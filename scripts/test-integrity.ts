#!/usr/bin/env tsx

/**
 * Test script for integrity checker
 * Creates a test database with known integrity issues to verify the checker works
 */

import { Database } from 'sqlite3';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

async function createTestDatabase(): Promise<string> {
  const testDbPath = 'test-integrity.db';
  
  // Remove existing test database
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  const db = new Database(testDbPath);

  // Create tables
  await new Promise<void>((resolve, reject) => {
    db.exec(`
      -- Products table
      CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sku TEXT UNIQUE NOT NULL,
        name_en TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Product stock table
      CREATE TABLE product_stock (
        product_id INTEGER PRIMARY KEY,
        current_quantity INTEGER NOT NULL DEFAULT 0,
        available_quantity INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (product_id) REFERENCES products(id)
      );

      -- Invoices table
      CREATE TABLE invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receipt_no TEXT UNIQUE NOT NULL,
        gross DECIMAL(10,2) NOT NULL,
        discount DECIMAL(10,2) DEFAULT 0,
        tax DECIMAL(10,2) DEFAULT 0,
        net DECIMAL(10,2) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Invoice lines table
      CREATE TABLE invoice_lines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        qty DECIMAL(10,3) NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      );

      -- Stock ledger table
      CREATE TABLE stock_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        delta_qty REAL NOT NULL,
        reason TEXT NOT NULL,
        ref_id INTEGER,
        balance_after REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id)
      );

      -- Stock lots table
      CREATE TABLE stock_lots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        lot_number TEXT,
        quantity_received INTEGER NOT NULL,
        quantity_remaining INTEGER NOT NULL,
        unit_cost_cents INTEGER NOT NULL,
        received_date TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id)
      );
    `, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Insert test data with known integrity issues
  await new Promise<void>((resolve, reject) => {
    db.exec(`
      -- Insert products
      INSERT INTO products (id, sku, name_en, is_active) VALUES
      (1, 'TEST-001', 'Test Product 1', 1),
      (2, 'TEST-002', 'Test Product 2', 1),
      (3, 'TEST-003', 'Test Product 3', 1),
      (4, 'TEST-004', 'Test Product 4', 1),
      (999, 'ORPHAN', 'Orphaned Product', 1); -- This will be referenced by non-existent movements

      -- Insert product stock with negative quantities (ISSUE 1)
      INSERT INTO product_stock (product_id, current_quantity, available_quantity) VALUES
      (1, 10, 10),  -- Normal
      (2, -5, -5),  -- Negative on-hand (ISSUE)
      (3, 15, 10),  -- Available < Current (ISSUE)
      (4, 0, 0);    -- Normal

      -- Insert invoices
      INSERT INTO invoices (id, receipt_no, gross, discount, tax, net) VALUES
      (1, 'RCP-001', 100.00, 0.00, 0.00, 100.00),
      (2, 'RCP-002', 200.00, 10.00, 0.00, 190.00),
      (3, 'RCP-003', 50.00, 0.00, 0.00, -50.00), -- Negative total (ISSUE)
      (4, 'RCP-001', 75.00, 0.00, 0.00, 75.00);  -- Duplicate receipt (ISSUE)

      -- Insert invoice lines
      INSERT INTO invoice_lines (id, invoice_id, product_id, qty, unit_price, total) VALUES
      (1, 1, 1, 2, 50.00, 100.00),
      (2, 2, 2, 1, 200.00, 200.00),
      (3, 1, 3, 1, 50.00, 50.00),  -- This will have no corresponding movement (ISSUE)
      (4, 999, 1, 1, 25.00, 25.00); -- Orphaned line (ISSUE)

      -- Insert stock movements
      INSERT INTO stock_ledger (id, product_id, delta_qty, reason, ref_id, balance_after) VALUES
      (1, 1, 10, 'GRN', 1, 10),
      (2, 1, -2, 'SALE', 1, 8),     -- Corresponds to invoice 1
      (3, 2, 5, 'GRN', 2, 5),
      (4, 2, -1, 'SALE', 2, 4),     -- Corresponds to invoice 2
      (5, 999, 10, 'GRN', 1, 10);   -- Movement for non-existent product (ISSUE)

      -- Insert stock lots with negative remaining quantities (ISSUE)
      INSERT INTO stock_lots (id, product_id, lot_number, quantity_received, quantity_remaining, unit_cost_cents) VALUES
      (1, 1, 'LOT-001', 10, 8, 5000),   -- Normal
      (2, 2, 'LOT-002', 5, -2, 4000),   -- Negative remaining (ISSUE)
      (3, 3, 'LOT-003', 15, 15, 3000);  -- Normal
    `, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  await new Promise<void>((resolve) => {
    db.close(() => resolve());
  });

  return testDbPath;
}

async function runIntegrityTest(): Promise<void> {
  console.log('🧪 Creating test database with known integrity issues...');
  
  const testDbPath = await createTestDatabase();
  console.log(`✅ Test database created: ${testDbPath}`);

  console.log('\n🔍 Running integrity checker on test database...');
  
  // Import and run the integrity checker
  const { IntegrityChecker } = await import('./integrity');
  const checker = new IntegrityChecker(testDbPath);

  try {
    await checker.runAllChecks();
    checker.printSummary();
    
    const csvReport = `test-integrity-report-${new Date().toISOString().split('T')[0]}.csv`;
    await checker.saveReport(csvReport);
    
    await checker.close();

    // Clean up test database
    fs.unlinkSync(testDbPath);
    console.log(`\n🧹 Cleaned up test database: ${testDbPath}`);

    console.log('\n✅ Integrity checker test completed successfully!');
    console.log('📄 Check the CSV report to verify all expected issues were detected.');

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    await checker.close();
    
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  runIntegrityTest().catch(console.error);
}

export { runIntegrityTest };










