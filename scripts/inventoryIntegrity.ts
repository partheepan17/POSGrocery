#!/usr/bin/env tsx

/**
 * Inventory Integrity Checker
 * Validates inventory calculations, stock movements, and costing accuracy
 */

import { getDatabase } from '../server/db';
import { createContextLogger } from '../server/utils/logger';
import { inventoryCostingService } from '../server/services/inventoryCostingService';
import { money, unitCost } from '../server/utils/money';

const logger = createContextLogger({ operation: 'inventory_integrity' });

interface IntegrityIssue {
  type: 'error' | 'warning' | 'info';
  category: string;
  product_id: number;
  sku: string;
  name: string;
  issue: string;
  details: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface IntegrityReport {
  totalIssues: number;
  errors: number;
  warnings: number;
  infos: number;
  issues: IntegrityIssue[];
  summary: {
    productsChecked: number;
    stockMovementsChecked: number;
    lotsChecked: number;
    costingAccuracy: number;
    dataConsistency: boolean;
  };
}

class InventoryIntegrityChecker {
  private db: any;
  private issues: IntegrityIssue[] = [];

  constructor() {
    this.db = getDatabase();
  }

  async runFullCheck(): Promise<IntegrityReport> {
    logger.info('Starting inventory integrity check...');
    
    this.issues = [];
    
    // Check stock movements consistency
    await this.checkStockMovements();
    
    // Check stock lots consistency
    await this.checkStockLots();
    
    // Check costing calculations
    await this.checkCostingCalculations();
    
    // Check for negative stock
    await this.checkNegativeStock();
    
    // Check for orphaned records
    await this.checkOrphanedRecords();
    
    // Check COGS calculations
    await this.checkCOGSCalculations();
    
    // Check inventory valuation
    await this.checkInventoryValuation();
    
    const errors = this.issues.filter(i => i.type === 'error').length;
    const warnings = this.issues.filter(i => i.type === 'warning').length;
    const infos = this.issues.filter(i => i.type === 'info').length;
    
    const report: IntegrityReport = {
      totalIssues: this.issues.length,
      errors,
      warnings,
      infos,
      issues: this.issues,
      summary: {
        productsChecked: await this.getProductCount(),
        stockMovementsChecked: await this.getStockMovementCount(),
        lotsChecked: await this.getStockLotCount(),
        costingAccuracy: this.calculateCostingAccuracy(),
        dataConsistency: errors === 0
      }
    };
    
    logger.info('Inventory integrity check completed', {
      totalIssues: report.totalIssues,
      errors: report.errors,
      warnings: report.warnings
    });
    
    return report;
  }

  private async checkStockMovements(): Promise<void> {
    logger.info('Checking stock movements consistency...');
    
    // Check for movements with invalid quantities
    const invalidQuantities = this.db.prepare(`
      SELECT 
        sm.id,
        sm.product_id,
        p.sku,
        p.name_en,
        sm.qty,
        sm.type,
        sm.reason
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      WHERE sm.qty = 0 OR sm.qty IS NULL
    `).all();

    for (const movement of invalidQuantities) {
      this.addIssue('error', 'stock_movements', movement.product_id, movement.sku, movement.name_en,
        'Invalid quantity in stock movement', {
          movement_id: movement.id,
          quantity: movement.qty,
          type: movement.type,
          reason: movement.reason
        }, 'high');
    }

    // Check for movements with invalid unit costs
    const invalidCosts = this.db.prepare(`
      SELECT 
        sm.id,
        sm.product_id,
        p.sku,
        p.name_en,
        sm.unit_cost,
        sm.type,
        sm.reason
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      WHERE sm.type = 'IN' AND (sm.unit_cost IS NULL OR sm.unit_cost <= 0)
    `).all();

    for (const movement of invalidCosts) {
      this.addIssue('warning', 'stock_movements', movement.product_id, movement.sku, movement.name_en,
        'Missing or invalid unit cost for IN movement', {
          movement_id: movement.id,
          unit_cost: movement.unit_cost,
          type: movement.type,
          reason: movement.reason
        }, 'medium');
    }
  }

