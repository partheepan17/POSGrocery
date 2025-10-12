import { Router } from 'express';
import { getDatabase } from '../db';
import { asyncHandler } from '../middleware/error';
import { createError, ErrorContext, AppError } from '../types/errors';
import { createRequestLogger } from '../utils/logger';

export const catalogRouter = Router();

// GET /api/categories - Enhanced with pagination, search, and filtering
catalogRouter.get('/api/categories', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const {
      page = 1,
      pageSize = 20,
      search = '',
      status = 'all',
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = parseInt(pageSize as string) || 20;
    const offset = (pageNum - 1) * pageSizeNum;

    requestLogger.debug({ 
      page: pageNum, 
      pageSize: pageSizeNum, 
      search, 
      status, 
      sortBy, 
      sortOrder 
    }, 'Fetching categories with filters');

    const db = getDatabase();
    
    // Build WHERE clause
    let whereConditions = [];
    let params: any[] = [];
    
    // Search condition
    if (search && typeof search === 'string' && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      whereConditions.push('LOWER(name) LIKE LOWER(?)');
      params.push(searchTerm);
    }
    
    // Status filter (assuming categories have is_active field)
    if (status === 'active') {
      whereConditions.push('(is_active = 1 OR is_active IS NULL)');
    } else if (status === 'inactive') {
      whereConditions.push('is_active = 0');
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Count total records
    const countQuery = `SELECT COUNT(*) as total FROM categories ${whereClause}`;
    const totalResult = db.prepare(countQuery).get(...params) as { total: number };
    const total = totalResult.total;
    const totalPages = Math.ceil(total / pageSizeNum);
    
    // Validate sortBy field to prevent SQL injection
    const allowedSortFields = ['name', 'created_at', 'is_active'];
    const safeSortBy = allowedSortFields.includes(sortBy as string) ? sortBy : 'name';
    const safeSortOrder = sortOrder === 'desc' ? 'DESC' : 'ASC';
    
    // Main query with pagination
    const query = `
      SELECT id, name, is_active, created_at, updated_at
      FROM categories 
      ${whereClause}
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT ? OFFSET ?
    `;
    
    const categories = db.prepare(query).all(...params, pageSizeNum, offset);
    
    requestLogger.info({ 
      categoryCount: categories.length, 
      total, 
      page: pageNum, 
      totalPages 
    }, 'Categories fetched successfully');
    
    res.json({ 
      categories,
      meta: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error: any) {
    // Re-throw AppError instances without wrapping
    if (error instanceof AppError) {
      throw error;
    }
    
    const context: ErrorContext = {
      requestId: req.requestId,
      operation: 'GET_CATEGORIES',
      resource: '/api/categories',
      metadata: { query: req.query }
    };
    throw createError.databaseError('Failed to fetch categories', error, context);
  }
}));

// GET /api/categories/options - Lightweight endpoint for dropdowns
catalogRouter.get('/api/categories/options', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const { search = '' } = req.query;
    const db = getDatabase();
    
    let query = 'SELECT id, name FROM categories WHERE (is_active = 1 OR is_active IS NULL)';
    let params: any[] = [];
    
    if (search && typeof search === 'string' && search.trim()) {
      query += ' AND LOWER(name) LIKE LOWER(?)';
      params.push(`%${search.trim()}%`);
    }
    
    query += ' ORDER BY name LIMIT 50';
    
    const categories = db.prepare(query).all(...params);
    
    requestLogger.info({ categoryCount: categories.length }, 'Category options fetched successfully');
    res.json({ categories });
  } catch (error: any) {
    const context: ErrorContext = {
      requestId: req.requestId,
      operation: 'GET_CATEGORY_OPTIONS',
      resource: '/api/categories/options'
    };
    throw createError.databaseError('Failed to fetch category options', error, context);
  }
}));

// GET /api/suppliers - Enhanced with pagination, search, and filtering
catalogRouter.get('/api/suppliers', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const {
      page = 1,
      pageSize = 20,
      search = '',
      status = 'all',
      sortBy = 'supplier_name',
      sortOrder = 'asc'
    } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = parseInt(pageSize as string) || 20;
    const offset = (pageNum - 1) * pageSizeNum;

    requestLogger.debug({ 
      page: pageNum, 
      pageSize: pageSizeNum, 
      search, 
      status, 
      sortBy, 
      sortOrder 
    }, 'Fetching suppliers with filters');

    const db = getDatabase();
    
    // Build WHERE clause
    let whereConditions = [];
    let params: any[] = [];
    
    // Search condition
    if (search && typeof search === 'string' && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      whereConditions.push('(LOWER(supplier_name) LIKE LOWER(?) OR LOWER(contact_phone) LIKE LOWER(?) OR LOWER(contact_email) LIKE LOWER(?) OR LOWER(tax_id) LIKE LOWER(?))');
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    // Status filter
    if (status === 'active') {
      whereConditions.push('active = 1');
    } else if (status === 'inactive') {
      whereConditions.push('active = 0');
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Count total records
    const countQuery = `SELECT COUNT(*) as total FROM suppliers ${whereClause}`;
    const totalResult = db.prepare(countQuery).get(...params) as { total: number };
    const total = totalResult.total;
    const totalPages = Math.ceil(total / pageSizeNum);
    
    // Validate sortBy field to prevent SQL injection
    const allowedSortFields = ['supplier_name', 'contact_phone', 'contact_email', 'active', 'created_at'];
    const safeSortBy = allowedSortFields.includes(sortBy as string) ? sortBy : 'supplier_name';
    const safeSortOrder = sortOrder === 'desc' ? 'DESC' : 'ASC';
    
    // Main query with pagination
    const query = `
      SELECT id, supplier_name, contact_phone, contact_email, address, tax_id, active, created_at, updated_at
      FROM suppliers 
      ${whereClause}
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT ? OFFSET ?
    `;
    
    const suppliers = db.prepare(query).all(...params, pageSizeNum, offset);
    
    requestLogger.info({ 
      supplierCount: suppliers.length, 
      total, 
      page: pageNum, 
      totalPages 
    }, 'Suppliers fetched successfully');
    
    res.json({ 
      suppliers,
      meta: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error: any) {
    // Re-throw AppError instances without wrapping
    if (error instanceof AppError) {
      throw error;
    }
    
    const context: ErrorContext = {
      requestId: req.requestId,
      operation: 'GET_SUPPLIERS',
      resource: '/api/suppliers',
      metadata: { query: req.query }
    };
    throw createError.databaseError('Failed to fetch suppliers', error, context);
  }
}));

// GET /api/suppliers/options - Lightweight endpoint for dropdowns
catalogRouter.get('/api/suppliers/options', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const { search = '' } = req.query;
    const db = getDatabase();
    
    let query = 'SELECT id, supplier_name FROM suppliers WHERE active = 1';
    let params: any[] = [];
    
    if (search && typeof search === 'string' && search.trim()) {
      query += ' AND LOWER(supplier_name) LIKE LOWER(?)';
      params.push(`%${search.trim()}%`);
    }
    
    query += ' ORDER BY supplier_name LIMIT 50';
    
    const suppliers = db.prepare(query).all(...params);
    
    requestLogger.info({ supplierCount: suppliers.length }, 'Supplier options fetched successfully');
    res.json({ suppliers });
  } catch (error: any) {
    const context: ErrorContext = {
      requestId: req.requestId,
      operation: 'GET_SUPPLIER_OPTIONS',
      resource: '/api/suppliers/options'
    };
    throw createError.databaseError('Failed to fetch supplier options', error, context);
  }
}));

