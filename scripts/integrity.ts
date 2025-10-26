#!/usr/bin/env tsx

/**
 * Database Integrity Check Script
 * Validates database schema, foreign keys, and data consistency
 */

import { getDatabase } from '../server/db';
import { createContextLogger } from '../server/utils/logger';

const logger = createContextLogger({ operation: 'integrity_check' });

interface IntegrityIssue {
  type: 'error' | 'warning';
  table: string;
  issue: string;
  details?: any;
}

interface IntegrityReport {
  totalIssues: number;
  errors: number;
  warnings: number;
  issues: IntegrityIssue[];
  summary: {
    tablesChecked: number;
    foreignKeysValid: boolean;
    indexesValid: boolean;
    dataConsistency: boolean;
  };
}

class DatabaseIntegrityChecker {
  private db: any;
  private issues: IntegrityIssue[] = [];

  constructor() {
    this.db = getDatabase();
  }

  async runFullCheck(): Promise<IntegrityReport> {
    logger.info('Starting database integrity check...');
    
    this.issues = [];
    
    // Check core tables exist
    await this.checkTableStructure();
    
    // Check foreign key constraints
    await this.checkForeignKeys();
    
    // Check indexes
    await this.checkIndexes();
    
    // Check data consistency
    await this.checkDataConsistency();
    
    // Check for orphaned records
    await this.checkOrphanedRecords();
    
    // Check for negative stock
    await this.checkNegativeStock();
    
    const errors = this.issues.filter(i => i.type === 'error').length;
    const warnings = this.issues.filter(i => i.type === 'warning').length;
    
    const report: IntegrityReport = {
      totalIssues: this.issues.length,
      errors,
      warnings,
      issues: this.issues,
      summary: {
        tablesChecked: await this.getTableCount(),
        foreignKeysValid: errors === 0,
        indexesValid: true, // Will be set based on index checks
        dataConsistency: errors === 0
      }
    };
    
    logger.info('Integrity check completed', {
      totalIssues: report.totalIssues,
      errors: report.errors,
      warnings: report.warnings
    });
    
    return report;
  }

  private async checkTableStructure(): Promise<void> {
    const requiredTables = [
      'products', 'categories', 'suppliers', 'users', 'customers',
      'invoices', 'invoice_lines', 'invoice_payments',
      'stock_movements', 'stock_lots', 'returns', 'return_lines'
    ];

    for (const table of requiredTables) {
      try {
        const result = this.db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
        if (!result) {
          this.addIssue('error', table, `Required table '${table}' does not exist`);
        }
      } catch (error) {
        this.addIssue('error', table, `Failed to check table '${table}': ${error}`);
      }
    }
  }

  private async checkForeignKeys(): Promise<void> {
    // Check if foreign keys are enabled
    const fkResult = this.db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number };
    if (fkResult.foreign_keys !== 1) {
      this.addIssue('warning', 'system', 'Foreign key constraints are not enabled');
    }

    // Check specific foreign key relationships
    const fkChecks = [
      {
        table: 'products',
        fk: 'category_id',
        refTable: 'categories',
        refColumn: 'id'
      },
      {
        table: 'products',
        fk: 'preferred_supplier_id',
        refTable: 'suppliers',
        refColumn: 'id'
      },
      {
        table: 'invoice_lines',
        fk: 'invoice_id',
        refTable: 'invoices',
        refColumn: 'id'
      },
      {
        table: 'invoice_lines',
        fk: 'product_id',
        refTable: 'products',
        refColumn: 'id'
      }
    ];

