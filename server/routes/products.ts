/**
 * Products API Routes
 * Handles product CRUD operations, search, and management
 */

import express from 'express';
import { z } from 'zod';
import { createRequestLogger } from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticateToken, requireRole } from '../middleware/auth';
import { createStandardError, ERROR_CODES } from '../utils/errorCodes';
import { getDatabase } from '../db';

const productsRouter = express.Router();
const logger = createRequestLogger('products');

// Validation schemas
const ProductSchema = z.object({
  sku: z.string().min(1),
  barcode: z.string().optional(),
  name_en: z.string().min(1),
  name_si: z.string().optional(),
  name_ta: z.string().optional(),
  unit: z.string().min(1),
  category_id: z.number().int().positive(),
  price_retail: z.number().positive(),
  price_wholesale: z.number().positive().optional(),
  price_credit: z.number().positive().optional(),
  price_other: z.number().positive().optional(),
  cost: z.number().min(0).optional(),
  reorder_level: z.number().min(0).optional(),
  preferred_supplier_id: z.number().int().positive().optional(),
  is_scale_item: z.boolean().optional().default(false),
  is_active: z.boolean().optional().default(true),
  tax_code: z.string().optional(),
  notes: z.string().optional()
});

const ProductUpdateSchema = ProductSchema.partial();

const ProductSearchSchema = z.object({
  q: z.string().optional(),
  category_id: z.string().optional(),
  scale_items_only: z.string().optional(),
  active_filter: z.enum(['all', 'active', 'inactive']).optional().default('all'),
  sortBy: z.enum(['name_en', 'sku', 'created_at', 'price_retail']).optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.string().transform(Number).optional().default(1),
  pageSize: z.string().transform(Number).optional().default(20)
});

/**
 * GET /api/products - List products with search and pagination
 */
productsRouter.get('/',
  authenticateToken,
  requireRole('cashier', 'manager', 'admin'),
  asyncHandler(async (req, res) => {
    const query = ProductSearchSchema.parse(req.query);
    const db = getDatabase();
    
    logger.info({ query }, 'Searching products');
    
    try {
      // Build WHERE clause
      const whereConditions = [];
      const params: any[] = [];
      
      if (query.q && query.q.trim()) {
        const searchTerm = `%${query.q.trim()}%`;
        whereConditions.push(`(
          p.name_en LIKE ? OR 
          p.name_si LIKE ? OR 
          p.name_ta LIKE ? OR 
          p.sku LIKE ? OR 
          p.barcode LIKE ?
        )`);
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }
      
      if (query.category_id) {
        whereConditions.push('p.category_id = ?');
        params.push(parseInt(query.category_id));
      }
      
      if (query.scale_items_only === 'true') {
        whereConditions.push('p.is_scale_item = 1');
      }
      
      if (query.active_filter === 'active') {
        whereConditions.push('p.is_active = 1');
      } else if (query.active_filter === 'inactive') {
        whereConditions.push('p.is_active = 0');
      }
      
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';
      
      // Get total count
      const countResult = db.prepare(`
        SELECT COUNT(*) as total
        FROM products p
        ${whereClause}
      `).get(...params) as { total: number };
      
      // Get products with pagination
      const offset = (query.page - 1) * query.pageSize;
      const products = db.prepare(`
        SELECT 
          p.*,
          c.name as category_name,
          s.supplier_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN suppliers s ON p.preferred_supplier_id = s.id
        ${whereClause}
        ORDER BY p.${query.sortBy} ${query.sortOrder}
        LIMIT ? OFFSET ?
      `).all(...params, query.pageSize, offset);
      
      const totalPages = Math.ceil(countResult.total / query.pageSize);
      
      res.json({
        success: true,
        products,
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          total: countResult.total,
          pages: totalPages,
          hasNextPage: query.page < totalPages,
          hasPrevPage: query.page > 1
        }
      });
      
    } catch (error) {
      logger.error({ error, query }, 'Failed to search products');
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to search products'
      ));
    }
  })
);

/**
 * GET /api/products/search - Quick product search for POS
 */