// GET /api/products - List products with filtering, pagination, and sorting
catalogRouter.get('/api/products', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const db = getDatabase();
    
    // Parse and validate query parameters
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const search = (req.query.search as string || '').trim();
    const categoryId = req.query.category_id ? parseInt(req.query.category_id as string) : null;
    const status = req.query.status as string || 'active'; // all, active, inactive
    const sortBy = req.query.sortBy as string || 'created_at'; // name_en, sku, barcode, created_at
    const sortOrder = req.query.sortOrder as string || 'desc'; // asc, desc
    const scaleItemsOnly = req.query.scale_items_only === 'true';
    
    // Validate pageSize against allowed values
    const allowedPageSizes = [10, 20, 50, 100];
    if (!allowedPageSizes.includes(pageSize)) {
      return res.status(400).json({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: `Invalid pageSize. Must be one of: ${allowedPageSizes.join(', ')}`,
        provided: req.query.pageSize
      });
    }
    
    // Validate status
    const validStatuses = ['active', 'inactive', 'all'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        provided: req.query.status
      });
    }
    
    requestLogger.debug({ 
      page, pageSize, search, categoryId, status, sortBy, sortOrder, scaleItemsOnly
    }, 'Listing products');
    
    // Validate sort parameters
    const validSortFields = ['name_en', 'sku', 'barcode', 'created_at'];
    const validSortOrders = ['asc', 'desc'];
    
    if (!validSortFields.includes(sortBy)) {
      return res.status(400).json({ 
        ok: false,
        code: 'VALIDATION_ERROR',
        message: `Invalid sort field. Must be one of: ${validSortFields.join(', ')}`,
        provided: req.query.sortBy
      });
    }
    
    if (!validSortOrders.includes(sortOrder)) {
      return res.status(400).json({ 
        ok: false,
        code: 'VALIDATION_ERROR',
        message: `Invalid sort order. Must be one of: ${validSortOrders.join(', ')}`,
        provided: req.query.sortOrder
      });
    }
    
    // Build WHERE clause
    const whereConditions = [];
    const params = [];
    
    // Search condition (case-insensitive)
    if (search) {
      whereConditions.push(`(LOWER(p.name_en) LIKE ? OR LOWER(p.name_si) LIKE ? OR LOWER(p.name_ta) LIKE ? OR LOWER(p.sku) LIKE ? OR LOWER(p.barcode) LIKE ?)`);
      const searchTerm = `%${search.toLowerCase()}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    // Category filter
    if (categoryId) {
      whereConditions.push('p.category_id = ?');
      params.push(categoryId);
    }
    
    // Status filter
    if (status === 'active') {
      whereConditions.push('p.is_active = 1');
    } else if (status === 'inactive') {
      whereConditions.push('p.is_active = 0');
    }
    
    // Scale items filter
    if (scaleItemsOnly) {
      whereConditions.push('p.is_scale_item = 1');
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.preferred_supplier_id = s.id
      ${whereClause}
    `;
    const countResult = db.prepare(countQuery).get(...params) as { total: number };
    const total = countResult.total;
    
    // Calculate pagination
    const offset = (page - 1) * pageSize;
    const totalPages = Math.ceil(total / pageSize);
    
    // Get products with pagination
    const productsQuery = `
      SELECT 
        p.id, p.sku, p.barcode, p.name_en, p.name_si, p.name_ta,
        p.unit, p.category_id, p.is_scale_item, p.tax_code,
        p.price_retail, p.price_wholesale, p.price_credit, p.price_other,
        p.cost, p.reorder_level, p.preferred_supplier_id, p.is_active,
        p.created_at, p.updated_at,
        c.name as category_name,
        s.supplier_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.preferred_supplier_id = s.id
      ${whereClause}
      ORDER BY p.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT ? OFFSET ?
    `;
    
    const products = db.prepare(productsQuery).all(...params, pageSize, offset);
    
    requestLogger.info({ 
      productCount: products.length,
      total,
      page,
      pageSize,
      totalPages,
      search,
      categoryId,
      status
    }, 'Products list completed');
    
    res.json({
      ok: true,
      products,
      meta: {
        page,
        pageSize,
        total,
        pages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filters: {
        search,
        categoryId,
        status,
        sortBy,
        sortOrder,
        scaleItemsOnly
      }
    });
  } catch (error: any) {
    console.error('Failed to list products:', error);
    
    const context: ErrorContext = {
      requestId: req.requestId,
      operation: 'LIST_PRODUCTS',
      resource: '/api/products',
      metadata: { 
        query: req.query
      }
    };
    
    throw createError.databaseError('Failed to list products', error, context);
  }
}));

