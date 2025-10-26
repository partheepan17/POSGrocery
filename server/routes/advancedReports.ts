/**
 * Advanced Reports API Routes
 * Provides comprehensive business intelligence and analytics endpoints
 */

import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { createContextLogger } from '../utils/logger';
import { authenticateToken, requireManager, AuthRequest } from '../middleware/auth';
import { advancedReportsService, DateRange } from '../reports/advancedReports';

const router = Router();
const logger = createContextLogger({ operation: 'advanced_reports_routes' });

/**
 * Helper function to validate date range
 */
function validateDateRange(startDate: string, endDate: string): DateRange {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date format. Use YYYY-MM-DD');
  }
  
  if (start > end) {
    throw new Error('Start date must be before end date');
  }
  
  // Check if date range is not too large (max 1 year)
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff > 365) {
    throw new Error('Date range cannot exceed 1 year');
  }
  
  return { startDate, endDate };
}

// GET /api/reports/financial - Financial report
router.get('/api/reports/financial', authenticateToken, requireManager, asyncHandler(async (req: AuthRequest, res) => {
  const requestLogger = createContextLogger({ 
    operation: 'financial_report', 
    requestId: req.requestId,
    userId: req.user.userId 
  });
  
  try {
    const { start, end } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({
        ok: false,
        error: 'Start date and end date are required (format: YYYY-MM-DD)'
      });
    }
    
    const dateRange = validateDateRange(start as string, end as string);
    const report = await advancedReportsService.generateFinancialReport(dateRange);
    
    requestLogger.info('Financial report generated', { 
      dateRange, 
      totalRevenue: report.summary.totalRevenue,
      totalTransactions: report.summary.totalTransactions
    });
    
    res.json({
      ok: true,
      report
    });
    
  } catch (error) {
    requestLogger.error('Failed to generate financial report', { 
      error: error.message,
      query: req.query 
    });
    
    res.status(400).json({
      ok: false,
      error: error.message || 'Failed to generate financial report'
    });
  }
}));

// GET /api/reports/inventory - Inventory report
router.get('/api/reports/inventory', authenticateToken, requireManager, asyncHandler(async (req: AuthRequest, res) => {
  const requestLogger = createContextLogger({ 
    operation: 'inventory_report', 
    requestId: req.requestId,
    userId: req.user.userId 
  });
  
  try {
    const { start, end } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({
        ok: false,
        error: 'Start date and end date are required (format: YYYY-MM-DD)'
      });
    }
    
    const dateRange = validateDateRange(start as string, end as string);
    const report = await advancedReportsService.generateInventoryReport(dateRange);
    
    requestLogger.info('Inventory report generated', { 
      dateRange, 
      totalProducts: report.summary.totalProducts,
      lowStockCount: report.summary.lowStockCount
    });
    
    res.json({
      ok: true,
      report
    });
    
  } catch (error) {
    requestLogger.error('Failed to generate inventory report', { 
      error: error.message,
      query: req.query 
    });
    
    res.status(400).json({
      ok: false,
      error: error.message || 'Failed to generate inventory report'
    });
  }
}));

// GET /api/reports/customers - Customer analytics report
router.get('/api/reports/customers', authenticateToken, requireManager, asyncHandler(async (req: AuthRequest, res) => {
  const requestLogger = createContextLogger({ 
    operation: 'customer_report', 
    requestId: req.requestId,
    userId: req.user.userId 
  });
  
  try {
    const { start, end } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({
        ok: false,
        error: 'Start date and end date are required (format: YYYY-MM-DD)'
      });
    }
    
    const dateRange = validateDateRange(start as string, end as string);
    const report = await advancedReportsService.generateCustomerReport(dateRange);
    
    requestLogger.info('Customer report generated', { 
      dateRange, 
      totalCustomers: report.summary.totalCustomers,
      activeCustomers: report.summary.activeCustomers
    });
    
    res.json({
      ok: true,
      report
    });
    
  } catch (error) {
    requestLogger.error('Failed to generate customer report', { 
      error: error.message,
      query: req.query 
    });
    
    res.status(400).json({
      ok: false,
      error: error.message || 'Failed to generate customer report'
    });
  }
}));

