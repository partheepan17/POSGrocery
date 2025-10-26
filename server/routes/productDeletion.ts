/**
 * Product Deletion Routes
 * Handles product deletion with FK constraint checks and soft delete support
 */

import express from 'express';
import { z } from 'zod';
import { createRequestLogger } from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticateToken, requireRole } from '../middleware/auth';
import { productDeletionService, ProductDeletionStatus, DeletionCheckResult } from '../services/productDeletionService';
import { createStandardError, ERROR_CODES } from '../utils/errorCodes';

const productDeletionRouter = express.Router();
const logger = createRequestLogger('productDeletion');

// Validation schemas
const ProductIdSchema = z.object({
  id: z.string().transform((val) => parseInt(val)).refine((val) => !isNaN(val) && val > 0, {
    message: 'Invalid product ID'
  })
});

const SoftDeleteSchema = z.object({
  productId: z.number().int().positive(),
  reason: z.string().optional()
});

const RestoreSchema = z.object({
  productId: z.number().int().positive()
});

/**
 * GET /api/products/:id/deletion-status
 * Check if a product can be deleted
 */
productDeletionRouter.get(
  '/:id/deletion-status',
  authenticateToken,
  requireRole('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const { id } = ProductIdSchema.parse(req.params);
    
    logger.info({ productId: id }, 'Checking product deletion status');
    
    try {
      const status = await productDeletionService.checkDeletionStatus(id);
      
      if (!status) {
        return res.status(404).json(createStandardError(
          ERROR_CODES.PRODUCT_NOT_FOUND,
          'Product not found'
        ));
      }

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error({ productId: id, error }, 'Error checking product deletion status');
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to check product deletion status'
      ));
    }
  })
);

/**
 * GET /api/products/:id/can-delete
 * Simple check if product can be deleted
 */
productDeletionRouter.get(
  '/:id/can-delete',
  authenticateToken,
  requireRole('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const { id } = ProductIdSchema.parse(req.params);
    
    logger.info({ productId: id }, 'Checking if product can be deleted');
    
    try {
      const result = await productDeletionService.canDeleteProduct(id);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error({ productId: id, error }, 'Error checking if product can be deleted');
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to check if product can be deleted'
      ));
    }
  })
);

/**
 * POST /api/products/:id/soft-delete
 * Soft delete a product
 */
productDeletionRouter.post(
  '/:id/soft-delete',
  authenticateToken,
  requireRole('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const { id } = ProductIdSchema.parse(req.params);
    const { reason } = SoftDeleteSchema.parse({ ...req.body, productId: id });
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json(createStandardError(
        ERROR_CODES.UNAUTHORIZED,
        'User not authenticated'
      ));
    }
    
    logger.info({ productId: id, userId, reason }, 'Soft deleting product');
    
    try {
      const success = await productDeletionService.softDeleteProduct(id, userId);
      
      if (!success) {
        return res.status(400).json(createStandardError(
          ERROR_CODES.INVALID_REQUEST,
          'Failed to soft delete product'
        ));
      }

      res.json({
        success: true,
        message: 'Product soft deleted successfully'
      });
    } catch (error) {
      logger.error({ productId: id, userId, error }, 'Error soft deleting product');
      
      if (error instanceof Error && error.message.includes('Cannot delete product')) {
        return res.status(409).json(createStandardError(
          ERROR_CODES.CONFLICT,
          error.message
        ));
      }
      
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to soft delete product'
      ));
    }
  })
);

/**
 * POST /api/products/:id/restore
 * Restore a soft deleted product
 */
productDeletionRouter.post(
  '/:id/restore',
  authenticateToken,
  requireRole('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const { id } = ProductIdSchema.parse(req.params);
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json(createStandardError(
        ERROR_CODES.UNAUTHORIZED,
        'User not authenticated'
      ));
    }
    
    logger.info({ productId: id, userId }, 'Restoring product');
    
    try {
      const success = await productDeletionService.restoreProduct(id, userId);
      
      if (!success) {
        return res.status(400).json(createStandardError(
          ERROR_CODES.INVALID_REQUEST,
          'Failed to restore product'
        ));
      }

      res.json({
        success: true,
        message: 'Product restored successfully'
      });
    } catch (error) {
      logger.error({ productId: id, userId, error }, 'Error restoring product');
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to restore product'
      ));
    }
  })
);

/**
 * DELETE /api/products/:id/hard-delete
 * Hard delete a product (only if no dependencies)
 */
productDeletionRouter.delete(
  '/:id/hard-delete',
  authenticateToken,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { id } = ProductIdSchema.parse(req.params);
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json(createStandardError(
        ERROR_CODES.UNAUTHORIZED,
        'User not authenticated'
      ));
    }
    
    logger.info({ productId: id, userId }, 'Hard deleting product');
    
    try {
      const success = await productDeletionService.hardDeleteProduct(id, userId);
      
      if (!success) {
        return res.status(400).json(createStandardError(
          ERROR_CODES.INVALID_REQUEST,
          'Failed to hard delete product'
        ));
      }

      res.json({
        success: true,
        message: 'Product hard deleted successfully'
      });
    } catch (error) {
      logger.error({ productId: id, userId, error }, 'Error hard deleting product');
      
      if (error instanceof Error && error.message.includes('Cannot delete product')) {
        return res.status(409).json(createStandardError(
          ERROR_CODES.CONFLICT,
          error.message
        ));
      }
      
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to hard delete product'
      ));
    }
  })
);

/**
 * GET /api/products/deletable
 * Get products that can be deleted
 */
productDeletionRouter.get(
  '/deletable',
  authenticateToken,
  requireRole('admin', 'manager'),
  asyncHandler(async (req, res) => {
    logger.info('Getting deletable products');
    
    try {
      const products = await productDeletionService.getDeletableProducts();
      
      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      logger.error({ error }, 'Error getting deletable products');
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to get deletable products'
      ));
    }
  })
);

/**
 * GET /api/products/with-dependencies
 * Get products with dependencies
 */
productDeletionRouter.get(
  '/with-dependencies',
  authenticateToken,
  requireRole('admin', 'manager'),
  asyncHandler(async (req, res) => {
    logger.info('Getting products with dependencies');
    
    try {
      const products = await productDeletionService.getProductsWithDependencies();
      
      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      logger.error({ error }, 'Error getting products with dependencies');
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to get products with dependencies'
      ));
    }
  })
);

/**
 * GET /api/products/deleted
 * Get soft deleted products
 */
productDeletionRouter.get(
  '/deleted',
  authenticateToken,
  requireRole('admin', 'manager'),
  asyncHandler(async (req, res) => {
    logger.info('Getting soft deleted products');
    
    try {
      const products = await productDeletionService.getSoftDeletedProducts();
      
      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      logger.error({ error }, 'Error getting soft deleted products');
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to get soft deleted products'
      ));
    }
  })
);

/**
 * GET /api/products/:id/dependencies
 * Get detailed dependency information for a product
 */
productDeletionRouter.get(
  '/:id/dependencies',
  authenticateToken,
  requireRole('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const { id } = ProductIdSchema.parse(req.params);
    
    logger.info({ productId: id }, 'Getting product dependencies');
    
    try {
      const dependencies = await productDeletionService.getProductDependencies(id);
      
      res.json({
        success: true,
        data: dependencies
      });
    } catch (error) {
      logger.error({ productId: id, error }, 'Error getting product dependencies');
      res.status(500).json(createStandardError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to get product dependencies'
      ));
    }
  })
);

export default productDeletionRouter;










