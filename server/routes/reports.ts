import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error';
import { createRequestLogger } from '../utils/logger';
import { getDatabase } from '../db';
import { createStandardError, ERROR_CODES } from '../utils/errorCodes';
import { auditPerformance, auditLogger } from '../middleware/auditLogger';

const router = Router();

// GET /api/reports/z-report - Z Report (P95 ≤ 500ms target)
router.get('/api/reports/z-report',
  auditPerformance('Z_REPORT'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    const db = getDatabase();
    
    try {
      const date = req.query.date as string || new Date().toISOString().split('T')[0];
      
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        res.status(400).json(createStandardError(
          'Invalid date format. Use YYYY-MM-DD',
          ERROR_CODES.INVALID_FORMAT,
          { date },
          req.requestId
        ));
        return;
      }
      
      // Z Report query - optimized for performance
      const zReport = db.prepare(`
        SELECT 
          COUNT(*) as invoice_count,
          COALESCE(SUM(net), 0) as total_sales,
          COALESCE(SUM(tax), 0) as total_tax,
          COALESCE(SUM(gross), 0) as gross_sales,
          COALESCE(SUM(discount), 0) as total_discounts,
          COALESCE(SUM(CASE WHEN meta LIKE '%"type":"quick-sale"%' THEN 1 ELSE 0 END), 0) as quick_sales_count,
          COALESCE(SUM(CASE WHEN meta LIKE '%"type":"quick-sale"%' THEN net ELSE 0 END), 0) as quick_sales_total
        FROM invoices 
        WHERE DATE(created_at) = ?
      `).get(date) as {
        invoice_count: number;
        total_sales: number;
        total_tax: number;
        gross_sales: number;
        total_discounts: number;
        quick_sales_count: number;
        quick_sales_total: number;
      };

      // Get payment method breakdown
      const paymentBreakdown = db.prepare(`
        SELECT 
          ip.method,
          COALESCE(SUM(ip.amount), 0) as total_amount
        FROM invoice_payments ip
        JOIN invoices i ON ip.invoice_id = i.id
        WHERE DATE(i.created_at) = ?
        GROUP BY ip.method
      `).all(date) as { method: string; total_amount: number }[];
      
      // Top products for the day
      const topProducts = db.prepare(`
        SELECT 
          p.name_en,
          p.sku,
          SUM(il.quantity) as total_quantity,
          SUM(il.total_price) as total_revenue
        FROM invoice_lines il
        JOIN invoices i ON il.invoice_id = i.id
        JOIN products p ON il.product_id = p.id
        WHERE DATE(i.created_at) = ? AND i.status = 'completed'
        GROUP BY p.id, p.name_en, p.sku
        ORDER BY total_revenue DESC
        LIMIT 10
      `).all(date);
      
      // Hourly breakdown
      const hourlyBreakdown = db.prepare(`
        SELECT 
          strftime('%H', created_at) as hour,
          COUNT(*) as invoice_count,
          COALESCE(SUM(total_amount), 0) as total_sales
        FROM invoices 
        WHERE DATE(created_at) = ? AND status = 'completed'
        GROUP BY strftime('%H', created_at)
        ORDER BY hour
      `).all(date);
      
      // Process payment breakdown
      const paymentTotals = {
        cash: 0,
        card: 0,
        wallet: 0
      };
      
      paymentBreakdown.forEach(payment => {
        if (payment.method in paymentTotals) {
          paymentTotals[payment.method as keyof typeof paymentTotals] = payment.total_amount;
        }
      });

      const report = {
        date,
        summary: {
          invoiceCount: zReport.invoice_count,
          totalSales: zReport.total_sales,
          totalTax: zReport.total_tax,
          grossSales: zReport.gross_sales,
          totalDiscounts: zReport.total_discounts,
          netSales: zReport.total_sales - zReport.total_tax,
          paymentBreakdown: {
            cash: paymentTotals.cash,
            card: paymentTotals.card,
            wallet: paymentTotals.wallet
          },
          quickSales: {
            count: zReport.quick_sales_count,
            total: zReport.quick_sales_total
          }
        },
        topProducts,
        hourlyBreakdown,
        generatedAt: new Date().toISOString()
      };
      
      // Log audit event
      auditLogger.log({
        action: 'Z_REPORT_GENERATED',
        entityType: 'report',
        dataSummary: {
          date,
          invoiceCount: zReport.invoice_count,
          totalSales: zReport.total_sales
        }
      }, req);
      
      requestLogger.info('Z Report generated', {
        date,
        invoiceCount: zReport.invoice_count,
        totalSales: zReport.total_sales
      });
      
      res.json({
        ok: true,
        report,
        requestId: req.requestId
      });
      
    } catch (error) {
      requestLogger.error('Z Report generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        date: req.query.date
      });
      
      res.status(500).json(createStandardError(
        'Failed to generate Z Report',
        ERROR_CODES.DATABASE_ERROR,
        { 
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        req.requestId
      ));
    }
  })
);

