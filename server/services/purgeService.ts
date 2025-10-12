import { getDatabase } from '../db';
import { createRequestLogger } from '../utils/logger';
import { createError } from '../types/errors';

export interface PurgeResult {
  success: boolean;
  purgedCounts: {
    products: number;
    customers: number;
    suppliers: number;
    invoices: number;
    invoiceLines: number;
    invoicePayments: number;
    returns: number;
    categories: number;
    users: number;
  };
  errors: string[];
}

export class PurgeService {
  private getDb() {
    try {
      return getDatabase();
    } catch (error) {
      throw createError.databaseError('Database connection failed', error);
    }
  }

  /**
   * Purge all demo data (names starting with TEST/DEMO)
   * This is a destructive operation that requires manager PIN verification
   */
  async purgeDemoData(requestId?: string): Promise<PurgeResult> {
    const logger = createRequestLogger({ requestId } as any);
    const db = this.getDb();
    
    const result: PurgeResult = {
      success: false,
      purgedCounts: {
        products: 0,
        customers: 0,
        suppliers: 0,
        invoices: 0,
        invoiceLines: 0,
        invoicePayments: 0,
        returns: 0,
        categories: 0,
        users: 0
      },
      errors: []
    };

    try {
      logger.info('Starting demo data purge operation');

      // Start transaction
      const transaction = db.transaction(() => {
        // Purge invoice-related data first (due to foreign key constraints)
        this.purgeInvoiceData(db, result, logger);
        
        // Purge product data
        this.purgeProductData(db, result, logger);
        
        // Purge customer data
        this.purgeCustomerData(db, result, logger);
        
        // Purge supplier data
        this.purgeSupplierData(db, result, logger);
        
        // Purge category data (only if no products reference them)
        this.purgeCategoryData(db, result, logger);
        
        // Purge user data (only demo users)
        this.purgeUserData(db, result, logger);
      });

      // Execute transaction
      transaction();

      result.success = true;
      logger.info('Demo data purge completed successfully', {
        purgedCounts: result.purgedCounts
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Purge operation failed: ${errorMessage}`);
      logger.error('Demo data purge failed', { error: errorMessage });
    }

    return result;
  }

  private purgeInvoiceData(db: any, result: PurgeResult, logger: any) {
    try {
      // Get demo invoices (those with demo customers or created by demo users)
      const demoInvoices = db.prepare(`
        SELECT i.id FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN users u ON i.cashier_id = u.id
        WHERE c.customer_name LIKE 'TEST%' 
           OR c.customer_name LIKE 'DEMO%'
           OR u.name LIKE 'TEST%'
           OR u.name LIKE 'DEMO%'
           OR i.receipt_no LIKE 'TEST%'
           OR i.receipt_no LIKE 'DEMO%'
      `).all();

      const invoiceIds = demoInvoices.map((inv: any) => inv.id);
      
      if (invoiceIds.length > 0) {
        // Delete invoice payments
        const deletePayments = db.prepare(`
          DELETE FROM invoice_payments 
          WHERE invoice_id IN (${invoiceIds.map(() => '?').join(',')})
        `);
        result.purgedCounts.invoicePayments = deletePayments.run(...invoiceIds).changes;

        // Delete invoice lines
        const deleteLines = db.prepare(`
          DELETE FROM invoice_lines 
          WHERE invoice_id IN (${invoiceIds.map(() => '?').join(',')})
        `);
        result.purgedCounts.invoiceLines = deleteLines.run(...invoiceIds).changes;

        // Delete invoices
        const deleteInvoices = db.prepare(`
          DELETE FROM invoices 
          WHERE id IN (${invoiceIds.map(() => '?').join(',')})
        `);
        result.purgedCounts.invoices = deleteInvoices.run(...invoiceIds).changes;

        logger.info(`Purged ${result.purgedCounts.invoices} demo invoices`);
      }
    } catch (error) {
      result.errors.push(`Failed to purge invoice data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private purgeProductData(db: any, result: PurgeResult, logger: any) {
    try {
      // Delete products with TEST/DEMO names
      const deleteProducts = db.prepare(`
        DELETE FROM products 
        WHERE name_en LIKE 'TEST%' 
           OR name_en LIKE 'DEMO%'
           OR sku LIKE 'TEST%'
           OR sku LIKE 'DEMO%'
           OR barcode LIKE 'TEST%'
           OR barcode LIKE 'DEMO%'
      `);
      
      result.purgedCounts.products = deleteProducts.run().changes;
      logger.info(`Purged ${result.purgedCounts.products} demo products`);
    } catch (error) {
      result.errors.push(`Failed to purge product data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private purgeCustomerData(db: any, result: PurgeResult, logger: any) {
    try {
      // Delete customers with TEST/DEMO names
      const deleteCustomers = db.prepare(`
        DELETE FROM customers 
        WHERE customer_name LIKE 'TEST%' 
           OR customer_name LIKE 'DEMO%'
      `);
      
      result.purgedCounts.customers = deleteCustomers.run().changes;
      logger.info(`Purged ${result.purgedCounts.customers} demo customers`);
    } catch (error) {
      result.errors.push(`Failed to purge customer data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private purgeSupplierData(db: any, result: PurgeResult, logger: any) {
    try {
      // Delete suppliers with TEST/DEMO names
      const deleteSuppliers = db.prepare(`
        DELETE FROM suppliers 
        WHERE supplier_name LIKE 'TEST%' 
           OR supplier_name LIKE 'DEMO%'
      `);
      
      result.purgedCounts.suppliers = deleteSuppliers.run().changes;
      logger.info(`Purged ${result.purgedCounts.suppliers} demo suppliers`);
    } catch (error) {
      result.errors.push(`Failed to purge supplier data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private purgeCategoryData(db: any, result: PurgeResult, logger: any) {
    try {
      // Only delete categories that have no products and are TEST/DEMO
      const deleteCategories = db.prepare(`
        DELETE FROM categories 
        WHERE name LIKE 'TEST%' 
           OR name LIKE 'DEMO%'
           AND id NOT IN (SELECT DISTINCT category_id FROM products WHERE category_id IS NOT NULL)
      `);
      
      result.purgedCounts.categories = deleteCategories.run().changes;
      logger.info(`Purged ${result.purgedCounts.categories} demo categories`);
    } catch (error) {
      result.errors.push(`Failed to purge category data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private purgeUserData(db: any, result: PurgeResult, logger: any) {
    try {
      // Only delete users with TEST/DEMO names (not admin users)
      const deleteUsers = db.prepare(`
        DELETE FROM users 
        WHERE (name LIKE 'TEST%' OR name LIKE 'DEMO%' OR username LIKE 'TEST%' OR username LIKE 'DEMO%')
          AND role != 'admin'
      `);
      
      result.purgedCounts.users = deleteUsers.run().changes;
      logger.info(`Purged ${result.purgedCounts.users} demo users`);
    } catch (error) {
      result.errors.push(`Failed to purge user data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get statistics about demo data before purging
   */
  async getDemoDataStats(): Promise<{
    products: number;
    customers: number;
    suppliers: number;
    invoices: number;
    categories: number;
    users: number;
  }> {
    const db = this.getDb();
    
    try {
      const stats = {
        products: 0,
        customers: 0,
        suppliers: 0,
        invoices: 0,
        categories: 0,
        users: 0
      };

      // Count demo products
      const productCount = db.prepare(`
        SELECT COUNT(*) as count FROM products 
        WHERE name_en LIKE 'TEST%' 
           OR name_en LIKE 'DEMO%'
           OR sku LIKE 'TEST%'
           OR sku LIKE 'DEMO%'
      `).get() as { count: number } | undefined;
      stats.products = productCount?.count || 0;

      // Count demo customers
      const customerCount = db.prepare(`
        SELECT COUNT(*) as count FROM customers 
        WHERE customer_name LIKE 'TEST%' 
           OR customer_name LIKE 'DEMO%'
      `).get() as { count: number } | undefined;
      stats.customers = customerCount?.count || 0;

      // Count demo suppliers
      const supplierCount = db.prepare(`
        SELECT COUNT(*) as count FROM suppliers 
        WHERE supplier_name LIKE 'TEST%' 
           OR supplier_name LIKE 'DEMO%'
      `).get() as { count: number } | undefined;
      stats.suppliers = supplierCount?.count || 0;

      // Count demo invoices
      const invoiceCount = db.prepare(`
        SELECT COUNT(*) as count FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN users u ON i.cashier_id = u.id
        WHERE c.customer_name LIKE 'TEST%' 
           OR c.customer_name LIKE 'DEMO%'
           OR u.name LIKE 'TEST%'
           OR u.name LIKE 'DEMO%'
           OR i.receipt_no LIKE 'TEST%'
           OR i.receipt_no LIKE 'DEMO%'
      `).get() as { count: number } | undefined;
      stats.invoices = invoiceCount?.count || 0;

      // Count demo categories
      const categoryCount = db.prepare(`
        SELECT COUNT(*) as count FROM categories 
        WHERE name LIKE 'TEST%' 
           OR name LIKE 'DEMO%'
      `).get() as { count: number } | undefined;
      stats.categories = categoryCount?.count || 0;

      // Count demo users
      const userCount = db.prepare(`
        SELECT COUNT(*) as count FROM users 
        WHERE (name LIKE 'TEST%' OR name LIKE 'DEMO%' OR username LIKE 'TEST%' OR username LIKE 'DEMO%')
          AND role != 'admin'
      `).get() as { count: number } | undefined;
      stats.users = userCount?.count || 0;

      return stats;
    } catch (error) {
      throw createError.databaseError('Failed to get demo data statistics', error);
    }
  }
}

export const purgeService = new PurgeService();