// GET /api/products/search - Legacy search endpoint for backward compatibility
catalogRouter.get('/api/products/search', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const { searchProducts } = await import('../utils/performance');
    const q = req.query.q as string || '';
    const requestedLimit = parseInt(req.query.limit as string) || 50;
    
    requestLogger.debug({ 
      query: q, 
      requestedLimit,
      hasQuery: !!q.trim()
    }, 'Searching products');
    
    // Validate limit with stricter caps for performance
    if (requestedLimit < 1 || requestedLimit > 200) {
      throw createError.invalidInput('Limit must be between 1 and 200', {
        provided: req.query.limit,
        min: 1,
        max: 200
      });
    }
    
    const limit = Math.min(requestedLimit, 200);
    
    // Use optimized search function
    const products = searchProducts(q, limit, req.requestId);
    
    requestLogger.info({ 
      productCount: products.length,
      searchQuery: q,
      limit
    }, 'Products search completed');
    
    res.json({ products, total: products.length });
  } catch (error: any) {
    // Re-throw AppError instances without wrapping
    if (error instanceof AppError) {
      throw error;
    }
    
    const context: ErrorContext = {
      requestId: req.requestId,
      operation: 'SEARCH_PRODUCTS',
      resource: '/api/products/search',
      metadata: { 
        query: req.query.q,
        limit: req.query.limit
      }
    };
    
    throw createError.databaseError('Failed to search products', error, context);
  }
}));

// GET /api/products/barcode/:code
catalogRouter.get('/api/products/barcode/:code', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const db = getDatabase();
    const code = req.params.code;
    
    requestLogger.debug({ barcode: code }, 'Looking up product by barcode');
    
    // Enhanced barcode validation
    if (!code || code.trim().length === 0) {
      throw createError.invalidInput('Barcode code is required', {
        provided: code
      });
    }
    
    const trimmedCode = code.trim();
    
    // Validate barcode format (basic validation for common barcode formats)
    if (trimmedCode.length < 3) {
      throw createError.invalidInput('Barcode must be at least 3 characters long', {
        provided: trimmedCode,
        length: trimmedCode.length
      });
    }
    
    if (trimmedCode.length > 50) {
      throw createError.invalidInput('Barcode cannot exceed 50 characters', {
        provided: trimmedCode,
        length: trimmedCode.length
      });
    }

    // Validate barcode contains only valid characters (alphanumeric and common barcode symbols)
    if (!/^[a-zA-Z0-9\-_\.]+$/.test(trimmedCode)) {
      throw createError.invalidInput('Barcode contains invalid characters. Only letters, numbers, hyphens, underscores, and periods are allowed', {
        provided: trimmedCode
      });
    }
    
    // Check for SKU fallback parameter
    const fallbackToSku = req.query.fallback === 'sku' || req.query.fallback === 'true';
    
    // Use optimized barcode lookup with caching and SKU fallback
    const { getProductByBarcode } = require('../utils/performance');
    const product = getProductByBarcode(trimmedCode, req.requestId, fallbackToSku);
    
    if (!product) {
      requestLogger.warn({ barcode: trimmedCode }, 'Product not found');
      const context: ErrorContext = {
        requestId: req.requestId,
        operation: 'GET_PRODUCT_BY_BARCODE',
        resource: '/api/products/barcode',
        metadata: { barcode: trimmedCode }
      };
      throw createError.notFound('Product', context);
    }
    
    requestLogger.info({ 
      productId: (product as any).id,
      productName: (product as any).name_en,
      barcode: trimmedCode
    }, 'Product found by barcode');
    
    res.json({ product });
  } catch (error: any) {
    // Re-throw AppError instances (like NOT_FOUND) without wrapping
    if (error instanceof AppError) {
      throw error;
    }
    
    // Re-throw validation errors
    if (error instanceof Error && error.message.includes('Barcode code is required')) {
      throw error;
    }
    
    const context: ErrorContext = {
      requestId: req.requestId,
      operation: 'GET_PRODUCT_BY_BARCODE',
      resource: '/api/products/barcode',
      metadata: { barcode: req.params.code }
    };
    
    throw createError.databaseError('Failed to fetch product by barcode', error, context);
  }
}));

