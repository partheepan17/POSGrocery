/**
 * Stock Ledger Routes
 * Provides access to stock ledger view with running calculations
 */

import express from 'express';
import { getDatabase } from '../db/database';
import { createRequestLogger } from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticateToken, requireManager } from '../middleware/auth';
import { requirePolicy, extractTenant } from '../../src/middleware/policy';

const stockLedgerRouter = express.Router();

// Get stock ledger with optional filters
stockLedgerRouter.get('/', 
  extractTenant,
  authenticateToken, 
  requirePolicy({ feature: 'inventory.view', permission: 'inventory.view' }),
  asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const db = getDatabase();
    
    // Parse query parameters
    const productId = req.query.product_id ? parseInt(req.query.product_id as string) : null;
    const startDate = req.query.start as string;
    const endDate = req.query.end as string;
    const movementType = req.query.movement_type as string;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 50, 200);
    const offset = (page - 1) * pageSize;
    
    // Build WHERE clause
    const whereConditions: string[] = [];
    const params: any[] = [];
    
    if (productId) {
      whereConditions.push('product_id = ?');
      params.push(productId);
    }
    
    if (startDate) {
      whereConditions.push('created_at >= ?');
      params.push(startDate);
    }
    
    if (endDate) {
      whereConditions.push('created_at <= ?');
      params.push(endDate);
    }
    
    if (movementType) {
      whereConditions.push('movement_type = ?');
      params.push(movementType);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get ledger entries
    const ledgerQuery = `
      SELECT 
        id,
        product_id,
        product_name,
        sku,
        movement_type,
        qty,
        unit_cost,
        total_cost,
        ref_type,
        ref_id,
        notes,
        created_at,
        created_by,
        created_by_username,
        created_by_name,
        running_qty,
        running_value,
        running_avg_cost,
        balance_after,
        lot_number,
        lot_source,
        movement_direction,
        movement_type_desc
      FROM vw_stock_ledger
      ${whereClause}
      ORDER BY product_id, created_at, id
      LIMIT ? OFFSET ?
    `;
    
    const ledgerEntries = db.prepare(ledgerQuery).all(...params, pageSize, offset);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM vw_stock_ledger
      ${whereClause}
    `;
    
    const totalResult = db.prepare(countQuery).get(...params);
    const total = (totalResult as any).total;
    const totalPages = Math.ceil(total / pageSize);
    
    // Get summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_movements,
        COUNT(DISTINCT product_id) as products_affected,
        SUM(qty) as net_quantity_change,
        SUM(total_cost) as total_value_change,
        AVG(running_avg_cost) as avg_running_cost
      FROM vw_stock_ledger
      ${whereClause}
    `;
    
    const summary = db.prepare(summaryQuery).get(...params);
    
    requestLogger.info({
      productId,
      startDate,
      endDate,
      movementType,
      page,
      pageSize,
      total,
      totalPages
    }, 'Retrieved stock ledger');
    
    res.json({
      success: true,
      data: {
        ledger: ledgerEntries,
        pagination: {
          page,
          pageSize,
          total,
          totalPages
        },
        summary: {
          total_movements: summary?.total_movements || 0,
          products_affected: summary?.products_affected || 0,
          net_quantity_change: summary?.net_quantity_change || 0,
          total_value_change: summary?.total_value_change || 0,
          avg_running_cost: summary?.avg_running_cost || 0
        }
      },
      requestId: req.requestId
    });
    
  } catch (error: any) {
    requestLogger.error({ error: error.message }, 'Failed to get stock ledger');
    res.status(500).json({
      success: false,
      error: 'Failed to get stock ledger',
      message: error.message
    });
  }
}));

// Get stock ledger for a specific product
stockLedgerRouter.get('/product/:productId', 
  extractTenant,
  authenticateToken, 
  requirePolicy({ feature: 'inventory.view', permission: 'inventory.view' }),
  asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const productId = parseInt(req.params.productId);
    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID'
      });
    }
    
    const db = getDatabase();
    const startDate = req.query.start as string;
    const endDate = req.query.end as string;
    
    // Build WHERE clause
    const whereConditions = ['product_id = ?'];
    const params: any[] = [productId];
    
    if (startDate) {
      whereConditions.push('created_at >= ?');
      params.push(startDate);
    }
    
    if (endDate) {
      whereConditions.push('created_at <= ?');
      params.push(endDate);
    }
    
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    
    // Get product ledger
    const ledgerQuery = `
      SELECT 
        id,
        product_id,
        product_name,
        sku,
        movement_type,
        qty,
        unit_cost,
        total_cost,
        ref_type,
        ref_id,
        notes,
        created_at,
        created_by,
        created_by_username,
        created_by_name,
        running_qty,
        running_value,
        running_avg_cost,
        balance_after,
        lot_number,
        lot_source,
        movement_direction,
        movement_type_desc
      FROM vw_stock_ledger
      ${whereClause}
      ORDER BY created_at, id
    `;
    
    const ledgerEntries = db.prepare(ledgerQuery).all(...params);
    
    // Get product summary
    const productQuery = `
      SELECT 
        p.id,
        p.name_en,
        p.sku,
        ps.current_quantity,
        ps.total_value,
        ps.average_cost,
        COUNT(vsl.id) as movement_count,
        SUM(vsl.qty) as net_quantity_change,
        SUM(vsl.total_cost) as net_value_change
      FROM products p
      LEFT JOIN product_stock ps ON p.id = ps.product_id
      LEFT JOIN vw_stock_ledger vsl ON p.id = vsl.product_id ${whereClause.replace('product_id = ?', 'vsl.product_id = ?')}
      WHERE p.id = ?
      GROUP BY p.id, p.name_en, p.sku, ps.current_quantity, ps.total_value, ps.average_cost
    `;
    
    const productSummary = db.prepare(productQuery).get(productId, ...params.slice(1));
    
    requestLogger.info({ productId, startDate, endDate, count: ledgerEntries.length }, 'Retrieved product stock ledger');
    
    res.json({
      success: true,
      data: {
        product: productSummary,
        ledger: ledgerEntries
      },
      requestId: req.requestId
    });
    
  } catch (error: any) {
    requestLogger.error({ error: error.message }, 'Failed to get product stock ledger');
    res.status(500).json({
      success: false,
      error: 'Failed to get product stock ledger',
      message: error.message
    });
  }
}));

