/**
 * Suppliers API Routes
 * Handles supplier CRUD operations and management
 */

import express from 'express';
import { z } from 'zod';
import { createRequestLogger } from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticateToken, requireRole } from '../middleware/auth';
import { createStandardError, ERROR_CODES } from '../utils/errorCodes';
import { getDatabase } from '../db';

const suppliersRouter = express.Router();
const logger = createRequestLogger('suppliers');

// Validation schemas
const SupplierSchema = z.object({
  supplier_name: z.string().min(1),
  contact_person: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().email().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  tax_id: z.string().optional(),
  payment_terms: z.string().optional(),
  credit_limit: z.number().min(0).optional(),
  notes: z.string().optional(),
  active: z.boolean().optional().default(true)
});

const SupplierUpdateSchema = SupplierSchema.partial();

const SupplierSearchSchema = z.object({
  q: z.string().optional(),
  active: z.string().optional(),
  sortBy: z.enum(['supplier_name', 'created_at', 'contact_person']).optional().default('supplier_name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.string().transform(Number).optional().default(1),
  pageSize: z.string().transform(Number).optional().default(20)
});

/**
 * GET /api/suppliers - List suppliers with search and pagination
 */
suppliersRouter.get('/',
  authenticateToken,
  requireRole('cashier', 'manager', 'admin'),
  asyncHandler(async (req, res) => {
    const query = SupplierSearchSchema.parse(req.query);
    const db = getDatabase();
    
    logger.info({ query }, 'Searching suppliers');
    
    try {
      // Build WHERE clause
      const whereConditions = [];
      const params: any[] = [];
      
      if (query.q && query.q.trim()) {
        const searchTerm = `%${query.q.trim()}%`;
        whereConditions.push(`(
          supplier_name LIKE ? OR 
          contact_person LIKE ? OR 
          contact_phone LIKE ? OR 
          contact_email LIKE ? OR
          address LIKE ?
        )`);
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }
      
      if (query.active === 'true') {
        whereConditions.push('active = 1');
      } else if (query.active === 'false') {
        whereConditions.push('active = 0');
      }
      
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';
      
      // Get total count
      const countResult = db.prepare(`
        SELECT COUNT(*) as total
        FROM suppliers
        ${whereClause}
      `).get(...params) as { total: number };
      
      // Get suppliers with pagination
      const offset = (query.page - 1) * query.pageSize;
      const suppliers = db.prepare(`
        SELECT 
          s.*,
          COUNT(p.id) as product_count
        FROM suppliers s
        LEFT JOIN products p ON s.id = p.preferred_supplier_id AND p.is_active = 1
        ${whereClause}
        GROUP BY s.id
        ORDER BY s.${query.sortBy} ${query.sortOrder}
        LIMIT ? OFFSET ?
      `).all(...params, query.pageSize, offset);
      
      const totalPages = Math.ceil(countResult.total / query.pageSize);
      
      res.json({
        success: true,
        suppliers,
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
      logger.error({ error, query }, 'Failed to search suppliers');
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to search suppliers'
      ));
    }
  })
);

/**
 * GET /api/suppliers/search - Quick supplier search
 */
suppliersRouter.get('/search',
  asyncHandler(async (req, res) => {
    const { q, limit = '10' } = req.query;
    const db = getDatabase();
    
    if (!q || q.toString().trim().length < 2) {
      return res.json({ success: true, suppliers: [] });
    }
    
    try {
      const searchTerm = `%${q.toString().trim()}%`;
      const limitNum = parseInt(limit.toString());
      
      const suppliers = db.prepare(`
        SELECT 
          id, supplier_name, contact_person, contact_phone, contact_email,
          active
        FROM suppliers
        WHERE active = 1 
          AND (
            supplier_name LIKE ? OR 
            contact_person LIKE ? OR 
            contact_phone LIKE ? OR 
            contact_email LIKE ?
          )
        ORDER BY 
          CASE 
            WHEN supplier_name LIKE ? THEN 1
            WHEN contact_person LIKE ? THEN 2
            WHEN contact_phone LIKE ? THEN 3
            WHEN contact_email LIKE ? THEN 4
            ELSE 5
          END,
          supplier_name
        LIMIT ?
      `).all(
        searchTerm, searchTerm, searchTerm, searchTerm,
        searchTerm, searchTerm, searchTerm, searchTerm,
        limitNum
      );
      
      res.json({ success: true, suppliers });
      
    } catch (error) {
      logger.error({ error, query: q }, 'Failed to search suppliers');
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to search suppliers'
      ));
    }
  })
);