// POST /api/products
catalogRouter.post('/api/products', asyncHandler(async (req, res) => {
  // Accept BOTH current UI names and legacy API names
    const { 
    // legacy
    name, cost_price, selling_price,
    // current UI
    name_en, name_si, name_ta,
    cost, price_retail, price_wholesale, price_credit, price_other,
    is_scale_item, tax_code, reorder_level,
    // common
    sku, barcode, category_id, preferred_supplier_id,
    unit = 'pc', is_active = true
    } = req.body;
    
  const canonicalName = (name_en ?? name ?? '').trim();
  const canonicalCost = (cost ?? cost_price ?? 0);
  const canonicalPriceRetail = (price_retail ?? selling_price ?? 0);

  if (!canonicalName) return res.status(400).json({ ok:false, message:'Product name is required' });
  if (!sku || !sku.trim()) return res.status(400).json({ ok:false, message:'SKU is required' });

  // numbers from strings
  const toNum = (v:any, d=0)=> (v===null||v===undefined||v==='')?d:Number(v);
  const vals = {
    category_id: category_id ? toNum(category_id, 0) : null,
    preferred_supplier_id: preferred_supplier_id ? toNum(preferred_supplier_id, 0) : null,
    cost: toNum(canonicalCost, 0),
    price_retail: toNum(canonicalPriceRetail, 0),
    price_wholesale: toNum(price_wholesale, 0),
    price_credit: toNum(price_credit, 0),
    price_other: toNum(price_other, 0),
    reorder_level: Number.isFinite(Number(reorder_level)) ? Number(reorder_level) : null,
  };

  const db = getDatabase();
  const dup = db.prepare('SELECT id FROM products WHERE sku = ?').get(sku.trim());
  if (dup) return res.status(409).json({ ok:false, message:'SKU already exists' });

  try {
    const info = db.prepare(`
      INSERT INTO products
      (name_en, name_si, name_ta, sku, barcode, category_id, preferred_supplier_id,
       cost, price_retail, price_wholesale, price_credit, price_other,
       unit, is_scale_item, tax_code, reorder_level, is_active, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, datetime('now'), datetime('now'))
    `).run(
      canonicalName, name_si ?? null, name_ta ?? null,
      sku.trim(), (barcode ?? '').trim(),
      vals.category_id, vals.preferred_supplier_id,
      vals.cost, vals.price_retail, vals.price_wholesale, vals.price_credit, vals.price_other,
      unit, is_scale_item ? 1 : 0, (tax_code ?? null), vals.reorder_level,
      is_active ? 1 : 0
    );

    const product = db.prepare(`
      SELECT p.*, c.name AS category_name, s.supplier_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.preferred_supplier_id = s.id
      WHERE p.id = ?
    `).get(info.lastInsertRowid);
    return res.status(201).json({ ok:true, product });
  } catch (e:any) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      const fld = e.message?.includes('barcode') ? 'Barcode' : 'SKU';
      return res.status(409).json({ ok:false, message:`${fld} already exists` });
    }
    if (e.code === 'SQLITE_CONSTRAINT_NOTNULL') {
      return res.status(400).json({ ok:false, message:'Missing required column' });
    }
    console.error('Create product failed:', e);
    return res.status(500).json({ ok:false, message:'Internal Server Error' });
  }
}));

