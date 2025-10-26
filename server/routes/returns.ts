/**
 * Sales Return Routes
 * Handles sales returns and stock movement updates
 */

import express from 'express';
import { z } from 'zod';
import { getDatabase } from '../db/database';
import { createRequestLogger } from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticateToken, requireRole } from '../middleware/auth';
import { requirePolicy, requireSalesAccess, extractTenant } from '../../src/middleware/policy';
import { ReturnsService } from '../services/returnsService';

const returnsRouter = express.Router();

// Return creation schema - updated to use sale_line_id instead of unit_cost
const CreateReturnSchema = z.object({
  original_receipt_no: z.string().min(1).max(50),
  customer_id: z.number().int().positive().optional(),
  notes: z.string().optional(),
  lines: z.array(z.object({
    sale_line_id: z.number().int().positive(),
    product_id: z.number().int().positive(),
    quantity: z.number().positive(),
    reason: z.string().min(1).max(200)
  })).min(1)
});

// Generate return receipt number
function generateReturnReceiptNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `RET${year}${month}${day}${random}`;
}

// Get sale by receipt number
returnsRouter.get('/sale/:receiptNumber', 
  extractTenant,
  authenticateToken, 
  requirePolicy({ feature: 'sales.view', permission: 'sales.view' }),
  asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const receiptNumber = req.params.receiptNumber;
    
    // Use service to get sale data with original unit costs
    const sale = await ReturnsService.getOriginalSaleData(receiptNumber);
    
    res.json({
      success: true,
      sale,
      requestId: req.requestId
    });
    
  } catch (error: any) {
    requestLogger.error({ error: error.message }, 'Failed to get sale');
    res.status(500).json({
      success: false,
      error: 'Failed to get sale',
      message: error.message
    });
  }
}));

// Create return
returnsRouter.post('/', 
  extractTenant,
  authenticateToken, 
  requirePolicy({ feature: 'sales.return', permission: 'sales.return' }),
  asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    // Validate request body
    const validationResult = CreateReturnSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.errors
      });
    }

    const data = validationResult.data;
    
    // Use service to process return with original unit costs
    const result = await ReturnsService.processReturn(data, req.user?.id || 1);
    
    requestLogger.info({ 
      returnId: result.return_id, 
      returnReceiptNo: result.return_receipt_no, 
      totalValue: result.total_value,
      linesProcessed: result.lines_processed 
    }, 'Return processed successfully with original costs');
    
    res.status(201).json({
      success: true,
      return_id: result.return_id,
      return_receipt_no: result.return_receipt_no,
      total_value: result.total_value,
      lines_processed: result.lines_processed,
      message: 'Return processed successfully with original unit costs preserved'
    });
    
  } catch (error: any) {
    requestLogger.error({ error: error.message }, 'Failed to process return');
    res.status(500).json({
      success: false,
      error: 'Failed to process return',
      message: error.message
    });
  }
}));

// Get returns list
returnsRouter.get('/', 
  extractTenant,
  authenticateToken, 
  requirePolicy({ feature: 'sales.view', permission: 'sales.view' }),
  asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const db = getDatabase();
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);
    const offset = (page - 1) * pageSize;
    
    // Get returns list
    const returns = db.prepare(`
      SELECT 
        r.id, r.return_receipt_no, r.original_receipt_no, r.total_value,
        r.notes, r.created_at, c.customer_name, u.username as cashier_name
      FROM returns r
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN users u ON r.cashier_id = u.id
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `).all(pageSize, offset);
    
    // Get total count
    const totalResult = db.prepare(`
      SELECT COUNT(*) as total FROM returns
    `).get();
    const total = (totalResult as any).total;
    const totalPages = Math.ceil(total / pageSize);
    
    res.json({
      success: true,
      data: {
        items: returns
      },
      meta: {
        page,
        pageSize,
        total,
        pages: totalPages
      },
      requestId: req.requestId
    });
    
  } catch (error: any) {
    requestLogger.error({ error: error.message }, 'Failed to get returns list');
    res.status(500).json({
      success: false,
      error: 'Failed to get returns list',
      message: error.message
    });
  }
}));

// Get return details
returnsRouter.get('/:id', 
  extractTenant,
  authenticateToken, 
  requirePolicy({ feature: 'sales.view', permission: 'sales.view' }),
  asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const returnId = parseInt(req.params.id);
    if (isNaN(returnId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid return ID'
      });
    }
    
    // Use service to get return details with lot information
    const returnData = await ReturnsService.getReturnDetails(returnId);
    
    res.json({
      success: true,
      return: returnData,
      requestId: req.requestId
    });
    
  } catch (error: any) {
    requestLogger.error({ error: error.message }, 'Failed to get return details');
    res.status(500).json({
      success: false,
      error: 'Failed to get return details',
      message: error.message
    });
  }
}));

// TODO: Add policy protection to remaining return routes:
// - POST /api/returns/void - Void return (requires sales.void permission)
// - GET /api/returns/stats - Return statistics (requires reports.sales permission)
// - POST /api/returns/refund - Process refund (requires sales.return + payments.process permission)

export default returnsRouter;