/**
 * GET /api/suppliers/:id - Get single supplier
 */
suppliersRouter.get('/:id',
  authenticateToken,
  requireRole('cashier', 'manager', 'admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const supplierId = parseInt(id);
    const db = getDatabase();
    
    if (isNaN(supplierId)) {
      return res.status(400).json(createStandardError(
        ERROR_CODES.INVALID_INPUT,
        'Invalid supplier ID'
      ));
    }
    
    try {
      const supplier = db.prepare(`
        SELECT 
          s.*,
          COUNT(p.id) as product_count
        FROM suppliers s
        LEFT JOIN products p ON s.id = p.preferred_supplier_id AND p.is_active = 1
        WHERE s.id = ?
        GROUP BY s.id
      `).get(supplierId);
      
      if (!supplier) {
        return res.status(404).json(createStandardError(
          ERROR_CODES.SUPPLIER_NOT_FOUND,
          'Supplier not found'
        ));
      }
      
      res.json({ success: true, supplier });
      
    } catch (error) {
      logger.error({ error, supplierId }, 'Failed to get supplier');
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to get supplier'
      ));
    }
  })
);

/**
 * POST /api/suppliers - Create new supplier
 */
suppliersRouter.post('/',
  authenticateToken,
  requireRole('manager', 'admin'),
  asyncHandler(async (req, res) => {
    const supplierData = SupplierSchema.parse(req.body);
    const db = getDatabase();
    
    logger.info({ supplierData }, 'Creating supplier');
    
    try {
      // Check if supplier with same name already exists
      const existingSupplier = db.prepare(`
        SELECT id FROM suppliers WHERE supplier_name = ?
      `).get(supplierData.supplier_name);
      
      if (existingSupplier) {
        return res.status(409).json(createStandardError(
          ERROR_CODES.CONFLICT,
          'Supplier with this name already exists'
        ));
      }
      
      // Check if supplier with same email already exists (if provided)
      if (supplierData.contact_email) {
        const existingEmail = db.prepare(`
          SELECT id FROM suppliers WHERE contact_email = ?
        `).get(supplierData.contact_email);
        
        if (existingEmail) {
          return res.status(409).json(createStandardError(
            ERROR_CODES.CONFLICT,
            'Supplier with this email already exists'
          ));
        }
      }
      
      // Create supplier
      const result = db.prepare(`
        INSERT INTO suppliers (
          supplier_name, contact_person, contact_phone, contact_email,
          address, city, tax_id, payment_terms, credit_limit, notes, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        supplierData.supplier_name,
        supplierData.contact_person || null,
        supplierData.contact_phone || null,
        supplierData.contact_email || null,
        supplierData.address || null,
        supplierData.city || null,
        supplierData.tax_id || null,
        supplierData.payment_terms || null,
        supplierData.credit_limit || 0,
        supplierData.notes || null,
        supplierData.active ? 1 : 0
      );
      
      const supplierId = result.lastInsertRowid;
      
      // Get the created supplier
      const supplier = db.prepare(`
        SELECT *
        FROM suppliers
        WHERE id = ?
      `).get(supplierId);
      
      logger.info({ supplierId }, 'Supplier created successfully');
      
      res.status(201).json({
        success: true,
        supplier,
        message: 'Supplier created successfully'
      });
      
    } catch (error) {
      logger.error({ error, supplierData }, 'Failed to create supplier');
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to create supplier'
      ));
    }
  })
);

/**
 * PUT /api/suppliers/:id - Update supplier
 */
suppliersRouter.put('/:id',
  authenticateToken,
  requireRole('manager', 'admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const supplierId = parseInt(id);
    const updateData = SupplierUpdateSchema.parse(req.body);
    const db = getDatabase();
    
    if (isNaN(supplierId)) {
      return res.status(400).json(createStandardError(
        ERROR_CODES.INVALID_INPUT,
        'Invalid supplier ID'
      ));
    }
    
    logger.info({ supplierId, updateData }, 'Updating supplier');
    
    try {
      // Check if supplier exists
      const existingSupplier = db.prepare(`
        SELECT id FROM suppliers WHERE id = ?
      `).get(supplierId);
      
      if (!existingSupplier) {
        return res.status(404).json(createStandardError(
          ERROR_CODES.SUPPLIER_NOT_FOUND,
          'Supplier not found'
        ));
      }
      
      // Check for name conflicts (if name is being updated)
      if (updateData.supplier_name) {
        const nameConflict = db.prepare(`
          SELECT id FROM suppliers WHERE supplier_name = ? AND id != ?
        `).get(updateData.supplier_name, supplierId);
        
        if (nameConflict) {
          return res.status(409).json(createStandardError(
            ERROR_CODES.CONFLICT,
            'Supplier with this name already exists'
          ));
        }
      }
      
      // Check for email conflicts (if email is being updated)
      if (updateData.contact_email) {
        const emailConflict = db.prepare(`
          SELECT id FROM suppliers WHERE contact_email = ? AND id != ?
        `).get(updateData.contact_email, supplierId);
        
        if (emailConflict) {
          return res.status(409).json(createStandardError(
            ERROR_CODES.CONFLICT,
            'Supplier with this email already exists'
          ));
        }
      }
      
      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];
      
      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields.push(`${key} = ?`);
          if (key === 'active') {
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
      updateValues.push(supplierId);
      
      const updateQuery = `
        UPDATE suppliers 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;
      
      db.prepare(updateQuery).run(...updateValues);
      
      // Get the updated supplier
      const supplier = db.prepare(`
        SELECT *
        FROM suppliers
        WHERE id = ?
      `).get(supplierId);
      
      logger.info({ supplierId }, 'Supplier updated successfully');
      
      res.json({
        success: true,
        supplier,
        message: 'Supplier updated successfully'
      });
      
    } catch (error) {
      logger.error({ error, supplierId, updateData }, 'Failed to update supplier');
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to update supplier'
      ));
    }
  })
);

