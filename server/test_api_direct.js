const Database = require('better-sqlite3');

console.log('🔍 Testing API Query Directly...\n');

const db = new Database('data/pos.db');

// Test the exact same query structure as the API
try {
  console.log('1. Testing basic table access...');
  const basicTest = db.prepare('SELECT COUNT(*) as count FROM stock_ledger').get();
  console.log('✅ Basic access works:', basicTest.count);
  
  console.log('\n2. Testing column access...');
  const columnTest = db.prepare('SELECT delta_qty FROM stock_ledger LIMIT 1').get();
  console.log('✅ Column access works:', columnTest);
  
  console.log('\n3. Testing JOIN query...');
  const joinTest = db.prepare(`
    SELECT p.id, p.sku, sl.delta_qty
    FROM products p
    LEFT JOIN stock_ledger sl ON p.id = sl.product_id
    LIMIT 3
  `).all();
  console.log('✅ JOIN query works:', joinTest);
  
  console.log('\n4. Testing GROUP BY query...');
  const groupTest = db.prepare(`
    SELECT 
      p.id as product_id,
      p.sku,
      COALESCE(SUM(sl.delta_qty), 0) as qty_on_hand
    FROM products p
    LEFT JOIN stock_ledger sl ON p.id = sl.product_id
    WHERE p.is_active = 1
    GROUP BY p.id, p.sku
    LIMIT 3
  `).all();
  console.log('✅ GROUP BY query works:', groupTest);
  
  console.log('\n5. Testing full API query...');
  const fullTest = db.prepare(`
    SELECT 
      p.id as product_id,
      p.sku,
      p.name_en,
      p.name_si,
      p.name_ta,
      p.unit,
      p.category_id,
      c.name as category_name,
      COALESCE(SUM(sl.delta_qty), 0) as qty_on_hand,
      pcp.cost_method
    FROM products p
    LEFT JOIN stock_ledger sl ON p.id = sl.product_id
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN product_cost_policy pcp ON p.id = pcp.product_id
    WHERE p.is_active = 1
    GROUP BY p.id, p.sku, p.name_en, p.name_si, p.name_ta, p.unit, p.category_id, c.name, pcp.cost_method
    ORDER BY p.name_en ASC
    LIMIT 10 OFFSET 0
  `).all();
  console.log('✅ Full API query works:', fullTest);
  
  console.log('\n🎉 All queries work perfectly!');
  
} catch (error) {
  console.error('❌ Query failed:', error.message);
  console.error('Error code:', error.code);
  console.error('Stack:', error.stack);
}

db.close();
