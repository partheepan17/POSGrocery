import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error';
import { createRequestLogger } from '../utils/logger';
import { getDatabase } from '../db';
import { createStandardError, ERROR_CODES } from '../utils/errorCodes';
import { auditPerformance, auditLogger } from '../middleware/auditLogger';
import { safeAdd, safeMultiply, decimalToCents } from '../utils/performance';
import { generateReceiptNumber, getReceiptStats } from '../utils/receiptNumber';
import { checkStockAvailability, getStockBalance } from '../utils/stockManager';

const router = Router();

// POST /api/invoices - Create invoice (P95 ≤ 100ms target)
router.post('/api/invoices',
  auditPerformance('INVOICE_CREATE'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    const db = getDatabase();
    
    try {
      const {
        customerId = 1, // Default to walk-in customer
        items = [],
        payments = [],
        cashierId = 1,
        shiftId = 1
      } = req.body;
      
      // Validate required fields
      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json(createStandardError(
          'Items array is required and cannot be empty',
          ERROR_CODES.MISSING_REQUIRED_FIELD,
          { items },
          req.requestId
        ));
        return;
      }
      
      if (!Array.isArray(payments) || payments.length === 0) {
        res.status(400).json(createStandardError(
          'Payments array is required and cannot be empty',
          ERROR_CODES.MISSING_REQUIRED_FIELD,
          { payments },
          req.requestId
        ));
        return;
      }
      
      // Validate items and check stock availability
      const stockValidationErrors: Array<{productId: number; productName: string; required: number; available: number}> = [];
      
      for (const item of items) {
        if (!item.productId || !item.quantity || item.quantity <= 0) {
          res.status(400).json(createStandardError(
            'Invalid item: productId and quantity are required',
            ERROR_CODES.INVALID_INPUT,
            { item },
            req.requestId
          ));
          return;
        }

        // Get product details for better error messages
        const product = db.prepare(`
          SELECT id, name_en, stock_qty FROM products WHERE id = ? AND is_active = 1
        `).get(item.productId) as { id: number; name_en: string; stock_qty: number } | undefined;
        
        if (!product) {
          res.status(404).json(createStandardError(
            `Product not found or inactive: ${item.productId}`,
            ERROR_CODES.PRODUCT_NOT_FOUND,
            { productId: item.productId },
            req.requestId
          ));
          return;
        }

        // Check stock availability with detailed validation
        if (product.stock_qty < item.quantity) {
          stockValidationErrors.push({
            productId: item.productId,
            productName: product.name_en,
            required: item.quantity,
            available: product.stock_qty
          });
        }
      }

      // If any stock validation errors, return them all
      if (stockValidationErrors.length > 0) {
        const errorMessage = stockValidationErrors.map(err => 
          `${err.productName}: Required ${err.required}, Available ${err.available}`
        ).join('; ');
        
        res.status(409).json(createStandardError(
          `Insufficient stock: ${errorMessage}`,
          ERROR_CODES.INSUFFICIENT_STOCK,
          { 
            errors: stockValidationErrors,
            totalErrors: stockValidationErrors.length
          },
          req.requestId
        ));
        return;
      }
      
      // Validate payments
      let totalPaymentAmount = 0;
      for (const payment of payments) {
        if (!payment.method || !payment.amount || payment.amount <= 0) {
          res.status(400).json(createStandardError(
            'Invalid payment: method and amount are required',
            ERROR_CODES.INVALID_INPUT,
            { payment },
            req.requestId
          ));
          return;
        }
        totalPaymentAmount = safeAdd(totalPaymentAmount, decimalToCents(payment.amount));
      }
      
      // Generate receipt number (outside transaction to avoid deadlocks)
      const receiptNo = await generateReceiptNumber();
      
      // Start transaction with enhanced error handling
      const transaction = db.transaction(() => {
        // Calculate totals
        let gross = 0;
        let taxAmount = 0;
        const taxRate = 0.15; // 15% tax
        
        // Process items and calculate totals
        for (const item of items) {
          const product = db.prepare(`
            SELECT price_retail, is_scale_item, name_en FROM products WHERE id = ? AND is_active = 1
          `).get(item.productId) as { price_retail: number; is_scale_item: number; name_en: string } | undefined;
          
          if (!product) {
            throw new Error(`Product not found or inactive: ${item.productId}`);
          }
          
          // Double-check stock availability within transaction
          const stock = getStockBalance(item.productId);
          if (!stock || stock.available_quantity < item.quantity) {
            throw new Error(`Insufficient stock for ${product.name_en}. Available: ${stock?.available_quantity || 0}, Required: ${item.quantity}`);
          }
          
          const lineTotal = safeMultiply(decimalToCents(product.price_retail), item.quantity);
          gross = safeAdd(gross, lineTotal);
        }
        
        taxAmount = Math.round(gross * taxRate);
        const net = safeAdd(gross, taxAmount);
        
        // Validate payment total matches invoice total
        if (totalPaymentAmount !== net) {
          throw new Error(`Payment mismatch: expected ${net}, got ${totalPaymentAmount}`);
        }
        
        // Create invoice
        const createInvoice = db.prepare(`
          INSERT INTO invoices (
            receipt_no, customer_id, gross, discount, tax, net,
            cashier_id, language, price_tier
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const invoiceResult = createInvoice.run(
          receiptNo,
          customerId,
          gross / 100, // Convert back to decimal (gross)
          0, // discount
          taxAmount / 100, // tax
          net / 100, // net
          cashierId,
          'EN', // language
          'Retail' // price_tier
        );
        
        const invoiceId = invoiceResult.lastInsertRowid;
        
        // Create invoice lines
        const createInvoiceLine = db.prepare(`
          INSERT INTO invoice_lines (
            invoice_id, product_id, qty, unit_price, line_discount, tax, total
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const item of items) {
          const product = db.prepare(`
            SELECT price_retail FROM products WHERE id = ?
          `).get(item.productId) as { price_retail: number } | undefined;
          
          if (!product) {
            throw new Error(`Product not found: ${item.productId}`);
          }
          
          const unitPrice = decimalToCents(product.price_retail);
          const totalPrice = safeMultiply(unitPrice, item.quantity);
          const lineTax = Math.round(totalPrice * 0.15); // 15% tax on line total
          
          createInvoiceLine.run(
            invoiceId,
            item.productId,
            item.quantity,
            unitPrice / 100,
            0, // line_discount
            lineTax / 100, // tax
            totalPrice / 100 // total
          );
        }
        
        // Create invoice payments
        const createInvoicePayment = db.prepare(`
          INSERT INTO invoice_payments (
            invoice_id, method, amount
          ) VALUES (?, ?, ?)
        `);
        
        for (const payment of payments) {
          createInvoicePayment.run(
            invoiceId,
            payment.method,
            payment.amount
          );
        }
        
        return {
          invoiceId,
          receiptNo,
          gross: gross / 100,
          tax: taxAmount / 100,
          net: net / 100
        };
      });
      
      const result = transaction();
      
      // Log audit event
      auditLogger.log({
        action: 'INVOICE_CREATED',
        entityType: 'invoice',
        entityId: result.invoiceId.toString(),
        dataSummary: {
          receiptNo: result.receiptNo,
          itemCount: items.length,
          paymentCount: payments.length,
          net: result.net
        }
      }, req);
      
      requestLogger.info('Invoice created successfully', {
        invoiceId: result.invoiceId,
        receiptNo: result.receiptNo,
        net: result.net,
        itemCount: items.length
      });
      
      res.status(201).json({
        ok: true,
        invoice: {
          id: result.invoiceId,
          receiptNo: result.receiptNo,
          gross: result.gross,
          tax: result.tax,
          net: result.net,
          status: 'completed'
        },
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Invoice creation failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      let errorCode: string = ERROR_CODES.DATABASE_ERROR;
      let message = 'Invoice creation failed';
      let statusCode = 500;
      
      if (error instanceof Error) {
        if (error.message.includes('Insufficient stock')) {
          errorCode = ERROR_CODES.INSUFFICIENT_STOCK;
          message = error.message;
          statusCode = 409;
        } else if (error.message.includes('Payment mismatch')) {
          errorCode = ERROR_CODES.PAYMENT_MISMATCH;
          message = 'Payment amount does not match invoice total';
          statusCode = 400;
        } else if (error.message.includes('Product not found')) {
          errorCode = ERROR_CODES.PRODUCT_NOT_FOUND;
          message = 'One or more products not found';
          statusCode = 404;
        } else if (error.message.includes('SQLITE_CONSTRAINT')) {
          errorCode = ERROR_CODES.SALE_TRANSACTION_FAILED;
          message = 'Transaction failed due to database constraints';
          statusCode = 409;
        }
      }
      
      res.status(statusCode).json(createStandardError(
        message,
        errorCode as any,
        { 
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        req.requestId
      ));
    }
  })
);

// GET /api/invoices - List invoices with pagination
router.get('/api/invoices',
  auditPerformance('INVOICE_LIST'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    const db = getDatabase();
    
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const offset = (page - 1) * limit;
      
      const invoices = db.prepare(`
        SELECT 
          i.id, i.receipt_no, i.customer_id, i.gross, i.discount, 
          i.tax, i.net, i.price_tier, i.language, i.created_at,
          c.customer_name
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        ORDER BY i.created_at DESC
        LIMIT ? OFFSET ?
      `).all(limit, offset);
      
      const totalCount = db.prepare(`
        SELECT COUNT(*) as count FROM invoices
      `).get() as { count: number };
      
      requestLogger.info('Invoices listed', {
        page,
        limit,
        totalCount: totalCount.count,
        returnedCount: invoices.length
      });
      
      res.json({
        ok: true,
        invoices,
        pagination: {
          page,
          limit,
          total: totalCount.count,
          pages: Math.ceil(totalCount.count / limit)
        },
        requestId: req.requestId
      });
      
    } catch (error) {
      requestLogger.error('Invoice listing failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(500).json(createStandardError(
        'Failed to list invoices',
        ERROR_CODES.DATABASE_ERROR,
        { 
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        req.requestId
      ));
    }
  })
);

