/**
 * Stock Management API Routes
 * Provides endpoints for stock on hand, movements, and valuation
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error';
import { createRequestLogger } from '../utils/logger';
import { getDatabase } from '../db';
import { createStandardError, ERROR_CODES } from '../utils/errorCodes';
import { auditPerformance } from '../middleware/auditLogger';
import { valuationEngine, ValuationMethod } from '../utils/valuationEngine';
import { dailySnapshotService } from '../jobs/dailySnapshot';
import { z } from 'zod';

const router = Router();

// Validation schemas
const SOHQuerySchema = z.object({
  search: z.string().optional(),
  category_id: z.string().transform(val => val ? parseInt(val) : undefined).optional(),
  page: z.string().transform(val => parseInt(val) || 1).optional(),
  pageSize: z.string().transform(val => parseInt(val) || 20).optional(),
  method: z.enum(['fifo', 'average', 'lifo']).optional()
});

const MovementsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.string().transform(val => parseInt(val) || 50).optional()
});

const ValuationQuerySchema = z.object({
  method: z.enum(['fifo', 'average', 'lifo']).optional()
});

// GET /api/stock/soh - Stock on Hand with search, filters, and pagination
router.get('/api/stock/soh',
  auditPerformance('STOCK_SOH'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      // Validate query parameters
      const { search, category_id, page = 1, pageSize = 20, method = 'average' } = SOHQuerySchema.parse(req.query);
      
      // Validate pageSize
      const allowedPageSizes = [10, 20, 50, 100];
      if (!allowedPageSizes.includes(pageSize)) {
        return res.status(400).json({
          ok: false,
          code: 'VALIDATION_ERROR',
          message: `Invalid pageSize. Must be one of: ${allowedPageSizes.join(', ')}`,
          provided: req.query.pageSize
        });
      }

      const db = getDatabase();
      const offset = (page - 1) * pageSize;
      
      requestLogger.debug({ search, category_id, page, pageSize, method }, 'Fetching stock on hand');

      // Build WHERE clause
      const whereConditions = ['p.is_active = 1'];
      const params: any[] = [];

      if (search) {
        whereConditions.push(`(
          LOWER(p.name_en) LIKE ? OR 
          LOWER(p.name_si) LIKE ? OR 
          LOWER(p.name_ta) LIKE ? OR 
          LOWER(p.sku) LIKE ? OR 
          LOWER(p.barcode) LIKE ?
        )`);
        const searchTerm = `%${search.toLowerCase()}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }

      if (category_id) {
        whereConditions.push('p.category_id = ?');
        params.push(category_id);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const totalResult = db.prepare(`
        SELECT COUNT(DISTINCT p.id) as total
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ${whereClause}
      `).get(...params) as { total: number };

      const total = totalResult.total;

      // Get products with stock data
      const sql = `
        SELECT 
          p.id as product_id,
          p.sku,
          p.name_en,
          p.name_si,
          p.name_ta,
          p.unit,
          p.category_id,
          c.name as category_name,
          COALESCE(SUM(sl.quantity), 0) as qty_on_hand,
          pcp.cost_method
        FROM products p
        LEFT JOIN stock_ledger sl ON p.id = sl.product_id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN product_cost_policy pcp ON p.id = pcp.product_id
        ${whereClause}
        GROUP BY p.id, p.sku, p.name_en, p.name_si, p.name_ta, p.unit, p.category_id, c.name, pcp.cost_method
        ORDER BY p.name_en ASC
        LIMIT ? OFFSET ?
      `;
      
      requestLogger.debug({ sql, params: [...params, pageSize, offset] }, 'Executing SOH query');
      
      const products = db.prepare(sql).all(...params, pageSize, offset) as any[];

      // Calculate valuations
      const items = products.map(product => {
        const qtyOnHand = product.qty_on_hand;
        const valuationMethod = (method.toUpperCase() as ValuationMethod) || 
                               (product.cost_method as ValuationMethod) || 
                               'AVERAGE';
        
        const valuation = valuationEngine.computeValuation(
          product.product_id, 
          qtyOnHand, 
          valuationMethod
        );

        return {
          product_id: product.product_id,
          sku: product.sku,
          name_en: product.name_en,
          name_si: product.name_si,
          name_ta: product.name_ta,
          unit: product.unit,
          category_id: product.category_id,
          category_name: product.category_name,
          qty_on_hand: qtyOnHand,
          value_cents: valuation.value_cents,
          method: valuationMethod,
          has_unknown_cost: valuation.has_unknown_cost
        };
      });

      const pages = Math.ceil(total / pageSize);

      requestLogger.info('Stock on hand retrieved successfully', {
        total,
        page,
        pageSize,
        itemsCount: items.length,
        method
      });

      res.json({
        ok: true,
        items,
        meta: {
          page,
          pageSize,
          total,
          pages,
          hasNext: page < pages,
          hasPrev: page > 1
        },
        requestId: req.requestId
      });

    } catch (error: any) {
      requestLogger.error('Failed to get stock on hand', {
        error: error.message,
        requestId: req.requestId
      });

      if (error.name === 'ZodError') {
        return res.status(400).json({
          ok: false,
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: error.errors,
          requestId: req.requestId
        });
      }

      res.status(500).json({
        ok: false,
        message: 'Failed to get stock on hand',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

// GET /api/stock/:productId/movements - Product movement history
router.get('/api/stock/:productId/movements',
  auditPerformance('STOCK_MOVEMENTS'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const productId = parseInt(req.params.productId);
      const { from, to, limit = 50 } = MovementsQuerySchema.parse(req.query);

      if (isNaN(productId) || productId <= 0) {
        throw createStandardError(
          'Invalid product ID',
          ERROR_CODES.INVALID_INPUT,
          { productId: req.params.productId },
          req.requestId
        );
      }

      const db = getDatabase();

      // Check if product exists
      const product = db.prepare(`
        SELECT id, sku, name_en FROM products WHERE id = ? AND is_active = 1
      `).get(productId) as { id: number; sku: string; name_en: string } | undefined;

      if (!product) {
        throw createStandardError(
          'Product not found',
          ERROR_CODES.PRODUCT_NOT_FOUND,
          { productId },
          req.requestId
        );
      }

      // Build WHERE clause for date range
      const whereConditions = ['product_id = ?'];
      const params: any[] = [productId];

      if (from) {
        whereConditions.push('created_at >= ?');
        params.push(from);
      }

      if (to) {
        whereConditions.push('created_at <= ?');
        params.push(to);
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      // Get movements
      const movements = db.prepare(`
        SELECT 
          id,
          created_at,
          quantity as delta_qty,
          balance_quantity as balance_after,
          movement_type as reason,
          reference_id as ref_id,
          unit_cost * 100 as unit_cost_cents,
          batch_number as lot_id,
          notes
        FROM stock_ledger
        ${whereClause}
        ORDER BY created_at DESC, id DESC
        LIMIT ?
      `).all(...params, limit) as any[];

      requestLogger.info('Product movements retrieved successfully', {
        productId,
        movementsCount: movements.length,
        limit
      });

      res.json({
        ok: true,
        product: {
          id: product.id,
          sku: product.sku,
          name_en: product.name_en
        },
        movements,
        meta: {
          limit,
          count: movements.length,
          hasMore: movements.length === limit
        },
        requestId: req.requestId
      });

    } catch (error: any) {
      requestLogger.error('Failed to get product movements', {
        error: error.message,
        productId: req.params.productId,
        requestId: req.requestId
      });

      if (error.code === ERROR_CODES.PRODUCT_NOT_FOUND) {
        return res.status(404).json({
          ok: false,
          code: error.code,
          message: error.message,
          requestId: req.requestId
        });
      }

      if (error.name === 'ZodError') {
        return res.status(400).json({
          ok: false,
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: error.errors,
          requestId: req.requestId
        });
      }

      res.status(500).json({
        ok: false,
        message: 'Failed to get product movements',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

// GET /api/stock/valuation - Full inventory valuation
router.get('/api/stock/valuation',
  auditPerformance('STOCK_VALUATION'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const { method = 'average' } = ValuationQuerySchema.parse(req.query);
      const valuationMethod = method.toUpperCase() as ValuationMethod;

      requestLogger.debug({ method: valuationMethod }, 'Computing inventory valuation');

      // Get total valuation
      const totalValuation = valuationEngine.getTotalInventoryValue(valuationMethod);

      // Get detailed breakdown by product
      const db = getDatabase();
      const products = db.prepare(`
        SELECT DISTINCT p.id as product_id
        FROM products p
        LEFT JOIN stock_ledger sl ON p.id = sl.product_id
        WHERE p.is_active = 1
        GROUP BY p.id
        HAVING COALESCE(SUM(sl.quantity), 0) > 0
        ORDER BY p.id
      `).all() as { product_id: number }[];

      const productValuations = products.map(({ product_id }) => {
        const qtyOnHand = valuationEngine.getSOH(product_id);
        const valuation = valuationEngine.computeValuation(product_id, qtyOnHand, valuationMethod);
        
        return {
          product_id,
          qty_on_hand: qtyOnHand,
          value_cents: valuation.value_cents,
          has_unknown_cost: valuation.has_unknown_cost
        };
      });

      requestLogger.info('Inventory valuation computed successfully', {
        method: valuationMethod,
        totalValue: totalValuation.total_value_cents,
        totalProducts: totalValuation.total_products,
        productsWithUnknownCost: totalValuation.products_with_unknown_cost
      });

      res.json({
        ok: true,
        method: valuationMethod,
        total_value_cents: totalValuation.total_value_cents,
        total_products: totalValuation.total_products,
        products_with_unknown_cost: totalValuation.products_with_unknown_cost,
        items: productValuations,
        requestId: req.requestId
      });

    } catch (error: any) {
      requestLogger.error('Failed to compute inventory valuation', {
        error: error.message,
        requestId: req.requestId
      });

      if (error.name === 'ZodError') {
        return res.status(400).json({
          ok: false,
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: error.errors,
          requestId: req.requestId
        });
      }

      res.status(500).json({
        ok: false,
        message: 'Failed to compute inventory valuation',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

// GET /api/stock/snapshot - Daily stock snapshot
router.get('/api/stock/snapshot',
  auditPerformance('STOCK_SNAPSHOT'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const { date, method = 'average' } = req.query;
      const snapshotDate = date as string || new Date().toISOString().split('T')[0];
      const valuationMethod = (method as string).toUpperCase() as ValuationMethod;

      const db = getDatabase();

      // Get snapshot data using the daily snapshot service
      const snapshots = dailySnapshotService.getSnapshot(snapshotDate);
      const summary = dailySnapshotService.getSnapshotSummary(snapshotDate);

      if (snapshots.length === 0) {
        return res.status(404).json({
          ok: false,
          code: 'SNAPSHOT_NOT_FOUND',
          message: `No snapshot found for date ${snapshotDate}`,
          requestId: req.requestId
        });
      }

      requestLogger.info('Stock snapshot retrieved successfully', {
        date: snapshotDate,
        method: summary?.valuation_method || valuationMethod,
        itemsCount: snapshots.length,
        totalValue: summary?.total_value_cents || 0
      });

      res.json({
        ok: true,
        date: snapshotDate,
        method: summary?.valuation_method || valuationMethod,
        total_value_cents: summary?.total_value_cents || 0,
        total_products: summary?.total_products || 0,
        products_with_stock: summary?.products_with_stock || 0,
        products_out_of_stock: summary?.products_out_of_stock || 0,
        products_low_stock: summary?.products_low_stock || 0,
        items: snapshots,
        requestId: req.requestId
      });

    } catch (error: any) {
      requestLogger.error('Failed to get stock snapshot', {
        error: error.message,
        requestId: req.requestId
      });

      res.status(500).json({
        ok: false,
        message: 'Failed to get stock snapshot',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

// POST /api/stock/snapshot/create - Create daily snapshot
router.post('/api/stock/snapshot/create',
  auditPerformance('STOCK_SNAPSHOT_CREATE'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const { method = 'average' } = req.body;
      const valuationMethod = (method as string).toUpperCase() as ValuationMethod;

      // Create daily snapshot
      const summary = await dailySnapshotService.createDailySnapshot(valuationMethod);

      requestLogger.info('Daily stock snapshot created successfully', {
        date: summary.snapshot_date,
        method: summary.valuation_method,
        totalProducts: summary.total_products,
        totalValue: summary.total_value_cents
      });

      res.json({
        ok: true,
        message: 'Daily snapshot created successfully',
        summary,
        requestId: req.requestId
      });

    } catch (error: any) {
      requestLogger.error('Failed to create daily snapshot', { error: error.message });
      
      res.status(500).json({
        ok: false,
        message: 'Failed to create daily snapshot',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

// GET /api/stock/snapshot/dates - Get available snapshot dates
router.get('/api/stock/snapshot/dates',
  auditPerformance('STOCK_SNAPSHOT_DATES'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const dates = dailySnapshotService.getAvailableDates();

      requestLogger.info('Snapshot dates retrieved successfully', {
        count: dates.length
      });

      res.json({
        ok: true,
        dates,
        requestId: req.requestId
      });

    } catch (error: any) {
      requestLogger.error('Failed to get snapshot dates', { error: error.message });
      
      res.status(500).json({
        ok: false,
        message: 'Failed to get snapshot dates',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

// GET /api/stock/snapshot/trends - Get snapshot trends
router.get('/api/stock/snapshot/trends',
  auditPerformance('STOCK_SNAPSHOT_TRENDS'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const { days = 30 } = req.query;
      const trends = dailySnapshotService.getSnapshotTrends(Number(days));

      requestLogger.info('Snapshot trends retrieved successfully', {
        days: Number(days),
        count: trends.length
      });

      res.json({
        ok: true,
        trends,
        requestId: req.requestId
      });

    } catch (error: any) {
      requestLogger.error('Failed to get snapshot trends', { error: error.message });
      
      res.status(500).json({
        ok: false,
        message: 'Failed to get snapshot trends',
        error: error.message,
        requestId: req.requestId
      });
    }
  })
);

export default router;