productsRouter.get('/search',
  asyncHandler(async (req, res) => {
    const { q, limit = '10' } = req.query;
    const db = getDatabase();
    
    if (!q || q.toString().trim().length < 2) {
      return res.json({ success: true, products: [] });
    }
    
    try {
      const searchTerm = `%${q.toString().trim()}%`;
      const limitNum = parseInt(limit.toString());
      
      const products = db.prepare(`
        SELECT 
          p.id, p.sku, p.barcode, p.name_en, p.name_si, p.name_ta,
          p.unit, p.category_id, p.is_scale_item, p.tax_code,
          p.price_retail, p.price_wholesale, p.price_credit, p.price_other,
          p.cost, p.reorder_level, p.preferred_supplier_id, p.is_active,
          p.stock_qty, p.stock_tracking,
          c.name as category_name,
          s.supplier_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN suppliers s ON p.preferred_supplier_id = s.id
        WHERE p.is_active = 1 
          AND (
            p.name_en LIKE ? OR 
            p.name_si LIKE ? OR 
            p.name_ta LIKE ? OR 
            p.sku LIKE ? OR 
            p.barcode LIKE ?
          )
        ORDER BY 
          CASE 
            WHEN p.name_en LIKE ? THEN 1
            WHEN p.sku LIKE ? THEN 2
            WHEN p.barcode LIKE ? THEN 3
            ELSE 4
          END,
          p.name_en
        LIMIT ?
      `).all(
        searchTerm, searchTerm, searchTerm, searchTerm, searchTerm,
        searchTerm, searchTerm, searchTerm,
        limitNum
      );
      
      res.json({ success: true, products });
      
    } catch (error) {
      logger.error({ error, query: q }, 'Failed to search products');
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to search products'
      ));
    }
  })
);

/**
 * GET /api/products/:id - Get single product
 */
productsRouter.get('/:id',
  authenticateToken,
  requireRole('cashier', 'manager', 'admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const productId = parseInt(id);
    const db = getDatabase();
    
    if (isNaN(productId)) {
      return res.status(400).json(createStandardError(
        ERROR_CODES.INVALID_INPUT,
        'Invalid product ID'
      ));
    }
    
    try {
      const product = db.prepare(`
        SELECT 
          p.*,
          c.name as category_name,
          s.supplier_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN suppliers s ON p.preferred_supplier_id = s.id
        WHERE p.id = ?
      `).get(productId);
      
      if (!product) {
        return res.status(404).json(createStandardError(
          ERROR_CODES.PRODUCT_NOT_FOUND,
          'Product not found'
        ));
      }
      
      res.json({ success: true, product });
      
    } catch (error) {
      logger.error({ error, productId }, 'Failed to get product');
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to get product'
      ));
    }
  })
);

/**
 * POST /api/products - Create new product
 */
