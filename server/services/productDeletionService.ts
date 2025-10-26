/**
 * Product Deletion Service
 * Handles product deletion checks and soft delete operations
 */

import { getDatabase } from '../db/database';
import { createLogger } from '../utils/logger';
import { getCurrentUTC } from '../utils/dateUtils';

const logger = createLogger('productDeletionService');

export interface ProductDeletionStatus {
  id: number;
  name_en: string;
  sku: string;
  deleted_at: string | null;
  deletion_status: 'already_deleted' | 'has_sales' | 'has_movements' | 'has_grn' | 'has_returns' | 'has_quick_sales' | 'can_delete';
  sales_count: number;
  movements_count: number;
  grn_count: number;
  returns_count: number;
  quick_sales_count: number;
}

export interface DeletionCheckResult {
  canDelete: boolean;
  reason?: string;
  dependencies: {
    sales: number;
    movements: number;
    grn: number;
    returns: number;
    quickSales: number;
  };
}

export class ProductDeletionService {
  private db = getDatabase();

  /**
   * Check if a product can be deleted
   */
  async checkDeletionStatus(productId: number): Promise<ProductDeletionStatus | null> {
    try {
      const result = this.db.prepare(`
        SELECT * FROM v_product_deletion_status 
        WHERE id = ?
      `).get(productId) as ProductDeletionStatus | undefined;

      if (!result) {
        return null;
      }

      logger.info({ productId, status: result.deletion_status }, 'Product deletion status checked');
      return result;
    } catch (error) {
      logger.error({ productId, error }, 'Error checking product deletion status');
      throw error;
    }
  }

  /**
   * Check if product can be deleted (simplified check)
   */
  async canDeleteProduct(productId: number): Promise<DeletionCheckResult> {
    try {
      const status = await this.checkDeletionStatus(productId);
      
      if (!status) {
        return {
          canDelete: false,
          reason: 'Product not found',
          dependencies: { sales: 0, movements: 0, grn: 0, returns: 0, quickSales: 0 }
        };
      }

      if (status.deletion_status === 'already_deleted') {
        return {
          canDelete: false,
          reason: 'Product is already deleted',
          dependencies: { sales: 0, movements: 0, grn: 0, returns: 0, quickSales: 0 }
        };
      }

      if (status.deletion_status === 'can_delete') {
        return {
          canDelete: true,
          dependencies: { sales: 0, movements: 0, grn: 0, returns: 0, quickSales: 0 }
        };
      }

      // Product has dependencies
      const reason = this.getDeletionReason(status.deletion_status);
      return {
        canDelete: false,
        reason,
        dependencies: {
          sales: status.sales_count,
          movements: status.movements_count,
          grn: status.grn_count,
          returns: status.returns_count,
          quickSales: status.quick_sales_count
        }
      };
    } catch (error) {
      logger.error({ productId, error }, 'Error checking if product can be deleted');
      throw error;
    }
  }

  /**
   * Soft delete a product
   */
  async softDeleteProduct(productId: number, deletedBy: number): Promise<boolean> {
    try {
      // Check if product can be deleted
      const canDelete = await this.canDeleteProduct(productId);
      if (!canDelete.canDelete) {
        throw new Error(`Cannot delete product: ${canDelete.reason}`);
      }

      // Perform soft delete
      const result = this.db.prepare(`
        UPDATE products 
        SET deleted_at = ?, deleted_by = ?, updated_at = ?
        WHERE id = ? AND deleted_at IS NULL
      `).run(getCurrentUTC(), deletedBy, getCurrentUTC(), productId);

      if (result.changes === 0) {
        throw new Error('Product not found or already deleted');
      }

      logger.info({ productId, deletedBy }, 'Product soft deleted successfully');
      return true;
    } catch (error) {
      logger.error({ productId, deletedBy, error }, 'Error soft deleting product');
      throw error;
    }
  }

  /**
   * Restore a soft deleted product
   */
  async restoreProduct(productId: number, restoredBy: number): Promise<boolean> {
    try {
      const result = this.db.prepare(`
        UPDATE products 
        SET deleted_at = NULL, deleted_by = NULL, updated_at = ?
        WHERE id = ? AND deleted_at IS NOT NULL
      `).run(getCurrentUTC(), productId);

      if (result.changes === 0) {
        throw new Error('Product not found or not deleted');
      }

      logger.info({ productId, restoredBy }, 'Product restored successfully');
      return true;
    } catch (error) {
      logger.error({ productId, restoredBy, error }, 'Error restoring product');
      throw error;
    }
  }