// Get stock ledger summary by movement type
stockLedgerRouter.get('/summary/movement-types', 
  extractTenant,
  authenticateToken, 
  requirePolicy({ feature: 'inventory.view', permission: 'inventory.view' }),
  asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const db = getDatabase();
    const startDate = req.query.start as string;
    const endDate = req.query.end as string;
    
    // Build WHERE clause
    const whereConditions: string[] = [];
    const params: any[] = [];
    
    if (startDate) {
      whereConditions.push('created_at >= ?');
      params.push(startDate);
    }
    
    if (endDate) {
      whereConditions.push('created_at <= ?');
      params.push(endDate);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get summary by movement type
    const summaryQuery = `
      SELECT 
        movement_type,
        movement_type_desc,
        COUNT(*) as movement_count,
        COUNT(DISTINCT product_id) as products_affected,
        SUM(qty) as net_quantity_change,
        SUM(total_cost) as net_value_change,
        AVG(unit_cost) as avg_unit_cost,
        MIN(created_at) as first_movement,
        MAX(created_at) as last_movement
      FROM vw_stock_ledger
      ${whereClause}
      GROUP BY movement_type, movement_type_desc
      ORDER BY movement_count DESC
    `;
    
    const summary = db.prepare(summaryQuery).all(...params);
    
    requestLogger.info({ startDate, endDate, types: summary.length }, 'Retrieved movement type summary');
    
    res.json({
      success: true,
      data: summary,
      requestId: req.requestId
    });
    
  } catch (error: any) {
    requestLogger.error({ error: error.message }, 'Failed to get movement type summary');
    res.status(500).json({
      success: false,
      error: 'Failed to get movement type summary',
      message: error.message
    });
  }
}));

// Get stock ledger summary by date range
stockLedgerRouter.get('/summary/date-range', 
  extractTenant,
  authenticateToken, 
  requirePolicy({ feature: 'inventory.view', permission: 'inventory.view' }),
  asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const db = getDatabase();
    const startDate = req.query.start as string;
    const endDate = req.query.end as string;
    const groupBy = (req.query.group_by as string) || 'day'; // day, week, month
    
    // Build WHERE clause
    const whereConditions: string[] = [];
    const params: any[] = [];
    
    if (startDate) {
      whereConditions.push('created_at >= ?');
      params.push(startDate);
    }
    
    if (endDate) {
      whereConditions.push('created_at <= ?');
      params.push(endDate);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Determine date grouping
    let dateGrouping: string;
    switch (groupBy) {
      case 'week':
        dateGrouping = "strftime('%Y-%W', created_at)";
        break;
      case 'month':
        dateGrouping = "strftime('%Y-%m', created_at)";
        break;
      case 'day':
      default:
        dateGrouping = "DATE(created_at)";
        break;
    }
    
    // Get summary by date range
    const summaryQuery = `
      SELECT 
        ${dateGrouping} as period,
        COUNT(*) as movement_count,
        COUNT(DISTINCT product_id) as products_affected,
        SUM(qty) as net_quantity_change,
        SUM(total_cost) as net_value_change,
        AVG(running_avg_cost) as avg_running_cost
      FROM vw_stock_ledger
      ${whereClause}
      GROUP BY ${dateGrouping}
      ORDER BY period DESC
    `;
    
    const summary = db.prepare(summaryQuery).all(...params);
    
    requestLogger.info({ startDate, endDate, groupBy, periods: summary.length }, 'Retrieved date range summary');
    
    res.json({
      success: true,
      data: summary,
      requestId: req.requestId
    });
    
  } catch (error: any) {
    requestLogger.error({ error: error.message }, 'Failed to get date range summary');
    res.status(500).json({
      success: false,
      error: 'Failed to get date range summary',
      message: error.message
    });
  }
}));

export default stockLedgerRouter;
