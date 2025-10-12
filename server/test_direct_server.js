const Database = require('better-sqlite3');
const path = require('path');

// Direct server test without migrations
async function testDirectServer() {
  try {
    const dbPath = path.join(__dirname, 'data', 'pos-grocery.db');
    console.log('Database path:', dbPath);
    
    const db = new Database(dbPath);
    
    // Test basic database operations
    console.log('1. Testing basic database operations...');
    
    // Check if GRN tables exist
    const grnTables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name LIKE '%grn%'
    `).all();
    
    console.log('GRN tables:', grnTables.map(t => t.name));
    
    // Check if we can create a simple GRN
    console.log('2. Testing GRN creation...');
    
    // Check suppliers
    const suppliers = db.prepare('SELECT COUNT(*) as count FROM suppliers').get();
    console.log('Suppliers count:', suppliers.count);
    
    // Check products
    const products = db.prepare('SELECT COUNT(*) as count FROM products').get();
    console.log('Products count:', products.count);
    
    if (suppliers.count > 0 && products.count > 0) {
      // Try to create a GRN
      const grnNumber = `TEST-${Date.now()}`;
      
      try {
        const grnResult = db.prepare(`
          INSERT INTO grn_headers (
            grn_number, supplier_id, status, created_at
          ) VALUES (?, ?, ?, datetime('now'))
        `).run(grnNumber, 1, 'draft');
        
        console.log('✓ GRN header created:', grnResult.lastInsertRowid);
        
        // Create GRN line
        const lineResult = db.prepare(`
          INSERT INTO grn_lines (
            grn_id, product_id, quantity_received, unit_cost, total_cost, created_at
          ) VALUES (?, ?, ?, ?, ?, datetime('now'))
        `).run(grnResult.lastInsertRowid, 1, 1, 1.00, 1.00);
        
        console.log('✓ GRN line created:', lineResult.lastInsertRowid);
        
        // Clean up
        db.prepare('DELETE FROM grn_lines WHERE grn_id = ?').run(grnResult.lastInsertRowid);
        db.prepare('DELETE FROM grn_headers WHERE id = ?').run(grnResult.lastInsertRowid);
        
        console.log('✓ Test GRN cleaned up');
        
      } catch (error) {
        console.log('✗ GRN creation failed:', error.message);
      }
    }
    
    db.close();
    
  } catch (error) {
    console.log('✗ Error:', error.message);
  }
}

testDirectServer();
