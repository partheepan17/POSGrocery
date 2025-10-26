/**
 * Customers API Routes
 * Handles customer CRUD operations and management
 */

import express from 'express';
import { z } from 'zod';
import { createRequestLogger } from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticateToken, requireRole } from '../middleware/auth';
import { createStandardError, ERROR_CODES } from '../utils/errorCodes';
import { getDatabase } from '../db';

const customersRouter = express.Router();
const logger = createRequestLogger('customers');

// Validation schemas
const CustomerSchema = z.object({
  customer_name: z.string().min(1),
  customer_phone: z.string().optional(),
  customer_email: z.string().email().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  customer_type: z.enum(['Retail', 'Wholesale', 'Credit', 'Other']).optional().default('Retail'),
  credit_limit: z.number().min(0).optional(),
  default_price_tier: z.enum(['Retail', 'Wholesale', 'Credit', 'Other']).optional(),
  notes: z.string().optional(),
  active: z.boolean().optional().default(true)
});

const CustomerUpdateSchema = CustomerSchema.partial();

const CustomerSearchSchema = z.object({
  q: z.string().optional(),
  customer_type: z.string().optional(),
  active: z.string().optional(),
  sortBy: z.enum(['customer_name', 'created_at', 'customer_type']).optional().default('customer_name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.string().transform(Number).optional().default(1),
  pageSize: z.string().transform(Number).optional().default(20)
});

/**
 * GET /api/customers - List customers with search and pagination
 */
customersRouter.get('/',
  authenticateToken,
  requireRole('cashier', 'manager', 'admin'),
  asyncHandler(async (req, res) => {
    const query = CustomerSearchSchema.parse(req.query);
    const db = getDatabase();
    
    logger.info({ query }, 'Searching customers');
    
    try {
      // Build WHERE clause
      const whereConditions = [];
      const params: any[] = [];
      
      if (query.q && query.q.trim()) {
        const searchTerm = `%${query.q.trim()}%`;
        whereConditions.push(`(
          customer_name LIKE ? OR 
          customer_phone LIKE ? OR 
          customer_email LIKE ? OR
          address LIKE ?
        )`);
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }
      
      if (query.customer_type) {
        whereConditions.push('customer_type = ?');
        params.push(query.customer_type);
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
        FROM customers
        ${whereClause}
      `).get(...params) as { total: number };
      
      // Get customers with pagination
      const offset = (query.page - 1) * query.pageSize;
      const customers = db.prepare(`
        SELECT *
        FROM customers
        ${whereClause}
        ORDER BY ${query.sortBy} ${query.sortOrder}
        LIMIT ? OFFSET ?
      `).all(...params, query.pageSize, offset);
      
      const totalPages = Math.ceil(countResult.total / query.pageSize);
      
      res.json({
        success: true,
        customers,
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
      logger.error({ error, query }, 'Failed to search customers');
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to search customers'
      ));
    }
  })
);

/**
 * GET /api/customers/search - Quick customer search for POS
 */
customersRouter.get('/search',
  asyncHandler(async (req, res) => {
    const { q, limit = '10' } = req.query;
    const db = getDatabase();
    
    if (!q || q.toString().trim().length < 2) {
      return res.json({ success: true, customers: [] });
    }
    
    try {
      const searchTerm = `%${q.toString().trim()}%`;
      const limitNum = parseInt(limit.toString());
      
      const customers = db.prepare(`
        SELECT 
          id, customer_name, customer_phone, customer_email,
          customer_type, credit_limit, default_price_tier, active
        FROM customers
        WHERE active = 1 
          AND (
            customer_name LIKE ? OR 
            customer_phone LIKE ? OR 
            customer_email LIKE ?
          )
        ORDER BY 
          CASE 
            WHEN customer_name LIKE ? THEN 1
            WHEN customer_phone LIKE ? THEN 2
            WHEN customer_email LIKE ? THEN 3
            ELSE 4
          END,
          customer_name
        LIMIT ?
      `).all(
        searchTerm, searchTerm, searchTerm,
        searchTerm, searchTerm, searchTerm,
        limitNum
      );
      
      res.json({ success: true, customers });
      
    } catch (error) {
      logger.error({ error, query: q }, 'Failed to search customers');
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to search customers'
      ));
    }
  })
);

/**
 * GET /api/customers/:id - Get single customer
 */
customersRouter.get('/:id',
  authenticateToken,
  requireRole('cashier', 'manager', 'admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const customerId = parseInt(id);
    const db = getDatabase();
    
    if (isNaN(customerId)) {
      return res.status(400).json(createStandardError(
        ERROR_CODES.INVALID_INPUT,
        'Invalid customer ID'
      ));
    }
    
    try {
      const customer = db.prepare(`
        SELECT *
        FROM customers
        WHERE id = ?
      `).get(customerId);
      
      if (!customer) {
        return res.status(404).json(createStandardError(
          ERROR_CODES.CUSTOMER_NOT_FOUND,
          'Customer not found'
        ));
      }
      
      res.json({ success: true, customer });
      
    } catch (error) {
      logger.error({ error, customerId }, 'Failed to get customer');
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to get customer'
      ));
    }
  })
);

/**
 * POST /api/customers - Create new customer
 */
customersRouter.post('/',
  authenticateToken,
  requireRole('manager', 'admin'),
  asyncHandler(async (req, res) => {
    const customerData = CustomerSchema.parse(req.body);
    const db = getDatabase();
    
    logger.info({ customerData }, 'Creating customer');
    
    try {
      // Check if customer with same phone or email already exists
      if (customerData.customer_phone || customerData.customer_email) {
        const existingCustomer = db.prepare(`
          SELECT id FROM customers 
          WHERE (customer_phone = ? AND customer_phone IS NOT NULL) 
             OR (customer_email = ? AND customer_email IS NOT NULL)
        `).get(customerData.customer_phone || '', customerData.customer_email || '');
        
        if (existingCustomer) {
          return res.status(409).json(createStandardError(
            ERROR_CODES.CONFLICT,
            'Customer with this phone or email already exists'
          ));
        }
      }
      
      // Create customer
      const result = db.prepare(`
        INSERT INTO customers (
          customer_name, customer_phone, customer_email, address, city,
          customer_type, credit_limit, default_price_tier, notes, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        customerData.customer_name,
        customerData.customer_phone || null,
        customerData.customer_email || null,
        customerData.address || null,
        customerData.city || null,
        customerData.customer_type,
        customerData.credit_limit || 0,
        customerData.default_price_tier || customerData.customer_type,
        customerData.notes || null,
        customerData.active ? 1 : 0
      );
      
      const customerId = result.lastInsertRowid;
      
      // Get the created customer
      const customer = db.prepare(`
        SELECT *
        FROM customers
        WHERE id = ?
      `).get(customerId);
      
      logger.info({ customerId }, 'Customer created successfully');
      
      res.status(201).json({
        success: true,
        customer,
        message: 'Customer created successfully'
      });
      
    } catch (error) {
      logger.error({ error, customerData }, 'Failed to create customer');
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to create customer'
      ));
    }
  })
);

