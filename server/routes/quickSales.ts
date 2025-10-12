// Quick Sales API Routes
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error';
import { createRequestLogger } from '../utils/logger';
import { 
  ensureTodayQuickSalesOpen, 
  addQuickSalesLine, 
  getTodayQuickSalesSession, 
  closeTodayQuickSalesSession,
  getQuickSalesLines,
  removeQuickSalesLine
} from '../utils/quickSales';
import { createStandardError, ERROR_CODES } from '../utils/errorCodes';
import { auditPerformance } from '../middleware/auditLogger';
import { rbacService, RBACContext } from '../utils/rbac';
import { quickSalesRateLimiter } from '../middleware/quickSalesRateLimiter';

const router = Router();

// Helper function to get RBAC context from request
function getRBACContext(req: Request): RBACContext | null {
  try {
    // For now, we'll use a simple approach - in production this would come from JWT/session
    const userId = req.body.userId || req.headers['x-user-id'] || 1; // Default to user 1
    const context = rbacService.getContextFromRequest(req);
    return context;
  } catch (error) {
    console.error('Failed to get RBAC context:', error);
    return null;
  }
}

// POST /api/quick-sales/ensure-open - Ensure today's session exists
router.post('/api/quick-sales/ensure-open', 
  auditPerformance('QUICK_SALES_ENSURE_OPEN'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const { opened_by = 1 } = req.body;
      
      const session = ensureTodayQuickSalesOpen(opened_by, req.requestId);
      
      requestLogger.info('Ensured Quick Sales session is open', { 
        sessionId: session.id, 
        openedBy: opened_by 
      });
      
      res.json({ session });
    } catch (error) {
      requestLogger.error('Failed to ensure Quick Sales session is open', { error });
      throw createStandardError(
        'Failed to ensure Quick Sales session is open',
        ERROR_CODES.DATABASE_ERROR,
        { error: error instanceof Error ? error.message : 'Unknown error' },
        req.requestId
      );
    }
  })
);

// GET /api/quick-sales/session - Get current open session for today
router.get('/api/quick-sales/session', 
  auditPerformance('QUICK_SALES_GET_SESSION'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const session = getTodayQuickSalesSession(req.requestId);
      
      if (!session) {
        return res.json({ status: 'none' });
      }
      
      requestLogger.info('Retrieved Quick Sales session', { 
        sessionId: session.id, 
        lineCount: session.total_lines 
      });
      
      res.json({ session });
    } catch (error) {
      requestLogger.error('Failed to get Quick Sales session', { error });
      throw createStandardError(
        'Failed to retrieve Quick Sales session',
        ERROR_CODES.DATABASE_ERROR,
        { error: error instanceof Error ? error.message : 'Unknown error' },
        req.requestId
      );
    }
  })
);

// GET /api/quick-sales/lines - Get paginated lines for open session
router.get('/api/quick-sales/lines', 
  auditPerformance('QUICK_SALES_GET_LINES'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const cursor = req.query.cursor as string;
      const limit = parseInt(req.query.limit as string) || 200;
      
      if (limit < 1 || limit > 500) {
        throw createStandardError(
          'Limit must be between 1 and 500',
          ERROR_CODES.INVALID_INPUT,
          { limit, min: 1, max: 500 },
          req.requestId
        );
      }
      
      const result = getQuickSalesLines(cursor, limit, req.requestId);
      
      requestLogger.info('Retrieved Quick Sales lines', { 
        count: result.lines.length,
        hasMore: result.hasMore,
        cursor: result.nextCursor 
      });
      
      res.json(result);
    } catch (error) {
      requestLogger.error('Failed to get Quick Sales lines', { error });
      throw createStandardError(
        'Failed to retrieve Quick Sales lines',
        ERROR_CODES.DATABASE_ERROR,
        { error: error instanceof Error ? error.message : 'Unknown error' },
        req.requestId
      );
    }
  })
);

