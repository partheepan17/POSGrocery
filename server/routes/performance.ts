/**
 * Performance Monitoring API Routes
 * Provides system performance metrics and monitoring data
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error';
import { createRequestLogger } from '../utils/logger';
import { performanceMetrics } from '../utils/performanceMetrics';
import { auditPerformance } from '../middleware/auditLogger';

const router = Router();

// GET /api/performance/system - System-wide metrics
router.get('/api/performance/system',
  auditPerformance('PERFORMANCE_SYSTEM'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const metrics = performanceMetrics.getSystemMetrics();
      
      requestLogger.info('System performance metrics retrieved');
      
      res.json({
        ok: true,
        metrics,
        requestId: req.requestId
      });

    } catch (error: any) {
      requestLogger.error('Failed to get system metrics', { error: error.message });
      
      res.status(500).json({
        ok: false,
        message: 'Failed to get system metrics',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

// GET /api/performance/database - Database metrics
router.get('/api/performance/database',
  auditPerformance('PERFORMANCE_DATABASE'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const metrics = performanceMetrics.getDatabaseMetrics();
      
      requestLogger.info('Database performance metrics retrieved');
      
      res.json({
        ok: true,
        metrics,
        requestId: req.requestId
      });

    } catch (error: any) {
      requestLogger.error('Failed to get database metrics', { error: error.message });
      
      res.status(500).json({
        ok: false,
        message: 'Failed to get database metrics',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

// GET /api/performance/api - API endpoint metrics
router.get('/api/performance/api',
  auditPerformance('PERFORMANCE_API'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const metrics = performanceMetrics.getAPIMetrics();
      
      requestLogger.info('API performance metrics retrieved');
      
      res.json({
        ok: true,
        metrics,
        requestId: req.requestId
      });

    } catch (error: any) {
      requestLogger.error('Failed to get API metrics', { error: error.message });
      
      res.status(500).json({
        ok: false,
        message: 'Failed to get API metrics',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

// GET /api/performance/health - System health status
router.get('/api/performance/health',
  auditPerformance('PERFORMANCE_HEALTH'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const healthStatus = performanceMetrics.getHealthStatus();
      
      requestLogger.info('System health status retrieved', { status: healthStatus.status });
      
      res.json({
        ok: true,
        health: healthStatus,
        requestId: req.requestId
      });

    } catch (error: any) {
      requestLogger.error('Failed to get health status', { error: error.message });
      
      res.status(500).json({
        ok: false,
        message: 'Failed to get health status',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

// GET /api/performance/trends - Performance trends over time
router.get('/api/performance/trends',
  auditPerformance('PERFORMANCE_TRENDS'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const { hours = 24 } = req.query;
      const trends = performanceMetrics.getPerformanceTrends(Number(hours));
      
      requestLogger.info('Performance trends retrieved', { hours: Number(hours) });
      
      res.json({
        ok: true,
        trends,
        requestId: req.requestId
      });

    } catch (error: any) {
      requestLogger.error('Failed to get performance trends', { error: error.message });
      
      res.status(500).json({
        ok: false,
        message: 'Failed to get performance trends',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

// GET /api/performance/recent - Recent metrics
router.get('/api/performance/recent',
  auditPerformance('PERFORMANCE_RECENT'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const { minutes = 5 } = req.query;
      const metrics = performanceMetrics.getRecentMetrics(Number(minutes));
      
      requestLogger.info('Recent performance metrics retrieved', { minutes: Number(minutes) });
      
      res.json({
        ok: true,
        metrics,
        requestId: req.requestId
      });

    } catch (error: any) {
      requestLogger.error('Failed to get recent metrics', { error: error.message });
      
      res.status(500).json({
        ok: false,
        message: 'Failed to get recent metrics',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

// POST /api/performance/clear - Clear old metrics
router.post('/api/performance/clear',
  auditPerformance('PERFORMANCE_CLEAR'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const { olderThanHours = 24 } = req.body;
      const removed = performanceMetrics.clearOldMetrics(Number(olderThanHours));
      
      requestLogger.info('Old metrics cleared', { removed, olderThanHours: Number(olderThanHours) });
      
      res.json({
        ok: true,
        message: 'Old metrics cleared successfully',
        removed,
        requestId: req.requestId
      });

    } catch (error: any) {
      requestLogger.error('Failed to clear old metrics', { error: error.message });
      
      res.status(500).json({
        ok: false,
        message: 'Failed to clear old metrics',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

export default router;