  private async checkStockLots(): Promise<void> {
    logger.info('Checking stock lots consistency...');
    
    // Check for lots with negative remaining quantities
    const negativeLots = this.db.prepare(`
      SELECT 
        sl.id,
        sl.product_id,
        p.sku,
        p.name_en,
        sl.quantity_remaining,
        sl.quantity_received,
        sl.unit_cost_cents
      FROM stock_lots sl
      JOIN products p ON sl.product_id = p.id
      WHERE sl.quantity_remaining < 0
    `).all();

    for (const lot of negativeLots) {
      this.addIssue('error', 'stock_lots', lot.product_id, lot.sku, lot.name_en,
        'Negative remaining quantity in stock lot', {
          lot_id: lot.id,
          quantity_remaining: lot.quantity_remaining,
          quantity_received: lot.quantity_received,
          unit_cost_cents: lot.unit_cost_cents
        }, 'critical');
    }

    // Check for lots with remaining > received
    const overReceivedLots = this.db.prepare(`
      SELECT 
        sl.id,
        sl.product_id,
        p.sku,
        p.name_en,
        sl.quantity_remaining,
        sl.quantity_received
      FROM stock_lots sl
      JOIN products p ON sl.product_id = p.id
      WHERE sl.quantity_remaining > sl.quantity_received
    `).all();

    for (const lot of overReceivedLots) {
      this.addIssue('error', 'stock_lots', lot.product_id, lot.sku, lot.name_en,
        'Remaining quantity exceeds received quantity', {
          lot_id: lot.id,
          quantity_remaining: lot.quantity_remaining,
          quantity_received: lot.quantity_received
        }, 'high');
    }
  }

  private async checkCostingCalculations(): Promise<void> {
    logger.info('Checking costing calculations...');
    
    const products = this.db.prepare(`
      SELECT id, sku, name_en FROM products WHERE is_active = 1
    `).all();

    for (const product of products) {
      try {
        const valuation = await inventoryCostingService.getInventoryValuation(product.id);
        const method = await inventoryCostingService.getCostingMethod(product.id);

        // Check if average cost calculation is reasonable
        if (valuation.average_cost_cents < 0) {
          this.addIssue('error', 'costing', product.id, product.sku, product.name_en,
            'Negative average cost calculated', {
              method,
              average_cost_cents: valuation.average_cost_cents,
              current_stock: valuation.current_stock
            }, 'high');
        }

        // Check for extremely high costs (potential data entry error)
        if (valuation.average_cost_cents > 100000) { // 1000 rupees
          this.addIssue('warning', 'costing', product.id, product.sku, product.name_en,
            'Unusually high average cost', {
              method,
              average_cost_cents: valuation.average_cost_cents,
              current_stock: valuation.current_stock
            }, 'medium');
        }

        // Check for zero cost with stock
        if (valuation.current_stock > 0 && valuation.average_cost_cents === 0) {
          this.addIssue('warning', 'costing', product.id, product.sku, product.name_en,
            'Zero cost with positive stock', {
              method,
              average_cost_cents: valuation.average_cost_cents,
              current_stock: valuation.current_stock
            }, 'medium');
        }

      } catch (error) {
        this.addIssue('error', 'costing', product.id, product.sku, product.name_en,
          'Failed to calculate inventory valuation', { error: error.message }, 'high');
      }
    }
  }

  private async checkNegativeStock(): Promise<void> {
    logger.info('Checking for negative stock...');
    
    const negativeStock = this.db.prepare(`
      SELECT 
        p.id as product_id,
        p.sku,
        p.name_en,
        COALESCE(SUM(sm.qty), 0) as current_stock
      FROM products p
      LEFT JOIN stock_movements sm ON p.id = sm.product_id
      GROUP BY p.id, p.sku, p.name_en
      HAVING current_stock < 0
    `).all();

    for (const item of negativeStock) {
      this.addIssue('error', 'stock_balance', item.product_id, item.sku, item.name_en,
        'Negative stock balance', {
          current_stock: item.current_stock
        }, 'critical');
    }
  }