// POST /api/quick-sales/lines - Add a line to today's session
router.post('/api/quick-sales/lines',
  quickSalesRateLimiter.checkLineRateLimit, // Rate limiting for line additions
  auditPerformance('QUICK_SALES_ADD_LINE'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const { product_id, qty = 1, uom } = req.body;

      if (!product_id) {
        throw createStandardError(
          'Product ID is required',
          ERROR_CODES.INVALID_INPUT,
          { field: 'product_id' },
          req.requestId
        );
      }

      if (qty <= 0) {
        throw createStandardError(
          'Quantity must be greater than 0',
          ERROR_CODES.INVALID_INPUT,
          { qty },
          req.requestId
        );
      }

      // Get RBAC context
      const context = getRBACContext(req);
      if (!context) {
        throw createStandardError(
          'Authentication required',
          ERROR_CODES.FORBIDDEN,
          { reason: 'User context not found' },
          req.requestId
        );
      }

      const line = addQuickSalesLine(product_id, qty, 0, uom, req.requestId, context);
      
      requestLogger.info('Added line to Quick Sales session', { 
        lineId: line.id, 
        productId: product_id, 
        qty,
        uom 
      });
      
      res.json({ line });
    } catch (error) {
      requestLogger.error('Failed to add Quick Sales line', { error });
      
      if (error instanceof Error && error.message.includes('not found')) {
        throw createStandardError(
          'Product not found or inactive',
          ERROR_CODES.PRODUCT_NOT_FOUND,
          { product_id: req.body.product_id },
          req.requestId
        );
      }
      
      throw createStandardError(
        'Failed to add line to Quick Sales session',
        ERROR_CODES.DATABASE_ERROR,
        { error: error instanceof Error ? error.message : 'Unknown error' },
        req.requestId
      );
    }
  })
);

// DELETE /api/quick-sales/lines/:lineId - Remove a line from today's session (manager PIN required)
router.delete('/api/quick-sales/lines/:lineId', 
  quickSalesRateLimiter.checkRateLimit, // Rate limiting for line deletions
  auditPerformance('QUICK_SALES_REMOVE_LINE'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const { lineId } = req.params;
      const { managerPin, reason } = req.body;
      
      if (!managerPin) {
        throw createStandardError(
          'Manager PIN is required to remove lines',
          ERROR_CODES.PIN_REQUIRED,
          { field: 'managerPin' },
          req.requestId
        );
      }

      // Get RBAC context
      const context = getRBACContext(req);
      if (!context) {
        throw createStandardError(
          'Authentication required',
          ERROR_CODES.FORBIDDEN,
          { reason: 'User context not found' },
          req.requestId
        );
      }
      
      const result = removeQuickSalesLine(parseInt(lineId), req.requestId, context, managerPin, reason);
      
      if (!result) {
        throw createStandardError(
          'Line not found or session is closed',
          ERROR_CODES.PRODUCT_NOT_FOUND,
          { lineId },
          req.requestId
        );
      }
      
      requestLogger.info('Removed line from Quick Sales session', { 
        lineId, 
        managerPin: '***' 
      });
      
      res.json({ success: true, message: 'Line removed successfully' });
    } catch (error) {
      requestLogger.error('Failed to remove Quick Sales line', { error });
      throw createStandardError(
        'Failed to remove line from Quick Sales session',
        ERROR_CODES.DATABASE_ERROR,
        { error: error instanceof Error ? error.message : 'Unknown error' },
        req.requestId
      );
    }
  })
);