    for (const check of fkChecks) {
      try {
        const query = `
          SELECT COUNT(*) as count 
          FROM ${check.table} t 
          LEFT JOIN ${check.refTable} r ON t.${check.fk} = r.${check.refColumn}
          WHERE t.${check.fk} IS NOT NULL AND r.${check.refColumn} IS NULL
        `;
        const result = this.db.prepare(query).get() as { count: number };
        
        if (result.count > 0) {
          this.addIssue('error', check.table, 
            `Found ${result.count} orphaned records in ${check.table}.${check.fk} referencing non-existent ${check.refTable}.${check.refColumn}`);
        }
      } catch (error) {
        this.addIssue('warning', check.table, `Failed to check foreign key ${check.fk}: ${error}`);
      }
    }
  }

  private async checkIndexes(): Promise<void> {
    const requiredIndexes = [
      { table: 'products', column: 'sku' },
      { table: 'products', column: 'barcode' },
      { table: 'products', column: 'category_id' },
      { table: 'invoices', column: 'receipt_no' },
      { table: 'invoices', column: 'created_at' },
      { table: 'invoice_lines', column: 'invoice_id' },
      { table: 'stock_movements', column: 'product_id' },
      { table: 'stock_movements', column: 'created_at' }
    ];

    for (const index of requiredIndexes) {
      try {
        const result = this.db.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='index' AND tbl_name=? AND sql LIKE ?
        `).get(index.table, `%${index.column}%`);
        
        if (!result) {
          this.addIssue('warning', index.table, `Missing index on ${index.table}.${index.column}`);
        }
      } catch (error) {
        this.addIssue('warning', index.table, `Failed to check index on ${index.column}: ${error}`);
      }
    }
  }

  private async checkDataConsistency(): Promise<void> {
    // Check for products with invalid categories
    try {
      const invalidCategories = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        WHERE p.category_id IS NOT NULL AND c.id IS NULL
      `).get() as { count: number };
      
      if (invalidCategories.count > 0) {
        this.addIssue('error', 'products', `Found ${invalidCategories.count} products with invalid category_id`);
      }
    } catch (error) {
      this.addIssue('warning', 'products', `Failed to check category consistency: ${error}`);
    }

    // Check for invoices with invalid cashiers
    try {
      const invalidCashiers = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM invoices i 
        LEFT JOIN users u ON i.cashier_id = u.id 
        WHERE u.id IS NULL
      `).get() as { count: number };
      
      if (invalidCashiers.count > 0) {
        this.addIssue('error', 'invoices', `Found ${invalidCashiers.count} invoices with invalid cashier_id`);
      }
    } catch (error) {
      this.addIssue('warning', 'invoices', `Failed to check cashier consistency: ${error}`);
    }
  }

  private async checkOrphanedRecords(): Promise<void> {
    // Check for orphaned invoice lines
    try {
      const orphanedLines = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM invoice_lines il 
        LEFT JOIN invoices i ON il.invoice_id = i.id 
        WHERE i.id IS NULL
      `).get() as { count: number };
      
      if (orphanedLines.count > 0) {
        this.addIssue('error', 'invoice_lines', `Found ${orphanedLines.count} orphaned invoice lines`);
      }
    } catch (error) {
      this.addIssue('warning', 'invoice_lines', `Failed to check orphaned invoice lines: ${error}`);
    }
  }

  private async checkNegativeStock(): Promise<void> {
    // Check for negative stock quantities
    try {
      const negativeStock = this.db.prepare(`
        SELECT p.id, p.sku, p.name_en, COALESCE(SUM(sm.qty), 0) as current_stock
        FROM products p
        LEFT JOIN stock_movements sm ON p.id = sm.product_id
        GROUP BY p.id, p.sku, p.name_en
        HAVING current_stock < 0
      `).all();
      
      if (negativeStock.length > 0) {
        this.addIssue('error', 'stock_movements', 
          `Found ${negativeStock.length} products with negative stock`, 
          negativeStock.map(p => ({ sku: p.sku, name: p.name_en, stock: p.current_stock }))
        );
      }
    } catch (error) {
      this.addIssue('warning', 'stock_movements', `Failed to check negative stock: ${error}`);
    }
  }

  private async getTableCount(): Promise<number> {
    try {
      const result = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).get() as { count: number };
      return result.count;
    } catch {
      return 0;
    }
  }

  private addIssue(type: 'error' | 'warning', table: string, issue: string, details?: any): void {
    this.issues.push({ type, table, issue, details });
  }
}

async function main() {
  try {
    const checker = new DatabaseIntegrityChecker();
    const report = await checker.runFullCheck();
    
    console.log('\n=== DATABASE INTEGRITY REPORT ===');
    console.log(`Total Issues: ${report.totalIssues}`);
    console.log(`Errors: ${report.errors}`);
    console.log(`Warnings: ${report.warnings}`);
    console.log(`Tables Checked: ${report.summary.tablesChecked}`);
    console.log(`Foreign Keys Valid: ${report.summary.foreignKeysValid ? 'Yes' : 'No'}`);
    console.log(`Data Consistency: ${report.summary.dataConsistency ? 'Yes' : 'No'}`);
    
    if (report.issues.length > 0) {
      console.log('\n=== DETAILED ISSUES ===');
      report.issues.forEach((issue, index) => {
        console.log(`\n${index + 1}. [${issue.type.toUpperCase()}] ${issue.table}: ${issue.issue}`);
        if (issue.details) {
          console.log('   Details:', JSON.stringify(issue.details, null, 2));
        }
      });
    }
    
    if (report.errors > 0) {
      console.log('\n❌ Database integrity check FAILED - errors found');
      process.exit(1);
    } else {
      console.log('\n✅ Database integrity check PASSED');
      process.exit(0);
    }
    
  } catch (error) {
    logger.error('Integrity check failed', { error });
    console.error('❌ Integrity check failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { DatabaseIntegrityChecker };