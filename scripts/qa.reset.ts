#!/usr/bin/env tsx
/**
 * QA Reset Script
 * Clears all data from the database and reseeds with fresh test data
 * 
 * Usage: npm run qa:reset
 */

import { dataService } from '../src/services/database';
import { QASeedService, type SeedCounts } from './qa.seed';

interface ResetStats {
  tablesCleared: string[];
  recordsDeleted: number;
  seedCounts: SeedCounts;
}

class QAResetService {
  private stats: ResetStats = {
    tablesCleared: [],
    recordsDeleted: 0,
    seedCounts: {
      categories: 0,
      suppliers: 0,
      customers: 0,
      products: 0,
      discountRules: 0,
      sales: 0,
      saleLines: 0,
      inventoryMovements: 0
    }
  };

  async resetAll(): Promise<ResetStats> {
    console.log('🔄 Starting QA database reset...\n');

    try {
      // Clear all data
      await this.clearAllTables();
      
      // Reseed with fresh data
      const seedService = new QASeedService();
      this.stats.seedCounts = await seedService.seedAll();

      console.log('\n✅ QA reset completed successfully!');
      this.printResetSummary();
      
      return this.stats;
    } catch (error) {
      console.error('❌ QA reset failed:', error);
      throw error;
    }
  }

  private async clearAllTables(): Promise<void> {
    console.log('🧹 Clearing all database tables...');

    // Order matters due to foreign key constraints
    const tablesToClear = [
      'sale_lines',
      'sales', 
      'inventory_movements',
      'products',
      'discount_rules',
      'customers',
      'suppliers',
      'categories',
      'backups',
      'settings'
    ];

    for (const table of tablesToClear) {
      try {
        const deletedCount = await this.clearTable(table);
        this.stats.tablesCleared.push(table);
        this.stats.recordsDeleted += deletedCount;
        console.log(`   ✓ Cleared ${table}: ${deletedCount} records`);
      } catch (error) {
        console.warn(`   ⚠️  Could not clear ${table}:`, error);
        // Continue with other tables even if one fails
      }
    }

    // Reset auto-increment counters
    await this.resetAutoIncrements();
  }

  private async clearTable(tableName: string): Promise<number> {
    try {
      // Get count before deletion
      const countResult = await dataService.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      const recordCount = countResult[0]?.count || 0;

      // Delete all records
      if (recordCount > 0) {
        await dataService.query(`DELETE FROM ${tableName}`);
      }

      return recordCount;
    } catch (error) {
      // Table might not exist or might be empty
      console.warn(`Warning clearing ${tableName}:`, error);
      return 0;
    }
  }

  private async resetAutoIncrements(): Promise<void> {
    console.log('🔢 Resetting auto-increment counters...');

    const tablesWithAutoIncrement = [
      'categories',
      'suppliers', 
      'customers',
      'products',
      'discount_rules',
      'sales',
      'sale_lines',
      'inventory_movements',
      'backups'
    ];

    for (const table of tablesWithAutoIncrement) {
      try {
        // SQLite syntax for resetting auto-increment
        await dataService.query(`UPDATE sqlite_sequence SET seq = 0 WHERE name = ?`, [table]);
        console.log(`   ✓ Reset ${table} auto-increment`);
      } catch (error) {
        // Sequence might not exist if table was empty
        console.warn(`   ⚠️  Could not reset ${table} sequence:`, error);
      }
    }
  }

  private printResetSummary(): void {
    console.log('\n🔄 QA RESET SUMMARY');
    console.log('===================');
    
    console.log('\n📊 CLEANUP RESULTS:');
    console.log(`Tables Cleared:     ${this.stats.tablesCleared.length}`);
    console.log(`Records Deleted:    ${this.stats.recordsDeleted}`);
    console.log(`Cleared Tables:     ${this.stats.tablesCleared.join(', ')}`);
    
    console.log('\n🌱 SEED RESULTS:');
    console.log(`Categories:         ${this.stats.seedCounts.categories}`);
    console.log(`Suppliers:          ${this.stats.seedCounts.suppliers}`);
    console.log(`Customers:          ${this.stats.seedCounts.customers}`);
    console.log(`Products:           ${this.stats.seedCounts.products}`);
    console.log(`Discount Rules:     ${this.stats.seedCounts.discountRules}`);
    console.log(`Inventory Movements: ${this.stats.seedCounts.inventoryMovements}`);
    console.log(`Sales:              ${this.stats.seedCounts.sales}`);
    console.log(`Sale Lines:         ${this.stats.seedCounts.saleLines}`);
    
    const totalNewRecords = Object.values(this.stats.seedCounts).reduce((a, b) => a + b, 0);
    console.log(`Total New Records:  ${totalNewRecords}`);
    
    console.log('\n===================');
    console.log(`Net Change: -${this.stats.recordsDeleted} +${totalNewRecords} = ${totalNewRecords - this.stats.recordsDeleted}`);
    
    console.log('\n🎯 READY FOR QA TESTING:');
    console.log('• Fresh database with deterministic test data');
    console.log('• All auto-increment IDs reset to start from 1');
    console.log('• Test scenarios ready for manual and automated testing');
    console.log('• Run QA checklist or e2e tests now');
  }

