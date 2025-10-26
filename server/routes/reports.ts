import express from 'express';
import { ReportsService } from '../services/reportsService';
import { requireAuth } from '../middleware/requireAuth';
import { checkPolicy } from '../middleware/checkPolicy';

export function createReportsRoutes(reportsService: ReportsService, authService: any, policyService: any) {
  const router = express.Router();

  // GET /api/reports/sales/summary
  router.get('/sales/summary',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'reports.view' }),
    async (req, res) => {
      try {
        const filters = {
          startDate: req.query.startDate as string,
          endDate: req.query.endDate as string,
          cashierId: req.query.cashierId ? parseInt(req.query.cashierId as string) : undefined
        };

        const summary = await reportsService.getSalesSummary(filters);
        
        res.json({
          success: true,
          data: summary
        });
      } catch (error) {
        console.error('Get sales summary error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to get sales summary'
        });
      }
    }
  );

  // GET /api/reports/sales/by-tier
  router.get('/sales/by-tier',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'reports.view' }),
    async (req, res) => {
      try {
        const filters = {
          startDate: req.query.startDate as string,
          endDate: req.query.endDate as string,
          cashierId: req.query.cashierId ? parseInt(req.query.cashierId as string) : undefined
        };

        const byTier = await reportsService.getSalesByTier(filters);
        
        res.json({
          success: true,
          data: byTier
        });
      } catch (error) {
        console.error('Get sales by tier error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to get sales by tier'
        });
      }
    }
  );

  // GET /api/reports/sales/top-products
  router.get('/sales/top-products',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'reports.view' }),
    async (req, res) => {
      try {
        const filters = {
          startDate: req.query.startDate as string,
          endDate: req.query.endDate as string,
          limit: req.query.limit ? parseInt(req.query.limit as string) : 10
        };

        const topProducts = await reportsService.getTopProducts(filters);
      
      res.json({
          success: true,
          data: topProducts
        });
      } catch (error) {
        console.error('Get top products error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to get top products'
        });
      }
    }
  );

  // GET /api/reports/sales/top-categories
  router.get('/sales/top-categories',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'reports.view' }),
    async (req, res) => {
      try {
        const filters = {
          startDate: req.query.startDate as string,
          endDate: req.query.endDate as string,
          limit: req.query.limit ? parseInt(req.query.limit as string) : 10
        };

        const topCategories = await reportsService.getTopCategories(filters);
        
        res.json({
          success: true,
          data: topCategories
        });
      } catch (error) {
        console.error('Get top categories error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to get top categories'
        });
      }
    }
  );

  // GET /api/reports/discounts/audit
  router.get('/discounts/audit',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'reports.view' }),
    async (req, res) => {
      try {
        const filters = {
          startDate: req.query.startDate as string,
          endDate: req.query.endDate as string,
          minDiscountAmount: req.query.minDiscountAmount ? parseFloat(req.query.minDiscountAmount as string) : undefined,
          limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
          offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
        };

        const audit = await reportsService.getDiscountAudit(filters);
      
      res.json({
          success: true,
          data: audit
        });
      } catch (error) {
        console.error('Get discount audit error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to get discount audit'
        });
      }
    }
  );

  // GET /api/reports/export/sales-summary
  router.get('/export/sales-summary',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'reports.export' }),
    async (req, res) => {
      try {
        const filters = {
          startDate: req.query.startDate as string,
          endDate: req.query.endDate as string,
          cashierId: req.query.cashierId ? parseInt(req.query.cashierId as string) : undefined
        };

        const csvData = await reportsService.exportSalesSummary(filters);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=sales-summary.csv');
        res.send(csvData);
      } catch (error) {
        console.error('Export sales summary error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to export sales summary'
        });
      }
    }
  );

  // GET /api/reports/export/discount-audit
  router.get('/export/discount-audit',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'reports.export' }),
    async (req, res) => {
      try {
        const filters = {
          startDate: req.query.startDate as string,
          endDate: req.query.endDate as string,
          minDiscountAmount: req.query.minDiscountAmount ? parseFloat(req.query.minDiscountAmount as string) : undefined
        };

        const csvData = await reportsService.exportDiscountAudit(filters);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=discount-audit.csv');
        res.send(csvData);
      } catch (error) {
        console.error('Export discount audit error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to export discount audit'
        });
      }
    }
  );

  return router;
}