// GET /api/invoices/:id - Get invoice details
router.get('/api/invoices/:id',
  auditPerformance('INVOICE_DETAILS'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    const db = getDatabase();
    const invoiceId = parseInt(req.params.id);
    
    try {
      if (isNaN(invoiceId)) {
        res.status(400).json(createStandardError(
          'Invalid invoice ID',
          ERROR_CODES.INVALID_INPUT,
          { invoiceId: req.params.id },
          req.requestId
        ));
        return;
      }
      
      const invoice = db.prepare(`
        SELECT 
          i.*, c.customer_name
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE i.id = ?
      `).get(invoiceId);
      
      if (!invoice) {
        res.status(404).json(createStandardError(
          'Invoice not found',
          ERROR_CODES.RESOURCE_NOT_FOUND,
          { invoiceId },
          req.requestId
        ));
        return;
      }
      
      const lines = db.prepare(`
        SELECT 
          il.id, il.invoice_id, il.product_id, il.qty, il.unit_price, 
          il.line_discount, il.tax, il.total, il.created_at,
          p.name_en, p.sku, p.barcode
        FROM invoice_lines il
        LEFT JOIN products p ON il.product_id = p.id
        WHERE il.invoice_id = ?
      `).all(invoiceId);
      
      const payments = db.prepare(`
        SELECT * FROM invoice_payments WHERE invoice_id = ?
      `).all(invoiceId);
      
      requestLogger.info('Invoice details retrieved', { invoiceId });
      
      res.json({
        ok: true,
        invoice: {
          ...invoice,
          lines,
          payments
        },
        requestId: req.requestId
      });
      
    } catch (error) {
      requestLogger.error('Invoice details retrieval failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        invoiceId
      });
      
      res.status(500).json(createStandardError(
        'Failed to retrieve invoice details',
        ERROR_CODES.DATABASE_ERROR,
        { 
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        req.requestId
      ));
    }
  })
);

