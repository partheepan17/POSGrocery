const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data/pos.db');
const db = new Database(dbPath);

try {
  // Check if products table exists
  const tableInfo = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='products'").get();
  console.log('Products table exists:', !!tableInfo);
  
  if (tableInfo) {
    // Check product count
    const count = db.prepare('SELECT COUNT(*) as count FROM products').get();
    console.log('Product count:', count.count);
    
    // Check if there are any products
    if (count.count > 0) {
      const products = db.prepare('SELECT id, sku, name_en, is_active FROM products LIMIT 5').all();
      console.log('Sample products:', products);
    } else {
      console.log('No products found in database');
    }
  }
} catch (error) {
  console.error('Error checking products:', error);
} finally {
  db.close();
}
