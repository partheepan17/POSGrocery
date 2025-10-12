/**
 * Metrics API Routes
 * Provides system metrics and observability endpoints
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error';
import { createContextLogger } from '../utils/logger';
import { metricsCollector } from '../middleware/metricsCollector';

const router = Router();

// GET /api/metrics - Get system metrics
router.get('/api/metrics',
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'metrics_get' });
    
    try {
      const systemMetrics = metricsCollector.getSystemMetrics();
      const databaseMetrics = metricsCollector.getDatabaseMetrics();
      const performanceMetrics = metricsCollector.getPerformanceMetrics();
      
      const metrics = {
        timestamp: new Date().toISOString(),
        system: systemMetrics,
        database: databaseMetrics,
        performance: performanceMetrics
      };
      
      requestLogger.info('Metrics retrieved successfully', {
        totalRequests: systemMetrics.totalRequests,
        errorRate: systemMetrics.errorRate,
        averageResponseTime: systemMetrics.averageResponseTime
      });
      
      res.json({
        ok: true,
        metrics,
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to get metrics', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json({
        ok: false,
        message: 'Failed to get metrics',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

// GET /api/metrics/system - Get system metrics only
router.get('/api/metrics/system',
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'metrics_system' });
    
    try {
      const systemMetrics = metricsCollector.getSystemMetrics();
      
      requestLogger.info('System metrics retrieved successfully');
      
      res.json({
        ok: true,
        metrics: systemMetrics,
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to get system metrics', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json({
        ok: false,
        message: 'Failed to get system metrics',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

// GET /api/metrics/database - Get database metrics only
router.get('/api/metrics/database',
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'metrics_database' });
    
    try {
      const databaseMetrics = metricsCollector.getDatabaseMetrics();
      
      requestLogger.info('Database metrics retrieved successfully');
      
      res.json({
        ok: true,
        metrics: databaseMetrics,
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to get database metrics', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json({
        ok: false,
        message: 'Failed to get database metrics',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

// GET /api/metrics/performance - Get performance metrics only
router.get('/api/metrics/performance',
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'metrics_performance' });
    
    try {
      const performanceMetrics = metricsCollector.getPerformanceMetrics();
      
      requestLogger.info('Performance metrics retrieved successfully');
      
      res.json({
        ok: true,
        metrics: performanceMetrics,
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to get performance metrics', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json({
        ok: false,
        message: 'Failed to get performance metrics',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

// POST /api/metrics/clear - Clear metrics (admin only)
router.post('/api/metrics/clear',
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'metrics_clear' });
    
    try {
      metricsCollector.clearMetrics();
      
      requestLogger.info('Metrics cleared successfully');
      
      res.json({
        ok: true,
        message: 'Metrics cleared successfully',
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to clear metrics', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json({
        ok: false,
        message: 'Failed to clear metrics',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

export default router;