// GET /api/reports/performance - Performance analytics report
router.get('/api/reports/performance', authenticateToken, requireManager, asyncHandler(async (req: AuthRequest, res) => {
  const requestLogger = createContextLogger({ 
    operation: 'performance_report', 
    requestId: req.requestId,
    userId: req.user.userId 
  });
  
  try {
    const { start, end } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({
        ok: false,
        error: 'Start date and end date are required (format: YYYY-MM-DD)'
      });
    }
    
    const dateRange = validateDateRange(start as string, end as string);
    const report = await advancedReportsService.generatePerformanceReport(dateRange);
    
    requestLogger.info('Performance report generated', { 
      dateRange, 
      totalSales: report.summary.totalSales,
      totalTransactions: report.summary.totalTransactions
    });
    
    res.json({
      ok: true,
      report
    });
    
  } catch (error) {
    requestLogger.error('Failed to generate performance report', { 
      error: error.message,
      query: req.query 
    });
    
    res.status(400).json({
      ok: false,
      error: error.message || 'Failed to generate performance report'
    });
  }
}));

// GET /api/reports/dashboard - Dashboard summary data
router.get('/api/reports/dashboard', authenticateToken, requireManager, asyncHandler(async (req: AuthRequest, res) => {
  const requestLogger = createContextLogger({ 
    operation: 'dashboard_data', 
    requestId: req.requestId,
    userId: req.user.userId 
  });
  
  try {
    const { period = '7d' } = req.query;
    
    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '1d':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }
    
    const dateRange = {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
    
    // Generate all reports in parallel
    const [financialReport, inventoryReport, customerReport, performanceReport] = await Promise.all([
      advancedReportsService.generateFinancialReport(dateRange),
      advancedReportsService.generateInventoryReport(dateRange),
      advancedReportsService.generateCustomerReport(dateRange),
      advancedReportsService.generatePerformanceReport(dateRange)
    ]);
    
    const dashboard = {
      period,
      dateRange,
      summary: {
        financial: {
          totalRevenue: financialReport.summary.totalRevenue,
          grossProfit: financialReport.summary.grossProfit,
          grossMargin: financialReport.summary.grossMargin,
          totalTransactions: financialReport.summary.totalTransactions,
          averageTransactionValue: financialReport.summary.averageTransactionValue
        },
        inventory: {
          totalProducts: inventoryReport.summary.totalProducts,
          activeProducts: inventoryReport.summary.activeProducts,
          totalValue: inventoryReport.summary.totalValue,
          lowStockCount: inventoryReport.summary.lowStockCount,
          outOfStockCount: inventoryReport.summary.outOfStockCount
        },
        customers: {
          totalCustomers: customerReport.summary.totalCustomers,
          activeCustomers: customerReport.summary.activeCustomers,
          newCustomers: customerReport.summary.newCustomers,
          totalRevenue: customerReport.summary.totalRevenue,
          averageOrderValue: customerReport.summary.averageOrderValue
        },
        performance: {
          totalSales: performanceReport.summary.totalSales,
          totalTransactions: performanceReport.summary.totalTransactions,
          averageTransactionValue: performanceReport.summary.averageTransactionValue,
          peakHour: performanceReport.summary.peakHour,
          peakDay: performanceReport.summary.peakDay,
          busiestTerminal: performanceReport.summary.busiestTerminal
        }
      },
      charts: {
        dailyRevenue: financialReport.dailyBreakdown.map(day => ({
          date: day.date,
          revenue: day.revenue,
          profit: day.profit
        })),
        hourlyPerformance: performanceReport.hourlyAnalysis,
        categoryBreakdown: financialReport.categoryBreakdown.map(cat => ({
          category: cat.category,
          revenue: cat.revenue,
          margin: cat.margin
        })),
        topProducts: inventoryReport.topProducts.slice(0, 10),
        customerGrowth: customerReport.customerGrowth
      },
      alerts: {
        lowStock: inventoryReport.lowStockProducts.slice(0, 5),
        topCustomers: customerReport.topCustomers.slice(0, 5),
        performanceIssues: performanceReport.cashierPerformance
          .filter(c => c.efficiency < 70)
          .slice(0, 3)
      }
    };
    
    requestLogger.info('Dashboard data generated', { 
      period, 
      dateRange,
      totalRevenue: dashboard.summary.financial.totalRevenue,
      totalTransactions: dashboard.summary.financial.totalTransactions
    });
    
    res.json({
      ok: true,
      dashboard
    });
    
  } catch (error) {
    requestLogger.error('Failed to generate dashboard data', { 
      error: error.message,
      query: req.query 
    });
    
    res.status(500).json({
      ok: false,
      error: error.message || 'Failed to generate dashboard data'
    });
  }
}));

