const Database = require('better-sqlite3');

console.log('🔍 Debugging SQL Query...\n');

const db = new Database('data/pos.db');

// Test the exact query from the API
const whereClause = 'WHERE p.is_active = 1';
const params = [];
const pageSize = 10;
const offset = 0;

const sql = `
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
  ${whereClause}
  GROUP BY p.id, p.sku, p.name_en, p.name_si, p.name_ta, p.unit, p.category_id, c.name, pcp.cost_method
  ORDER BY p.name_en ASC
  LIMIT ? OFFSET ?
`;

console.log('SQL Query:');
console.log(sql);
console.log('\nParameters:', [pageSize, offset]);

try {
  const result = db.prepare(sql).all(pageSize, offset);
  console.log('\n✅ Query executed successfully!');
  console.log('Results:', JSON.stringify(result, null, 2));
} catch (error) {
  console.log('\n❌ Query failed:', error.message);
  console.log('Error code:', error.code);
  
  // Let's check if the table exists
  console.log('\n🔍 Checking table structure...');
  try {
    const tableInfo = db.prepare('PRAGMA table_info(stock_ledger)').all();
    console.log('stock_ledger columns:', tableInfo.map(col => col.name));
  } catch (e) {
    console.log('Error getting table info:', e.message);
  }
  
  // Let's check if there are any views that might be interfering
  console.log('\n🔍 Checking for views...');
  try {
    const views = db.prepare('SELECT name FROM sqlite_master WHERE type=?').all('view');
    console.log('Views:', views.map(v => v.name));
  } catch (e) {
    console.log('Error getting views:', e.message);
  }
}

db.close();
