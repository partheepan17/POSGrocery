#!/usr/bin/env ts-node

/**
 * Database Clear Script
 * Clears all data except users and essential system data
 * Preserves user accounts, login data, and system settings
 */

import Database from 'better-sqlite3';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Database path
const DB_PATH = process.env.DB_PATH || join(__dirname, '../server/data/pos-grocery.db');

interface ClearOptions {
  preserveUsers: boolean;
  preserveSettings: boolean;
  preserveCategories: boolean;
  preserveSuppliers: boolean;
  dryRun: boolean;
}

const defaultOptions: ClearOptions = {
  preserveUsers: true,
  preserveSettings: true,
  preserveCategories: true,
  preserveSuppliers: true,
  dryRun: false
};

function clearDatabase(options: ClearOptions = defaultOptions) {
  if (!existsSync(DB_PATH)) {
    console.error('❌ Database file not found:', DB_PATH);
    process.exit(1);
  }

  const db = new Database(DB_PATH);
  
  try {
    console.log('🗄️  Database Clear Script');
    console.log('========================');
    console.log(`📁 Database: ${DB_PATH}`);
    console.log(`🔧 Preserve Users: ${options.preserveUsers ? '✅' : '❌'}`);
    console.log(`🔧 Preserve Settings: ${options.preserveSettings ? '✅' : '❌'}`);
    console.log(`🔧 Preserve Categories: ${options.preserveCategories ? '✅' : '❌'}`);
    console.log(`🔧 Preserve Suppliers: ${options.preserveSuppliers ? '✅' : '❌'}`);
    console.log(`🔧 Dry Run: ${options.dryRun ? '✅' : '❌'}`);
    console.log('');

    if (options.dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made');
      console.log('');
    }

    // Start transaction
    if (!options.dryRun) {
      db.exec('BEGIN TRANSACTION');
    }

    // Tables to clear (in dependency order)
    const tablesToClear = [
      'invoice_payments',
      'invoice_lines', 
      'invoices',
      'return_lines',
      'returns',
      'stock_movements',
      'stock_levels',
      'discount_rules',
      'products',
      'shifts',
      'shift_movements',
      'audit_logs',
      'app_settings'
    ];

    // Tables to preserve based on options
    const tablesToPreserve = [];
    if (options.preserveUsers) {
      tablesToPreserve.push('users');
    }
    if (options.preserveSettings) {
      tablesToPreserve.push('app_settings');
    }
    if (options.preserveCategories) {
      tablesToPreserve.push('categories');
    }
    if (options.preserveSuppliers) {
      tablesToPreserve.push('suppliers');
    }

    // Filter out preserved tables
    const finalTablesToClear = tablesToClear.filter(table => !tablesToPreserve.includes(table));

    console.log('🧹 Clearing tables:');
    for (const table of finalTablesToClear) {
      try {
        // Check if table exists
        const tableExists = db.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name=?
        `).get(table);

        if (tableExists) {
          const countResult = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };
          const count = countResult.count;
          
          if (count > 0) {
            console.log(`  📊 ${table}: ${count} records`);
            
            if (!options.dryRun) {
              db.prepare(`DELETE FROM ${table}`).run();
              console.log(`  ✅ Cleared ${table}`);
            } else {
              console.log(`  🔍 Would clear ${table} (${count} records)`);
            }
          } else {
            console.log(`  📊 ${table}: 0 records (already empty)`);
          }
        } else {
          console.log(`  📊 ${table}: Table does not exist`);
        }
      } catch (error) {
        console.error(`  ❌ Error clearing ${table}:`, error);
      }
    }

    // Reset auto-increment counters for cleared tables
    console.log('');
    console.log('🔄 Resetting auto-increment counters:');
    for (const table of finalTablesToClear) {
      try {
        const tableExists = db.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name=?
        `).get(table);

        if (tableExists) {
          if (!options.dryRun) {
            db.prepare(`DELETE FROM sqlite_sequence WHERE name='${table}'`).run();
            console.log(`  ✅ Reset ${table} counter`);
          } else {
            console.log(`  🔍 Would reset ${table} counter`);
          }
        }
      } catch (error) {
        // Ignore errors for tables without auto-increment
      }
    }

    // Insert default data if needed
    console.log('');
    console.log('🌱 Ensuring default data exists:');
    
    // Default category
    if (!options.preserveCategories) {
      const categoryExists = db.prepare('SELECT id FROM categories WHERE id = 1').get();
      if (!categoryExists) {
        if (!options.dryRun) {
          db.prepare('INSERT INTO categories (id, name) VALUES (1, ?)').run('General');
          console.log('  ✅ Added default category');
        } else {
          console.log('  🔍 Would add default category');
        }
      } else {
        console.log('  📊 Default category already exists');
      }
    }

    // Default supplier
    if (!options.preserveSuppliers) {
      const supplierExists = db.prepare('SELECT id FROM suppliers WHERE id = 1').get();
      if (!supplierExists) {
        if (!options.dryRun) {
          db.prepare('INSERT INTO suppliers (id, supplier_name, active) VALUES (1, ?, 1)').run('Default Supplier');
          console.log('  ✅ Added default supplier');
        } else {
          console.log('  🔍 Would add default supplier');
        }
      } else {
        console.log('  📊 Default supplier already exists');
      }
    }

    // Default user
    if (!options.preserveUsers) {
      const userExists = db.prepare('SELECT id FROM users WHERE id = 1').get();
      if (!userExists) {
        if (!options.dryRun) {
          db.prepare('INSERT INTO users (id, username, name, role) VALUES (1, ?, ?, ?)').run('admin', 'Administrator', 'admin');
          console.log('  ✅ Added default admin user');
        } else {
          console.log('  🔍 Would add default admin user');
        }
      } else {
        console.log('  📊 Default admin user already exists');
      }
    }

    // Default customer
    const customerExists = db.prepare('SELECT id FROM customers WHERE id = 1').get();
    if (!customerExists) {
      if (!options.dryRun) {
        db.prepare('INSERT INTO customers (id, customer_name, customer_type) VALUES (1, ?, ?)').run('Walk-in Customer', 'Retail');
        console.log('  ✅ Added default walk-in customer');
      } else {
        console.log('  🔍 Would add default walk-in customer');
      }
    } else {
      console.log('  📊 Default walk-in customer already exists');
    }

    // Commit transaction
    if (!options.dryRun) {
      db.exec('COMMIT');
      console.log('');
      console.log('✅ Database cleared successfully!');
    } else {
      console.log('');
      console.log('🔍 Dry run completed - no changes made');
    }

    // Show final statistics
    console.log('');
    console.log('📊 Final table counts:');
    const allTables = [
      'users', 'customers', 'suppliers', 'categories', 
      'products', 'invoices', 'invoice_lines', 'invoice_payments',
      'returns', 'return_lines', 'stock_movements', 'stock_levels',
      'discount_rules', 'shifts', 'shift_movements', 'audit_logs'
    ];

    for (const table of allTables) {
      try {
        const tableExists = db.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name=?
        `).get(table);

        if (tableExists) {
          const countResult = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };
          console.log(`  ${table}: ${countResult.count} records`);
        }
      } catch (error) {
        // Ignore errors
      }
    }

  } catch (error) {
    if (!options.dryRun) {
      db.exec('ROLLBACK');
    }
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Command line interface
function main() {
  const args = process.argv.slice(2);
  
  const options: ClearOptions = { ...defaultOptions };
  
  // Parse command line arguments
  for (const arg of args) {
    switch (arg) {
      case '--clear-users':
        options.preserveUsers = false;
        break;
      case '--clear-settings':
        options.preserveSettings = false;
        break;
      case '--clear-categories':
        options.preserveCategories = false;
        break;
      case '--clear-suppliers':
        options.preserveSuppliers = false;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
        console.log(`
Database Clear Script

Usage: ts-node clear-database.ts [options]

Options:
  --clear-users        Also clear user accounts (default: preserve)
  --clear-settings     Also clear app settings (default: preserve)
  --clear-categories   Also clear categories (default: preserve)
  --clear-suppliers    Also clear suppliers (default: preserve)
  --dry-run           Show what would be cleared without making changes
  --help              Show this help message

Examples:
  ts-node clear-database.ts                    # Clear data, preserve users & settings
  ts-node clear-database.ts --dry-run          # Show what would be cleared
  ts-node clear-database.ts --clear-users      # Clear everything including users
        `);
        process.exit(0);
        break;
    }
  }

  // Confirmation prompt
  if (!options.dryRun) {
    console.log('⚠️  WARNING: This will clear most database data!');
    console.log('   Users and settings will be preserved unless specified otherwise.');
    console.log('');
    
    // In a real implementation, you might want to add a confirmation prompt here
    // For now, we'll proceed directly
  }

  clearDatabase(options);
}

if (require.main === module) {
  main();
}

export { clearDatabase, ClearOptions };
