// PUT /api/products/:id
catalogRouter.put('/api/products/:id', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const productId = parseInt(req.params.id);
    
    // Accept BOTH current UI names and legacy API names
    const { 
      // legacy
      name, cost_price, selling_price,
      // current UI
      name_en, name_si, name_ta,
      cost, price_retail, price_wholesale, price_credit, price_other,
      is_scale_item, tax_code, reorder_level,
      // common
      sku, barcode, category_id, preferred_supplier_id,
      unit, is_active
    } = req.body;
    
    const canonicalName = (name_en ?? name ?? '').trim();
    const canonicalCost = (cost ?? cost_price ?? 0);
    const canonicalPriceRetail = (price_retail ?? selling_price ?? 0);
    
    if (isNaN(productId)) {
      return res.status(400).json({ ok: false, message: 'Invalid product ID' });
    }
    
    requestLogger.debug({ productId, name: canonicalName, sku }, 'Updating product');
    const db = getDatabase();
    
    // Check if product exists
    const existingProduct = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
    if (!existingProduct) {
      return res.status(404).json({ ok: false, message: 'Product not found' });
    }
    
    // Check if SKU already exists (excluding current product)
    if (sku && sku.trim()) {
      const skuConflict = db.prepare('SELECT id FROM products WHERE sku = ? AND id != ?').get(sku.trim(), productId);
      if (skuConflict) {
        return res.status(409).json({ ok: false, message: 'SKU already exists' });
      }
    }
    
    // Check if barcode already exists (excluding current product)
    if (barcode && barcode.trim()) {
      const barcodeConflict = db.prepare('SELECT id FROM products WHERE barcode = ? AND id != ?').get(barcode.trim(), productId);
      if (barcodeConflict) {
        return res.status(409).json({ ok: false, message: 'Barcode already exists' });
      }
    }

    // Type coercion helper
    const toNum = (v: any, d = 0) => (v === null || v === undefined || v === '') ? d : Number(v);
    const vals = {
      category_id: category_id ? toNum(category_id, 0) : null,
      preferred_supplier_id: preferred_supplier_id ? toNum(preferred_supplier_id, 0) : null,
      cost: toNum(canonicalCost, 0),
      price_retail: toNum(canonicalPriceRetail, 0),
      price_wholesale: toNum(price_wholesale, 0),
      price_credit: toNum(price_credit, 0),
      price_other: toNum(price_other, 0),
      reorder_level: Number.isFinite(Number(reorder_level)) ? Number(reorder_level) : null,
    };
    
    // Update product with all fields
    db.prepare(`
      UPDATE products 
      SET name_en = COALESCE(?, name_en),
          name_si = COALESCE(?, name_si),
          name_ta = COALESCE(?, name_ta),
          sku = COALESCE(?, sku),
          barcode = COALESCE(?, barcode),
          category_id = COALESCE(?, category_id),
          preferred_supplier_id = COALESCE(?, preferred_supplier_id),
          cost = COALESCE(?, cost),
          price_retail = COALESCE(?, price_retail),
          price_wholesale = COALESCE(?, price_wholesale),
          price_credit = COALESCE(?, price_credit),
          price_other = COALESCE(?, price_other),
          unit = COALESCE(?, unit),
          is_scale_item = COALESCE(?, is_scale_item),
          tax_code = COALESCE(?, tax_code),
          reorder_level = COALESCE(?, reorder_level),
          is_active = COALESCE(?, is_active),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      canonicalName || null,
      name_si || null,
      name_ta || null,
      sku?.trim() || null,
      barcode?.trim() || null,
      vals.category_id,
      vals.preferred_supplier_id,
      vals.cost,
      vals.price_retail,
      vals.price_wholesale,
      vals.price_credit,
      vals.price_other,
      unit || null,
      is_scale_item ? 1 : 0,
      tax_code || null,
      vals.reorder_level,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      productId
    );
    
    // Fetch the updated product
    const product = db.prepare(`
      SELECT p.*, c.name as category_name, s.supplier_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.preferred_supplier_id = s.id
      WHERE p.id = ?
    `).get(productId);
    
    requestLogger.info({ productId, name: canonicalName, sku }, 'Product updated successfully');
    res.json({ ok: true, product });
  } catch (error: any) {
    console.error('Update product failed:', error);
    
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      const field = error.message?.includes('barcode') ? 'Barcode' : 'SKU';
      return res.status(409).json({ ok: false, message: `${field} already exists` });
    }
    
    if (error.code === 'SQLITE_CONSTRAINT_NOTNULL') {
      return res.status(400).json({ ok: false, message: 'Missing required field' });
    }
    
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
}));

// DELETE /api/products/:id
catalogRouter.delete('/api/products/:id', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const productId = parseInt(req.params.id);
    
    if (isNaN(productId)) {
      return res.status(400).json({ ok: false, message: 'Invalid product ID' });
    }
    
    requestLogger.debug({ productId }, 'Deleting product');
    const db = getDatabase();
    
    // Check if product exists
    const existingProduct = db.prepare('SELECT id, name_en as name, sku FROM products WHERE id = ?').get(productId) as { id: number; name: string; sku: string } | undefined;
    if (!existingProduct) {
      return res.status(404).json({ ok: false, message: 'Product not found' });
    }
    
    // Check for foreign key references
    const references = [];
    
    // Check invoice_lines
    const invoiceLines = db.prepare('SELECT COUNT(*) as count FROM invoice_lines WHERE product_id = ?').get(productId) as { count: number };
    if (invoiceLines.count > 0) {
      references.push(`${invoiceLines.count} invoice line(s)`);
    }
    
    // Check quick_sales_lines
    const quickSalesLines = db.prepare('SELECT COUNT(*) as count FROM quick_sales_lines WHERE product_id = ?').get(productId) as { count: number };
    if (quickSalesLines.count > 0) {
      references.push(`${quickSalesLines.count} quick sales line(s)`);
    }
    
    // Check stock_movements
    const stockMovements = db.prepare('SELECT COUNT(*) as count FROM stock_movements WHERE product_id = ?').get(productId) as { count: number };
    if (stockMovements.count > 0) {
      references.push(`${stockMovements.count} stock movement(s)`);
    }
    
    // If product has references, perform soft delete
    if (references.length > 0) {
      requestLogger.info({ productId, references }, 'Product has references, performing soft delete');
      
      // Soft delete (set is_active to false)
      db.prepare('UPDATE products SET is_active = 0, updated_at = datetime("now") WHERE id = ?').run(productId);
      
      requestLogger.info({ productId, name: existingProduct.name }, 'Product soft deleted successfully');
      return res.json({ 
        ok: true, 
        message: 'Product deactivated successfully (has references in sales/stock)',
        softDelete: true,
        references: references
      });
    }
    
    // No references - perform hard delete
    requestLogger.info({ productId }, 'Product has no references, performing hard delete');
    
    // Temporarily disable foreign key checks for hard delete
    db.pragma('foreign_keys = OFF');
    
    // Hard delete
    db.prepare('DELETE FROM products WHERE id = ?').run(productId);
    
    // Re-enable foreign key checks
    db.pragma('foreign_keys = ON');
    
    requestLogger.info({ productId, name: existingProduct.name }, 'Product hard deleted successfully');
    res.json({ 
      ok: true, 
      message: 'Product deleted successfully',
      softDelete: false
    });
  } catch (error: any) {
    console.error('Delete product failed:', error);
    
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ 
        ok: false, 
        message: 'Cannot delete product: it is referenced by other records',
        softDelete: true
      });
    }
    
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
}));

// GET /api/customers
catalogRouter.get('/api/customers', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    requestLogger.debug({ active: req.query.active }, 'Fetching customers');
    const db = getDatabase();
    const active = req.query.active;
    
    let query = 'SELECT id, customer_name, phone, customer_type, note, active, created_at FROM customers';
    const params: any[] = [];
    
    if (active !== undefined) {
      query += ' WHERE active = ?';
      params.push(active === 'true' ? 1 : 0);
    }
    
    query += ' ORDER BY customer_name';
    
    const customers = db.prepare(query).all(...params);
    requestLogger.info({ customerCount: customers.length }, 'Customers fetched successfully');
    res.json({ customers });
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    
    const context: ErrorContext = {
      requestId: req.requestId,
      operation: 'GET_CUSTOMERS',
      resource: '/api/customers'
    };
    throw createError.databaseError('Failed to fetch customers', error, context);
  }
}));

// POST /api/customers
catalogRouter.post('/api/customers', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const { customer_name, phone, customer_type = 'Retail', note, active = true } = req.body;
    
    // Validate required fields
    if (!customer_name) {
      throw createError.invalidInput('Customer name is required');
    }
    
    requestLogger.debug({ customer_name, customer_type }, 'Creating new customer');
    const db = getDatabase();
    
    // Insert new customer
    const result = db.prepare(`
      INSERT INTO customers (customer_name, phone, customer_type, note, active, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(customer_name, phone, customer_type, note, active ? 1 : 0);
    
    const customerId = result.lastInsertRowid;
    
    // Fetch the created customer
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
    
    requestLogger.info({ customerId, customer_name }, 'Customer created successfully');
    res.status(201).json({ customer });
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    
    const context: ErrorContext = {
      requestId: req.requestId,
      operation: 'CREATE_CUSTOMER',
      resource: '/api/customers',
      metadata: { body: req.body }
    };
    
    throw createError.databaseError('Failed to create customer', error, context);
  }
}));

