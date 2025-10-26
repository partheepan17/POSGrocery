import express from 'express';
import { InvoiceService } from '../services/invoiceService';
import { requireAuth } from '../middleware/requireAuth';
import { checkPolicy } from '../middleware/checkPolicy';

export function createInvoiceRoutes(invoiceService: InvoiceService, authService: any, policyService: any) {
  const router = express.Router();

  // POST /api/invoices
  router.post('/', 
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'sales.create' }),
    async (req, res) => {
      try {
        const invoice = await invoiceService.createInvoice(req.body);
        
        res.status(201).json({
          success: true,
          data: invoice,
          message: 'Invoice created successfully'
        });
      } catch (error) {
        console.error('Create invoice error:', error);
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Failed to create invoice'
        });
      }
    }
  );

  // GET /api/invoices/:id
  router.get('/:id', 
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'sales.view' }),
    async (req, res) => {
      try {
        const invoiceId = parseInt(req.params.id);
        const invoice = await invoiceService.getInvoice(invoiceId);
        
        if (!invoice) {
          return res.status(404).json({
            success: false,
            message: 'Invoice not found'
          });
        }

        const lines = await invoiceService.getInvoiceLines(invoiceId);
        
        res.json({
          success: true,
          data: {
            ...invoice,
            lines
          }
        });
      } catch (error) {
        console.error('Get invoice error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to get invoice'
        });
      }
    }
  );

  // GET /api/invoices
  router.get('/', 
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'sales.view' }),
    async (req, res) => {
      try {
        const filters = {
          startDate: req.query.startDate as string,
          endDate: req.query.endDate as string,
          cashierId: req.query.cashierId ? parseInt(req.query.cashierId as string) : undefined,
          customerId: req.query.customerId ? parseInt(req.query.customerId as string) : undefined,
          status: req.query.status as string,
          limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
          offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
        };

        const invoices = await invoiceService.getInvoices(filters);
      
      res.json({
        success: true,
          data: invoices
        });
    } catch (error) {
        console.error('Get invoices error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to get invoices'
        });
      }
    }
  );

  // POST /api/invoices/:id/return
  router.post('/:id/return',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'sales.update' }),
    async (req, res) => {
      try {
    const invoiceId = parseInt(req.params.id);
        const { lines, processedBy } = req.body;

        if (!lines || !Array.isArray(lines) || lines.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Return lines required'
          });
        }

        const success = await invoiceService.processReturn(invoiceId, lines, processedBy);
        
        if (success) {
      res.json({
            success: true,
            message: 'Return processed successfully'
          });
        } else {
          res.status(400).json({
            success: false,
            message: 'Failed to process return'
          });
        }
    } catch (error) {
        console.error('Process return error:', error);
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Failed to process return'
        });
      }
    }
  );

  // GET /api/invoices/summary
  router.get('/summary',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'reports.view' }),
    async (req, res) => {
      try {
        const filters = {
          startDate: req.query.startDate as string,
          endDate: req.query.endDate as string,
          cashierId: req.query.cashierId ? parseInt(req.query.cashierId as string) : undefined
        };

        const summary = await invoiceService.getInvoiceSummary(filters);
      
      res.json({
          success: true,
          data: summary
      });
    } catch (error) {
        console.error('Get invoice summary error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to get invoice summary'
        });
      }
    }
  );

  return router;
}