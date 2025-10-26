/**
 * Inventory Recount Route
 * Manual shadow recount and drift detection
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error';
import { createContextLogger } from '../utils/logger';
import { createStandardError, ERROR_CODES } from '../utils/errorCodes';
import { auditPerformance } from '../middleware/auditLogger';
import { authenticateToken, requireRole } from '../middleware/auth';
import { shadowRecountService } from '../jobs/recount';

const router = Router();

// Request validation schemas
const RecountRequestSchema = z.object({
  tolerance_threshold: z.number().min(0).max(1000).optional(),
  enable_alerts: z.boolean().optional(),
  alert_threshold: z.number().min(0).max(1000).optional(),
  include_inactive_products: z.boolean().optional(),
  max_products_per_batch: z.number().min(1).max(10000).optional()
});

const ProductRecountSchema = z.object({
  product_ids: z.array(z.number().positive()).min(1).max(100)
});

// POST /api/inventory/recount - Perform manual shadow recount
router.post('/api/inventory/recount',
  authenticateToken,
  requireRole(['admin']),
  auditPerformance('inventory_recount'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'inventory_recount', requestId: req.requestId });
    
    try {
      // Validate request body
      const validationResult = RecountRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json(createStandardError(
          'Invalid recount parameters',
          ERROR_CODES.INVALID_INPUT,
          { errors: validationResult.error.errors },
          req.requestId
        ));
        return;
      }
      
      const config = validationResult.data;
      
      requestLogger.info({ config }, 'Starting manual shadow recount');
      
      // Perform recount
      const report = await shadowRecountService.performRecount(config);
      
      requestLogger.info({ 
        totalProducts: report.summary.total_products,
        driftsFound: report.summary.products_with_drift,
        processingTime: report.summary.processing_time_ms
      }, 'Manual shadow recount completed');
      
      res.json({
        ok: true,
        data: report,
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Manual shadow recount failed', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Manual shadow recount failed',
        ERROR_CODES.INTERNAL_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

// POST /api/inventory/recount/products - Recount specific products
router.post('/api/inventory/recount/products',
  authenticateToken,
  requireRole(['admin', 'manager']),
  auditPerformance('inventory_recount_products'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'inventory_recount_products', requestId: req.requestId });
    
    try {
      // Validate request body
      const validationResult = ProductRecountSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json(createStandardError(
          'Invalid product recount parameters',
          ERROR_CODES.INVALID_INPUT,
          { errors: validationResult.error.errors },
          req.requestId
        ));
        return;
      }
      
      const { product_ids } = validationResult.data;
      
      requestLogger.info({ productCount: product_ids.length }, 'Starting product-specific recount');
      
      // Get products from database
      const { getDatabase } = await import('../db');
      const db = getDatabase();
      
      const products = db.prepare(`
        SELECT 
          p.id as product_id,
          p.sku,
          p.name_en,
          p.name_si,
          p.name_ta,
          p.unit,
          c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id IN (${product_ids.map(() => '?').join(',')})
      `).all(...product_ids) as Array<{
        product_id: number;
        sku: string;
        name_en: string;
        name_si?: string;
        name_ta?: string;
        unit: string;
        category_name?: string;
      }>;

      if (products.length === 0) {
        res.status(404).json(createStandardError(
          'No products found',
          ERROR_CODES.NOT_FOUND,
          { product_ids },
          req.requestId
        ));
        return;
      }

      // Perform recount for specific products
      const config = { tolerance_threshold: 0 }; // No tolerance for specific products
      const drifts = [];
      
      for (const product of products) {
        const result = await shadowRecountService.recountProduct(product, config);
        if (result) {
          drifts.push(result);
        }
      }

      const report = {
        summary: {
          total_products: products.length,
          products_with_drift: drifts.length,
          total_drift_value: drifts.reduce((sum, drift) => sum + Math.abs(drift.difference), 0),
          tolerance_threshold: 0,
          recount_date: new Date().toISOString(),
          processing_time_ms: 0
        },
        drifts,
        adjustments: {
          total_adjustments: drifts.length,
          total_quantity_adjustment: drifts.reduce((sum, drift) => sum + drift.difference, 0),
          products_requiring_review: drifts.length
        },
        alerts: {
          high_drift_products: drifts,
          zero_stock_products: drifts.filter(d => d.computed_quantity === 0),
          negative_stock_products: drifts.filter(d => d.computed_quantity < 0)
        }
      };
      
      requestLogger.info({ 
        productsRequested: product_ids.length,
        productsFound: products.length,
        driftsFound: drifts.length
      }, 'Product-specific recount completed');
      
      res.json({
        ok: true,
        data: report,
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Product-specific recount failed', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Product-specific recount failed',
        ERROR_CODES.INTERNAL_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

// GET /api/inventory/recount/history - Get recount history
router.get('/api/inventory/recount/history',
  authenticateToken,
  requireRole(['admin', 'manager']),
  auditPerformance('inventory_recount_history'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'inventory_recount_history', requestId: req.requestId });
    
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      
      requestLogger.info({ limit }, 'Getting recount history');
      
      const history = await shadowRecountService.getRecountHistory(limit);
      
      res.json({
        ok: true,
        data: {
          history,
          limit,
          total: history.length
        },
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to get recount history', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Failed to get recount history',
        ERROR_CODES.INTERNAL_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

// GET /api/inventory/recount/config - Get recount configuration
router.get('/api/inventory/recount/config',
  authenticateToken,
  requireRole(['admin', 'manager']),
  auditPerformance('inventory_recount_config'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'inventory_recount_config', requestId: req.requestId });
    
    try {
      const config = {
        tolerance_threshold: parseInt(process.env.RECOUNT_TOLERANCE_THRESHOLD || '1'),
        enable_alerts: process.env.RECOUNT_ENABLE_ALERTS === 'true',
        alert_threshold: parseInt(process.env.RECOUNT_ALERT_THRESHOLD || '5'),
        include_inactive_products: process.env.RECOUNT_INCLUDE_INACTIVE === 'true',
        max_products_per_batch: parseInt(process.env.RECOUNT_BATCH_SIZE || '1000')
      };
      
      requestLogger.info('Recount configuration retrieved');
      
      res.json({
        ok: true,
        data: config,
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to get recount configuration', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Failed to get recount configuration',
        ERROR_CODES.INTERNAL_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

// PUT /api/inventory/recount/config - Update recount configuration
router.put('/api/inventory/recount/config',
  authenticateToken,
  requireRole(['admin']),
  auditPerformance('inventory_recount_config_update'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'inventory_recount_config_update', requestId: req.requestId });
    
    try {
      // Validate request body
      const validationResult = RecountRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json(createStandardError(
          'Invalid recount configuration',
          ERROR_CODES.INVALID_INPUT,
          { errors: validationResult.error.errors },
          req.requestId
        ));
        return;
      }
      
      const config = validationResult.data;
      
      // Update environment variables (in production, this should be stored in database)
      if (config.tolerance_threshold !== undefined) {
        process.env.RECOUNT_TOLERANCE_THRESHOLD = config.tolerance_threshold.toString();
      }
      if (config.enable_alerts !== undefined) {
        process.env.RECOUNT_ENABLE_ALERTS = config.enable_alerts.toString();
      }
      if (config.alert_threshold !== undefined) {
        process.env.RECOUNT_ALERT_THRESHOLD = config.alert_threshold.toString();
      }
      if (config.include_inactive_products !== undefined) {
        process.env.RECOUNT_INCLUDE_INACTIVE = config.include_inactive_products.toString();
      }
      if (config.max_products_per_batch !== undefined) {
        process.env.RECOUNT_BATCH_SIZE = config.max_products_per_batch.toString();
      }
      
      requestLogger.info({ config }, 'Recount configuration updated');
      
      res.json({
        ok: true,
        data: { 
          message: 'Configuration updated successfully',
          config 
        },
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to update recount configuration', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Failed to update recount configuration',
        ERROR_CODES.INTERNAL_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

export { router as inventoryRecountRouter };










