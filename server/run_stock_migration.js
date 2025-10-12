const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

console.log('🔄 Running Stock Ledger & Valuation Migration...\n');

const db = new Database('data/pos.db');

try {
  // Read and execute migration
  const migrationPath = path.join(__dirname, 'db', 'migrations', '025_stock_ledger_valuation_system.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('📄 Executing migration: 025_stock_ledger_valuation_system.sql');
  db.exec(migrationSQL);
  
  console.log('✅ Migration completed successfully!\n');
  
  // Verify tables were created
  console.log('🔍 Verifying tables...');
  const tables = db.prepare('SELECT name FROM sqlite_master WHERE type=? ORDER BY name').all('table');
  const stockTables = tables.filter(t => 
    ['stock_ledger', 'stock_lots', 'product_cost_policy', 'stock_snapshots'].includes(t.name)
  );
  
  console.log('📊 Stock-related tables:', stockTables.map(t => t.name).join(', '));
  
  // Check data migration
  console.log('\n📈 Checking data migration...');
  const ledgerCount = db.prepare('SELECT COUNT(*) as count FROM stock_ledger').get();
  const movementsCount = db.prepare('SELECT COUNT(*) as count FROM stock_movements').get();
  
  console.log(`📝 Migrated ${ledgerCount.count} records from stock_movements to stock_ledger`);
  console.log(`📊 Original stock_movements still has ${movementsCount.count} records`);
  
  // Check product cost policies
  const policyCount = db.prepare('SELECT COUNT(*) as count FROM product_cost_policy').get();
  console.log(`⚙️  Created ${policyCount.count} product cost policies`);
  
  // Test stock on hand calculation
  console.log('\n🧮 Testing stock calculations...');
  const stockData = db.prepare(`
    SELECT 
      p.id, p.sku, p.name_en,
      COALESCE(SUM(sl.delta_qty), 0) as qty_on_hand
    FROM products p
    LEFT JOIN stock_ledger sl ON p.id = sl.product_id
    WHERE p.is_active = 1
    GROUP BY p.id, p.sku, p.name_en
    HAVING COALESCE(SUM(sl.delta_qty), 0) != 0
    LIMIT 5
  `).all();
  
  console.log('📦 Sample stock data:');
  stockData.forEach(item => {
    console.log(`  ${item.sku} (${item.name_en}): ${item.qty_on_hand} units`);
  });
  
  // Check for negative stock
  const negativeStock = db.prepare(`
    SELECT product_id, SUM(delta_qty) as total_qty
    FROM stock_ledger 
    GROUP BY product_id 
    HAVING SUM(delta_qty) < 0
  `).all();
  
  if (negativeStock.length > 0) {
    console.log('\n⚠️  Warning: Found negative stock:');
    negativeStock.forEach(item => {
      console.log(`  Product ${item.product_id}: ${item.total_qty} units`);
    });
  } else {
    console.log('\n✅ No negative stock found');
  }
  
  console.log('\n🎉 Stock Ledger & Valuation System is ready!');
  console.log('\n📋 Next steps:');
  console.log('  1. Start the server to test API endpoints');
  console.log('  2. Test /api/stock/soh endpoint');
  console.log('  3. Test /api/stock/valuation endpoint');
  console.log('  4. Create some GRN data to test FIFO/Average valuation');
  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
} finally {
  db.close();
}