// GET /api/invoices/sequence/current - Get current sequence number for today
router.get('/api/invoices/sequence/current',
  auditPerformance('INVOICE_SEQUENCE_CURRENT'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const currentSeq = await getReceiptStats();
      
      requestLogger.info('Current sequence number retrieved', { currentSeq });
      
      res.json({
        ok: true,
        currentSequence: currentSeq,
        requestId: req.requestId
      });
      
    } catch (error) {
      requestLogger.error('Failed to get current sequence number', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(500).json(createStandardError(
        'Failed to get current sequence number',
        ERROR_CODES.DATABASE_ERROR,
        { 
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        req.requestId
      ));
    }
  })
);

// GET /api/invoices/sequence/stats - Get receipt number statistics for date range
router.get('/api/invoices/sequence/stats',
  auditPerformance('INVOICE_SEQUENCE_STATS'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      if (!startDate || !endDate) {
        res.status(400).json(createStandardError(
          'startDate and endDate query parameters are required',
          ERROR_CODES.MISSING_REQUIRED_FIELD,
          { startDate, endDate },
          req.requestId
        ));
        return;
      }
      
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        res.status(400).json(createStandardError(
          'Invalid date format. Use YYYY-MM-DD',
          ERROR_CODES.INVALID_INPUT,
          { startDate, endDate },
          req.requestId
        ));
        return;
      }
      
      const stats = await getReceiptStats(undefined, startDate);
      
      requestLogger.info('Receipt number statistics retrieved', {
        startDate,
        endDate,
        totalReceipts: stats.totalReceipts,
        lastSequence: stats.lastSequence
      });
      
      res.json({
        ok: true,
        stats,
        dateRange: { startDate, endDate },
        requestId: req.requestId
      });
      
    } catch (error) {
      requestLogger.error('Failed to get receipt number statistics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(500).json(createStandardError(
        'Failed to get receipt number statistics',
        ERROR_CODES.DATABASE_ERROR,
        { 
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        req.requestId
      ));
    }
  })
);

export default router;
