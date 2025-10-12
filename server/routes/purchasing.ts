// Purchasing and GRN API Routes
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error';
import { createContextLogger } from '../utils/logger';
import { getDatabase } from '../db';
import { createStandardError, ERROR_CODES } from '../utils/errorCodes';
import { auditPerformance } from '../middleware/auditLogger';

const router = Router();

// Generate GRN number
function generateGRNNumber(): string {
  const db = getDatabase();
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  
  // Get the last GRN number for this month
  const lastGRN = db.prepare(`
    SELECT grn_number FROM grn_headers 
    WHERE grn_number LIKE ? 
    ORDER BY grn_number DESC 
    LIMIT 1
  `).get(`GRN${year}${month}%`) as { grn_number: string } | undefined;
  
  let sequence = 1;
  if (lastGRN) {
    const lastSequence = parseInt(lastGRN.grn_number.slice(-4));
    sequence = lastSequence + 1;
  }
  
  return `GRN${year}${month}${String(sequence).padStart(4, '0')}`;
}

// POST /api/purchasing/grn - Create GRN with transaction wrapper and enhanced validation
router.post('/api/purchasing/grn',
  auditPerformance('GRN_CREATE'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'grn_create', requestId: req.requestId });
    
    try {
      const {
        po_id,
        supplier_id,
        grn_date,
        lines = [],
        freight_cost = 0,
        duty_cost = 0,
        misc_cost = 0,
        notes,
        idempotency_key
      } = req.body;
      
      // Enhanced validation with proper error mapping
      if (!supplier_id || typeof supplier_id !== 'number' || supplier_id <= 0) {
        throw createStandardError(
          'Valid supplier ID is required',
          ERROR_CODES.INVALID_INPUT,
          { supplier_id },
          req.requestId
        );
      }
      
      if (!grn_date || typeof grn_date !== 'string') {
        throw createStandardError(
          'GRN date is required (YYYY-MM-DD format)',
          ERROR_CODES.INVALID_INPUT,
          { grn_date },
          req.requestId
        );
      }
      
      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(grn_date)) {
        throw createStandardError(
          'GRN date must be in YYYY-MM-DD format',
          ERROR_CODES.INVALID_INPUT,
          { grn_date },
          req.requestId
        );
      }
      
      if (!Array.isArray(lines) || lines.length === 0) {
        throw createStandardError(
          'At least one GRN line is required',
          ERROR_CODES.INVALID_INPUT,
          { lines },
          req.requestId
        );
      }
      
      const db = getDatabase();
      
      // Check supplier exists and is active
      const supplier = db.prepare('SELECT id, supplier_name, active FROM suppliers WHERE id = ? AND active = 1').get(supplier_id);
      if (!supplier) {
        throw createStandardError(
          'Supplier not found or inactive',
          ERROR_CODES.NOT_FOUND,
          { supplier_id },
          req.requestId
        );
      }
      
      // Normalize and validate lines data
      const normalizedLines = lines.map((line, index) => {
        const product_id = Number(line.product_id);
        const quantity_received = Number(line.quantity_received || line.qty_received || 0);
        const unit_cost = Number(line.unit_cost || 0);
        const cost_cents = Number(line.cost_cents || Math.round(unit_cost * 100));
        
        // Validate line data
        if (!product_id || product_id <= 0) {
          throw createStandardError(
            `Line ${index + 1}: Valid product ID is required`,
            ERROR_CODES.INVALID_INPUT,
            { line, index },
            req.requestId
          );
        }
        
        if (quantity_received <= 0) {
          throw createStandardError(
            `Line ${index + 1}: Quantity must be greater than 0`,
            ERROR_CODES.INVALID_INPUT,
            { line, index },
            req.requestId
          );
        }
        
        if (cost_cents < 0) {
          throw createStandardError(
            `Line ${index + 1}: Cost cannot be negative`,
            ERROR_CODES.INVALID_INPUT,
            { line, index },
            req.requestId
          );
        }
        
        return {
          product_id,
          quantity_received,
          cost_cents,
          line_total_cents: quantity_received * cost_cents,
          batch_number: line.batch_number?.trim() || null,
          expiry_date: line.expiry_date?.trim() || null,
          notes: line.notes?.trim() || null
        };
      });
      
      // Validate all products exist and are active
      const productIds = normalizedLines.map(line => line.product_id);
      const products = db.prepare(`
        SELECT id, name_en, is_active FROM products 
        WHERE id IN (${productIds.map(() => '?').join(',')}) AND is_active = 1
      `).all(...productIds) as { id: number; name_en: string; is_active: number }[];
      
      if (products.length !== productIds.length) {
        const foundIds = products.map(p => p.id);
        const missingIds = productIds.filter(id => !foundIds.includes(id));
        throw createStandardError(
          `Products not found or inactive: ${missingIds.join(', ')}`,
          ERROR_CODES.NOT_FOUND,
          { missingIds },
          req.requestId
        );
      }
      
      // Check for idempotency if key provided
      if (idempotency_key) {
        const existingGRN = db.prepare('SELECT id, grn_number FROM grn_headers WHERE idempotency_key = ?').get(idempotency_key) as { id: number; grn_number: string } | undefined;
        if (existingGRN) {
          requestLogger.info('Idempotent GRN request', { idempotency_key, existingGrnId: existingGRN.id });
          return res.json({
            ok: true,
            grn: {
              id: existingGRN.id,
              grn_number: existingGRN.grn_number,
              status: 'draft',
              duplicate: true
            }
          });
        }
      }
      
      // Generate GRN number
      const grnNumber = generateGRNNumber();
      
      // Begin transaction with retry logic
      const maxRetries = 5;
      let retryCount = 0;
      
      while (retryCount < maxRetries) {
        try {
          db.prepare('BEGIN IMMEDIATE').run();
          
          // Insert GRN header
          const grnResult = db.prepare(`
            INSERT INTO grn_headers (
              grn_number, po_id, supplier_id, grn_date, received_by, status,
              total_quantity, total_value, freight_cost, duty_cost, misc_cost, notes,
              idempotency_key, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            grnNumber,
            po_id || null,
            supplier_id,
            grn_date,
            (req as any).user?.id || null,
            'draft',
            0, // total_quantity - will be calculated
            0, // total_value - will be calculated
            Number(freight_cost) || 0,
            Number(duty_cost) || 0,
            Number(misc_cost) || 0,
            notes?.trim() || null,
            idempotency_key || null,
            new Date().toISOString(),
            new Date().toISOString()
          );
          
          const grnId = grnResult.lastInsertRowid as number;
          let totalQuantity = 0;
          let totalValue = 0;
          
          // Insert GRN lines and update stock ledger
          for (const line of normalizedLines) {
            // Insert GRN line
            db.prepare(`
              INSERT INTO grn_lines (
                grn_id, product_id, quantity_received, unit_cost, total_cost,
                batch_number, expiry_date, notes, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              grnId,
              line.product_id,
              line.quantity_received,
              line.cost_cents / 100, // Convert cents to decimal for display
              line.line_total_cents / 100, // Convert cents to decimal for display
              line.batch_number,
              line.expiry_date,
              line.notes,
              new Date().toISOString(),
              new Date().toISOString()
            );
            
            // Get current stock balance
            const currentBalance = db.prepare(`
              SELECT COALESCE(SUM(quantity), 0) as balance 
              FROM stock_ledger 
              WHERE product_id = ?
            `).get(line.product_id) as { balance: number } || { balance: 0 };
            
            const newBalance = currentBalance.balance + line.quantity_received;
            
            // Insert stock ledger entry
            db.prepare(`
              INSERT INTO stock_ledger (
                product_id, movement_type, reference_id, reference_type,
                quantity, unit_cost, total_cost, balance_quantity, balance_value,
                batch_number, expiry_date, notes, created_by, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              line.product_id,
              'GRN',
              grnId,
              'grn',
              line.quantity_received,
              line.cost_cents / 100,
              line.line_total_cents / 100,
              newBalance,
              newBalance * (line.cost_cents / 100),
              line.batch_number,
              line.expiry_date,
              line.notes,
              (req as any).user?.id || null,
              new Date().toISOString()
            );
            
            totalQuantity += line.quantity_received;
            totalValue += line.line_total_cents;
          }
          
          // Update GRN totals
          db.prepare(`
            UPDATE grn_headers 
            SET total_quantity = ?, total_value = ?, updated_at = ?
            WHERE id = ?
          `).run(totalQuantity, totalValue / 100, new Date().toISOString(), grnId);
          
          // Commit transaction
          db.prepare('COMMIT').run();
          
          requestLogger.info('GRN created successfully', {
            grnId,
            grnNumber,
            supplierId: supplier_id,
            lineCount: normalizedLines.length,
            totalQuantity,
            totalValue: totalValue / 100
          });
          
          res.status(201).json({
            ok: true,
            grn: {
              id: grnId,
              grn_number: grnNumber,
              status: 'draft',
              total_quantity: totalQuantity,
              total_value: totalValue / 100,
              line_count: normalizedLines.length
            }
          });
          
          return; // Success, exit retry loop
          
        } catch (error: any) {
          // Rollback transaction
          try {
            db.prepare('ROLLBACK').run();
          } catch (rollbackError) {
            requestLogger.error('Failed to rollback transaction', { error: rollbackError });
          }
          
          // Check if it's a SQLITE_BUSY error and retry
          if (error.code === 'SQLITE_BUSY' && retryCount < maxRetries - 1) {
            retryCount++;
            const jitter = Math.random() * 40 + 10; // 10-50ms jitter
            await new Promise(resolve => setTimeout(resolve, jitter));
            requestLogger.warn('SQLITE_BUSY retry', { retryCount, jitter });
            continue;
          }
          
          // Re-throw if not retryable or max retries reached
          throw error;
        }
      }
      
    } catch (error: any) {
      requestLogger.error('GRN creation failed', { error: error.message, stack: error.stack });
      
      // Re-throw if it's already a standard error (validation errors)
      if (error.code && error.status) {
        throw error;
      }
      
      // Map specific errors to standard error codes
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw createStandardError(
          'GRN number already exists',
          ERROR_CODES.DUPLICATE_IDEMPOTENCY,
          { grn_number: req.body.grn_number },
          req.requestId
        );
      }
      
      // Generic error fallback
      throw createStandardError(
        'Failed to create GRN',
        ERROR_CODES.INTERNAL_ERROR,
        { error: error.message },
        req.requestId
      );
    }
  })
);

// GET /api/purchasing/grn - List GRNs
router.get('/api/purchasing/grn',
  auditPerformance('GRN_LIST'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'grn_list', requestId: req.requestId });
    
    try {
      const db = getDatabase();
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
      const status = req.query.status as string || 'all';
      const supplierId = req.query.supplier_id ? parseInt(req.query.supplier_id as string) : null;
      
      // Build WHERE clause
      const whereConditions = [];
      const params = [];
      
      if (status !== 'all') {
        whereConditions.push('gh.status = ?');
        params.push(status);
      }
      
      if (supplierId) {
        whereConditions.push('gh.supplier_id = ?');
        params.push(supplierId);
      }
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      // Get total count
      const totalCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM grn_headers gh
        ${whereClause}
      `).get(...params) as { count: number };
      
      // Get GRNs
      const grns = db.prepare(`
        SELECT 
          gh.id, gh.grn_number, gh.supplier_id, gh.grn_date, gh.status,
          gh.total_quantity, gh.total_value, gh.freight_cost, gh.duty_cost, gh.misc_cost,
          gh.notes, gh.created_at, gh.updated_at,
          s.supplier_name,
          u.name as received_by_name
        FROM grn_headers gh
        LEFT JOIN suppliers s ON gh.supplier_id = s.id
        LEFT JOIN users u ON gh.received_by = u.id
        ${whereClause}
        ORDER BY gh.created_at DESC
        LIMIT ? OFFSET ?
      `).all(...params, pageSize, (page - 1) * pageSize) as any[];
      
      requestLogger.info('GRNs listed successfully', {
        count: grns.length,
        page,
        pageSize,
        totalCount: totalCount.count
      });
      
      res.json({
        ok: true,
        grns,
        pagination: {
          page,
          pageSize,
          total: totalCount.count,
          totalPages: Math.ceil(totalCount.count / pageSize)
        }
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to list GRNs', { error: error.message });
      throw createStandardError(
        'Failed to list GRNs',
        ERROR_CODES.INTERNAL_ERROR,
        { error: error.message },
        req.requestId
      );
    }
  })
);

// GET /api/purchasing/grn/:id - Get GRN details
router.get('/api/purchasing/grn/:id',
  auditPerformance('GRN_GET'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'grn_get', requestId: req.requestId });
    
    try {
      const grnId = parseInt(req.params.id);
      
      if (isNaN(grnId)) {
        throw createStandardError(
          'Invalid GRN ID',
          ERROR_CODES.INVALID_INPUT,
          { grnId: req.params.id },
          req.requestId
        );
      }
      
      const db = getDatabase();
      
      // Get GRN header
      const grn = db.prepare(`
        SELECT 
          gh.*, s.supplier_name, u.name as received_by_name
        FROM grn_headers gh
        LEFT JOIN suppliers s ON gh.supplier_id = s.id
        LEFT JOIN users u ON gh.received_by = u.id
        WHERE gh.id = ?
      `).get(grnId) as any;
      
      if (!grn) {
        throw createStandardError(
          'GRN not found',
          ERROR_CODES.GRN_NOT_FOUND,
          { grnId },
          req.requestId
        );
      }
      
      // Get GRN lines
      const lines = db.prepare(`
        SELECT 
          gl.*, p.sku, p.name_en, p.barcode
        FROM grn_lines gl
        JOIN products p ON gl.product_id = p.id
        WHERE gl.grn_id = ?
        ORDER BY gl.id
      `).all(grnId) as any[];
      
      requestLogger.info('GRN details retrieved', {
        grnId,
        grnNumber: grn.grn_number,
        lineCount: lines.length
      });
      
      res.json({
        ok: true,
        grn: {
          ...grn,
          lines
        }
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to get GRN', { error: error.message });
      throw createStandardError(
        'Failed to get GRN',
        ERROR_CODES.INTERNAL_ERROR,
        { error: error.message },
        req.requestId
      );
    }
  })
);

export default router;
