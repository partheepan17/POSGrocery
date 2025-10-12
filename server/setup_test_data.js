const Database = require('better-sqlite3');
const path = require('path');

async function setupTestData() {
  try {
    const dbPath = path.join(__dirname, 'data', 'pos-grocery.db');
    console.log('Database path:', dbPath);
    
    const db = new Database(dbPath);
    
    console.log('1. Setting up test data...');
    
    // Create test products
    console.log('2. Creating test products...');
    const products = [
      {
        name_en: 'Test Product 1',
        sku: 'TEST001',
        barcode: '123456789',
        price_retail: 10.50,
        unit: 'pc',
        is_active: true
      },
      {
        name_en: 'Test Product 2',
        sku: 'TEST002',
        barcode: '987654321',
        price_retail: 15.75,
        unit: 'kg',
        is_active: true
      },
      {
        name_en: 'Test Product 3',
        sku: 'TEST003',
        barcode: '111222333',
        price_retail: 5.25,
        unit: 'g',
        is_active: true
      }
    ];
    
    for (const product of products) {
      try {
        const result = db.prepare(`
          INSERT INTO products (
            name_en, sku, barcode, price_retail, unit, is_active, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
          product.name_en,
          product.sku,
          product.barcode,
          Number(product.price_retail),
          product.unit,
          product.is_active ? 1 : 0
        );
        
        console.log(`✓ Product created: ${product.name_en} (ID: ${result.lastInsertRowid})`);
      } catch (error) {
        console.log(`✗ Failed to create product ${product.name_en}:`, error.message);
      }
    }
    
    // Create test supplier if needed
    console.log('3. Checking suppliers...');
    const supplierCount = db.prepare('SELECT COUNT(*) as count FROM suppliers').get();
    console.log('Suppliers count:', supplierCount.count);
    
    if (supplierCount.count === 0) {
      console.log('4. Creating test supplier...');
      const supplierResult = db.prepare(`
        INSERT INTO suppliers (
          supplier_name, contact_person, email, phone, address, active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        'Test Supplier',
        'John Doe',
        'john@test.com',
        '1234567890',
        '123 Test St',
        true
      );
      
      console.log(`✓ Supplier created: Test Supplier (ID: ${supplierResult.lastInsertRowid})`);
    }
    
    // Final counts
    console.log('5. Final data counts...');
    const finalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get();
    const finalSuppliers = db.prepare('SELECT COUNT(*) as count FROM suppliers').get();
    
    console.log('Products:', finalProducts.count);
    console.log('Suppliers:', finalSuppliers.count);
    
    db.close();
    
  } catch (error) {
    console.log('✗ Error:', error.message);
  }
}

setupTestData();
