/**
 * Snapshot Reports API Routes
 * Provides endpoints for generating and exporting daily snapshot reports
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error';
import { createRequestLogger } from '../utils/logger';
import { snapshotReportsService } from '../services/snapshotReportsService';
import { auditPerformance } from '../middleware/auditLogger';
import { z } from 'zod';

const router = Router();

// Validation schemas
const ReportDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
});

const TrendAnalysisSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
});

// GET /api/snapshot-reports/dates - Get available report dates
router.get('/api/snapshot-reports/dates',
  auditPerformance('SNAPSHOT_REPORTS_DATES'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const dates = snapshotReportsService.getAvailableReportDates();
      
      requestLogger.info({ count: dates.length }, 'Available report dates retrieved');
      
      res.json({
        ok: true,
        dates,
        count: dates.length,
        requestId: req.requestId
      });

    } catch (error: any) {
      requestLogger.error('Failed to get report dates', { error: error.message });
      
      res.status(500).json({
        ok: false,
        message: 'Failed to get report dates',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

// GET /api/snapshot-reports/daily-summary/:date - Generate daily summary report
router.get('/api/snapshot-reports/daily-summary/:date',
  auditPerformance('SNAPSHOT_REPORTS_DAILY_SUMMARY'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const { date } = ReportDateSchema.parse({ date: req.params.date });
      
      const report = snapshotReportsService.generateDailySummaryReport(date);
      
      requestLogger.info({
        report_id: report.report_id,
        date,
        total_products: report.summary.total_products,
        total_value: report.summary.total_value_cents
      }, 'Daily summary report generated');
      
      res.json({
        ok: true,
        report,
        requestId: req.requestId
      });

    } catch (error: any) {
      if (error.name === 'ZodError') {
        requestLogger.warn('Invalid date format', { error: error.errors });
        return res.status(400).json({
          ok: false,
          message: 'Invalid date format',
          errors: error.errors,
          requestId: req.requestId
        });
      }
      
      requestLogger.error('Failed to generate daily summary report', { error: error.message });
      
      res.status(500).json({
        ok: false,
        message: 'Failed to generate daily summary report',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

// GET /api/snapshot-reports/trend-analysis - Generate trend analysis report
router.get('/api/snapshot-reports/trend-analysis',
  auditPerformance('SNAPSHOT_REPORTS_TREND_ANALYSIS'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const validatedData = TrendAnalysisSchema.parse(req.query);
      
      const report = snapshotReportsService.generateTrendAnalysisReport(
        validatedData.start_date,
        validatedData.end_date
      );
      
      requestLogger.info({
        start_date: validatedData.start_date,
        end_date: validatedData.end_date,
        trend_points: report.total_value_trend.length,
        categories: report.category_trends.length
      }, 'Trend analysis report generated');
      
      res.json({
        ok: true,
        report,
        requestId: req.requestId
      });

    } catch (error: any) {
      if (error.name === 'ZodError') {
        requestLogger.warn('Invalid date parameters', { error: error.errors });
        return res.status(400).json({
          ok: false,
          message: 'Invalid date parameters',
          errors: error.errors,
          requestId: req.requestId
        });
      }
      
      requestLogger.error('Failed to generate trend analysis report', { error: error.message });
      
      res.status(500).json({
        ok: false,
        message: 'Failed to generate trend analysis report',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

// GET /api/snapshot-reports/category-breakdown/:date - Generate category breakdown report
router.get('/api/snapshot-reports/category-breakdown/:date',
  auditPerformance('SNAPSHOT_REPORTS_CATEGORY_BREAKDOWN'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const { date } = ReportDateSchema.parse({ date: req.params.date });
      
      const report = snapshotReportsService.generateCategoryBreakdownReport(date);
      
      requestLogger.info({
        date,
        categories_count: report.length,
        total_products: report.reduce((sum, cat) => sum + cat.product_count, 0)
      }, 'Category breakdown report generated');
      
      res.json({
        ok: true,
        report,
        count: report.length,
        requestId: req.requestId
      });

    } catch (error: any) {
      if (error.name === 'ZodError') {
        requestLogger.warn('Invalid date format', { error: error.errors });
        return res.status(400).json({
          ok: false,
          message: 'Invalid date format',
          errors: error.errors,
          requestId: req.requestId
        });
      }
      
      requestLogger.error('Failed to generate category breakdown report', { error: error.message });
      
      res.status(500).json({
        ok: false,
        message: 'Failed to generate category breakdown report',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

// GET /api/snapshot-reports/comprehensive/:date - Generate comprehensive report
router.get('/api/snapshot-reports/comprehensive/:date',
  auditPerformance('SNAPSHOT_REPORTS_COMPREHENSIVE'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const { date } = ReportDateSchema.parse({ date: req.params.date });
      
      const report = snapshotReportsService.generateComprehensiveReport(date);
      
      requestLogger.info({
        report_id: report.report_id,
        date,
        sections: Object.keys(report).filter(key => key !== 'report_id' && key !== 'report_type' && key !== 'report_date' && key !== 'generated_at' && key !== 'metadata')
      }, 'Comprehensive report generated');
      
      res.json({
        ok: true,
        report,
        requestId: req.requestId
      });

    } catch (error: any) {
      if (error.name === 'ZodError') {
        requestLogger.warn('Invalid date format', { error: error.errors });
        return res.status(400).json({
          ok: false,
          message: 'Invalid date format',
          errors: error.errors,
          requestId: req.requestId
        });
      }
      
      requestLogger.error('Failed to generate comprehensive report', { error: error.message });
      
      res.status(500).json({
        ok: false,
        message: 'Failed to generate comprehensive report',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

// GET /api/snapshot-reports/export/:date/:format - Export report
router.get('/api/snapshot-reports/export/:date/:format',
  auditPerformance('SNAPSHOT_REPORTS_EXPORT'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const { date } = ReportDateSchema.parse({ date: req.params.date });
      const format = req.params.format.toLowerCase();
      
      if (!['json', 'csv'].includes(format)) {
        return res.status(400).json({
          ok: false,
          message: 'Invalid format. Supported formats: json, csv',
          requestId: req.requestId
        });
      }
      
      const report = snapshotReportsService.generateDailySummaryReport(date);
      let exportData: string;
      let contentType: string;
      
      if (format === 'json') {
        exportData = snapshotReportsService.exportReportToJSON(report);
        contentType = 'application/json';
      } else {
        exportData = snapshotReportsService.exportReportToCSV(report);
        contentType = 'text/csv';
      }
      
      requestLogger.info({
        date,
        format,
        report_id: report.report_id
      }, 'Report exported');
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="snapshot-report-${date}.${format}"`);
      res.send(exportData);

    } catch (error: any) {
      if (error.name === 'ZodError') {
        requestLogger.warn('Invalid date format', { error: error.errors });
        return res.status(400).json({
          ok: false,
          message: 'Invalid date format',
          errors: error.errors,
          requestId: req.requestId
        });
      }
      
      requestLogger.error('Failed to export report', { error: error.message });
      
      res.status(500).json({
        ok: false,
        message: 'Failed to export report',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

// GET /api/snapshot-reports/dashboard/:date - Get dashboard data
router.get('/api/snapshot-reports/dashboard/:date',
  auditPerformance('SNAPSHOT_REPORTS_DASHBOARD'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const { date } = ReportDateSchema.parse({ date: req.params.date });
      
      const dailySummary = snapshotReportsService.generateDailySummaryReport(date);
      const categoryBreakdown = snapshotReportsService.generateCategoryBreakdownReport(date);
      
      // Get trend data for last 7 days
      const trendStartDate = new Date(date);
      trendStartDate.setDate(trendStartDate.getDate() - 7);
      const trendAnalysis = snapshotReportsService.generateTrendAnalysisReport(
        trendStartDate.toISOString().split('T')[0],
        date
      );
      
      const dashboardData = {
        date,
        generated_at: new Date().toISOString(),
        summary: dailySummary.summary,
        top_categories: categoryBreakdown.slice(0, 5),
        recent_trends: trendAnalysis.total_value_trend.slice(-7),
        stock_alerts: {
          low_stock: dailySummary.summary.products_low_stock,
          out_of_stock: dailySummary.summary.products_out_of_stock,
          total_alerts: dailySummary.summary.products_low_stock + dailySummary.summary.products_out_of_stock
        }
      };
      
      requestLogger.info({
        date,
        total_products: dailySummary.summary.total_products,
        total_value: dailySummary.summary.total_value_cents
      }, 'Dashboard data generated');
      
      res.json({
        ok: true,
        dashboard: dashboardData,
        requestId: req.requestId
      });

    } catch (error: any) {
      if (error.name === 'ZodError') {
        requestLogger.warn('Invalid date format', { error: error.errors });
        return res.status(400).json({
          ok: false,
          message: 'Invalid date format',
          errors: error.errors,
          requestId: req.requestId
        });
      }
      
      requestLogger.error('Failed to generate dashboard data', { error: error.message });
      
      res.status(500).json({
        ok: false,
        message: 'Failed to generate dashboard data',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

export default router;
