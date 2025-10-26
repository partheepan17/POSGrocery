import { getDatabase } from '../db';

export interface ConstraintCheckResult {
  hasDependencies: boolean;
  dependencies: string[];
  totalCount: number;
}

/**
 * Check if a product has dependencies that would prevent hard deletion
 */
export function checkProductDependencies(productId: number): ConstraintCheckResult {
  const db = getDatabase();
  const dependencies: string[] = [];
  let totalCount = 0;

  try {
    // Check invoice_lines
    const invoiceLines = db.prepare('SELECT COUNT(*) as count FROM invoice_lines WHERE product_id = ?').get(productId) as { count: number };
    if (invoiceLines.count > 0) {
      dependencies.push(`${invoiceLines.count} invoice line(s)`);
      totalCount += invoiceLines.count;
    }

    // Check quick_sales_lines
    const quickSalesLines = db.prepare('SELECT COUNT(*) as count FROM quick_sales_lines WHERE product_id = ?').get(productId) as { count: number };
    if (quickSalesLines.count > 0) {
      dependencies.push(`${quickSalesLines.count} quick sales line(s)`);
      totalCount += quickSalesLines.count;
    }

    // Check stock_movements
    const stockMovements = db.prepare('SELECT COUNT(*) as count FROM stock_movements WHERE product_id = ?').get(productId) as { count: number };
    if (stockMovements.count > 0) {
      dependencies.push(`${stockMovements.count} stock movement(s)`);
      totalCount += stockMovements.count;
    }

    return {
      hasDependencies: dependencies.length > 0,
      dependencies,
      totalCount
    };
  } catch (error) {
    console.error('Error checking product dependencies:', error);
    return {
      hasDependencies: true, // Assume has dependencies on error to be safe
      dependencies: ['Error checking dependencies'],
      totalCount: 1
    };
  }
}

/**
 * Check if a product can be hard deleted (no dependencies)
 */
export function canHardDeleteProduct(productId: number): boolean {
  const result = checkProductDependencies(productId);
  return !result.hasDependencies;
}











