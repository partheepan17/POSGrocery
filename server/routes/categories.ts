/**
 * Categories API Routes
 * Handles category CRUD operations and management
 */

import express from 'express';
import { z } from 'zod';
import { createRequestLogger } from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticateToken, requireRole } from '../middleware/auth';
import { createStandardError, ERROR_CODES } from '../utils/errorCodes';
import { getDatabase } from '../db';

const categoriesRouter = express.Router();
const logger = createRequestLogger('categories');

// Validation schemas
const CategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  parent_id: z.number().int().positive().optional(),
  sort_order: z.number().int().min(0).optional().default(0),
  is_active: z.boolean().optional().default(true)
});

const CategoryUpdateSchema = CategorySchema.partial();

/**
 * GET /api/categories - List all categories
 */
categoriesRouter.get('/',
  authenticateToken,
  requireRole('cashier', 'manager', 'admin'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    
    try {
      const categories = db.prepare(`
        SELECT 
          c.*,
          p.name as parent_name,
          COUNT(p2.id) as product_count
        FROM categories c
        LEFT JOIN categories p ON c.parent_id = p.id
        LEFT JOIN products p2 ON c.id = p2.category_id AND p2.is_active = 1
        GROUP BY c.id
        ORDER BY c.sort_order, c.name
      `).all();
      
      res.json({
        success: true,
        categories
      });
      
    } catch (error) {
      logger.error({ error }, 'Failed to get categories');
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to get categories'
      ));
    }
  })
);

/**
 * GET /api/categories/tree - Get categories as tree structure
 */
categoriesRouter.get('/tree',
  authenticateToken,
  requireRole('cashier', 'manager', 'admin'),
  asyncHandler(async (req, res) => {
    const db = getDatabase();
    
    try {
      const categories = db.prepare(`
        SELECT 
          c.*,
          COUNT(p.id) as product_count
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id AND p.is_active = 1
        WHERE c.is_active = 1
        GROUP BY c.id
        ORDER BY c.sort_order, c.name
      `).all();
      
      // Build tree structure
      const categoryMap = new Map();
      const rootCategories = [];
      
      // First pass: create map
      categories.forEach(category => {
        categoryMap.set(category.id, { ...category, children: [] });
      });
      
      // Second pass: build tree
      categories.forEach(category => {
        if (category.parent_id) {
          const parent = categoryMap.get(category.parent_id);
          if (parent) {
            parent.children.push(categoryMap.get(category.id));
          }
        } else {
          rootCategories.push(categoryMap.get(category.id));
        }
      });
      
      res.json({
        success: true,
        categories: rootCategories
      });
      
    } catch (error) {
      logger.error({ error }, 'Failed to get category tree');
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to get category tree'
      ));
    }
  })
);

/**
 * GET /api/categories/:id - Get single category
 */
categoriesRouter.get('/:id',
  authenticateToken,
  requireRole('cashier', 'manager', 'admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const categoryId = parseInt(id);
    const db = getDatabase();
    
    if (isNaN(categoryId)) {
      return res.status(400).json(createStandardError(
        ERROR_CODES.INVALID_INPUT,
        'Invalid category ID'
      ));
    }
    
    try {
      const category = db.prepare(`
        SELECT 
          c.*,
          p.name as parent_name,
          COUNT(p2.id) as product_count
        FROM categories c
        LEFT JOIN categories p ON c.parent_id = p.id
        LEFT JOIN products p2 ON c.id = p2.category_id AND p2.is_active = 1
        WHERE c.id = ?
        GROUP BY c.id
      `).get(categoryId);
      
      if (!category) {
        return res.status(404).json(createStandardError(
          ERROR_CODES.CATEGORY_NOT_FOUND,
          'Category not found'
        ));
      }
      
      res.json({ success: true, category });
      
    } catch (error) {
      logger.error({ error, categoryId }, 'Failed to get category');
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to get category'
      ));
    }
  })
);

/**
 * POST /api/categories - Create new category
 */