// POST /api/quick-sales/close - Close today's session and create invoice
router.post('/api/quick-sales/close', 
  quickSalesRateLimiter.checkRateLimit, // Rate limiting for session close
  auditPerformance('QUICK_SALES_CLOSE_SESSION'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const { managerPin, note, sessionIdToClose } = req.body;
      
      if (!managerPin) {
        throw createStandardError(
          'Manager PIN is required to close session',
          ERROR_CODES.PIN_REQUIRED,
          { field: 'managerPin' },
          req.requestId
        );
      }

      // Get RBAC context
      const context = getRBACContext(req);
      if (!context) {
        throw createStandardError(
          'Authentication required',
          ERROR_CODES.FORBIDDEN,
          { reason: 'User context not found' },
          req.requestId
        );
      }
      
      const result = await closeTodayQuickSalesSession(1, note, req.requestId, context, managerPin, sessionIdToClose);
      
      requestLogger.info('Closed Quick Sales session', { 
        sessionId: result.session.id, 
        invoiceId: result.invoiceId,
        receiptNo: result.receiptNo,
        totals: result.totals 
      });
      
      res.json({ 
        invoice_id: result.invoiceId,
        receipt_no: result.receiptNo,
        totals: result.totals
      });
    } catch (error) {
      requestLogger.error('Failed to close Quick Sales session', { error });
      
      if (error instanceof Error && error.message.includes('CONFLICT')) {
        throw createStandardError(
          'Session is already being closed by another process',
          ERROR_CODES.CONFLICT,
          { error: error.message },
          req.requestId
        );
      }
      
      throw createStandardError(
        'Failed to close Quick Sales session',
        ERROR_CODES.DATABASE_ERROR,
        { error: error instanceof Error ? error.message : 'Unknown error' },
        req.requestId
      );
    }
  })
);

// GET /api/quick-sales/print-summary/:sessionId - Get print summary data for a session
router.get('/api/quick-sales/print-summary/:sessionId',
  auditPerformance('QUICK_SALES_GET_PRINT_SUMMARY'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const { sessionId } = req.params;
      const { topN = 10 } = req.query;
      
      const db = require('../db').getDatabase();
      
      // Get session details
      const session = db.prepare(`
        SELECT * FROM quick_sales_sessions WHERE id = ?
      `).get(parseInt(sessionId)) as any;
      
      if (!session) {
        throw createStandardError(
          'Session not found',
          ERROR_CODES.PRODUCT_NOT_FOUND,
          { sessionId },
          req.requestId
        );
      }
      
      // Get invoice details
      const invoice = db.prepare(`
        SELECT id, receipt_no, gross, tax, net, created_at
        FROM invoices 
        WHERE id = (
          SELECT invoice_id FROM quick_sales_sessions WHERE id = ?
        )
      `).get(parseInt(sessionId)) as any;
      
      if (!invoice) {
        throw createStandardError(
          'Invoice not found for session',
          ERROR_CODES.PRODUCT_NOT_FOUND,
          { sessionId },
          req.requestId
        );
      }
      
      // Get top items by quantity
      const topItems = db.prepare(`
        SELECT 
          p.sku,
          p.name_en as name,
          SUM(qsl.qty) as qty,
          qsl.uom,
          SUM(qsl.line_total) as line_total
        FROM quick_sales_lines qsl
        JOIN products p ON qsl.product_id = p.id
        WHERE qsl.session_id = ?
        GROUP BY qsl.product_id, qsl.uom
        ORDER BY SUM(qsl.qty) DESC
        LIMIT ?
      `).all(parseInt(sessionId), parseInt(topN as string)) as any[];
      
      // Get total line count
      const totalLines = db.prepare(`
        SELECT COUNT(*) as count FROM quick_sales_lines WHERE session_id = ?
      `).get(parseInt(sessionId)) as { count: number };
      
      const summary = {
        session: {
          id: session.id,
          session_date: session.session_date,
          opened_at: session.opened_at,
          closed_at: session.closed_at,
          notes: session.notes
        },
        invoice: {
          id: invoice.id,
          receipt_no: invoice.receipt_no,
          gross: invoice.gross,
          tax: invoice.tax,
          net: invoice.net,
          created_at: invoice.created_at
        },
        topItems,
        totalLines: totalLines.count
      };
      
      requestLogger.info('Retrieved Quick Sales print summary', { 
        sessionId, 
        topItemsCount: topItems.length,
        totalLines: totalLines.count
      });
      
      res.json(summary);
    } catch (error) {
      requestLogger.error('Failed to get Quick Sales print summary', { error });
      throw createStandardError(
        'Failed to get print summary',
        ERROR_CODES.DATABASE_ERROR,
        { error: error instanceof Error ? error.message : 'Unknown error' },
        req.requestId
      );
    }
  })
);

export default router;