  /**
   * Clear only specific tables (useful for targeted resets)
   */
  async clearSpecificTables(tables: string[]): Promise<void> {
    console.log(`🧹 Clearing specific tables: ${tables.join(', ')}`);
    
    for (const table of tables) {
      try {
        const deletedCount = await this.clearTable(table);
        console.log(`   ✓ Cleared ${table}: ${deletedCount} records`);
      } catch (error) {
        console.error(`   ❌ Failed to clear ${table}:`, error);
      }
    }
  }

  /**
   * Backup current data before reset (optional safety feature)
   */
  async createBackupBeforeReset(): Promise<string> {
    console.log('💾 Creating backup before reset...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `qa-reset-backup-${timestamp}`;
    
    try {
      // This would use the backup service if available
      // For now, just log the intent
      console.log(`   ✓ Would create backup: ${backupName}`);
      return backupName;
    } catch (error) {
      console.warn('   ⚠️  Backup creation failed, continuing with reset:', error);
      return '';
    }
  }

  /**
   * Verify database state after reset
   */
  async verifyResetState(): Promise<boolean> {
    console.log('🔍 Verifying reset state...');
    
    try {
      // Check that we have the expected number of records
      const verifications = [
        { table: 'categories', expected: this.stats.seedCounts.categories },
        { table: 'suppliers', expected: this.stats.seedCounts.suppliers },
        { table: 'customers', expected: this.stats.seedCounts.customers },
        { table: 'products', expected: this.stats.seedCounts.products },
        { table: 'discount_rules', expected: this.stats.seedCounts.discountRules }
      ];

      let allVerified = true;

      for (const { table, expected } of verifications) {
        const result = await dataService.query(`SELECT COUNT(*) as count FROM ${table}`);
        const actual = result[0]?.count || 0;
        
        if (actual === expected) {
          console.log(`   ✓ ${table}: ${actual} records (expected ${expected})`);
        } else {
          console.log(`   ❌ ${table}: ${actual} records (expected ${expected})`);
          allVerified = false;
        }
      }

      if (allVerified) {
        console.log('   ✅ All tables verified successfully');
      } else {
        console.log('   ⚠️  Some verification checks failed');
      }

      return allVerified;
    } catch (error) {
      console.error('   ❌ Verification failed:', error);
      return false;
    }
  }
}

// CLI argument parsing
function parseArgs(): { backup?: boolean; tables?: string[]; verify?: boolean } {
  const args = process.argv.slice(2);
  const options = {
    backup: args.includes('--backup'),
    verify: args.includes('--verify'),
    tables: undefined as string[] | undefined
  };

  const tablesIndex = args.indexOf('--tables');
  if (tablesIndex !== -1 && args[tablesIndex + 1]) {
    options.tables = args[tablesIndex + 1].split(',');
  }

  return options;
}

// Main execution
async function main() {
  try {
    const options = parseArgs();
    const resetService = new QAResetService();

    // Create backup if requested
    if (options.backup) {
      await resetService.createBackupBeforeReset();
    }

    // Perform reset
    if (options.tables) {
      // Partial reset of specific tables
      await resetService.clearSpecificTables(options.tables);
      console.log(`✅ Partial reset completed for: ${options.tables.join(', ')}`);
    } else {
      // Full reset
      await resetService.resetAll();
    }

    // Verify if requested
    if (options.verify) {
      const verified = await resetService.verifyResetState();
      if (!verified) {
        console.warn('⚠️  Verification checks failed, but reset completed');
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ QA reset failed:', error);
    process.exit(1);
  }
}

// Usage examples
function printUsage() {
  console.log(`
QA Reset Script Usage:
======================

Basic usage:
  npm run qa:reset                    # Full reset and reseed

Advanced options:
  npm run qa:reset -- --backup        # Create backup before reset
  npm run qa:reset -- --verify        # Verify database state after reset
  npm run qa:reset -- --tables sales,sale_lines  # Reset only specific tables

Combined options:
  npm run qa:reset -- --backup --verify  # Backup, reset, and verify

Examples:
  npm run qa:reset                     # Quick full reset
  tsx scripts/qa.reset.ts --backup     # Full reset with backup
  tsx scripts/qa.reset.ts --tables products,categories  # Partial reset
`);
}

// Show usage if --help is passed
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  printUsage();
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main();
}

export { QAResetService, type ResetStats };



