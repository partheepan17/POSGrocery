import { Router, Request, Response } from 'express';
import { getLogger } from '../utils/logger';

const logger = getLogger();

interface ErrorReport {
  message: string;
  code?: string;
  requestId?: string;
  stack?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  userId?: string;
  sessionId?: string;
}

interface ErrorStats {
  totalErrors: number;
  errorsByType: { [key: string]: number };
  errorsByUrl: { [key: string]: number };
  recentErrors: ErrorReport[];
}

class ErrorCollector {
  private errors: ErrorReport[] = [];
  private maxErrors = 1000; // Keep last 1000 errors

  addError(error: ErrorReport) {
    this.errors.push(error);
    
    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Log error
    logger.error({
      event: 'client_error',
      message: error.message,
      code: error.code,
      requestId: error.requestId,
      url: error.url,
      userAgent: error.userAgent,
      stack: error.stack,
    });
  }

  getStats(): ErrorStats {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    // Filter errors from the last hour
    const recentErrors = this.errors.filter(e => 
      new Date(e.timestamp).getTime() > oneHourAgo
    );

    const errorsByType = recentErrors.reduce((acc, error) => {
      const type = error.code || 'UNKNOWN';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const errorsByUrl = recentErrors.reduce((acc, error) => {
      const url = new URL(error.url).pathname;
      acc[url] = (acc[url] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    return {
      totalErrors: recentErrors.length,
      errorsByType,
      errorsByUrl,
      recentErrors: recentErrors.slice(-10), // Last 10 errors
    };
  }

  getErrorsByRequestId(requestId: string): ErrorReport[] {
    return this.errors.filter(e => e.requestId === requestId);
  }

  clearErrors() {
    this.errors = [];
  }
}

const errorCollector = new ErrorCollector();

const router = Router();

// POST /api/errors - Report client-side errors
router.post('/', (req: Request, res: Response) => {
  try {
    const errorReport: ErrorReport = req.body;
    
    // Validate required fields
    if (!errorReport.message || !errorReport.timestamp || !errorReport.url) {
      return res.status(400).json({ 
        error: 'Missing required fields: message, timestamp, url' 
      });
    }

    // Add server-side metadata
    errorReport.userId = req.headers['x-user-id'] as string;
    errorReport.sessionId = req.headers['x-session-id'] as string;

    errorCollector.addError(errorReport);
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error processing error report:', error);
    res.status(500).json({ error: 'Failed to process error report' });
  }
});

// GET /api/errors/stats - Get error statistics
router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = errorCollector.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting error stats:', error);
    res.status(500).json({ error: 'Failed to get error stats' });
  }
});

// GET /api/errors/request/:requestId - Get errors by request ID
router.get('/request/:requestId', (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const errors = errorCollector.getErrorsByRequestId(requestId);
    res.json({ errors });
  } catch (error) {
    logger.error('Error getting errors by request ID:', error);
    res.status(500).json({ error: 'Failed to get errors by request ID' });
  }
});

// DELETE /api/errors - Clear error logs
router.delete('/', (req: Request, res: Response) => {
  try {
    errorCollector.clearErrors();
    res.json({ success: true, message: 'Error logs cleared' });
  } catch (error) {
    logger.error('Error clearing error logs:', error);
    res.status(500).json({ error: 'Failed to clear error logs' });
  }
});

// GET /api/errors/health - Health check for error reporting
router.get('/health', (req: Request, res: Response) => {
  try {
    const stats = errorCollector.getStats();
    const isHealthy = stats.totalErrors < 100; // Less than 100 errors per hour
    
    res.json({
      healthy: isHealthy,
      totalErrors: stats.totalErrors,
      errorRate: stats.totalErrors / 60, // Errors per minute
      topErrorTypes: Object.entries(stats.errorsByType)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([type, count]) => ({ type, count }))
    });
  } catch (error) {
    logger.error('Error checking error reporting health:', error);
    res.status(500).json({ error: 'Failed to check error reporting health' });
  }
});

export default router;