productsRouter.post('/',
  authenticateToken,
  requireRole('manager', 'admin'),
  asyncHandler(async (req, res) => {
    const productData = ProductSchema.parse(req.body);
    const db = getDatabase();
    
    logger.info({ productData }, 'Creating product');
    
    try {
      // Check if SKU already exists
      const existingProduct = db.prepare(`
        SELECT id FROM products WHERE sku = ?
      `).get(productData.sku);
      
      if (existingProduct) {
        return res.status(409).json(createStandardError(
          ERROR_CODES.CONFLICT,
          'Product with this SKU already exists'
        ));
      }
      
      // Check if barcode already exists (if provided)
      if (productData.barcode) {
        const existingBarcode = db.prepare(`
          SELECT id FROM products WHERE barcode = ?
        `).get(productData.barcode);
        
        if (existingBarcode) {
          return res.status(409).json(createStandardError(
            ERROR_CODES.CONFLICT,
            'Product with this barcode already exists'
          ));
        }
      }
      
      // Create product
      const result = db.prepare(`
        INSERT INTO products (
          sku, barcode, name_en, name_si, name_ta, unit, category_id,
          price_retail, price_wholesale, price_credit, price_other,
          cost, reorder_level, preferred_supplier_id, is_scale_item,
          is_active, tax_code, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        productData.sku,
        productData.barcode || null,
        productData.name_en,
        productData.name_si || null,
        productData.name_ta || null,
        productData.unit,
        productData.category_id,
        productData.price_retail,
        productData.price_wholesale || productData.price_retail,
        productData.price_credit || productData.price_retail,
        productData.price_other || productData.price_retail,
        productData.cost || 0,
        productData.reorder_level || 0,
        productData.preferred_supplier_id || null,
        productData.is_scale_item ? 1 : 0,
        productData.is_active ? 1 : 0,
        productData.tax_code || null,
        productData.notes || null
      );
      
      const productId = result.lastInsertRowid;
      
      // Get the created product
      const product = db.prepare(`
        SELECT 
          p.*,
          c.name as category_name,
          s.supplier_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN suppliers s ON p.preferred_supplier_id = s.id
        WHERE p.id = ?
      `).get(productId);
      
      logger.info({ productId }, 'Product created successfully');
      
      res.status(201).json({
        success: true,
        product,
        message: 'Product created successfully'
      });
      
    } catch (error) {
      logger.error({ error, productData }, 'Failed to create product');
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to create product'
      ));
    }
  })
);

/**
 * PUT /api/products/:id - Update product
 */
productsRouter.put('/:id',
  authenticateToken,
  requireRole('manager', 'admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const productId = parseInt(id);
    const updateData = ProductUpdateSchema.parse(req.body);
    const db = getDatabase();
    
    if (isNaN(productId)) {
      return res.status(400).json(createStandardError(
        ERROR_CODES.INVALID_INPUT,
        'Invalid product ID'
      ));
    }
    
    logger.info({ productId, updateData }, 'Updating product');
    
    try {
      // Check if product exists
      const existingProduct = db.prepare(`
        SELECT id FROM products WHERE id = ?
      `).get(productId);
      
      if (!existingProduct) {
        return res.status(404).json(createStandardError(
          ERROR_CODES.PRODUCT_NOT_FOUND,
          'Product not found'
        ));
      }
      
      // Check for SKU conflicts (if SKU is being updated)
      if (updateData.sku) {
        const skuConflict = db.prepare(`
          SELECT id FROM products WHERE sku = ? AND id != ?
        `).get(updateData.sku, productId);
        
        if (skuConflict) {
          return res.status(409).json(createStandardError(
            ERROR_CODES.CONFLICT,
            'Product with this SKU already exists'
          ));
        }
      }
      
      // Check for barcode conflicts (if barcode is being updated)
      if (updateData.barcode) {
        const barcodeConflict = db.prepare(`
          SELECT id FROM products WHERE barcode = ? AND id != ?
        `).get(updateData.barcode, productId);
        
        if (barcodeConflict) {
          return res.status(409).json(createStandardError(
            ERROR_CODES.CONFLICT,
            'Product with this barcode already exists'
          ));
        }
      }
      
      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];
      
      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields.push(`${key} = ?`);
          if (key === 'is_scale_item' || key === 'is_active') {
            updateValues.push(value ? 1 : 0);
          } else {
            updateValues.push(value);
          }
        }
      });
      
      if (updateFields.length === 0) {
        return res.status(400).json(createStandardError(
          ERROR_CODES.INVALID_INPUT,
          'No fields to update'
        ));
      }
      
      updateFields.push('updated_at = datetime("now")');
      updateValues.push(productId);
      
      const updateQuery = `
        UPDATE products 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;
      
      db.prepare(updateQuery).run(...updateValues);
      
      // Get the updated product
      const product = db.prepare(`
        SELECT 
          p.*,
          c.name as category_name,
          s.supplier_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN suppliers s ON p.preferred_supplier_id = s.id
        WHERE p.id = ?
      `).get(productId);
      
      logger.info({ productId }, 'Product updated successfully');
      
      res.json({
        success: true,
        product,
        message: 'Product updated successfully'
      });
      
    } catch (error) {
      logger.error({ error, productId, updateData }, 'Failed to update product');
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to update product'
      ));
    }
  })
);

/**
 * DELETE /api/products/:id - Soft delete product
 */
productsRouter.delete('/:id',
  authenticateToken,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const productId = parseInt(id);
    const db = getDatabase();
    
    if (isNaN(productId)) {
      return res.status(400).json(createStandardError(
        ERROR_CODES.INVALID_INPUT,
        'Invalid product ID'
      ));
    }
    
    logger.info({ productId }, 'Deleting product');
    
    try {
      // Check if product exists
      const existingProduct = db.prepare(`
        SELECT id, is_active FROM products WHERE id = ?
      `).get(productId);
      
      if (!existingProduct) {
        return res.status(404).json(createStandardError(
          ERROR_CODES.PRODUCT_NOT_FOUND,
          'Product not found'
        ));
      }
      
      // Soft delete (set is_active = 0)
      db.prepare(`
        UPDATE products 
        SET is_active = 0, updated_at = datetime("now")
        WHERE id = ?
      `).run(productId);
      
      logger.info({ productId }, 'Product deleted successfully');
      
      res.json({
        success: true,
        message: 'Product deleted successfully'
      });
      
    } catch (error) {
      logger.error({ error, productId }, 'Failed to delete product');
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to delete product'
      ));
    }
  })
);

export default productsRouter;