  /**
   * Hard delete a product (only if no dependencies)
   */
  async hardDeleteProduct(productId: number, deletedBy: number): Promise<boolean> {
    try {
      // Check if product can be deleted
      const canDelete = await this.canDeleteProduct(productId);
      if (!canDelete.canDelete) {
        throw new Error(`Cannot delete product: ${canDelete.reason}`);
      }

      // Perform hard delete
      const result = this.db.prepare(`
        DELETE FROM products 
        WHERE id = ? AND deleted_at IS NULL
      `).run(productId);

      if (result.changes === 0) {
        throw new Error('Product not found or already deleted');
      }

      logger.info({ productId, deletedBy }, 'Product hard deleted successfully');
      return true;
    } catch (error) {
      logger.error({ productId, deletedBy, error }, 'Error hard deleting product');
      throw error;
    }
  }

  /**
   * Get products that can be deleted
   */
  async getDeletableProducts(): Promise<ProductDeletionStatus[]> {
    try {
      const results = this.db.prepare(`
        SELECT * FROM v_product_deletion_status 
        WHERE deletion_status = 'can_delete'
        ORDER BY name_en
      `).all() as ProductDeletionStatus[];

      logger.info({ count: results.length }, 'Retrieved deletable products');
      return results;
    } catch (error) {
      logger.error({ error }, 'Error getting deletable products');
      throw error;
    }
  }

  /**
   * Get products with dependencies
   */
  async getProductsWithDependencies(): Promise<ProductDeletionStatus[]> {
    try {
      const results = this.db.prepare(`
        SELECT * FROM v_product_deletion_status 
        WHERE deletion_status != 'can_delete' AND deletion_status != 'already_deleted'
        ORDER BY name_en
      `).all() as ProductDeletionStatus[];

      logger.info({ count: results.length }, 'Retrieved products with dependencies');
      return results;
    } catch (error) {
      logger.error({ error }, 'Error getting products with dependencies');
      throw error;
    }
  }

  /**
   * Get soft deleted products
   */
  async getSoftDeletedProducts(): Promise<ProductDeletionStatus[]> {
    try {
      const results = this.db.prepare(`
        SELECT * FROM v_product_deletion_status 
        WHERE deletion_status = 'already_deleted'
        ORDER BY deleted_at DESC
      `).all() as ProductDeletionStatus[];

      logger.info({ count: results.length }, 'Retrieved soft deleted products');
      return results;
    } catch (error) {
      logger.error({ error }, 'Error getting soft deleted products');
      throw error;
    }
  }

  /**
   * Get deletion reason message
   */
  private getDeletionReason(status: string): string {
    switch (status) {
      case 'has_sales':
        return 'Product has sales records';
      case 'has_movements':
        return 'Product has stock movements';
      case 'has_grn':
        return 'Product has GRN records';
      case 'has_returns':
        return 'Product has return records';
      case 'has_quick_sales':
        return 'Product has quick sales records';
      default:
        return 'Product has dependencies';
    }
  }

  /**
   * Get detailed dependency information for a product
   */
  async getProductDependencies(productId: number): Promise<{
    sales: any[];
    movements: any[];
    grn: any[];
    returns: any[];
    quickSales: any[];
  }> {
    try {
      const sales = this.db.prepare(`
        SELECT il.*, i.receipt_no, i.created_at as sale_date
        FROM invoice_lines il
        JOIN invoices i ON il.invoice_id = i.id
        WHERE il.product_id = ?
        ORDER BY i.created_at DESC
        LIMIT 10
      `).all(productId);

      const movements = this.db.prepare(`
        SELECT * FROM stock_movements
        WHERE product_id = ?
        ORDER BY created_at DESC
        LIMIT 10
      `).all(productId);

      const grn = this.db.prepare(`
        SELECT gl.*, gh.grn_number, gh.grn_date
        FROM grn_lines gl
        JOIN grn_headers gh ON gl.grn_id = gh.id
        WHERE gl.product_id = ?
        ORDER BY gh.grn_date DESC
        LIMIT 10
      `).all(productId);

      const returns = this.db.prepare(`
        SELECT rl.*, r.return_receipt_no, r.created_at as return_date
        FROM return_lines rl
        JOIN returns r ON rl.return_id = r.id
        WHERE rl.product_id = ?
        ORDER BY r.created_at DESC
        LIMIT 10
      `).all(productId);

      const quickSales = this.db.prepare(`
        SELECT qsl.*, qss.session_name, qss.created_at as session_date
        FROM quick_sales_lines qsl
        JOIN quick_sales_sessions qss ON qsl.session_id = qss.id
        WHERE qsl.product_id = ?
        ORDER BY qss.created_at DESC
        LIMIT 10
      `).all(productId);

      return {
        sales,
        movements,
        grn,
        returns,
        quickSales
      };
    } catch (error) {
      logger.error({ productId, error }, 'Error getting product dependencies');
      throw error;
    }
  }
}

export const productDeletionService = new ProductDeletionService();










