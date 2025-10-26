/**
 * Webhook Management Routes
 * Provides endpoints for webhook management and monitoring
 */

import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authMiddleware, authorize } from '../middleware/auth';
import { createContextLogger } from '../utils/logger';
import { webhookService } from '../integrations/webhooks';

const router = Router();
const logger = createContextLogger({ operation: 'webhook_routes' });

// GET /api/webhooks/stats - Get webhook statistics
router.get('/api/webhooks/stats', authMiddleware, authorize(['admin', 'manager']), asyncHandler(async (req, res) => {
  try {
    const stats = await webhookService.getWebhookStats();
    
    res.json({
      ok: true,
      stats
    });
  } catch (error) {
    logger.error('Failed to get webhook stats', { error: error.message });
    res.status(500).json({
      ok: false,
      error: 'Failed to get webhook statistics'
    });
  }
}));

// GET /api/webhooks/logs/:webhookId - Get webhook delivery logs
router.get('/api/webhooks/logs/:webhookId', authMiddleware, authorize(['admin', 'manager']), asyncHandler(async (req, res) => {
  try {
    const { webhookId } = req.params;
    const logs = await webhookService.getWebhookLogs(webhookId);
    
    res.json({
      ok: true,
      webhookId,
      logs
    });
  } catch (error) {
    logger.error('Failed to get webhook logs', { error: error.message, webhookId: req.params.webhookId });
    res.status(500).json({
      ok: false,
      error: 'Failed to get webhook logs'
    });
  }
}));

// POST /api/webhooks/process - Manually process pending webhooks
router.post('/api/webhooks/process', authMiddleware, authorize(['admin']), asyncHandler(async (req, res) => {
  try {
    await webhookService.processPendingWebhooks();
    
    res.json({
      ok: true,
      message: 'Webhook processing completed'
    });
  } catch (error) {
    logger.error('Failed to process webhooks', { error: error.message });
    res.status(500).json({
      ok: false,
      error: 'Failed to process webhooks'
    });
  }
}));

// POST /api/webhooks/retry - Retry failed webhooks
router.post('/api/webhooks/retry', authMiddleware, authorize(['admin']), asyncHandler(async (req, res) => {
  try {
    const retriedCount = await webhookService.retryFailedWebhooks();
    
    res.json({
      ok: true,
      message: `Retried ${retriedCount} failed webhooks`,
      retriedCount
    });
  } catch (error) {
    logger.error('Failed to retry webhooks', { error: error.message });
    res.status(500).json({
      ok: false,
      error: 'Failed to retry webhooks'
    });
  }
}));

// POST /api/webhooks/cleanup - Clean up old dead letter queue entries
router.post('/api/webhooks/cleanup', authMiddleware, authorize(['admin']), asyncHandler(async (req, res) => {
  try {
    const deletedCount = await webhookService.cleanupDeadLetterQueue();
    
    res.json({
      ok: true,
      message: `Cleaned up ${deletedCount} old dead letter queue entries`,
      deletedCount
    });
  } catch (error) {
    logger.error('Failed to cleanup webhook DLQ', { error: error.message });
    res.status(500).json({
      ok: false,
      error: 'Failed to cleanup dead letter queue'
    });
  }
}));

// POST /api/webhooks/test - Test webhook configuration
router.post('/api/webhooks/test', authMiddleware, authorize(['admin']), asyncHandler(async (req, res) => {
  try {
    const { event_type } = req.body;
    
    if (!event_type || !['sale_committed', 'grn_created'].includes(event_type)) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid event_type. Must be "sale_committed" or "grn_created"'
      });
    }
    
    const success = await webhookService.testWebhook(event_type);
    
    res.json({
      ok: true,
      success,
      message: success ? 'Webhook test successful' : 'Webhook test failed'
    });
  } catch (error) {
    logger.error('Webhook test failed', { error: error.message, eventType: req.body.event_type });
    res.status(500).json({
      ok: false,
      error: 'Webhook test failed',
      details: error.message
    });
  }
}));

export { router as webhookRoutes };










