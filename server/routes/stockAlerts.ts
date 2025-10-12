/**
 * Stock Alerts and Reorder Points API Routes
 * Provides endpoints for managing stock alerts, reorder points, and supplier integration
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error';
import { createRequestLogger } from '../utils/logger';
import { stockAlertsService } from '../services/stockAlertsService';
import { auditPerformance } from '../middleware/auditLogger';
import { z } from 'zod';

const router = Router();

// Validation schemas
const CreateAlertSchema = z.object({
  product_id: z.number().int().positive(),
  alert_type: z.enum(['LOW_STOCK', 'OUT_OF_STOCK', 'REORDER_POINT', 'EXPIRY_WARNING']),
  current_quantity: z.number().min(0),
  threshold_quantity: z.number().min(0),
  message: z.string().min(1),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional()
});

const SetReorderPointSchema = z.object({
  product_id: z.number().int().positive(),
  reorder_quantity: z.number().positive(),
  reorder_point: z.number().min(0),
  lead_time_days: z.number().int().min(1).optional(),
  supplier_id: z.number().int().positive().optional()
});

const CreateAlertRuleSchema = z.object({
  rule_name: z.string().min(1),
  alert_type: z.enum(['LOW_STOCK', 'OUT_OF_STOCK', 'REORDER_POINT', 'EXPIRY_WARNING']),
  condition_type: z.enum(['QUANTITY_LESS_THAN', 'QUANTITY_EQUALS', 'DAYS_TO_EXPIRY']),
  condition_value: z.number(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  applies_to_all_products: z.boolean().optional(),
  category_id: z.number().int().positive().optional()
});

// GET /api/stock-alerts - Get all active stock alerts
router.get('/api/stock-alerts',
  auditPerformance('STOCK_ALERTS_GET'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const alerts = stockAlertsService.getActiveAlerts();
      
      requestLogger.info({ count: alerts.length }, 'Stock alerts retrieved');
      
      res.json({
        ok: true,
        alerts,
        count: alerts.length,
        requestId: req.requestId
      });

    } catch (error: any) {
      requestLogger.error('Failed to get stock alerts', { error: error.message });
      
      res.status(500).json({
        ok: false,
        message: 'Failed to get stock alerts',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

// POST /api/stock-alerts - Create a stock alert
router.post('/api/stock-alerts',
  auditPerformance('STOCK_ALERTS_CREATE'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const validatedData = CreateAlertSchema.parse(req.body);
      
      const alertId = stockAlertsService.createAlert(
        validatedData.product_id,
        validatedData.alert_type,
        validatedData.current_quantity,
        validatedData.threshold_quantity,
        validatedData.message,
        validatedData.priority || 'MEDIUM'
      );
      
      requestLogger.info({ alertId, ...validatedData }, 'Stock alert created');
      
      res.status(201).json({
        ok: true,
        message: 'Stock alert created successfully',
        alert_id: alertId,
        requestId: req.requestId
      });

    } catch (error: any) {
      if (error.name === 'ZodError') {
        requestLogger.warn('Invalid alert data', { error: error.errors });
        return res.status(400).json({
          ok: false,
          message: 'Invalid alert data',
          errors: error.errors,
          requestId: req.requestId
        });
      }
      
      requestLogger.error('Failed to create stock alert', { error: error.message });
      
      res.status(500).json({
        ok: false,
        message: 'Failed to create stock alert',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

// DELETE /api/stock-alerts/:id - Dismiss a stock alert
router.delete('/api/stock-alerts/:id',
  auditPerformance('STOCK_ALERTS_DISMISS'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const alertId = parseInt(req.params.id);
      const dismissedBy = req.body.dismissed_by || 'system';
      
      if (isNaN(alertId)) {
        return res.status(400).json({
          ok: false,
          message: 'Invalid alert ID',
          requestId: req.requestId
        });
      }
      
      const success = stockAlertsService.dismissAlert(alertId, dismissedBy);
      
      if (success) {
        requestLogger.info({ alertId, dismissedBy }, 'Stock alert dismissed');
        
        res.json({
          ok: true,
          message: 'Stock alert dismissed successfully',
          requestId: req.requestId
        });
      } else {
        res.status(404).json({
          ok: false,
          message: 'Alert not found or already dismissed',
          requestId: req.requestId
        });
      }

    } catch (error: any) {
      requestLogger.error('Failed to dismiss stock alert', { error: error.message });
      
      res.status(500).json({
        ok: false,
        message: 'Failed to dismiss stock alert',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

// GET /api/reorder-points - Get reorder recommendations
router.get('/api/reorder-points',
  auditPerformance('REORDER_POINTS_GET'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const recommendations = stockAlertsService.getReorderRecommendations();
      
      requestLogger.info({ count: recommendations.length }, 'Reorder recommendations retrieved');
      
      res.json({
        ok: true,
        recommendations,
        count: recommendations.length,
        requestId: req.requestId
      });

    } catch (error: any) {
      requestLogger.error('Failed to get reorder recommendations', { error: error.message });
      
      res.status(500).json({
        ok: false,
        message: 'Failed to get reorder recommendations',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

// POST /api/reorder-points - Set reorder point for a product
router.post('/api/reorder-points',
  auditPerformance('REORDER_POINTS_SET'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const validatedData = SetReorderPointSchema.parse(req.body);
      
      const reorderPointId = stockAlertsService.setReorderPoint(
        validatedData.product_id,
        validatedData.reorder_quantity,
        validatedData.reorder_point,
        validatedData.lead_time_days || 7,
        validatedData.supplier_id
      );
      
      requestLogger.info({ reorderPointId, ...validatedData }, 'Reorder point set');
      
      res.status(201).json({
        ok: true,
        message: 'Reorder point set successfully',
        reorder_point_id: reorderPointId,
        requestId: req.requestId
      });

    } catch (error: any) {
      if (error.name === 'ZodError') {
        requestLogger.warn('Invalid reorder point data', { error: error.errors });
        return res.status(400).json({
          ok: false,
          message: 'Invalid reorder point data',
          errors: error.errors,
          requestId: req.requestId
        });
      }
      
      requestLogger.error('Failed to set reorder point', { error: error.message });
      
      res.status(500).json({
        ok: false,
        message: 'Failed to set reorder point',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

// GET /api/alert-rules - Get alert rules
router.get('/api/alert-rules',
  auditPerformance('ALERT_RULES_GET'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const rules = stockAlertsService.getAlertRules();
      
      requestLogger.info({ count: rules.length }, 'Alert rules retrieved');
      
      res.json({
        ok: true,
        rules,
        count: rules.length,
        requestId: req.requestId
      });

    } catch (error: any) {
      requestLogger.error('Failed to get alert rules', { error: error.message });
      
      res.status(500).json({
        ok: false,
        message: 'Failed to get alert rules',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

// POST /api/alert-rules - Create alert rule
router.post('/api/alert-rules',
  auditPerformance('ALERT_RULES_CREATE'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const validatedData = CreateAlertRuleSchema.parse(req.body);
      
      const ruleId = stockAlertsService.createAlertRule(
        validatedData.rule_name,
        validatedData.alert_type,
        validatedData.condition_type,
        validatedData.condition_value,
        validatedData.priority || 'MEDIUM',
        validatedData.applies_to_all_products || true,
        validatedData.category_id
      );
      
      requestLogger.info({ ruleId, ...validatedData }, 'Alert rule created');
      
      res.status(201).json({
        ok: true,
        message: 'Alert rule created successfully',
        rule_id: ruleId,
        requestId: req.requestId
      });

    } catch (error: any) {
      if (error.name === 'ZodError') {
        requestLogger.warn('Invalid alert rule data', { error: error.errors });
        return res.status(400).json({
          ok: false,
          message: 'Invalid alert rule data',
          errors: error.errors,
          requestId: req.requestId
        });
      }
      
      requestLogger.error('Failed to create alert rule', { error: error.message });
      
      res.status(500).json({
        ok: false,
        message: 'Failed to create alert rule',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

// POST /api/stock-alerts/check - Check and create alerts based on current stock
router.post('/api/stock-alerts/check',
  auditPerformance('STOCK_ALERTS_CHECK'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const alertsCreated = stockAlertsService.checkAndCreateAlerts();
      
      requestLogger.info({ alertsCreated }, 'Stock alerts check completed');
      
      res.json({
        ok: true,
        message: 'Stock alerts check completed',
        alerts_created: alertsCreated,
        requestId: req.requestId
      });

    } catch (error: any) {
      requestLogger.error('Failed to check stock alerts', { error: error.message });
      
      res.status(500).json({
        ok: false,
        message: 'Failed to check stock alerts',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

// GET /api/supplier-performance - Get supplier performance data
router.get('/api/supplier-performance',
  auditPerformance('SUPPLIER_PERFORMANCE_GET'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const { supplier_id } = req.query;
      const supplierId = supplier_id ? parseInt(supplier_id as string) : undefined;
      
      if (supplierId && isNaN(supplierId)) {
        return res.status(400).json({
          ok: false,
          message: 'Invalid supplier ID',
          requestId: req.requestId
        });
      }
      
      const performance = stockAlertsService.getSupplierPerformance(supplierId);
      
      requestLogger.info({ count: performance.length, supplierId }, 'Supplier performance retrieved');
      
      res.json({
        ok: true,
        performance,
        count: performance.length,
        requestId: req.requestId
      });

    } catch (error: any) {
      requestLogger.error('Failed to get supplier performance', { error: error.message });
      
      res.status(500).json({
        ok: false,
        message: 'Failed to get supplier performance',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

export default router;