/**
 * DELETE /api/suppliers/:id - Soft delete supplier
 */
suppliersRouter.delete('/:id',
  authenticateToken,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const supplierId = parseInt(id);
    const db = getDatabase();
    
    if (isNaN(supplierId)) {
      return res.status(400).json(createStandardError(
        ERROR_CODES.INVALID_INPUT,
        'Invalid supplier ID'
      ));
    }
    
    logger.info({ supplierId }, 'Deleting supplier');
    
    try {
      // Check if supplier exists
      const existingSupplier = db.prepare(`
        SELECT id, active FROM suppliers WHERE id = ?
      `).get(supplierId);
      
      if (!existingSupplier) {
        return res.status(404).json(createStandardError(
          ERROR_CODES.SUPPLIER_NOT_FOUND,
          'Supplier not found'
        ));
      }
      
      // Check if supplier has products
      const productCount = db.prepare(`
        SELECT COUNT(*) as count FROM products WHERE preferred_supplier_id = ? AND is_active = 1
      `).get(supplierId) as { count: number };
      
      if (productCount.count > 0) {
        return res.status(400).json(createStandardError(
          ERROR_CODES.INVALID_INPUT,
          'Cannot delete supplier with active products'
        ));
      }
      
      // Soft delete (set active = 0)
      db.prepare(`
        UPDATE suppliers 
        SET active = 0, updated_at = datetime("now")
        WHERE id = ?
      `).run(supplierId);
      
      logger.info({ supplierId }, 'Supplier deleted successfully');
      
      res.json({
        success: true,
        message: 'Supplier deleted successfully'
      });
      
    } catch (error) {
      logger.error({ error, supplierId }, 'Failed to delete supplier');
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to delete supplier'
      ));
    }
  })
);

export default suppliersRouter;






