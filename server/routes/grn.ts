/**
 * GRN (Goods Received Note) Routes
 * Handles GRN creation and stock movement updates
 */

import express from 'express';
import { z } from 'zod';
import { getDatabase } from '../db/database';
import { createRequestLogger } from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticateToken, requireRole } from '../middleware/auth';
import { requirePolicy, requireInventoryAccess, extractTenant } from '../../src/middleware/policy';
import { valuationEngine } from '../services/valuationEngine';
import { uomService } from '../services/uomService';

const grnRouter = express.Router();

// GRN creation schema
const CreateGRNSchema = z.object({
  supplier_id: z.number().int().positive(),
  invoice_number: z.string().min(1).max(100),
  grn_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
  lines: z.array(z.object({
    product_id: z.number().int().positive(),
    quantity: z.number().positive(),
    unit_cost: z.number().positive(),
    total_cost: z.number().positive(),
    received_unit: z.string().optional().default('pc'),
    received_quantity: z.number().positive().optional()
  })).min(1)
});

// Generate GRN number
function generateGRNNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `GRN${year}${month}${day}${random}`;
}

// Create GRN
grnRouter.post('/', 
  extractTenant,
  authenticateToken, 
  requirePolicy({ feature: 'inventory.receive', permission: 'inventory.receive' }),
  asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    // Validate request body
    const validationResult = CreateGRNSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.errors
      });
    }

    const data = validationResult.data;
    const db = getDatabase();
    
    // Start transaction
    db.exec('BEGIN TRANSACTION');
    
    try {
      // Generate GRN number
      const grnNumber = generateGRNNumber();
      
      // Create GRN header
      const grnHeader = db.prepare(`
        INSERT INTO grn_headers (
          grn_number, supplier_id, grn_date, received_by, status,
          total_quantity, total_value, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);
      
      const totalQuantity = data.lines.reduce((sum, line) => sum + line.quantity, 0);
      const totalValue = data.lines.reduce((sum, line) => sum + line.total_cost, 0);
      
      const grnResult = grnHeader.run(
        grnNumber,
        data.supplier_id,
        data.grn_date,
        req.user?.id || 1,
        'completed',
        totalQuantity,
        totalValue,
        data.notes || null
      );
      
      const grnId = grnResult.lastInsertRowid;
      requestLogger.info({ grnId, grnNumber }, 'GRN header created');
      
      // Check for backdated GRN and cost freeze implications
      const grnDate = new Date(data.grn_date);
      const currentDate = new Date();
      const isBackdated = grnDate < currentDate;
      
      let backdatedWarnings: string[] = [];
      let costFreezeApplied = false;
      
      if (isBackdated) {
        requestLogger.warn({ grnDate: data.grn_date, currentDate: currentDate.toISOString() }, 'Backdated GRN detected');
        
        // Check each product for historical COGS impact
        for (const line of data.lines) {
          const wouldAffectHistorical = await valuationEngine.wouldAffectHistoricalCOGS(line.product_id, data.grn_date);
          if (wouldAffectHistorical) {
            backdatedWarnings.push(`Product ${line.product_id} has sales after GRN date - historical COGS will not be recalculated`);
          }
          
          // Check if cost should be frozen
          const isFrozen = await valuationEngine.isCostFrozen(line.product_id, data.grn_date);
          if (isFrozen) {
            costFreezeApplied = true;
            backdatedWarnings.push(`Product ${line.product_id} cost is frozen - only future consumption will be affected`);
          }
        }
      }

      // Create GRN lines and stock movements
      const insertGRNLine = db.prepare(`
        INSERT INTO grn_lines (
          grn_id, product_id, quantity_received, unit_cost, total_cost,
          received_unit, received_quantity, conversion_multiplier,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);
      
      const insertStockMovement = db.prepare(`
        INSERT INTO stock_movements (
          product_id, movement_type, reference_id, reference_type,
          quantity, unit_cost, total_cost, balance_after, notes, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      
      const insertStockLot = db.prepare(`
        INSERT INTO stock_lots (
          product_id, lot_number, quantity_received, quantity_remaining,
          unit_cost_cents, received_date, expiry_date, supplier_id, grn_id, version,
          received_unit, received_quantity, conversion_multiplier
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
      `);
      
      const updateProductStock = db.prepare(`
        INSERT OR REPLACE INTO product_stock (
          product_id, current_quantity, available_quantity, total_value, average_cost,
          last_movement_date, updated_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);
      
      const getCurrentStock = db.prepare(`
        SELECT current_quantity, total_value, average_cost 
        FROM product_stock WHERE product_id = ?
      `);
      
      for (const line of data.lines) {
        // Handle UOM conversion
        const receivedUnit = line.received_unit || 'pc';
        const receivedQuantity = line.received_quantity || line.quantity;
        
        // Convert to base unit
        const conversionResult = uomService.convertToBase(
          line.product_id, 
          receivedQuantity, 
          receivedUnit
        );
        
        const baseQuantity = conversionResult.baseQuantity;
        const conversionMultiplier = conversionResult.conversionUsed?.multiplier || 1.0;
        
        // Insert GRN line with UOM data
        insertGRNLine.run(
          grnId,
          line.product_id,
          baseQuantity, // Store normalized quantity
          line.unit_cost,
          line.total_cost,
          receivedUnit,
          receivedQuantity,
          conversionMultiplier
        );
        
        // Create stock lot for this GRN line
        const lotNumber = `GRN-${grnNumber}-${line.product_id}`;
        const unitCostCents = Math.round(line.unit_cost * 100);
        
        insertStockLot.run(
          line.product_id,
          lotNumber,
          baseQuantity, // Store normalized quantity
          baseQuantity, // Initially all quantity is remaining
          unitCostCents,
          data.grn_date,
          null, // No expiry date for now
          data.supplier_id,
          grnId,
          receivedUnit,
          receivedQuantity,
          conversionMultiplier
        );
        
        // Get current stock for this product
        const currentStock = getCurrentStock.get(line.product_id) || {
          current_quantity: 0,
          total_value: 0,
          average_cost: 0
        };
        
        // Calculate new stock levels
        const newQuantity = (currentStock as any).current_quantity + line.quantity;
        const newTotalValue = (currentStock as any).total_value + line.total_cost;
        const newAverageCost = newQuantity > 0 ? newTotalValue / newQuantity : 0;
        
        // Insert stock movement
        insertStockMovement.run(
          line.product_id,
          'purchase',
          grnId,
          'grn',
          line.quantity,
          line.unit_cost,
          line.total_cost,
          newQuantity,
          `GRN ${grnNumber}`,
          req.user?.id || 1
        );
        
        // Update product stock
        updateProductStock.run(
          line.product_id,
          newQuantity,
          newQuantity, // available = current for now
          newTotalValue,
          newAverageCost
        );
        
        requestLogger.info({
          productId: line.product_id,
          quantity: line.quantity,
          unitCost: line.unit_cost,
          newQuantity,
          newAverageCost
        }, 'Stock updated for product');
      }
      
      // Commit transaction
      db.exec('COMMIT');
      
      requestLogger.info({ 
        grnId, 
        grnNumber, 
        totalQuantity, 
        totalValue, 
        isBackdated, 
        costFreezeApplied,
        warnings: backdatedWarnings.length 
      }, 'GRN created successfully');
      
      const response: any = {
        success: true,
        grn_id: grnId,
        grn_number: grnNumber,
        total_quantity: totalQuantity,
        total_value: totalValue,
        message: 'GRN created successfully'
      };
      
      // Add backdated warnings if any
      if (backdatedWarnings.length > 0) {
        response.warnings = backdatedWarnings;
        response.is_backdated = isBackdated;
        response.cost_freeze_applied = costFreezeApplied;
        response.message += ' (Backdated GRN - see warnings)';
      }
      
      res.status(201).json(response);
      
    } catch (error) {
      // Rollback transaction on error
      db.exec('ROLLBACK');
      throw error;
    }
    
  } catch (error: any) {
    requestLogger.error({ error: error.message }, 'Failed to create GRN');
    res.status(500).json({
      success: false,
      error: 'Failed to create GRN',
      message: error.message
    });
  }
}));

