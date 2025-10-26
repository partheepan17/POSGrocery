/**
 * Expiry Reports Route
 * Near-expiry and expiry management reports
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error';
import { createContextLogger } from '../utils/logger';
import { createStandardError, ERROR_CODES } from '../utils/errorCodes';
import { auditPerformance } from '../middleware/auditLogger';
import { authenticateToken, requireRole } from '../middleware/auth';
import { expiryAlertService } from '../alerts/expiryAlerts';
import { fefoManager } from '../utils/fefoManager';

const router = Router();

// Request validation schemas
const ExpiryReportSchema = z.object({
  days_threshold: z.number().min(0).max(365).optional(),
  status: z.enum(['all', 'expired', 'critical', 'near_expiry']).optional(),
  category_id: z.number().positive().optional(),
  export_format: z.enum(['json', 'csv']).optional()
});

const ProductExpirySchema = z.object({
  product_id: z.number().positive()
});

// GET /api/reports/near-expiry - Get near-expiry products report
router.get('/api/reports/near-expiry',
  authenticateToken,
  requireRole(['admin', 'manager', 'cashier']),
  auditPerformance('expiry_reports_near_expiry'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'expiry_reports_near_expiry', requestId: req.requestId });
    
    try {
      // Validate query parameters
      const validationResult = ExpiryReportSchema.safeParse(req.query);
      if (!validationResult.success) {
        res.status(400).json(createStandardError(
          'Invalid expiry report parameters',
          ERROR_CODES.INVALID_INPUT,
          { errors: validationResult.error.errors },
          req.requestId
        ));
        return;
      }
      
      const { days_threshold, status, category_id, export_format } = validationResult.data;
      const threshold = days_threshold || 30;
      
      requestLogger.info({ 
        threshold, 
        status, 
        category_id, 
        export_format 
      }, 'Generating near-expiry report');
      
      // Get near expiry products
      const nearExpiryProducts = await expiryAlertService.getNearExpiryProducts(threshold);
      
      // Filter by status if specified
      let filteredProducts = nearExpiryProducts;
      if (status && status !== 'all') {
        filteredProducts = nearExpiryProducts.filter(product => {
          switch (status) {
            case 'expired':
              return product.expiry_status === 'Expired';
            case 'critical':
              return product.expiry_status === 'Critical';
            case 'near_expiry':
              return product.expiry_status === 'Near Expiry';
            default:
              return true;
          }
        });
      }
      
      // Filter by category if specified
      if (category_id) {
        filteredProducts = filteredProducts.filter(product => 
          product.category_name && product.category_name.includes(category_id.toString())
        );
      }
      
      // Get summary statistics
      const summary = {
        total_lots: filteredProducts.length,
        expired_lots: filteredProducts.filter(p => p.expiry_status === 'Expired').length,
        critical_lots: filteredProducts.filter(p => p.expiry_status === 'Critical').length,
        near_expiry_lots: filteredProducts.filter(p => p.expiry_status === 'Near Expiry').length,
        total_value_at_risk: filteredProducts.reduce((sum, p) => sum + p.total_value_cents, 0),
        threshold_days: threshold
      };
      
      requestLogger.info({ 
        totalLots: summary.total_lots,
        expiredLots: summary.expired_lots,
        criticalLots: summary.critical_lots,
        nearExpiryLots: summary.near_expiry_lots
      }, 'Near-expiry report generated');
      
      // Handle CSV export
      if (export_format === 'csv') {
        const csvData = generateExpiryCSV(filteredProducts);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="near-expiry-report-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvData);
        return;
      }
      
      res.json({
        ok: true,
        data: {
          summary,
          products: filteredProducts,
          generated_at: new Date().toISOString(),
          filters: {
            days_threshold: threshold,
            status: status || 'all',
            category_id: category_id || null
          }
        },
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to generate near-expiry report', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Failed to generate near-expiry report',
        ERROR_CODES.INTERNAL_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

// GET /api/reports/expiry-summary - Get expiry summary for dashboard
router.get('/api/reports/expiry-summary',
  authenticateToken,
  requireRole(['admin', 'manager', 'cashier']),
  auditPerformance('expiry_reports_summary'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'expiry_reports_summary', requestId: req.requestId });
    
    try {
      requestLogger.info('Generating expiry summary');
      
      const summary = await expiryAlertService.getExpirySummary();
      
      requestLogger.info({ summary }, 'Expiry summary generated');
      
      res.json({
        ok: true,
        data: summary,
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to generate expiry summary', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Failed to generate expiry summary',
        ERROR_CODES.INTERNAL_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

// GET /api/reports/product-expiry/:productId - Get expiry info for specific product
router.get('/api/reports/product-expiry/:productId',
  authenticateToken,
  requireRole(['admin', 'manager', 'cashier']),
  auditPerformance('expiry_reports_product'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'expiry_reports_product', requestId: req.requestId });
    
    try {
      // Validate product ID
      const validationResult = ProductExpirySchema.safeParse({ product_id: parseInt(req.params.productId) });
      if (!validationResult.success) {
        res.status(400).json(createStandardError(
          'Invalid product ID',
          ERROR_CODES.INVALID_INPUT,
          { errors: validationResult.error.errors },
          req.requestId
        ));
        return;
      }
      
      const { product_id } = validationResult.data;
      
      requestLogger.info({ productId: product_id }, 'Getting product expiry info');
      
      // Get product expiry information
      const expiryInfo = fefoManager.getProductExpiryInfo(product_id);
      const lotsWithExpiry = fefoManager.getProductLotsWithExpiry(product_id);
      
      requestLogger.info({ 
        productId: product_id,
        hasExpiry: expiryInfo.hasExpiry,
        lotsCount: lotsWithExpiry.length
      }, 'Product expiry info retrieved');
      
      res.json({
        ok: true,
        data: {
          product_id,
          expiry_info: expiryInfo,
          lots: lotsWithExpiry,
          generated_at: new Date().toISOString()
        },
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to get product expiry info', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Failed to get product expiry info',
        ERROR_CODES.INTERNAL_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

// POST /api/reports/expiry-test - Test expiry alert configuration
router.post('/api/reports/expiry-test',
  authenticateToken,
  requireRole(['admin']),
  auditPerformance('expiry_reports_test'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'expiry_reports_test', requestId: req.requestId });
    
    try {
      requestLogger.info('Testing expiry alert configuration');
      
      await expiryAlertService.testAlert();
      
      requestLogger.info('Expiry test alert sent successfully');
      
      res.json({
        ok: true,
        data: { message: 'Expiry test alert sent successfully' },
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to send expiry test alert', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Failed to send expiry test alert',
        ERROR_CODES.INTERNAL_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

// GET /api/reports/expiry-config - Get expiry alert configuration
router.get('/api/reports/expiry-config',
  authenticateToken,
  requireRole(['admin', 'manager']),
  auditPerformance('expiry_reports_config'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'expiry_reports_config', requestId: req.requestId });
    
    try {
      const config = {
        expiry_days_threshold: parseInt(process.env.ALERTS_EXPIRY_DAYS_THRESHOLD || '30'),
        critical_days_threshold: parseInt(process.env.ALERTS_CRITICAL_EXPIRY_DAYS || '7'),
        channels: {
          slack: {
            enabled: process.env.ALERTS_SLACK_ENABLED === 'true',
            configured: !!process.env.ALERTS_SLACK_WEBHOOK_URL
          },
          telegram: {
            enabled: process.env.ALERTS_TELEGRAM_ENABLED === 'true',
            configured: !!(process.env.ALERTS_TELEGRAM_BOT_TOKEN && process.env.ALERTS_TELEGRAM_CHAT_ID)
          },
          email: {
            enabled: process.env.ALERTS_EMAIL_ENABLED === 'true',
            configured: !!(process.env.ALERTS_EMAIL_SMTP_HOST && process.env.ALERTS_EMAIL_TO)
          }
        }
      };
      
      requestLogger.info('Expiry configuration retrieved');
      
      res.json({
        ok: true,
        data: config,
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to get expiry configuration', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Failed to get expiry configuration',
        ERROR_CODES.INTERNAL_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

/**
 * Generate CSV data for expiry report
 */
function generateExpiryCSV(products: any[]): string {
  const headers = [
    'Product ID',
    'SKU',
    'Product Name (EN)',
    'Product Name (SI)',
    'Product Name (TA)',
    'Unit',
    'Category',
    'Lot ID',
    'Lot Number',
    'Quantity Remaining',
    'Expiry Date',
    'Days to Expiry',
    'Expiry Status',
    'Unit Cost (LKR)',
    'Total Value (LKR)'
  ];
  
  const rows = products.map(product => [
    product.product_id,
    product.sku,
    product.name_en,
    product.name_si || '',
    product.name_ta || '',
    product.unit,
    product.category_name || '',
    product.lot_id,
    product.lot_number,
    product.quantity_remaining,
    product.expiry_date,
    product.days_to_expiry,
    product.expiry_status,
    (product.unit_cost_cents / 100).toFixed(2),
    (product.total_value_cents / 100).toFixed(2)
  ]);
  
  return [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
}

export { router as expiryReportsRouter };