categoriesRouter.post('/',
  authenticateToken,
  requireRole('manager', 'admin'),
  asyncHandler(async (req, res) => {
    const categoryData = CategorySchema.parse(req.body);
    const db = getDatabase();
    
    logger.info({ categoryData }, 'Creating category');
    
    try {
      // Check if category name already exists
      const existingCategory = db.prepare(`
        SELECT id FROM categories WHERE name = ?
      `).get(categoryData.name);
      
      if (existingCategory) {
        return res.status(409).json(createStandardError(
          ERROR_CODES.CONFLICT,
          'Category with this name already exists'
        ));
      }
      
      // Validate parent category exists (if provided)
      if (categoryData.parent_id) {
        const parentCategory = db.prepare(`
          SELECT id FROM categories WHERE id = ? AND is_active = 1
        `).get(categoryData.parent_id);
        
        if (!parentCategory) {
          return res.status(400).json(createStandardError(
            ERROR_CODES.INVALID_INPUT,
            'Parent category not found or inactive'
          ));
        }
      }
      
      // Create category
      const result = db.prepare(`
        INSERT INTO categories (
          name, description, parent_id, sort_order, is_active
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        categoryData.name,
        categoryData.description || null,
        categoryData.parent_id || null,
        categoryData.sort_order,
        categoryData.is_active ? 1 : 0
      );
      
      const categoryId = result.lastInsertRowid;
      
      // Get the created category
      const category = db.prepare(`
        SELECT 
          c.*,
          p.name as parent_name
        FROM categories c
        LEFT JOIN categories p ON c.parent_id = p.id
        WHERE c.id = ?
      `).get(categoryId);
      
      logger.info({ categoryId }, 'Category created successfully');
      
      res.status(201).json({
        success: true,
        category,
        message: 'Category created successfully'
      });
      
    } catch (error) {
      logger.error({ error, categoryData }, 'Failed to create category');
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to create category'
      ));
    }
  })
);

/**
 * PUT /api/categories/:id - Update category
 */
categoriesRouter.put('/:id',
  authenticateToken,
  requireRole('manager', 'admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const categoryId = parseInt(id);
    const updateData = CategoryUpdateSchema.parse(req.body);
    const db = getDatabase();
    
    if (isNaN(categoryId)) {
      return res.status(400).json(createStandardError(
        ERROR_CODES.INVALID_INPUT,
        'Invalid category ID'
      ));
    }
    
    logger.info({ categoryId, updateData }, 'Updating category');
    
    try {
      // Check if category exists
      const existingCategory = db.prepare(`
        SELECT id FROM categories WHERE id = ?
      `).get(categoryId);
      
      if (!existingCategory) {
        return res.status(404).json(createStandardError(
          ERROR_CODES.CATEGORY_NOT_FOUND,
          'Category not found'
        ));
      }
      
      // Check for name conflicts (if name is being updated)
      if (updateData.name) {
        const nameConflict = db.prepare(`
          SELECT id FROM categories WHERE name = ? AND id != ?
        `).get(updateData.name, categoryId);
        
        if (nameConflict) {
          return res.status(409).json(createStandardError(
            ERROR_CODES.CONFLICT,
            'Category with this name already exists'
          ));
        }
      }
      
      // Validate parent category exists (if being updated)
      if (updateData.parent_id) {
        const parentCategory = db.prepare(`
          SELECT id FROM categories WHERE id = ? AND is_active = 1
        `).get(updateData.parent_id);
        
        if (!parentCategory) {
          return res.status(400).json(createStandardError(
            ERROR_CODES.INVALID_INPUT,
            'Parent category not found or inactive'
          ));
        }
        
        // Prevent circular reference
        if (updateData.parent_id === categoryId) {
          return res.status(400).json(createStandardError(
            ERROR_CODES.INVALID_INPUT,
            'Category cannot be its own parent'
          ));
        }
      }
      
      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];
      
      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields.push(`${key} = ?`);
          if (key === 'is_active') {
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
      updateValues.push(categoryId);
      
      const updateQuery = `
        UPDATE categories 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;
      
      db.prepare(updateQuery).run(...updateValues);
      
      // Get the updated category
      const category = db.prepare(`
        SELECT 
          c.*,
          p.name as parent_name
        FROM categories c
        LEFT JOIN categories p ON c.parent_id = p.id
        WHERE c.id = ?
      `).get(categoryId);
      
      logger.info({ categoryId }, 'Category updated successfully');
      
      res.json({
        success: true,
        category,
        message: 'Category updated successfully'
      });
      
    } catch (error) {
      logger.error({ error, categoryId, updateData }, 'Failed to update category');
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to update category'
      ));
    }
  })
);

/**
 * DELETE /api/categories/:id - Soft delete category
 */
categoriesRouter.delete('/:id',
  authenticateToken,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const categoryId = parseInt(id);
    const db = getDatabase();
    
    if (isNaN(categoryId)) {
      return res.status(400).json(createStandardError(
        ERROR_CODES.INVALID_INPUT,
        'Invalid category ID'
      ));
    }
    
    logger.info({ categoryId }, 'Deleting category');
    
    try {
      // Check if category exists
      const existingCategory = db.prepare(`
        SELECT id, is_active FROM categories WHERE id = ?
      `).get(categoryId);
      
      if (!existingCategory) {
        return res.status(404).json(createStandardError(
          ERROR_CODES.CATEGORY_NOT_FOUND,
          'Category not found'
        ));
      }
      
      // Check if category has products
      const productCount = db.prepare(`
        SELECT COUNT(*) as count FROM products WHERE category_id = ? AND is_active = 1
      `).get(categoryId) as { count: number };
      
      if (productCount.count > 0) {
        return res.status(400).json(createStandardError(
          ERROR_CODES.INVALID_INPUT,
          'Cannot delete category with active products'
        ));
      }
      
      // Check if category has children
      const childrenCount = db.prepare(`
        SELECT COUNT(*) as count FROM categories WHERE parent_id = ? AND is_active = 1
      `).get(categoryId) as { count: number };
      
      if (childrenCount.count > 0) {
        return res.status(400).json(createStandardError(
          ERROR_CODES.INVALID_INPUT,
          'Cannot delete category with active subcategories'
        ));
      }
      
      // Soft delete (set is_active = 0)
      db.prepare(`
        UPDATE categories 
        SET is_active = 0, updated_at = datetime("now")
        WHERE id = ?
      `).run(categoryId);
      
      logger.info({ categoryId }, 'Category deleted successfully');
      
      res.json({
        success: true,
        message: 'Category deleted successfully'
      });
      
    } catch (error) {
      logger.error({ error, categoryId }, 'Failed to delete category');
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to delete category'
      ));
    }
  })
);

export default categoriesRouter;