// Get GRN list
grnRouter.get('/', 
  extractTenant,
  authenticateToken, 
  requirePolicy({ feature: 'inventory.view', permission: 'inventory.view' }),
  asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const db = getDatabase();
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);
    const offset = (page - 1) * pageSize;
    
    // Get GRN list with supplier info
    const grns = db.prepare(`
      SELECT 
        gh.id, gh.grn_number, gh.grn_date, gh.status,
        gh.total_quantity, gh.total_value, gh.notes,
        s.supplier_name, u.username as received_by,
        gh.created_at, gh.updated_at
      FROM grn_headers gh
      LEFT JOIN suppliers s ON gh.supplier_id = s.id
      LEFT JOIN users u ON gh.received_by = u.id
      ORDER BY gh.created_at DESC
      LIMIT ? OFFSET ?
    `).all(pageSize, offset);
    
    // Get total count
    const totalResult = db.prepare(`
      SELECT COUNT(*) as total FROM grn_headers
    `).get();
    const total = (totalResult as any).total;
    const totalPages = Math.ceil(total / pageSize);
    
    res.json({
      success: true,
      data: {
        items: grns
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
    requestLogger.error({ error: error.message }, 'Failed to get GRN list');
    res.status(500).json({
      success: false,
      error: 'Failed to get GRN list',
      message: error.message
    });
  }
}));