// POST /api/categories
catalogRouter.post('/api/categories', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const { name } = req.body;
    
    // Enhanced validation
    if (!name || !name.trim()) {
      throw createError.invalidInput('Category name is required');
    }

    const trimmedName = name.trim();
    
    // Validate name length (1-100 characters)
    if (trimmedName.length < 1) {
      throw createError.invalidInput('Category name cannot be empty');
    }
    
    if (trimmedName.length > 100) {
      throw createError.invalidInput('Category name cannot exceed 100 characters');
    }

    // Validate name contains only valid characters (letters, numbers, spaces, hyphens, underscores)
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmedName)) {
      throw createError.invalidInput('Category name can only contain letters, numbers, spaces, hyphens, and underscores');
    }

    requestLogger.debug({ name: trimmedName }, 'Creating new category');
    const db = getDatabase();
    
    // Check if category already exists (case-insensitive)
    const existingCategory = db.prepare('SELECT id, name FROM categories WHERE LOWER(name) = LOWER(?)').get(trimmedName) as { id: number; name: string } | undefined;
    if (existingCategory) {
      throw createError.conflict(`A category with the name "${existingCategory.name}" already exists`);
    }

    // Create category
    const result = db.prepare('INSERT INTO categories (name) VALUES (?)').run(trimmedName);
    const newCategory = db.prepare('SELECT id, name FROM categories WHERE id = ?').get(result.lastInsertRowid);
    
    requestLogger.info({ categoryId: (newCategory as any).id, name: (newCategory as any).name }, 'Category created successfully');
    res.status(201).json({ category: newCategory });
  } catch (error: any) {
    // Re-throw AppError instances without wrapping
    if (error instanceof AppError) {
      throw error;
    }
    
    // Handle SQLite constraint errors
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw createError.conflict('A category with this name already exists');
    }
    
    const context: ErrorContext = {
      requestId: req.requestId,
      operation: 'CREATE_CATEGORY',
      resource: '/api/categories',
      metadata: { body: req.body }
    };
    
    throw createError.databaseError('Failed to create category', error, context);
  }
}));

// PATCH /api/categories/:id - Update category
catalogRouter.patch('/api/categories/:id', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const { id } = req.params;
    const { name, is_active } = req.body;
    
    // Validate ID
    const categoryId = parseInt(id);
    if (isNaN(categoryId) || categoryId <= 0) {
      throw createError.invalidInput('Invalid category ID');
    }
    
    // Check if category exists
    const db = getDatabase();
    const existingCategory = db.prepare('SELECT id, name FROM categories WHERE id = ?').get(categoryId);
    if (!existingCategory) {
      throw createError.notFound('Category not found');
    }
    
    // Build update fields dynamically
    const updateFields = [];
    const updateValues = [];
    
    if (name !== undefined) {
      const trimmedName = name.trim();
      
      // Validate name
      if (!trimmedName) {
        throw createError.invalidInput('Category name is required');
      }
      
      if (trimmedName.length > 100) {
        throw createError.invalidInput('Category name cannot exceed 100 characters');
      }
      
      if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmedName)) {
        throw createError.invalidInput('Category name can only contain letters, numbers, spaces, hyphens, and underscores');
      }
      
      // Check for duplicate name (excluding current category)
      const duplicateCategory = db.prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND id != ?').get(trimmedName, categoryId);
      if (duplicateCategory) {
        throw createError.conflict(`A category with the name "${trimmedName}" already exists`);
      }
      
      updateFields.push('name = ?');
      updateValues.push(trimmedName);
    }
    
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(is_active ? 1 : 0);
    }
    
    if (updateFields.length === 0) {
      throw createError.invalidInput('No valid fields to update');
    }
    
    // Add updated_at
    updateFields.push('updated_at = ?');
    updateValues.push(new Date().toISOString());
    updateValues.push(categoryId);
    
    const updateQuery = `UPDATE categories SET ${updateFields.join(', ')} WHERE id = ?`;
    db.prepare(updateQuery).run(...updateValues);
    
    // Fetch updated category
    const updatedCategory = db.prepare(`
      SELECT id, name, is_active, created_at, updated_at 
      FROM categories WHERE id = ?
    `).get(categoryId);
    
    requestLogger.info({ categoryId, fields: updateFields.length }, 'Category updated successfully');
    res.json({ category: updatedCategory });
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    
    const context: ErrorContext = {
      requestId: req.requestId,
      operation: 'UPDATE_CATEGORY',
      resource: `/api/categories/${req.params.id}`,
      metadata: { body: req.body }
    };
    throw createError.databaseError('Failed to update category', error, context);
  }
}));