/**
 * PUT /api/customers/:id - Update customer
 */
customersRouter.put('/:id',
  authenticateToken,
  requireRole('manager', 'admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const customerId = parseInt(id);
    const updateData = CustomerUpdateSchema.parse(req.body);
    const db = getDatabase();
    
    if (isNaN(customerId)) {
      return res.status(400).json(createStandardError(
        ERROR_CODES.INVALID_INPUT,
        'Invalid customer ID'
      ));
    }
    
    logger.info({ customerId, updateData }, 'Updating customer');
    
    try {
      // Check if customer exists
      const existingCustomer = db.prepare(`
        SELECT id FROM customers WHERE id = ?
      `).get(customerId);
      
      if (!existingCustomer) {
        return res.status(404).json(createStandardError(
          ERROR_CODES.CUSTOMER_NOT_FOUND,
          'Customer not found'
        ));
      }
      
      // Check for phone/email conflicts (if being updated)
      if (updateData.customer_phone || updateData.customer_email) {
        const conflict = db.prepare(`
          SELECT id FROM customers 
          WHERE id != ? AND (
            (customer_phone = ? AND customer_phone IS NOT NULL) 
            OR (customer_email = ? AND customer_email IS NOT NULL)
          )
        `).get(
          customerId,
          updateData.customer_phone || '',
          updateData.customer_email || ''
        );
        
        if (conflict) {
          return res.status(409).json(createStandardError(
            ERROR_CODES.CONFLICT,
            'Customer with this phone or email already exists'
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
      updateValues.push(customerId);
      
      const updateQuery = `
        UPDATE customers 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;
      
      db.prepare(updateQuery).run(...updateValues);
      
      // Get the updated customer
      const customer = db.prepare(`
        SELECT *
        FROM customers
        WHERE id = ?
      `).get(customerId);
      
      logger.info({ customerId }, 'Customer updated successfully');
      
      res.json({
        success: true,
        customer,
        message: 'Customer updated successfully'
      });
      
    } catch (error) {
      logger.error({ error, customerId, updateData }, 'Failed to update customer');
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to update customer'
      ));
    }
  })
);

/**
 * DELETE /api/customers/:id - Soft delete customer
 */
customersRouter.delete('/:id',
  authenticateToken,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const customerId = parseInt(id);
    const db = getDatabase();
    
    if (isNaN(customerId)) {
      return res.status(400).json(createStandardError(
        ERROR_CODES.INVALID_INPUT,
        'Invalid customer ID'
      ));
    }
    
    logger.info({ customerId }, 'Deleting customer');
    
    try {
      // Check if customer exists
      const existingCustomer = db.prepare(`
        SELECT id, active FROM customers WHERE id = ?
      `).get(customerId);
      
      if (!existingCustomer) {
        return res.status(404).json(createStandardError(
          ERROR_CODES.CUSTOMER_NOT_FOUND,
          'Customer not found'
        ));
      }
      
      // Soft delete (set active = 0)
      db.prepare(`
        UPDATE customers 
        SET active = 0, updated_at = datetime("now")
        WHERE id = ?
      `).run(customerId);
      
      logger.info({ customerId }, 'Customer deleted successfully');
      
      res.json({
        success: true,
        message: 'Customer deleted successfully'
      });
      
    } catch (error) {
      logger.error({ error, customerId }, 'Failed to delete customer');
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to delete customer'
      ));
    }
  })
);

export default customersRouter;






