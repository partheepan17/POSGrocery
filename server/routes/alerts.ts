/**
 * Alerts Route - Low stock alert management
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error';
import { createContextLogger } from '../utils/logger';
import { createStandardError, ERROR_CODES } from '../utils/errorCodes';
import { auditPerformance } from '../middleware/auditLogger';
import { authenticateToken, requireRole } from '../middleware/auth';
import { lowStockAlertService } from '../alerts/lowStock';
import { schedulerService } from '../scheduler';

const router = Router();

// Request validation schemas
const TestAlertSchema = z.object({
  channels: z.array(z.enum(['slack', 'telegram', 'email'])).optional()
});

const ThresholdUpdateSchema = z.object({
  threshold: z.number().min(0).max(10000)
});

// GET /api/alerts/low-stock - Get current low stock products
router.get('/api/alerts/low-stock',
  authenticateToken,
  requireRole(['admin', 'manager']),
  auditPerformance('alerts_low_stock'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'alerts_low_stock', requestId: req.requestId });
    
    try {
      const threshold = parseInt(req.query.threshold as string) || undefined;
      const products = await lowStockAlertService.getLowStockProducts(threshold);
      
      requestLogger.info({ 
        threshold, 
        productCount: products.length 
      }, 'Low stock products retrieved');
      
      res.json({
        ok: true,
        data: {
          products,
          threshold: threshold || parseInt(process.env.ALERTS_LOW_STOCK_THRESHOLD || '10'),
          totalCount: products.length
        },
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to get low stock products', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Failed to get low stock products',
        ERROR_CODES.DATABASE_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

// POST /api/alerts/test - Test alert configuration
router.post('/api/alerts/test',
  authenticateToken,
  requireRole(['admin']),
  auditPerformance('alerts_test'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'alerts_test', requestId: req.requestId });
    
    try {
      // Validate request body
      const validationResult = TestAlertSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json(createStandardError(
          'Invalid test alert parameters',
          ERROR_CODES.INVALID_INPUT,
          { errors: validationResult.error.errors },
          req.requestId
        ));
        return;
      }
      
      const { channels } = validationResult.data;
      
      requestLogger.info({ channels }, 'Testing alert configuration');
      
      // Send test alert
      await lowStockAlertService.testAlert();
      
      requestLogger.info('Test alert sent successfully');
      
      res.json({
        ok: true,
        data: { message: 'Test alert sent successfully' },
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to send test alert', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Failed to send test alert',
        ERROR_CODES.INTERNAL_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

// POST /api/alerts/check - Manually trigger low stock check
router.post('/api/alerts/check',
  authenticateToken,
  requireRole(['admin', 'manager']),
  auditPerformance('alerts_check'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'alerts_check', requestId: req.requestId });
    
    try {
      requestLogger.info('Manually triggering low stock check');
      
      // Run low stock check
      await lowStockAlertService.checkAndAlert();
      
      requestLogger.info('Low stock check completed successfully');
      
      res.json({
        ok: true,
        data: { message: 'Low stock check completed successfully' },
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to run low stock check', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Failed to run low stock check',
        ERROR_CODES.INTERNAL_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

// PUT /api/alerts/threshold - Update low stock threshold
router.put('/api/alerts/threshold',
  authenticateToken,
  requireRole(['admin']),
  auditPerformance('alerts_threshold_update'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'alerts_threshold_update', requestId: req.requestId });
    
    try {
      // Validate request body
      const validationResult = ThresholdUpdateSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json(createStandardError(
          'Invalid threshold value',
          ERROR_CODES.INVALID_INPUT,
          { errors: validationResult.error.errors },
          req.requestId
        ));
        return;
      }
      
      const { threshold } = validationResult.data;
      
      // Update environment variable (in production, this should be stored in database)
      process.env.ALERTS_LOW_STOCK_THRESHOLD = threshold.toString();
      
      requestLogger.info({ threshold }, 'Low stock threshold updated');
      
      res.json({
        ok: true,
        data: { 
          message: 'Threshold updated successfully',
          threshold 
        },
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to update threshold', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Failed to update threshold',
        ERROR_CODES.INTERNAL_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

// GET /api/alerts/status - Get alert system status
router.get('/api/alerts/status',
  authenticateToken,
  requireRole(['admin', 'manager']),
  auditPerformance('alerts_status'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'alerts_status', requestId: req.requestId });
    
    try {
      const jobsStatus = schedulerService.getAllJobsStatus();
      const config = {
        low_stock_threshold: parseInt(process.env.ALERTS_LOW_STOCK_THRESHOLD || '10'),
        channels: {
          slack: {
            enabled: process.env.ALERTS_SLACK_ENABLED === 'true',
            configured: !!process.env.ALERTS_SLACK_WEBHOOK_URL
          },
          telegram: {
            enabled: process.env.ALERTS_TELEGRAM_ENABLED === 'true',
            configured: !!(process.env.ALERTS_TELEGRAM_BOT_TOKEN && process.env.ALERTS_TELEGRAM_CHAT_ID)
          },
          email: {
            enabled: process.env.ALERTS_EMAIL_ENABLED === 'true',
            configured: !!(process.env.ALERTS_EMAIL_SMTP_HOST && process.env.ALERTS_EMAIL_TO)
          }
        }
      };
      
      requestLogger.info('Alert system status retrieved');
      
      res.json({
        ok: true,
        data: {
          config,
          jobs: jobsStatus,
          system: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            nodeVersion: process.version
          }
        },
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to get alert status', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Failed to get alert status',
        ERROR_CODES.INTERNAL_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

// POST /api/alerts/jobs/:jobName/run - Run a specific job immediately
router.post('/api/alerts/jobs/:jobName/run',
  authenticateToken,
  requireRole(['admin']),
  auditPerformance('alerts_job_run'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'alerts_job_run', requestId: req.requestId });
    
    try {
      const { jobName } = req.params;
      
      requestLogger.info({ jobName }, 'Running job immediately');
      
      const success = await schedulerService.runJobNow(jobName);
      
      if (success) {
        requestLogger.info({ jobName }, 'Job completed successfully');
        
        res.json({
          ok: true,
          data: { 
            message: `Job ${jobName} completed successfully`,
            jobName 
          },
          requestId: req.requestId
        });
      } else {
        res.status(400).json(createStandardError(
          `Job ${jobName} not found or failed`,
          ERROR_CODES.NOT_FOUND,
          { jobName },
          req.requestId
        ));
      }
      
    } catch (error: any) {
      requestLogger.error('Failed to run job', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Failed to run job',
        ERROR_CODES.INTERNAL_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

export { router as alertsRouter };










