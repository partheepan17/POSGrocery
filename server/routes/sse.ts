import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { SSEService } from '../services/sseService';
import { requireAuth } from '../middleware/requireAuth';

export function createSSERoutes(sseService: SSEService, authService: any) {
  const router = express.Router();

  // GET /api/sse/events
  router.get('/events', requireAuth(authService), (req, res) => {
    const clientId = uuidv4();
    const topics = req.query.topics ? (req.query.topics as string).split(',') : ['*'];
    
    sseService.addClient(clientId, res, topics);

    // Send initial features update
    sseService.sendToClient(clientId, 'features:update', {
      message: 'Connected to real-time updates',
      clientId,
      topics
    });
  });

  // POST /api/sse/broadcast
  router.post('/broadcast', requireAuth(authService), (req, res) => {
    const { topic, event, data } = req.body;

    if (!topic || !event) {
      return res.status(400).json({
        success: false,
        message: 'Topic and event required'
      });
    }

    sseService.sendToTopic(topic, event, data);

    res.json({
      success: true,
      message: 'Broadcast sent successfully'
    });
  });

  // GET /api/sse/stats
  router.get('/stats', requireAuth(authService), (req, res) => {
    res.json({
      success: true,
      data: {
        clientCount: sseService.getClientCount(),
        topics: {
          features: sseService.getClientsByTopic('features').length,
          sales: sseService.getClientsByTopic('sales').length,
          inventory: sseService.getClientsByTopic('inventory').length,
          settings: sseService.getClientsByTopic('settings').length
        }
      }
    });
  });

  return router;
}