// Get GRN details
grnRouter.get('/:id', 
  extractTenant,
  authenticateToken, 
  requirePolicy({ feature: 'inventory.view', permission: 'inventory.view' }),
  asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const grnId = parseInt(req.params.id);
    if (isNaN(grnId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid GRN ID'
      });
    }
    
    const db = getDatabase();
    
    // Get GRN header
    const grn = db.prepare(`
      SELECT 
        gh.*, s.supplier_name, u.username as received_by
      FROM grn_headers gh
      LEFT JOIN suppliers s ON gh.supplier_id = s.id
      LEFT JOIN users u ON gh.received_by = u.id
      WHERE gh.id = ?
    `).get(grnId);
    
    if (!grn) {
      return res.status(404).json({
        success: false,
        error: 'GRN not found'
      });
    }
    
    // Get GRN lines
    const lines = db.prepare(`
      SELECT 
        gl.*, p.name_en as product_name, p.sku
      FROM grn_lines gl
      LEFT JOIN products p ON gl.product_id = p.id
      WHERE gl.grn_id = ?
      ORDER BY gl.id
    `).all(grnId);
    
    res.json({
      success: true,
      grn: {
        ...grn,
        lines
      },
      requestId: req.requestId
    });
    
  } catch (error: any) {
    requestLogger.error({ error: error.message }, 'Failed to get GRN details');
    res.status(500).json({
      success: false,
      error: 'Failed to get GRN details',
      message: error.message
    });
  }
}));

// Get cost freeze status for a product
grnRouter.get('/cost-freeze-status/:productId', 
  extractTenant,
  authenticateToken, 
  requirePolicy({ feature: 'inventory.view', permission: 'inventory.view' }),
  asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const productId = parseInt(req.params.productId);
    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID'
      });
    }
    
    const freezeStatus = await valuationEngine.getCostFreezeStatus(productId);
    const freezeDays = await valuationEngine.getCostFreezeDays();
    
    if (!freezeStatus) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        ...freezeStatus,
        freezeDays,
        isFrozen: freezeStatus.freezeStatus === 'FROZEN'
      }
    });
    
  } catch (error: any) {
    requestLogger.error({ error: error.message }, 'Failed to get cost freeze status');
    res.status(500).json({
      success: false,
      error: 'Failed to get cost freeze status',
      message: error.message
    });
  }
}));

// Freeze cost for a product
grnRouter.post('/freeze-cost/:productId', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const productId = parseInt(req.params.productId);
    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID'
      });
    }
    
    const { freezeDate } = req.body;
    if (!freezeDate) {
      return res.status(400).json({
        success: false,
        error: 'Freeze date is required'
      });
    }
    
    await valuationEngine.freezeCost(productId, freezeDate);
    
    requestLogger.info({ productId, freezeDate }, 'Cost frozen for product');
    
    res.json({
      success: true,
      message: 'Cost frozen successfully',
      productId,
      freezeDate
    });
    
  } catch (error: any) {
    requestLogger.error({ error: error.message }, 'Failed to freeze cost');
    res.status(500).json({
      success: false,
      error: 'Failed to freeze cost',
      message: error.message
    });
  }
}));

// Get UOM conversions for a product
grnRouter.get('/uom-conversions/:productId', authenticateToken, asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const productId = parseInt(req.params.productId);
    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID'
      });
    }
    
    const conversions = uomService.getConversionsForProduct(productId);
    const baseUnit = uomService.getBaseUnit(productId);
    const alternativeUnits = uomService.getAlternativeUnits(productId);
    
    res.json({
      success: true,
      data: {
        productId,
        baseUnit,
        conversions,
        alternativeUnits
      }
    });
    
  } catch (error: any) {
    requestLogger.error({ error: error.message }, 'Failed to get UOM conversions');
    res.status(500).json({
      success: false,
      error: 'Failed to get UOM conversions',
      message: error.message
    });
  }
}));