// GET /api/reports/export/:type - Export report data
router.get('/api/reports/export/:type', authenticateToken, requireManager, asyncHandler(async (req: AuthRequest, res) => {
  const requestLogger = createContextLogger({ 
    operation: 'export_report', 
    requestId: req.requestId,
    userId: req.user.userId 
  });
  
  try {
    const { type } = req.params;
    const { start, end, format = 'json' } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({
        ok: false,
        error: 'Start date and end date are required (format: YYYY-MM-DD)'
      });
    }
    
    const dateRange = validateDateRange(start as string, end as string);
    let report: any;
    
    switch (type) {
      case 'financial':
        report = await advancedReportsService.generateFinancialReport(dateRange);
        break;
      case 'inventory':
        report = await advancedReportsService.generateInventoryReport(dateRange);
        break;
      case 'customers':
        report = await advancedReportsService.generateCustomerReport(dateRange);
        break;
      case 'performance':
        report = await advancedReportsService.generatePerformanceReport(dateRange);
        break;
      default:
        return res.status(400).json({
          ok: false,
          error: 'Invalid report type. Must be: financial, inventory, customers, or performance'
        });
    }
    
    if (format === 'csv') {
      // Convert to CSV format (simplified)
      const csvData = convertToCSV(report);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-report-${dateRange.startDate}-to-${dateRange.endDate}.csv"`);
      res.send(csvData);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-report-${dateRange.startDate}-to-${dateRange.endDate}.json"`);
      res.json({
        ok: true,
        report,
        exportedAt: new Date().toISOString(),
        exportedBy: req.user.userId
      });
    }
    
    requestLogger.info('Report exported', { 
      type, 
      format, 
      dateRange,
      userId: req.user.userId 
    });
    
  } catch (error) {
    requestLogger.error('Failed to export report', { 
      error: error.message,
      type: req.params.type,
      query: req.query 
    });
    
    res.status(400).json({
      ok: false,
      error: error.message || 'Failed to export report'
    });
  }
}));

/**
 * Helper function to convert report data to CSV format
 */
function convertToCSV(report: any): string {
  // This is a simplified CSV conversion
  // In a real implementation, you'd want more sophisticated CSV generation
  const lines: string[] = [];
  
  // Add summary data
  lines.push('Summary');
  lines.push('Metric,Value');
  if (report.summary) {
    Object.entries(report.summary).forEach(([key, value]) => {
      lines.push(`${key},${value}`);
    });
  }
  
  lines.push(''); // Empty line
  
  // Add daily breakdown if available
  if (report.dailyBreakdown) {
    lines.push('Daily Breakdown');
    lines.push('Date,Revenue,Cost,Profit,Transactions');
    report.dailyBreakdown.forEach((day: any) => {
      lines.push(`${day.date},${day.revenue},${day.cost},${day.profit},${day.transactions}`);
    });
  }
  
  return lines.join('\n');
}

export { router as advancedReportsRouter };










