const Database = require('better-sqlite3');
const path = require('path');

async function testDBSchema() {
  try {
    const dbPath = path.join(__dirname, 'data', 'pos-grocery.db');
    console.log('Database path:', dbPath);
    
    const db = new Database(dbPath);
    
    // Check if GRN tables exist
    console.log('1. Checking GRN tables...');
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name LIKE '%grn%'
    `).all();
    
    console.log('GRN tables found:', tables.map(t => t.name));
    
    // Check if stock tables exist
    console.log('2. Checking stock tables...');
    const stockTables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND (name LIKE '%stock%' OR name LIKE '%ledger%')
    `).all();
    
    console.log('Stock tables found:', stockTables.map(t => t.name));
    
    // Check suppliers table
    console.log('3. Checking suppliers table...');
    const suppliers = db.prepare('SELECT COUNT(*) as count FROM suppliers').get();
    console.log('Suppliers count:', suppliers.count);
    
    // Check products table
    console.log('4. Checking products table...');
    const products = db.prepare('SELECT COUNT(*) as count FROM products').get();
    console.log('Products count:', products.count);
    
    db.close();
    
  } catch (error) {
    console.log('✗ Database Error:', error.message);
  }
}

testDBSchema();