// DELETE /api/categories/:id - Soft delete category
catalogRouter.delete('/api/categories/:id', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const { id } = req.params;
    const categoryId = parseInt(id);
    
    if (isNaN(categoryId) || categoryId <= 0) {
      throw createError.invalidInput('Invalid category ID');
    }
    
    const db = getDatabase();
    
    // Check if category exists
    const category = db.prepare('SELECT id, name, is_active FROM categories WHERE id = ?').get(categoryId) as { id: number; name: string; is_active: number } | undefined;
    if (!category) {
      throw createError.notFound('Category not found');
    }
    
    // Check if category is referenced by products
    const productRefs = db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?').get(categoryId) as { count: number };
    
    const totalRefs = productRefs.count;
    
    if (totalRefs > 0) {
      // Soft delete - set is_active to 0
      db.prepare('UPDATE categories SET is_active = 0, updated_at = ? WHERE id = ?').run(new Date().toISOString(), categoryId);
      
      requestLogger.info({ 
        categoryId, 
        categoryName: category.name,
        references: totalRefs 
      }, 'Category soft deleted due to references');
      
      res.json({ 
        ok: true, 
        softDeleted: true, 
        message: `Category "${category.name}" has been deactivated (referenced by ${totalRefs} product${totalRefs > 1 ? 's' : ''})`,
        references: totalRefs
      });
    } else {
      // Hard delete - no references
      db.prepare('DELETE FROM categories WHERE id = ?').run(categoryId);
      
      requestLogger.info({ 
        categoryId, 
        categoryName: category.name 
      }, 'Category hard deleted');
      
      res.json({ 
        ok: true, 
        softDeleted: false, 
        message: `Category "${category.name}" has been deleted`
      });
    }
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    
    const context: ErrorContext = {
      requestId: req.requestId,
      operation: 'DELETE_CATEGORY',
      resource: `/api/categories/${req.params.id}`
    };
    throw createError.databaseError('Failed to delete category', error, context);
  }
}));

