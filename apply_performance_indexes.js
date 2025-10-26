/**
 * Apply Performance Indexes Script
 * Applies the performance indexes migration and runs basic tests
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'data', 'pos-grocery.db');

function applyMigration() {
  console.log('🚀 Applying Performance Indexes Migration');
  console.log('=========================================');
  
  // Check if database exists
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Database not found at: ${dbPath}`);
    console.log('Please ensure the database exists and run migrations first.');
    return false;
  }
  
  const db = new Database(dbPath);
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'server', 'db', 'migrations', '034_perf_indexes.sql');
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found at: ${migrationPath}`);
      return false;
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Reading migration file...');
    console.log('🔧 Applying indexes...');
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    let successCount = 0;
    let errorCount = 0;
    
    statements.forEach((statement, index) => {
      try {
        db.exec(statement);
        successCount++;
        console.log(`   ✅ Statement ${index + 1} executed successfully`);
      } catch (error) {
        errorCount++;
        console.log(`   ❌ Statement ${index + 1} failed: ${error.message}`);
      }
    });
    
    console.log(`\n📊 Migration Results:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 All indexes applied successfully!');
    } else {
      console.log('\n⚠️  Some indexes failed to apply. Check the errors above.');
    }
    
    return errorCount === 0;
    
  } catch (error) {
    console.error(`❌ Error applying migration: ${error.message}`);
    return false;
  } finally {
    db.close();
  }
}

function testIndexes() {
  console.log('\n🧪 Testing Index Performance');
  console.log('============================');
  
  const db = new Database(dbPath);
  
  // Test queries to verify indexes are working
  const testQueries = [
    {
      name: 'Stock Movements Index Test',
      query: `EXPLAIN QUERY PLAN SELECT * FROM stock_movements WHERE product_id = 1 AND created_at >= '2024-01-01' ORDER BY created_at DESC`,
      expectedIndex: 'idx_stock_movements_product_created_at'
    },
    {
      name: 'Invoices Date Index Test',
      query: `EXPLAIN QUERY PLAN SELECT * FROM invoices WHERE created_at >= '2024-01-01' ORDER BY created_at DESC`,
      expectedIndex: 'idx_invoices_created_at'
    },
    {
      name: 'Invoice Lines Product Index Test',
      query: `EXPLAIN QUERY PLAN SELECT * FROM invoice_lines WHERE product_id = 1 ORDER BY created_at DESC`,
      expectedIndex: 'idx_invoice_lines_product_id'
    },
    {
      name: 'Products Barcode Index Test',
      query: `EXPLAIN QUERY PLAN SELECT * FROM products WHERE barcode = '1234567890123'`,
      expectedIndex: 'idx_products_barcode'
    },
    {
      name: 'Products Name Index Test',
      query: `EXPLAIN QUERY PLAN SELECT * FROM products WHERE name_en LIKE '%Coca%' ORDER BY name_en`,
      expectedIndex: 'idx_products_name_en'
    }
  ];
  
  testQueries.forEach((test, index) => {
    console.log(`\n${index + 1}. ${test.name}`);
    
    try {
      const plan = db.prepare(test.query).all();
      const planText = plan.map(row => row.detail).join(' ').toLowerCase();
      
      console.log(`   Query Plan:`);
      plan.forEach((row, stepIndex) => {
        console.log(`     ${stepIndex + 1}. ${row.detail}`);
      });
      
      const usesIndex = planText.includes('index') || planText.includes('scan');
      const usesExpectedIndex = test.expectedIndex ? planText.includes(test.expectedIndex.toLowerCase()) : false;
      
      console.log(`   Index Usage: ${usesIndex ? '✅ Yes' : '❌ No'}`);
      if (test.expectedIndex) {
        console.log(`   Expected Index: ${usesExpectedIndex ? '✅ Used' : '❌ Not Used'}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  });
  
  db.close();
}

function listIndexes() {
  console.log('\n📋 Current Indexes');
  console.log('==================');
  
  const db = new Database(dbPath);
  
  try {
    // Get all indexes
    const indexes = db.prepare(`
      SELECT name, sql 
      FROM sqlite_master 
      WHERE type = 'index' 
        AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();
    
    console.log(`Found ${indexes.length} indexes:\n`);
    
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}`);
      if (index.sql) {
        console.log(`   SQL: ${index.sql}`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.error(`❌ Error listing indexes: ${error.message}`);
  } finally {
    db.close();
  }
}

function main() {
  console.log('🔧 Performance Indexes Setup');
  console.log('============================\n');
  
  // Apply migration
  const migrationSuccess = applyMigration();
  
  if (migrationSuccess) {
    // Test indexes
    testIndexes();
    
    // List all indexes
    listIndexes();
    
    console.log('\n🎯 Setup completed successfully!');
    console.log('Run "node run_performance_tests.js" for detailed analysis.');
  } else {
    console.log('\n❌ Setup failed. Please check the errors above.');
  }
}

// Run the script
main();










