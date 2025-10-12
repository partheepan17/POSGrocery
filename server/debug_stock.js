const Database = require('better-sqlite3');
const express = require('express');

const app = express();
const db = new Database('data/pos.db');

app.get('/debug/stock', (req, res) => {
  try {
    console.log('🔍 Debug endpoint called');
    
    // Test 1: Check if stock_ledger exists
    const tableExists = db.prepare('SELECT name FROM sqlite_master WHERE type=? AND name=?').get('table', 'stock_ledger');
    console.log('Table exists:', !!tableExists);
    
    // Test 2: Check columns
    const columns = db.prepare('PRAGMA table_info(stock_ledger)').all();
    console.log('Columns:', columns.map(c => c.name));
    
    // Test 3: Simple query
    const simpleResult = db.prepare('SELECT COUNT(*) as count FROM stock_ledger').get();
    console.log('Record count:', simpleResult.count);
    
    // Test 4: The problematic query
    const complexResult = db.prepare(`
      SELECT 
        p.id as product_id,
        p.sku,
        p.name_en,
        COALESCE(SUM(sl.delta_qty), 0) as qty_on_hand
      FROM products p
      LEFT JOIN stock_ledger sl ON p.id = sl.product_id
      WHERE p.is_active = 1
      GROUP BY p.id, p.sku, p.name_en
      LIMIT 5
    `).all();
    
    console.log('Complex query result:', complexResult);
    
    res.json({
      ok: true,
      tableExists: !!tableExists,
      columns: columns.map(c => c.name),
      recordCount: simpleResult.count,
      complexResult: complexResult
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({
      ok: false,
      error: error.message,
      code: error.code
    });
  }
});

app.listen(8251, () => {
  console.log('Debug server running on port 8251');
});
