/**
 * Returns API Routes
 * Handles product returns with validation and stock updates
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error';
import { createContextLogger } from '../utils/logger';
import { getDatabase } from '../db';
import { createStandardError, ERROR_CODES } from '../utils/errorCodes';
import { auditPerformance, auditLogger } from '../middleware/auditLogger';
import { generateReceiptNumber } from '../utils/receiptNumber';
import { 
  addStockBackToLedger, 
  validateStockAvailability,
  getStockLedgerSummary 
} from '../utils/stockLedger';
import { z } from 'zod';

const router = Router();

// Validation schemas
const ReturnItemSchema = z.object({
  product_id: z.number().int().positive(),
  quantity: z.number().int().positive(),
  reason: z.string().optional(),
  condition: z.enum(['good', 'damaged', 'defective']).default('good')
});

const CreateReturnSchema = z.object({
  original_receipt_no: z.string().min(1),
  items: z.array(ReturnItemSchema).min(1),
  customer_id: z.number().int().positive().optional(),
  cashier_id: z.number().int().positive().optional(),
  notes: z.string().optional()
});

// POST /api/returns - Create a return
router.post('/api/returns',
  auditPerformance('return_create'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'return_create' });
    
    try {
      // Validate request body
      const validatedData = CreateReturnSchema.parse(req.body);
      const { original_receipt_no, items, customer_id, cashier_id, notes } = validatedData;
      
      const db = getDatabase();
      
      // Find the original sale
      const originalSale = db.prepare(`
        SELECT 
          i.id as invoice_id,
          i.receipt_no,
          i.customer_id,
          i.cashier_id,
          i.created_at,
          il.product_id,
          il.qty as original_quantity,
          p.name_en as product_name,
          p.sku
        FROM invoices i
        JOIN invoice_lines il ON i.id = il.invoice_id
        JOIN products p ON il.product_id = p.id
        WHERE i.receipt_no = ?
      `).all(original_receipt_no);
      
      if (originalSale.length === 0) {
        res.status(404).json(createStandardError(
          `Original sale with receipt number ${original_receipt_no} not found`,
          ERROR_CODES.RESOURCE_NOT_FOUND,
          { receipt_no: original_receipt_no },
          req.requestId
        ));
        return;
      }
      
      // Validate return items against original sale
      const originalItems = new Map();
      originalSale.forEach(item => {
        originalItems.set((item as any).product_id, {
          quantity: (item as any).original_quantity,
          product_name: (item as any).product_name,
          sku: (item as any).sku
        });
      });
      
      const validationErrors: string[] = [];
      let totalReturnValue = 0;
      
      for (const returnItem of items) {
        const originalItem = originalItems.get(returnItem.product_id);
        
        if (!originalItem) {
          validationErrors.push(`Product ${returnItem.product_id} was not in the original sale`);
          continue;
        }
        
        if (returnItem.quantity > originalItem.quantity) {
          validationErrors.push(
            `Cannot return ${returnItem.quantity} units of ${originalItem.product_name} ` +
            `(only ${originalItem.quantity} were sold)`
          );
          continue;
        }
        
        // Get current stock info for value calculation
        const stockSummary = getStockLedgerSummary(returnItem.product_id);
        const returnValue = returnItem.quantity * stockSummary.averageCost;
        totalReturnValue += returnValue;
      }
      
      if (validationErrors.length > 0) {
        res.status(400).json(createStandardError(
          'Return validation failed',
          ERROR_CODES.INVALID_INPUT,
          { errors: validationErrors },
          req.requestId
        ));
        return;
      }
      
      // Generate return receipt number
      const receiptNoResult = await generateReceiptNumber();
      const returnReceiptNo = `R-${receiptNoResult.receiptNo}`;
      
      // Create return transaction
      const result = db.transaction(() => {
        // Create return record
        const returnId = db.prepare(`
          INSERT INTO returns (
            return_receipt_no, original_receipt_no, customer_id, cashier_id,
            total_value, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(
          returnReceiptNo, original_receipt_no, customer_id, cashier_id,
          totalReturnValue, notes
        ).lastInsertRowid as number;
        
        // Process each return item
        const returnLines = [];
        for (const returnItem of items) {
          // Add stock back to ledger
          addStockBackToLedger(
            returnItem.product_id,
            returnItem.quantity,
            returnId,
            'return',
            cashier_id
          );
          
          // Create return line record
          const lineId = db.prepare(`
            INSERT INTO return_lines (
              return_id, product_id, quantity, reason, condition, created_at
            ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `).run(
            returnId, returnItem.product_id, returnItem.quantity,
            returnItem.reason, returnItem.condition
          ).lastInsertRowid as number;
          
          returnLines.push({
            id: lineId,
            product_id: returnItem.product_id,
            quantity: returnItem.quantity,
            reason: returnItem.reason,
            condition: returnItem.condition
          });
        }
        
        return {
          return_id: returnId,
          return_receipt_no: returnReceiptNo,
          total_value: totalReturnValue,
          lines: returnLines
        };
      })();
      
      requestLogger.info('Return created successfully', {
        return_id: result.return_id,
        return_receipt_no: result.return_receipt_no,
        total_value: result.total_value,
        item_count: items.length
      });
      
      res.status(201).json({
        ok: true,
        return: {
          id: result.return_id,
          return_receipt_no: result.return_receipt_no,
          original_receipt_no,
          total_value: result.total_value,
          lines: result.lines,
          created_at: new Date().toISOString()
        }
      });
      
    } catch (error) {
      requestLogger.error('Return creation failed', { error: error instanceof Error ? error.message : String(error) });
      
      if (error instanceof z.ZodError) {
        res.status(400).json(createStandardError(
          'Invalid return data',
          ERROR_CODES.INVALID_INPUT,
          { errors: error.errors },
          req.requestId
        ));
        return;
      }
      
      res.status(500).json(createStandardError(
        'Failed to create return',
        ERROR_CODES.DATABASE_ERROR,
        { error: error instanceof Error ? error.message : String(error) },
        req.requestId
      ));
    }
  })
);

// GET /api/returns - List returns with pagination
router.get('/api/returns',
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'returns_list' });
    const { page = 1, pageSize = 20, receipt_no, customer_id } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);
    
    const db = getDatabase();
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    if (receipt_no) {
      whereClause += ' AND (r.return_receipt_no LIKE ? OR r.original_receipt_no LIKE ?)';
      params.push(`%${receipt_no}%`, `%${receipt_no}%`);
    }
    
    if (customer_id) {
      whereClause += ' AND r.customer_id = ?';
      params.push(Number(customer_id));
    }
    
    const returns = db.prepare(`
      SELECT 
        r.id,
        r.return_receipt_no,
        r.original_receipt_no,
        r.customer_id,
        r.cashier_id,
        r.total_value,
        r.notes,
        r.created_at,
        c.name as customer_name,
        u.name as cashier_name
      FROM returns r
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN users u ON r.cashier_id = u.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, Number(pageSize), offset);
    
    const totalCount = db.prepare(`
      SELECT COUNT(*) as count FROM returns r ${whereClause}
    `).get(...params) as { count: number };
    
    res.json({
      ok: true,
      returns,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total: totalCount.count,
        totalPages: Math.ceil(totalCount.count / Number(pageSize))
      }
    });
  })
);

// GET /api/returns/:id - Get return details
router.get('/api/returns/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'return_details' });
    const { id } = req.params;
    const db = getDatabase();
    
    const returnData = db.prepare(`
      SELECT 
        r.*,
        c.name as customer_name,
        u.name as cashier_name
      FROM returns r
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN users u ON r.cashier_id = u.id
      WHERE r.id = ?
    `).get(Number(id));
    
    if (!returnData) {
      res.status(404).json(createStandardError(
        'Return not found',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        { return_id: id },
        req.requestId
      ));
      return;
    }
    
    const returnLines = db.prepare(`
      SELECT 
        rl.*,
        p.name_en as product_name,
        p.sku
      FROM return_lines rl
      JOIN products p ON rl.product_id = p.id
      WHERE rl.return_id = ?
      ORDER BY rl.id
    `).all(Number(id));
    
    res.json({
      ok: true,
      return: {
        ...returnData,
        lines: returnLines
      }
    });
  })
);

// GET /api/returns/receipt/:receipt_no - Get return by receipt number
router.get('/api/returns/receipt/:receipt_no',
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'return_by_receipt' });
    const { receipt_no } = req.params;
    const db = getDatabase();
    
    const returnData = db.prepare(`
      SELECT 
        r.*,
        c.name as customer_name,
        u.name as cashier_name
      FROM returns r
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN users u ON r.cashier_id = u.id
      WHERE r.return_receipt_no = ? OR r.original_receipt_no = ?
    `).get(receipt_no, receipt_no);
    
    if (!returnData) {
      res.status(404).json(createStandardError(
        'Return not found',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        { receipt_no },
        req.requestId
      ));
      return;
    }
    
    const returnLines = db.prepare(`
      SELECT 
        rl.*,
        p.name_en as product_name,
        p.sku
      FROM return_lines rl
      JOIN products p ON rl.product_id = p.id
      WHERE rl.return_id = ?
      ORDER BY rl.id
    `).all((returnData as any).id);
    
    res.json({
      ok: true,
      return: {
        ...returnData,
        lines: returnLines
      }
    });
  })
);

export default router;
