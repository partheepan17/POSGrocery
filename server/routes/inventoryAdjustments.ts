/**
 * Inventory Adjustments Routes
 * Handles inventory adjustments with proper RBAC guards
 */

import express from 'express';
import { z } from 'zod';
import { createRequestLogger } from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticateToken, requireManager } from '../middleware/auth';
import { InventoryAdjustmentService } from '../services/inventoryAdjustmentService';
import { getCurrentUTC, addTimezoneInfo } from '../utils/dateUtils';

const inventoryAdjustmentsRouter = express.Router();

// Adjustment creation schema
const CreateAdjustmentSchema = z.object({
  product_id: z.number().int().positive(),
  delta_qty: z.number().int(), // Can be negative for decreases
  reason: z.string().min(1).max(200),
  notes: z.string().max(500).optional()
});

// Get adjustments list
inventoryAdjustmentsRouter.get('/', authenticateToken, requireManager, asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);
    const productId = req.query.product_id ? parseInt(req.query.product_id as string) : undefined;
    
    const result = await InventoryAdjustmentService.getAdjustments(page, pageSize, productId);
    
    requestLogger.info({ 
      page, 
      pageSize, 
      productId,
      total: result.pagination.total 
    }, 'Retrieved inventory adjustments');
    
    res.json({
      success: true,
      data: {
        adjustments: result.adjustments,
        pagination: result.pagination
      },
      requestId: req.requestId
    });
    
  } catch (error: any) {
    requestLogger.error({ error: error.message }, 'Failed to get adjustments');
    res.status(500).json({
      success: false,
      error: 'Failed to get adjustments',
      message: error.message
    });
  }
}));

// Create adjustment
inventoryAdjustmentsRouter.post('/', authenticateToken, requireManager, asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    // Validate request body
    const validationResult = CreateAdjustmentSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.errors
      });
    }

    const data = validationResult.data;
    
    // Validate reason
    const reasonValidation = InventoryAdjustmentService.validateReason(data.reason);
    if (!reasonValidation.valid) {
      return res.status(400).json({
        success: false,
        error: reasonValidation.error
      });
    }
    
    // Create adjustment
    const adjustment: any = {
      product_id: data.product_id,
      delta_qty: data.delta_qty,
      reason: data.reason,
      notes: data.notes,
      created_by: req.user?.id || 1
    };
    
    const result = await InventoryAdjustmentService.createAdjustment(adjustment);
    
    requestLogger.info({
      adjustmentId: result.adjustment_id,
      productId: result.product_id,
      deltaQty: result.delta_qty,
      newQuantity: result.new_quantity,
      reason: result.reason,
      createdBy: req.user?.id
    }, 'Inventory adjustment created');
    
    res.status(201).json({
      success: true,
      data: result,
      message: 'Inventory adjustment created successfully'
    });
    
  } catch (error: any) {
    requestLogger.error({ error: error.message }, 'Failed to create adjustment');
    res.status(500).json({
      success: false,
      error: 'Failed to create adjustment',
      message: error.message
    });
  }
}));

// Get adjustment by ID
inventoryAdjustmentsRouter.get('/:id', authenticateToken, requireManager, asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const adjustmentId = parseInt(req.params.id);
    if (isNaN(adjustmentId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid adjustment ID'
      });
    }
    
    const adjustment = await InventoryAdjustmentService.getAdjustmentById(adjustmentId);
    
    if (!adjustment) {
      return res.status(404).json({
        success: false,
        error: 'Adjustment not found'
      });
    }
    
    requestLogger.info({ adjustmentId }, 'Retrieved adjustment details');
    
    res.json({
      success: true,
      data: adjustment,
      requestId: req.requestId
    });
    
  } catch (error: any) {
    requestLogger.error({ error: error.message }, 'Failed to get adjustment');
    res.status(500).json({
      success: false,
      error: 'Failed to get adjustment',
      message: error.message
    });
  }
}));

// Get product adjustment history
inventoryAdjustmentsRouter.get('/product/:productId/history', authenticateToken, requireManager, asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const productId = parseInt(req.params.productId);
    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID'
      });
    }
    
    const limit = parseInt(req.query.limit as string) || 50;
    const adjustments = await InventoryAdjustmentService.getProductAdjustmentHistory(productId, limit);
    
    requestLogger.info({ productId, limit, count: adjustments.length }, 'Retrieved product adjustment history');
    
    res.json({
      success: true,
      data: adjustments,
      requestId: req.requestId
    });
    
  } catch (error: any) {
    requestLogger.error({ error: error.message }, 'Failed to get product adjustment history');
    res.status(500).json({
      success: false,
      error: 'Failed to get product adjustment history',
      message: error.message
    });
  }
}));

// Get adjustment statistics
inventoryAdjustmentsRouter.get('/stats/summary', authenticateToken, requireManager, asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const days = parseInt(req.query.days as string) || 30;
    const stats = await InventoryAdjustmentService.getAdjustmentStats(days);
    
    requestLogger.info({ days, stats }, 'Retrieved adjustment statistics');
    
    res.json({
      success: true,
      data: stats,
      requestId: req.requestId
    });
    
  } catch (error: any) {
    requestLogger.error({ error: error.message }, 'Failed to get adjustment statistics');
    res.status(500).json({
      success: false,
      error: 'Failed to get adjustment statistics',
      message: error.message
    });
  }
}));

export default inventoryAdjustmentsRouter;