  private async checkOrphanedRecords(): Promise<void> {
    logger.info('Checking for orphaned records...');
    
    // Check for stock movements referencing non-existent products
    const orphanedMovements = this.db.prepare(`
      SELECT 
        sm.id,
        sm.product_id,
        sm.qty,
        sm.type,
        sm.reason
      FROM stock_movements sm
      LEFT JOIN products p ON sm.product_id = p.id
      WHERE p.id IS NULL
    `).all();

    for (const movement of orphanedMovements) {
      this.addIssue('error', 'orphaned_records', movement.product_id, 'UNKNOWN', 'UNKNOWN',
        'Stock movement references non-existent product', {
          movement_id: movement.id,
          product_id: movement.product_id,
          quantity: movement.qty,
          type: movement.type,
          reason: movement.reason
        }, 'high');
    }

    // Check for stock lots referencing non-existent products
    const orphanedLots = this.db.prepare(`
      SELECT 
        sl.id,
        sl.product_id,
        sl.quantity_remaining,
        sl.unit_cost_cents
      FROM stock_lots sl
      LEFT JOIN products p ON sl.product_id = p.id
      WHERE p.id IS NULL
    `).all();

    for (const lot of orphanedLots) {
      this.addIssue('error', 'orphaned_records', lot.product_id, 'UNKNOWN', 'UNKNOWN',
        'Stock lot references non-existent product', {
          lot_id: lot.id,
          product_id: lot.product_id,
          quantity_remaining: lot.quantity_remaining,
          unit_cost_cents: lot.unit_cost_cents
        }, 'high');
    }
  }

  private async checkCOGSCalculations(): Promise<void> {
    logger.info('Checking COGS calculations...');
    
    // Check invoice lines with COGS data
    const invoiceLines = this.db.prepare(`
      SELECT 
        il.id,
        il.invoice_id,
        il.product_id,
        p.sku,
        p.name_en,
        il.qty,
        il.unit_price,
        il.unit_cost_cents,
        il.cogs_cents,
        il.gross_margin_cents
      FROM invoice_lines il
      JOIN products p ON il.product_id = p.id
      WHERE il.unit_cost_cents IS NOT NULL
    `).all();

    for (const line of invoiceLines) {
      const expectedCOGS = money(line.qty * (line.unit_cost_cents / 100));
      const actualCOGS = money(line.cogs_cents / 100);
      const expectedMargin = money(line.qty * line.unit_price) - expectedCOGS;
      const actualMargin = money(line.gross_margin_cents / 100);

      // Check COGS calculation
      if (Math.abs(expectedCOGS - actualCOGS) > 0.01) {
        this.addIssue('error', 'cogs', line.product_id, line.sku, line.name_en,
          'COGS calculation mismatch', {
            line_id: line.id,
            invoice_id: line.invoice_id,
            expected_cogs: expectedCOGS,
            actual_cogs: actualCOGS,
            difference: Math.abs(expectedCOGS - actualCOGS)
          }, 'high');
      }

      // Check gross margin calculation
      if (Math.abs(expectedMargin - actualMargin) > 0.01) {
        this.addIssue('error', 'cogs', line.product_id, line.sku, line.name_en,
          'Gross margin calculation mismatch', {
            line_id: line.id,
            invoice_id: line.invoice_id,
            expected_margin: expectedMargin,
            actual_margin: actualMargin,
            difference: Math.abs(expectedMargin - actualMargin)
          }, 'high');
      }
    }
  }

  private async checkInventoryValuation(): Promise<void> {
    logger.info('Checking inventory valuation...');
    
    const products = this.db.prepare(`
      SELECT id, sku, name_en FROM products WHERE is_active = 1
    `).all();

    for (const product of products) {
      try {
        const valuation = await inventoryCostingService.getInventoryValuation(product.id);
        
        // Check if total value calculation is correct
        const expectedValue = valuation.current_stock * (valuation.average_cost_cents / 100);
        const actualValue = valuation.total_value_cents / 100;
        
        if (Math.abs(expectedValue - actualValue) > 0.01) {
          this.addIssue('warning', 'valuation', product.id, product.sku, product.name_en,
            'Inventory valuation calculation mismatch', {
              current_stock: valuation.current_stock,
              average_cost_cents: valuation.average_cost_cents,
              expected_value: expectedValue,
              actual_value: actualValue,
              difference: Math.abs(expectedValue - actualValue)
            }, 'medium');
        }

        // Check for products with stock but no lots (for FIFO/LIFO)
        const method = await inventoryCostingService.getCostingMethod(product.id);
        if ((method === 'FIFO' || method === 'LIFO') && valuation.current_stock > 0 && valuation.lots.length === 0) {
          this.addIssue('warning', 'valuation', product.id, product.sku, product.name_en,
            'Stock without lots for FIFO/LIFO product', {
              method,
              current_stock: valuation.current_stock,
              lots_count: valuation.lots.length
            }, 'medium');
        }

      } catch (error) {
        this.addIssue('error', 'valuation', product.id, product.sku, product.name_en,
          'Failed to validate inventory valuation', { error: error.message }, 'high');
      }
    }
  }

