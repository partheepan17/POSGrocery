/**
 * Sales Route - Production-Ready Sales System
 * Implements idempotency, receipt numbering, money math, and concurrency safety
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error';
import { createContextLogger } from '../utils/logger';
import { getDatabase } from '../db';
import { createStandardError, ERROR_CODES } from '../utils/errorCodes';
import { auditPerformance, auditLogger } from '../middleware/auditLogger';
import { env } from '../config/env';
import { initializeConcurrency, executeTransactionWithRetry } from '../utils/concurrency';
import { generateReceiptNumber } from '../utils/receiptNumber';
import { checkIdempotency, storeIdempotency, validateIdempotencyKey } from '../utils/idempotency';
import { 
  toCents, 
  fromCents, 
  calculateTotal, 
  LineItem, 
  BillDiscount,
  formatMoney,
  parseMoneyInput 
} from '../utils/money';
import { createPrinterAdapter, DEFAULT_PRINTER_CONFIG, ReceiptData } from '../utils/printerAdapter';

const router = Router();

// Request validation schemas
const LineItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  discountAmount: z.number().min(0).optional(),
  taxInclusive: z.boolean().optional().default(false)
});

const PaymentSchema = z.object({
  method: z.enum(['cash', 'card', 'mobile', 'credit']),
  amount: z.number().positive(),
  reference: z.string().optional()
});

const BillDiscountSchema = z.object({
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  value: z.number().min(0)
});

const SalesRequestSchema = z.object({
  customerId: z.number().int().positive().optional(),
  items: z.array(LineItemSchema).min(1),
  payments: z.array(PaymentSchema).min(1),
  billDiscount: BillDiscountSchema.optional(),
  taxRate: z.number().min(0).max(1).default(0.15),
  cashierId: z.number().int().positive().optional().default(1),
  shiftId: z.number().int().positive().optional(),
  idempotencyKey: z.string().optional()
});

// POST /api/sales - Create sale with full production features
router.post('/api/sales',
  auditPerformance('sales_create'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'sales_create', requestId: req.requestId });
    const startTime = Date.now();
    
    try {
      // Validate request body
      const validationResult = SalesRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        
        res.status(400).json(createStandardError(
          `Validation failed: ${errors}`,
          ERROR_CODES.INVALID_INPUT,
          { errors: validationResult.error.errors },
          req.requestId
        ));
        return;
      }
      
      const { 
        customerId, 
        items, 
        payments, 
        billDiscount, 
        taxRate, 
        cashierId, 
        shiftId,
        idempotencyKey 
      } = validationResult.data;
      
      // Validate idempotency key in production
      if (env.NODE_ENV === 'production' && env.REQUIRE_IDEMPOTENCY_ON_PROD) {
        if (!idempotencyKey) {
          res.status(400).json(createStandardError(
            'Idempotency key is required in production mode',
            ERROR_CODES.INVALID_INPUT,
            {},
            req.requestId
          ));
          return;
        }
        
        if (!validateIdempotencyKey(idempotencyKey)) {
          res.status(400).json(createStandardError(
            'Invalid idempotency key format',
            ERROR_CODES.INVALID_INPUT,
            {},
            req.requestId
          ));
          return;
        }
      }
      
      // Convert prices to cents
      const itemsInCents: LineItem[] = items.map(item => ({
        ...item,
        unitPrice: toCents(item.unitPrice),
        discountAmount: item.discountAmount ? toCents(item.discountAmount) : 0
      }));
      
      // Calculate totals
      const totals = calculateTotal(itemsInCents, billDiscount, taxRate);
      
      // Validate payments match total
      const totalPaymentAmount = payments.reduce((sum, payment) => sum + toCents(payment.amount), 0);
      if (totalPaymentAmount !== totals.total) {
        res.status(400).json(createStandardError(
          `Payment mismatch: expected ${formatMoney(totals.total)}, got ${formatMoney(totalPaymentAmount)}`,
          ERROR_CODES.PAYMENT_MISMATCH,
          { 
            expected: totals.total, 
            received: totalPaymentAmount,
            expectedFormatted: formatMoney(totals.total),
            receivedFormatted: formatMoney(totalPaymentAmount)
          },
          req.requestId
        ));
        return;
      }
      
      // Check idempotency if key provided
      if (idempotencyKey) {
        const idempotencyResult = await checkIdempotency(
          { idempotencyKey, customerId, items: itemsInCents, payments },
          totals.total
        );
        
        if (idempotencyResult.isDuplicate) {
          // Return original sale
          res.status(200).json({
            ok: true,
            duplicate: true,
            sale: {
              id: idempotencyResult.originalSaleId,
              receiptNo: idempotencyResult.originalReceiptNo,
              message: 'Sale already processed'
            },
            requestId: req.requestId
          });
          return;
        }
      }
      
      // Execute sale transaction with retry logic
      const result = await executeTransactionWithRetry(async (db) => {
        // Validate products and check stock
        for (const item of itemsInCents) {
          const product = db.prepare(`
            SELECT id, name_en, stock_qty, price_retail, is_active 
            FROM products 
            WHERE id = ? AND is_active = 1
          `).get(item.productId) as {
            id: number;
            name_en: string;
            stock_qty: number;
            price_retail: number;
            is_active: number;
          } | undefined;
          
          if (!product) {
            throw new Error(`Product not found or inactive: ${item.productId}`);
          }
          
          if (product.stock_qty < item.quantity) {
            throw new Error(`Insufficient stock for ${product.name_en}: required ${item.quantity}, available ${product.stock_qty}`);
          }
        }
        
        // Generate receipt number
        const receiptResult = await generateReceiptNumber();
        
        // Create invoice
        const createInvoice = db.prepare(`
          INSERT INTO invoices (
            receipt_no, customer_id, gross, discount, tax, net,
            cashier_id, language, price_tier, shift_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const invoiceResult = createInvoice.run(
          receiptResult.receiptNo,
          customerId,
          fromCents(totals.subtotal), // gross
          fromCents(totals.billDiscountAmount), // discount
          fromCents(totals.taxAmount), // tax
          fromCents(totals.total), // net
          cashierId,
          'EN', // language
          'Retail', // price_tier
          shiftId
        );
        
        const invoiceId = invoiceResult.lastInsertRowid;
        
        // Create invoice lines
        const createInvoiceLine = db.prepare(`
          INSERT INTO invoice_lines (
            invoice_id, product_id, qty, unit_price, line_discount, tax, total
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (let i = 0; i < itemsInCents.length; i++) {
          const item = itemsInCents[i];
          const lineTotal = totals.lineTotals[i];
          const lineTax = Math.round(lineTotal * taxRate);
          
          createInvoiceLine.run(
            invoiceId,
            item.productId,
            item.quantity,
            fromCents(item.unitPrice),
            fromCents(item.discountAmount || 0),
            fromCents(lineTax),
            fromCents(lineTotal)
          );
        }
        
        // Create invoice payments
        const createInvoicePayment = db.prepare(`
          INSERT INTO invoice_payments (
            invoice_id, method, amount, reference
          ) VALUES (?, ?, ?, ?)
        `);
        
        for (const payment of payments) {
          createInvoicePayment.run(
            invoiceId,
            payment.method,
            fromCents(toCents(payment.amount)),
            payment.reference
          );
        }
        
        // Store idempotency record if key provided
        if (idempotencyKey) {
          await storeIdempotency(
            idempotencyKey,
            invoiceId,
            customerId,
            totals.total,
            itemsInCents
          );
        }
        
        return {
          invoiceId,
          receiptNo: receiptResult.receiptNo,
          totals,
          itemsCount: itemsInCents.length,
          paymentsCount: payments.length
        };
      });
      
      const processingTime = Date.now() - startTime;
      
      // Log successful sale
      requestLogger.info('Sale created successfully', {
        invoiceId: result.invoiceId,
        receiptNo: result.receiptNo,
        customerId,
        itemsCount: result.itemsCount,
        paymentsCount: result.paymentsCount,
        total: formatMoney(totals.total),
        processingTimeMs: processingTime,
        idempotencyKey: idempotencyKey ? 'provided' : 'none'
      });
      
      res.status(201).json({
        ok: true,
        sale: {
          id: result.invoiceId,
          receiptNo: result.receiptNo,
          customerId,
          gross: fromCents(totals.subtotal),
          discount: fromCents(totals.billDiscountAmount),
          tax: fromCents(totals.taxAmount),
          net: fromCents(totals.total),
          itemsCount: result.itemsCount,
          paymentsCount: result.paymentsCount,
          createdAt: new Date().toISOString()
        },
        totals: {
          subtotal: fromCents(totals.subtotal),
          billDiscount: fromCents(totals.billDiscountAmount),
          tax: fromCents(totals.taxAmount),
          total: fromCents(totals.total)
        },
        processingTimeMs: processingTime,
        requestId: req.requestId
      });
      
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      requestLogger.error('Sale creation failed', {
        error: error.message,
        processingTimeMs: processingTime,
        requestId: req.requestId
      });
      
      // Handle specific error types
      if (error.message.includes('Insufficient stock')) {
        res.status(409).json(createStandardError(
          error.message,
          ERROR_CODES.INSUFFICIENT_STOCK,
          {},
          req.requestId
        ));
        return;
      }
      
      if (error.message.includes('Product not found')) {
        res.status(404).json(createStandardError(
          error.message,
          ERROR_CODES.PRODUCT_NOT_FOUND,
          {},
          req.requestId
        ));
        return;
      }
      
      if (error.message.includes('Idempotency key conflict')) {
        res.status(409).json(createStandardError(
          error.message,
          ERROR_CODES.CONFLICT,
          {},
          req.requestId
        ));
        return;
      }
      
      // Generic error
      res.status(500).json(createStandardError(
        'Sale creation failed',
        ERROR_CODES.DATABASE_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

// GET /api/sales/:id - Get sale details
router.get('/api/sales/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const requestLogger = createContextLogger({ operation: 'sales_create', requestId: req.requestId });
    
    try {
      const db = getDatabase();
      
      // Get sale details
      const sale = db.prepare(`
        SELECT 
          i.*,
          c.name as customer_name
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE i.id = ?
      `).get(parseInt(id)) as any;
      
      if (!sale) {
        res.status(404).json(createStandardError(
          'Sale not found',
          ERROR_CODES.RESOURCE_NOT_FOUND,
          {},
          req.requestId
        ));
        return;
      }
      
      // Get sale lines
      const lines = db.prepare(`
        SELECT 
          il.*,
          p.name_en as product_name,
          p.sku
        FROM invoice_lines il
        JOIN products p ON il.product_id = p.id
        WHERE il.invoice_id = ?
      `).all(parseInt(id));
      
      // Get payments
      const payments = db.prepare(`
        SELECT * FROM invoice_payments
        WHERE invoice_id = ?
      `).all(parseInt(id));
      
      requestLogger.info('Sale retrieved successfully', {
        saleId: id,
        receiptNo: sale.receipt_no,
        requestId: req.requestId
      });
      
      res.json({
        ok: true,
        sale: {
          ...sale,
          lines,
          payments
        },
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to get sale', {
        saleId: id,
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Failed to retrieve sale',
        ERROR_CODES.DATABASE_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

// GET /api/sales - List sales with pagination
router.get('/api/sales',
  asyncHandler(async (req: Request, res: Response) => {
    const { 
      page = '1', 
      pageSize = '20', 
      startDate, 
      endDate, 
      customerId,
      receiptNo 
    } = req.query;
    
    const requestLogger = createContextLogger({ operation: 'sales_create', requestId: req.requestId });
    const pageNum = parseInt(page as string);
    const pageSizeNum = parseInt(pageSize as string);
    const offset = (pageNum - 1) * pageSizeNum;
    
    try {
      const db = getDatabase();
      
      // Build WHERE clause
      const whereConditions = [];
      const params: any[] = [];
      
      if (startDate) {
        whereConditions.push('DATE(i.created_at) >= ?');
        params.push(startDate);
      }
      
      if (endDate) {
        whereConditions.push('DATE(i.created_at) <= ?');
        params.push(endDate);
      }
      
      if (customerId) {
        whereConditions.push('i.customer_id = ?');
        params.push(parseInt(customerId as string));
      }
      
      if (receiptNo) {
        whereConditions.push('i.receipt_no LIKE ?');
        params.push(`%${receiptNo}%`);
      }
      
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';
      
      // Get total count
      const countResult = db.prepare(`
        SELECT COUNT(*) as total
        FROM invoices i
        ${whereClause}
      `).get(...params) as { total: number };
      
      // Get sales
      const sales = db.prepare(`
        SELECT 
          i.*,
          c.name as customer_name
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        ${whereClause}
        ORDER BY i.created_at DESC
        LIMIT ? OFFSET ?
      `).all(...params, pageSizeNum, offset);
      
      const totalPages = Math.ceil(countResult.total / pageSizeNum);
      
      requestLogger.info('Sales listed successfully', {
        page: pageNum,
        pageSize: pageSizeNum,
        total: countResult.total,
        returned: sales.length,
        requestId: req.requestId
      });
      
      res.json({
        ok: true,
        sales,
        pagination: {
          page: pageNum,
          pageSize: pageSizeNum,
          total: countResult.total,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        },
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to list sales', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Failed to list sales',
        ERROR_CODES.DATABASE_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

// POST /api/sales/:id/print - Print receipt
router.post('/api/sales/:id/print',
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'sales_print' });
    const { id } = req.params;
    const { printer_config } = req.body;
    
    try {
      const db = getDatabase();
      
      // Get sale details
      const sale = db.prepare(`
        SELECT 
          i.*,
          c.name as customer_name,
          u.name as cashier_name
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN users u ON i.cashier_id = u.id
        WHERE i.id = ?
      `).get(Number(id));
      
      if (!sale) {
        res.status(404).json(createStandardError(
          'Sale not found',
          ERROR_CODES.RESOURCE_NOT_FOUND,
          { sale_id: id },
          req.requestId
        ));
        return;
      }
      
      // Get sale lines
      const saleLines = db.prepare(`
        SELECT 
          il.*,
          p.name_en as product_name,
          p.sku
        FROM invoice_lines il
        JOIN products p ON il.product_id = p.id
        WHERE il.invoice_id = ?
        ORDER BY il.id
      `).all(Number(id));
      
      // Get system configuration
      const config = db.prepare(`
        SELECT config_key, config_value FROM system_config
        WHERE config_key IN ('store_name', 'store_address', 'store_phone', 'receipt_footer')
      `).all() as { config_key: string, config_value: string }[];
      
      const systemConfig = config.reduce((acc, item) => {
        acc[item.config_key] = item.config_value;
        return acc;
      }, {} as Record<string, string>);
      
      // Prepare receipt data
      const receiptData: ReceiptData = {
        receipt_no: (sale as any).receipt_no,
        receipt_type: 'sale',
        store_name: systemConfig.store_name || 'POS Store',
        store_address: systemConfig.store_address || '123 Main Street',
        store_phone: systemConfig.store_phone || '+94 11 234 5678',
        cashier_name: (sale as any).cashier_name || 'Unknown',
        customer_name: (sale as any).customer_name,
        items: saleLines.map(line => ({
          name: (line as any).product_name,
          sku: (line as any).sku,
          quantity: (line as any).qty,
          unit_price: (line as any).unit_price,
          line_total: (line as any).line_total,
          discount: (line as any).discount_amount || 0
        })),
        subtotal: (sale as any).subtotal,
        tax_amount: (sale as any).tax_amount || 0,
        discount_amount: (sale as any).discount_amount || 0,
        total: (sale as any).total_amount,
        payment_method: (sale as any).payment_method || 'cash',
        payment_reference: (sale as any).payment_reference,
        created_at: (sale as any).created_at,
        footer_text: systemConfig.receipt_footer || 'Thank you for your business!'
      };
      
      // Create printer adapter
      const printerConfig = printer_config || DEFAULT_PRINTER_CONFIG;
      const printer = createPrinterAdapter(printerConfig, process.env.NODE_ENV === 'development');
      
      // Check printer connection
      const isConnected = await printer.isConnected();
      if (!isConnected) {
        res.status(503).json(createStandardError(
          'Printer not available',
          ERROR_CODES.SERVICE_UNAVAILABLE,
          { printer_host: printerConfig.host, printer_port: printerConfig.port },
          req.requestId
        ));
        return;
      }
      
      // Print receipt
      const printResult = await printer.print(receiptData);
      
      if (!printResult.success) {
        res.status(500).json(createStandardError(
          'Failed to print receipt',
          ERROR_CODES.PRINTER_ERROR,
          { error: printResult.message, printer_response: printResult.printer_response },
          req.requestId
        ));
        return;
      }
      
      requestLogger.info('Receipt printed successfully', {
        sale_id: id,
        receipt_no: (sale as any).receipt_no,
        printer_response: printResult.printer_response,
        requestId: req.requestId
      });
      
      res.json({
        ok: true,
        message: 'Receipt printed successfully',
        receipt_data: receiptData,
        printer_response: printResult.printer_response,
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to print receipt', {
        error: error.message,
        sale_id: id,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Failed to print receipt',
        ERROR_CODES.DATABASE_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

// GET /api/sales/:id/reprint - Reprint receipt
router.get('/api/sales/:id/reprint',
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'sales_reprint' });
    const { id } = req.params;
    const { printer_config } = req.query;
    
    try {
      const db = getDatabase();
      
      // Get sale details
      const sale = db.prepare(`
        SELECT 
          i.*,
          c.name as customer_name,
          u.name as cashier_name
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN users u ON i.cashier_id = u.id
        WHERE i.id = ?
      `).get(Number(id));
      
      if (!sale) {
        res.status(404).json(createStandardError(
          'Sale not found',
          ERROR_CODES.RESOURCE_NOT_FOUND,
          { sale_id: id },
          req.requestId
        ));
        return;
      }
      
      // Get sale lines
      const saleLines = db.prepare(`
        SELECT 
          il.*,
          p.name_en as product_name,
          p.sku
        FROM invoice_lines il
        JOIN products p ON il.product_id = p.id
        WHERE il.invoice_id = ?
        ORDER BY il.id
      `).all(Number(id));
      
      // Get system configuration
      const config = db.prepare(`
        SELECT config_key, config_value FROM system_config
        WHERE config_key IN ('store_name', 'store_address', 'store_phone', 'receipt_footer')
      `).all() as { config_key: string, config_value: string }[];
      
      const systemConfig = config.reduce((acc, item) => {
        acc[item.config_key] = item.config_value;
        return acc;
      }, {} as Record<string, string>);
      
      // Prepare receipt data
      const receiptData: ReceiptData = {
        receipt_no: (sale as any).receipt_no,
        receipt_type: 'sale',
        store_name: systemConfig.store_name || 'POS Store',
        store_address: systemConfig.store_address || '123 Main Street',
        store_phone: systemConfig.store_phone || '+94 11 234 5678',
        cashier_name: (sale as any).cashier_name || 'Unknown',
        customer_name: (sale as any).customer_name,
        items: saleLines.map(line => ({
          name: (line as any).product_name,
          sku: (line as any).sku,
          quantity: (line as any).qty,
          unit_price: (line as any).unit_price,
          line_total: (line as any).line_total,
          discount: (line as any).discount_amount || 0
        })),
        subtotal: (sale as any).subtotal,
        tax_amount: (sale as any).tax_amount || 0,
        discount_amount: (sale as any).discount_amount || 0,
        total: (sale as any).total_amount,
        payment_method: (sale as any).payment_method || 'cash',
        payment_reference: (sale as any).payment_reference,
        created_at: (sale as any).created_at,
        footer_text: systemConfig.receipt_footer || 'Thank you for your business!'
      };
      
      // Create printer adapter
      const printerConfig = printer_config ? JSON.parse(printer_config as string) : DEFAULT_PRINTER_CONFIG;
      const printer = createPrinterAdapter(printerConfig, process.env.NODE_ENV === 'development');
      
      // Check printer connection
      const isConnected = await printer.isConnected();
      if (!isConnected) {
        res.status(503).json(createStandardError(
          'Printer not available',
          ERROR_CODES.SERVICE_UNAVAILABLE,
          { printer_host: printerConfig.host, printer_port: printerConfig.port },
          req.requestId
        ));
        return;
      }
      
      // Print receipt
      const printResult = await printer.print(receiptData);
      
      if (!printResult.success) {
        res.status(500).json(createStandardError(
          'Failed to reprint receipt',
          ERROR_CODES.PRINTER_ERROR,
          { error: printResult.message, printer_response: printResult.printer_response },
          req.requestId
        ));
        return;
      }
      
      requestLogger.info('Receipt reprinted successfully', {
        sale_id: id,
        receipt_no: (sale as any).receipt_no,
        printer_response: printResult.printer_response,
        requestId: req.requestId
      });
      
      res.json({
        ok: true,
        message: 'Receipt reprinted successfully',
        receipt_data: receiptData,
        printer_response: printResult.printer_response,
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to reprint receipt', {
        error: error.message,
        sale_id: id,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Failed to reprint receipt',
        ERROR_CODES.DATABASE_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

export default router;