// GET /api/reports/sales-summary - Sales summary for date range
router.get('/api/reports/sales-summary',
  auditPerformance('SALES_SUMMARY'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    const db = getDatabase();
    
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      if (!startDate || !endDate) {
        res.status(400).json(createStandardError(
          'startDate and endDate are required',
          ERROR_CODES.MISSING_REQUIRED_FIELD,
          { startDate, endDate },
          req.requestId
        ));
        return;
      }
      
      // Validate date formats
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        res.status(400).json(createStandardError(
          'Invalid date format. Use YYYY-MM-DD',
          ERROR_CODES.INVALID_FORMAT,
          { startDate, endDate },
          req.requestId
        ));
        return;
      }
      
      const summary = db.prepare(`
        SELECT 
          COUNT(*) as invoice_count,
          COALESCE(SUM(total_amount), 0) as total_sales,
          COALESCE(SUM(tax_amount), 0) as total_tax,
          COALESCE(AVG(total_amount), 0) as avg_invoice_value,
          COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_sales,
          COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END), 0) as card_sales
        FROM invoices 
        WHERE DATE(created_at) BETWEEN ? AND ? AND status = 'completed'
      `).get(startDate, endDate) as {
        invoice_count: number;
        total_sales: number;
        total_tax: number;
        avg_invoice_value: number;
        cash_sales: number;
        card_sales: number;
      };
      
      const dailyBreakdown = db.prepare(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as invoice_count,
          COALESCE(SUM(total_amount), 0) as total_sales
        FROM invoices 
        WHERE DATE(created_at) BETWEEN ? AND ? AND status = 'completed'
        GROUP BY DATE(created_at)
        ORDER BY date
      `).all(startDate, endDate);
      
      const report = {
        period: { startDate, endDate },
        summary: {
          invoiceCount: summary.invoice_count,
          totalSales: summary.total_sales,
          totalTax: summary.total_tax,
          netSales: summary.total_sales - summary.total_tax,
          avgInvoiceValue: summary.avg_invoice_value,
          paymentBreakdown: {
            cash: summary.cash_sales,
            card: summary.card_sales
          }
        },
        dailyBreakdown,
        generatedAt: new Date().toISOString()
      };
      
      requestLogger.info('Sales summary generated', {
        startDate,
        endDate,
        invoiceCount: summary.invoice_count,
        totalSales: summary.total_sales
      });
      
      res.json({
        ok: true,
        report,
        requestId: req.requestId
      });
      
    } catch (error) {
      requestLogger.error('Sales summary generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        startDate: req.query.startDate,
        endDate: req.query.endDate
      });
      
      res.status(500).json(createStandardError(
        'Failed to generate sales summary',
        ERROR_CODES.DATABASE_ERROR,
        { 
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        req.requestId
      ));
    }
  })
);

// GET /api/reports/inventory - Inventory report
router.get('/api/reports/inventory',
  auditPerformance('INVENTORY_REPORT'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    const db = getDatabase();
    
    try {
      const lowStockThreshold = parseInt(req.query.lowStockThreshold as string) || 10;
      
      const inventory = db.prepare(`
        SELECT 
          p.id, p.sku, p.barcode, p.name_en, p.name_si, p.name_ta,
          p.price_retail, p.cost, p.reorder_level, p.is_active,
          c.name as category_name,
          COALESCE(SUM(il.quantity), 0) as total_sold,
          COALESCE(SUM(il.total_price), 0) as total_revenue
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN invoice_lines il ON p.id = il.product_id
        LEFT JOIN invoices i ON il.invoice_id = i.id AND i.status = 'completed'
        WHERE p.is_active = 1
        GROUP BY p.id, p.sku, p.barcode, p.name_en, p.name_si, p.name_ta,
                 p.price_retail, p.cost, p.reorder_level, p.is_active, c.name
        ORDER BY total_revenue DESC
      `).all() as Array<{
        id: number;
        sku: string;
        barcode: string;
        name_en: string;
        name_si: string;
        name_ta: string;
        price_retail: number;
        cost: number;
        reorder_level: number;
        is_active: number;
        category_name: string;
        total_sold: number;
        total_revenue: number;
      }>;
      
      const lowStockItems = inventory.filter(item => 
        item.reorder_level && item.total_sold >= item.reorder_level
      );
      
      const report = {
        totalProducts: inventory.length,
        lowStockItems: lowStockItems.length,
        lowStockThreshold,
        inventory,
        generatedAt: new Date().toISOString()
      };
      
      requestLogger.info('Inventory report generated', {
        totalProducts: inventory.length,
        lowStockItems: lowStockItems.length
      });
      
      res.json({
        ok: true,
        report,
        requestId: req.requestId
      });
      
    } catch (error) {
      requestLogger.error('Inventory report generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(500).json(createStandardError(
        'Failed to generate inventory report',
        ERROR_CODES.DATABASE_ERROR,
        { 
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        req.requestId
      ));
    }
  })
);

export default router;