// POST /api/suppliers
catalogRouter.post('/api/suppliers', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const { 
      supplier_name, 
      contact_phone, 
      contact_email, 
      address, 
      tax_id, 
      active = true 
    } = req.body;
    
    // Enhanced validation
    if (!supplier_name || !supplier_name.trim()) {
      throw createError.invalidInput('Supplier name is required');
    }

    const trimmedName = supplier_name.trim();
    
    // Validate name length (1-100 characters)
    if (trimmedName.length < 1) {
      throw createError.invalidInput('Supplier name cannot be empty');
    }
    
    if (trimmedName.length > 100) {
      throw createError.invalidInput('Supplier name cannot exceed 100 characters');
    }

    // Validate name contains only valid characters (letters, numbers, spaces, hyphens, underscores, periods)
    if (!/^[a-zA-Z0-9\s\-_\.]+$/.test(trimmedName)) {
      throw createError.invalidInput('Supplier name can only contain letters, numbers, spaces, hyphens, underscores, and periods');
    }

    // Validate email format if provided
    if (contact_email && contact_email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contact_email.trim())) {
        throw createError.invalidInput('Please enter a valid email address');
      }
    }

    // Validate phone format if provided (basic validation for common formats)
    if (contact_phone && contact_phone.trim()) {
      const phoneRegex = /^[\+]?[0-9\s\-\(\)]{7,20}$/;
      if (!phoneRegex.test(contact_phone.trim())) {
        throw createError.invalidInput('Please enter a valid phone number');
      }
    }

    requestLogger.debug({ supplier_name: trimmedName, active }, 'Creating new supplier');
    const db = getDatabase();
    
    // Check if supplier already exists (case-insensitive)
    const existingSupplier = db.prepare('SELECT id, supplier_name FROM suppliers WHERE LOWER(supplier_name) = LOWER(?)').get(trimmedName) as { id: number; supplier_name: string } | undefined;
    if (existingSupplier) {
      throw createError.conflict(`A supplier with the name "${existingSupplier.supplier_name}" already exists`);
    }

    // Create supplier
    const result = db.prepare(`
      INSERT INTO suppliers (supplier_name, contact_phone, contact_email, address, tax_id, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      trimmedName,
      contact_phone?.trim() || null,
      contact_email?.trim() || null,
      address?.trim() || null,
      tax_id?.trim() || null,
      active ? 1 : 0,
      new Date().toISOString()
    );
    
    const newSupplier = db.prepare(`
      SELECT id, supplier_name, contact_phone, contact_email, address, tax_id, active, created_at 
      FROM suppliers WHERE id = ?
    `).get(result.lastInsertRowid);
    
    requestLogger.info({ supplierId: (newSupplier as any).id, supplier_name: (newSupplier as any).supplier_name }, 'Supplier created successfully');
    res.status(201).json({ supplier: newSupplier });
  } catch (error: any) {
    // Re-throw AppError instances without wrapping
    if (error instanceof AppError) {
      throw error;
    }
    
    // Handle SQLite constraint errors
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw createError.conflict('A supplier with this name already exists');
    }
    
    const context: ErrorContext = {
      requestId: req.requestId,
      operation: 'CREATE_SUPPLIER',
      resource: '/api/suppliers',
      metadata: { body: req.body }
    };
    
    throw createError.databaseError('Failed to create supplier', error, context);
  }
}));

// PATCH /api/suppliers/:id - Update supplier
catalogRouter.patch('/api/suppliers/:id', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const { id } = req.params;
    const { 
      supplier_name, 
      contact_phone, 
      contact_email, 
      address, 
      tax_id, 
      active 
    } = req.body;
    
    // Validate ID
    const supplierId = parseInt(id);
    if (isNaN(supplierId) || supplierId <= 0) {
      throw createError.invalidInput('Invalid supplier ID');
    }
    
    // Check if supplier exists
    const db = getDatabase();
    const existingSupplier = db.prepare('SELECT id, supplier_name FROM suppliers WHERE id = ?').get(supplierId);
    if (!existingSupplier) {
      throw createError.notFound('Supplier not found');
    }
    
    // Build update fields dynamically
    const updateFields = [];
    const updateValues = [];
    
    if (supplier_name !== undefined) {
      const trimmedName = supplier_name.trim();
      
      // Validate name
      if (!trimmedName) {
        throw createError.invalidInput('Supplier name is required');
      }
      
      if (trimmedName.length > 100) {
        throw createError.invalidInput('Supplier name cannot exceed 100 characters');
      }
      
      if (!/^[a-zA-Z0-9\s\-_\.]+$/.test(trimmedName)) {
        throw createError.invalidInput('Supplier name can only contain letters, numbers, spaces, hyphens, underscores, and periods');
      }
      
      // Check for duplicate name (excluding current supplier)
      const duplicateSupplier = db.prepare('SELECT id FROM suppliers WHERE LOWER(supplier_name) = LOWER(?) AND id != ?').get(trimmedName, supplierId);
      if (duplicateSupplier) {
        throw createError.conflict(`A supplier with the name "${trimmedName}" already exists`);
      }
      
      updateFields.push('supplier_name = ?');
      updateValues.push(trimmedName);
    }
    
    if (contact_email !== undefined) {
      if (contact_email && contact_email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(contact_email.trim())) {
          throw createError.invalidInput('Please enter a valid email address');
        }
        updateFields.push('contact_email = ?');
        updateValues.push(contact_email.trim());
      } else {
        updateFields.push('contact_email = NULL');
      }
    }
    
    if (contact_phone !== undefined) {
      if (contact_phone && contact_phone.trim()) {
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{7,20}$/;
        if (!phoneRegex.test(contact_phone.trim())) {
          throw createError.invalidInput('Please enter a valid phone number');
        }
        updateFields.push('contact_phone = ?');
        updateValues.push(contact_phone.trim());
      } else {
        updateFields.push('contact_phone = NULL');
      }
    }
    
    if (address !== undefined) {
      updateFields.push('address = ?');
      updateValues.push(address?.trim() || null);
    }
    
    if (tax_id !== undefined) {
      updateFields.push('tax_id = ?');
      updateValues.push(tax_id?.trim() || null);
    }
    
    if (active !== undefined) {
      updateFields.push('active = ?');
      updateValues.push(active ? 1 : 0);
    }
    
    if (updateFields.length === 0) {
      throw createError.invalidInput('No valid fields to update');
    }
    
    // Add updated_at
    updateFields.push('updated_at = ?');
    updateValues.push(new Date().toISOString());
    updateValues.push(supplierId);
    
    const updateQuery = `UPDATE suppliers SET ${updateFields.join(', ')} WHERE id = ?`;
    db.prepare(updateQuery).run(...updateValues);
    
    // Fetch updated supplier
    const updatedSupplier = db.prepare(`
      SELECT id, supplier_name, contact_phone, contact_email, address, tax_id, active, created_at, updated_at 
      FROM suppliers WHERE id = ?
    `).get(supplierId);
    
    requestLogger.info({ supplierId, fields: updateFields.length }, 'Supplier updated successfully');
    res.json({ supplier: updatedSupplier });
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    
    const context: ErrorContext = {
      requestId: req.requestId,
      operation: 'UPDATE_SUPPLIER',
      resource: `/api/suppliers/${req.params.id}`,
      metadata: { body: req.body }
    };
    throw createError.databaseError('Failed to update supplier', error, context);
  }
}));

// DELETE /api/suppliers/:id - Soft delete supplier
catalogRouter.delete('/api/suppliers/:id', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const { id } = req.params;
    const supplierId = parseInt(id);
    
    if (isNaN(supplierId) || supplierId <= 0) {
      throw createError.invalidInput('Invalid supplier ID');
    }
    
    const db = getDatabase();
    
    // Check if supplier exists
    const supplier = db.prepare('SELECT id, supplier_name, active FROM suppliers WHERE id = ?').get(supplierId) as { id: number; supplier_name: string; active: number } | undefined;
    if (!supplier) {
      throw createError.notFound('Supplier not found');
    }
    
    // Check if supplier is referenced by products
    const productRefs = db.prepare('SELECT COUNT(*) as count FROM products WHERE preferred_supplier_id = ?').get(supplierId) as { count: number };
    
    // Check if supplier is referenced by GRN
    const grnRefs = db.prepare('SELECT COUNT(*) as count FROM grn_headers WHERE supplier_id = ?').get(supplierId) as { count: number };
    
    const totalRefs = productRefs.count + grnRefs.count;
    
    if (totalRefs > 0) {
      // Soft delete - set active to 0
      db.prepare('UPDATE suppliers SET active = 0, updated_at = ? WHERE id = ?').run(new Date().toISOString(), supplierId);
      
      requestLogger.info({ 
        supplierId, 
        supplierName: supplier.supplier_name,
        references: totalRefs 
      }, 'Supplier soft deleted due to references');
      
      res.json({ 
        ok: true, 
        softDeleted: true, 
        message: `Supplier "${supplier.supplier_name}" has been deactivated (referenced by ${totalRefs} record${totalRefs > 1 ? 's' : ''})`,
        references: totalRefs
      });
    } else {
      // Hard delete - no references
      db.prepare('DELETE FROM suppliers WHERE id = ?').run(supplierId);
      
      requestLogger.info({ 
        supplierId, 
        supplierName: supplier.supplier_name 
      }, 'Supplier hard deleted');
      
      res.json({ 
        ok: true, 
        softDeleted: false, 
        message: `Supplier "${supplier.supplier_name}" has been deleted`
      });
    }
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    
    const context: ErrorContext = {
      requestId: req.requestId,
      operation: 'DELETE_SUPPLIER',
      resource: `/api/suppliers/${req.params.id}`
    };
    throw createError.databaseError('Failed to delete supplier', error, context);
  }
}));
