/**
 * Realtime Routes
 * Provides SSE and WebSocket endpoints for realtime updates
 */

import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { createContextLogger } from '../utils/logger';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { extractTenant, requirePolicy } from '../../src/middleware/policy';
import { 
  createSSEHandler, 
  createStatusHandler, 
  createBroadcastHandler,
  createWebSocketHandler 
} from '../../src/realtime';

const router = Router();
const logger = createContextLogger({ operation: 'realtime_routes' });

/**
 * GET /api/realtime/events/:tenantId
 * Server-Sent Events endpoint for realtime updates
 */
router.get('/api/realtime/events/:tenantId', 
  extractTenant,
  authenticateToken,
  createSSEHandler()
);

/**
 * GET /api/realtime/status
 * Get realtime connection statistics
 */
router.get('/api/realtime/status', 
  extractTenant,
  authenticateToken,
  requirePolicy({ feature: 'admin.system', permission: 'admin.system.view' }),
  createStatusHandler()
);

/**
 * POST /api/realtime/broadcast
 * Broadcast message to all connections for a tenant (admin only)
 */
router.post('/api/realtime/broadcast', 
  extractTenant,
  authenticateToken,
  requirePolicy({ feature: 'admin.system', permission: 'admin.system.broadcast' }),
  asyncHandler(async (req: AuthRequest, res) => {
    const requestLogger = createContextLogger({ 
      operation: 'realtime_broadcast', 
      requestId: req.requestId,
      userId: req.user?.id,
      tenantId: req.tenant
    });

    try {
      const { tenantId, event, data } = req.body;
      
      if (!tenantId || !event) {
        return res.status(400).json({
          ok: false,
          error: 'Tenant ID and event are required'
        });
      }

      requestLogger.info('Broadcasting realtime message', {
        tenantId,
        event,
        data,
        userId: req.user?.id
      });

      // Use the broadcast handler
      const broadcastHandler = createBroadcastHandler();
      broadcastHandler(req, res);

    } catch (error) {
      requestLogger.error('Failed to broadcast message', { 
        error: error.message,
        userId: req.user?.id,
        tenantId: req.tenant
      });

      res.status(500).json({
        ok: false,
        error: 'Failed to broadcast message',
        message: error.message
      });
    }
  })
);

/**
 * GET /api/realtime/test/:tenantId
 * Send test message to all connections for a tenant
 */
router.get('/api/realtime/test/:tenantId', 
  extractTenant,
  authenticateToken,
  requirePolicy({ feature: 'admin.system', permission: 'admin.system.view' }),
  asyncHandler(async (req: AuthRequest, res) => {
    const requestLogger = createContextLogger({ 
      operation: 'realtime_test', 
      requestId: req.requestId,
      userId: req.user?.id,
      tenantId: req.tenant
    });

    try {
      const tenantId = req.params.tenantId;
      const message = req.query.message as string || 'Test message from server';

      if (!tenantId) {
        return res.status(400).json({
          ok: false,
          error: 'Tenant ID is required'
        });
      }

      requestLogger.info('Sending test message', {
        tenantId,
        message,
        userId: req.user?.id
      });

      // Import and use the test message function
      const { sendTestMessage } = await import('../../src/realtime');
      sendTestMessage(tenantId, message);

      res.json({
        ok: true,
        message: 'Test message sent successfully',
        data: {
          tenantId,
          message,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      requestLogger.error('Failed to send test message', { 
        error: error.message,
        userId: req.user?.id,
        tenantId: req.tenant
      });

      res.status(500).json({
        ok: false,
        error: 'Failed to send test message',
        message: error.message
      });
    }
  })
);

/**
 * GET /api/realtime/connections
 * Get detailed connection information
 */
router.get('/api/realtime/connections', 
  extractTenant,
  authenticateToken,
  requirePolicy({ feature: 'admin.system', permission: 'admin.system.view' }),
  asyncHandler(async (req: AuthRequest, res) => {
    const requestLogger = createContextLogger({ 
      operation: 'realtime_connections', 
      requestId: req.requestId,
      userId: req.user?.id,
      tenantId: req.tenant
    });

    try {
      const { getConnectionStats } = await import('../../src/realtime');
      const stats = getConnectionStats();

      requestLogger.info('Retrieved connection statistics', {
        totalConnections: stats.totalConnections,
        activeTenants: stats.activeTenants,
        userId: req.user?.id
      });

      res.json({
        ok: true,
        data: stats
      });

    } catch (error) {
      requestLogger.error('Failed to get connection statistics', { 
        error: error.message,
        userId: req.user?.id,
        tenantId: req.tenant
      });

      res.status(500).json({
        ok: false,
        error: 'Failed to get connection statistics',
        message: error.message
      });
    }
  })
);

/**
 * POST /api/realtime/cleanup
 * Force cleanup of all connections (admin only)
 */
router.post('/api/realtime/cleanup', 
  extractTenant,
  authenticateToken,
  requirePolicy({ feature: 'admin.system', permission: 'admin.system.manage' }),
  asyncHandler(async (req: AuthRequest, res) => {
    const requestLogger = createContextLogger({ 
      operation: 'realtime_cleanup', 
      requestId: req.requestId,
      userId: req.user?.id,
      tenantId: req.tenant
    });

    try {
      const { forceCleanup } = await import('../../src/realtime');
      forceCleanup();

      requestLogger.warn('Forced cleanup of all realtime connections', {
        userId: req.user?.id,
        tenantId: req.tenant
      });

      res.json({
        ok: true,
        message: 'All connections cleaned up successfully'
      });

    } catch (error) {
      requestLogger.error('Failed to cleanup connections', { 
        error: error.message,
        userId: req.user?.id,
        tenantId: req.tenant
      });

      res.status(500).json({
        ok: false,
        error: 'Failed to cleanup connections',
        message: error.message
      });
    }
  })
);

export { router as realtimeRouter };