  private calculateCostingAccuracy(): number {
    const costingIssues = this.issues.filter(i => 
      i.category === 'costing' || i.category === 'cogs' || i.category === 'valuation'
    );
    
    const totalChecks = await this.getProductCount();
    const issues = costingIssues.length;
    
    return totalChecks > 0 ? Math.max(0, ((totalChecks - issues) / totalChecks) * 100) : 100;
  }

  private async getProductCount(): Promise<number> {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1').get() as { count: number };
    return result.count;
  }

  private async getStockMovementCount(): Promise<number> {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM stock_movements').get() as { count: number };
    return result.count;
  }

  private async getStockLotCount(): Promise<number> {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM stock_lots').get() as { count: number };
    return result.count;
  }

  private addIssue(
    type: 'error' | 'warning' | 'info',
    category: string,
    productId: number,
    sku: string,
    name: string,
    issue: string,
    details: any,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): void {
    this.issues.push({
      type,
      category,
      product_id: productId,
      sku,
      name,
      issue,
      details,
      severity
    });
  }
}

async function main() {
  try {
    const checker = new InventoryIntegrityChecker();
    const report = await checker.runFullCheck();
    
    console.log('\n=== INVENTORY INTEGRITY REPORT ===');
    console.log(`Total Issues: ${report.totalIssues}`);
    console.log(`Errors: ${report.errors}`);
    console.log(`Warnings: ${report.warnings}`);
    console.log(`Infos: ${report.infos}`);
    console.log(`Products Checked: ${report.summary.productsChecked}`);
    console.log(`Stock Movements Checked: ${report.summary.stockMovementsChecked}`);
    console.log(`Lots Checked: ${report.summary.lotsChecked}`);
    console.log(`Costing Accuracy: ${report.summary.costingAccuracy.toFixed(1)}%`);
    console.log(`Data Consistency: ${report.summary.dataConsistency ? 'Yes' : 'No'}`);
    
    if (report.issues.length > 0) {
      console.log('\n=== DETAILED ISSUES ===');
      
      // Group by severity
      const critical = report.issues.filter(i => i.severity === 'critical');
      const high = report.issues.filter(i => i.severity === 'high');
      const medium = report.issues.filter(i => i.severity === 'medium');
      const low = report.issues.filter(i => i.severity === 'low');
      
      if (critical.length > 0) {
        console.log('\n🚨 CRITICAL ISSUES:');
        critical.forEach((issue, index) => {
          console.log(`\n${index + 1}. [${issue.sku}] ${issue.name}: ${issue.issue}`);
          console.log(`   Details:`, JSON.stringify(issue.details, null, 2));
        });
      }
      
      if (high.length > 0) {
        console.log('\n🔴 HIGH PRIORITY ISSUES:');
        high.forEach((issue, index) => {
          console.log(`\n${index + 1}. [${issue.sku}] ${issue.name}: ${issue.issue}`);
          console.log(`   Details:`, JSON.stringify(issue.details, null, 2));
        });
      }
      
      if (medium.length > 0) {
        console.log('\n🟡 MEDIUM PRIORITY ISSUES:');
        medium.forEach((issue, index) => {
          console.log(`\n${index + 1}. [${issue.sku}] ${issue.name}: ${issue.issue}`);
        });
      }
      
      if (low.length > 0) {
        console.log('\n🟢 LOW PRIORITY ISSUES:');
        low.forEach((issue, index) => {
          console.log(`\n${index + 1}. [${issue.sku}] ${issue.name}: ${issue.issue}`);
        });
      }
    }
    
    if (report.errors > 0) {
      console.log('\n❌ Inventory integrity check FAILED - errors found');
      process.exit(1);
    } else {
      console.log('\n✅ Inventory integrity check PASSED');
      process.exit(0);
    }
    
  } catch (error) {
    logger.error('Inventory integrity check failed', { error });
    console.error('❌ Inventory integrity check failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { InventoryIntegrityChecker };







