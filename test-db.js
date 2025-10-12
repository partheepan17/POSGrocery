import Database from 'better-sqlite3';
import path from 'path';

console.log('Testing database connection...');

try {
  const db = new Database('./data/pos.db');
  console.log('Database opened successfully');
  
  // Check if tables exist
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables:', tables.map(t => t.name));
  
  // Check products table structure
  const productsSchema = db.prepare("PRAGMA table_info(products)").all();
  console.log('Products table columns:', productsSchema.map(c => `${c.name} (${c.type})`));
  
  // Test a simple insert
  try {
    const result = db.prepare(`
      INSERT INTO products (name_en, sku, barcode, category_id, preferred_supplier_id, cost, price_retail, unit, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run('Test Product', 'TEST001', '123456789', null, null, 10.00, 15.00, 'pc', 1);
    
    console.log('Test insert successful, ID:', result.lastInsertRowid);
    
    // Clean up
    db.prepare('DELETE FROM products WHERE sku = ?').run('TEST001');
    console.log('Test cleanup successful');
    
  } catch (insertError) {
    console.error('Insert test failed:', insertError.message);
  }
  
  db.close();
  console.log('Database test completed successfully');
  
} catch (error) {
  console.error('Database test failed:', error.message);
  process.exit(1);
}