// Get all UOM conversions with product details
grnRouter.get('/uom-conversions', authenticateToken, requireRole('manager', 'admin'), asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const conversions = uomService.getAllConversionsWithDetails();
    
    res.json({
      success: true,
      data: conversions
    });
    
  } catch (error: any) {
    requestLogger.error({ error: error.message }, 'Failed to get all UOM conversions');
    res.status(500).json({
      success: false,
      error: 'Failed to get UOM conversions',
      message: error.message
    });
  }
}));

// Create UOM conversion
grnRouter.post('/uom-conversions', authenticateToken, requireRole('manager', 'admin'), asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const { productId, baseUnit, altUnit, multiplier } = req.body;
    
    if (!productId || !baseUnit || !altUnit || !multiplier) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: productId, baseUnit, altUnit, multiplier'
      });
    }
    
    // Validate conversion data
    const validation = uomService.validateConversion(productId, baseUnit, altUnit, multiplier);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversion data',
        details: validation.errors
      });
    }
    
    const conversion = uomService.createConversion(productId, baseUnit, altUnit, multiplier);
    
    requestLogger.info({ conversionId: conversion.id, productId, baseUnit, altUnit, multiplier }, 'Created UOM conversion');
    
    res.status(201).json({
      success: true,
      data: conversion,
      message: 'UOM conversion created successfully'
    });
    
  } catch (error: any) {
    requestLogger.error({ error: error.message }, 'Failed to create UOM conversion');
    res.status(500).json({
      success: false,
      error: 'Failed to create UOM conversion',
      message: error.message
    });
  }
}));

// Update UOM conversion
grnRouter.put('/uom-conversions/:conversionId', authenticateToken, requireRole('manager', 'admin'), asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const conversionId = parseInt(req.params.conversionId);
    if (isNaN(conversionId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversion ID'
      });
    }
    
    const { baseUnit, altUnit, multiplier } = req.body;
    
    if (!baseUnit || !altUnit || !multiplier) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: baseUnit, altUnit, multiplier'
      });
    }
    
    const success = uomService.updateConversion(conversionId, baseUnit, altUnit, multiplier);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'UOM conversion not found'
      });
    }
    
    requestLogger.info({ conversionId, baseUnit, altUnit, multiplier }, 'Updated UOM conversion');
    
    res.json({
      success: true,
      message: 'UOM conversion updated successfully'
    });
    
  } catch (error: any) {
    requestLogger.error({ error: error.message }, 'Failed to update UOM conversion');
    res.status(500).json({
      success: false,
      error: 'Failed to update UOM conversion',
      message: error.message
    });
  }
}));

// Deactivate UOM conversion
grnRouter.delete('/uom-conversions/:conversionId', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const conversionId = parseInt(req.params.conversionId);
    if (isNaN(conversionId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversion ID'
      });
    }
    
    const success = uomService.deactivateConversion(conversionId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'UOM conversion not found'
      });
    }
    
    requestLogger.info({ conversionId }, 'Deactivated UOM conversion');
    
    res.json({
      success: true,
      message: 'UOM conversion deactivated successfully'
    });
    
  } catch (error: any) {
    requestLogger.error({ error: error.message }, 'Failed to deactivate UOM conversion');
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate UOM conversion',
      message: error.message
    });
  }
}));

// Get UOM conversion suggestions for a product
grnRouter.get('/uom-conversions/:productId/suggestions', authenticateToken, asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const productId = parseInt(req.params.productId);
    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID'
      });
    }
    
    const suggestions = uomService.getConversionSuggestions(productId);
    
    res.json({
      success: true,
      data: {
        productId,
        suggestions
      }
    });
    
  } catch (error: any) {
    requestLogger.error({ error: error.message }, 'Failed to get UOM conversion suggestions');
    res.status(500).json({
      success: false,
      error: 'Failed to get UOM conversion suggestions',
      message: error.message
    });
  }
}));

// TODO: Add policy protection to remaining GRN routes:
// - POST /api/grn/freeze-cost/:productId - Freeze product cost (requires inventory.pricing.manage permission)
// - GET /api/grn/uom-conversions - List UOM conversions (requires inventory.view permission)
// - POST /api/grn/uom-conversions - Create UOM conversion (requires inventory.pricing.manage permission)
// - PUT /api/grn/uom-conversions/:conversionId - Update UOM conversion (requires inventory.pricing.manage permission)
// - DELETE /api/grn/uom-conversions/:conversionId - Delete UOM conversion (requires inventory.pricing.manage permission)
// - GET /api/grn/uom-conversions/:productId/suggestions - UOM suggestions (requires inventory.view permission)

export default grnRouter;
