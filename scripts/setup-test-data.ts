#!/usr/bin/env tsx
// Setup test data for benchmarking

import { initDatabase, getDatabase } from '../server/dist/db/index.js';

async function setupTestData() {
  console.log('🔧 Setting up test data...');
  
  // Initialize database
  initDatabase();
  const db = getDatabase();
  
  // Check if products table exists and has data
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
  
  if (productCount.count > 0) {
    console.log(`✅ Database already has ${productCount.count} products`);
    return;
  }
  
  console.log('📊 Creating test products...');
  
  // Create test products
  const createProduct = db.prepare(`
    INSERT INTO products (
      sku, barcode, name_en, name_si, name_ta, unit, 
      price_retail, price_wholesale, price_credit, price_other,
      is_active, category_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const products = [
    { sku: 'APP001', barcode: '1234567890123', name_en: 'Red Apples', name_si: 'රතු ඇපල්', name_ta: 'சிவப்பு ஆப்பிள்', unit: 'kg', price: 150.00 },
    { sku: 'MIL001', barcode: '1234567890124', name_en: 'Fresh Milk', name_si: 'නැවුම් කිරි', name_ta: 'புதிய பால்', unit: 'l', price: 120.00 },
    { sku: 'BRE001', barcode: '1234567890125', name_en: 'White Bread', name_si: 'සුදු පාන්', name_ta: 'வெள்ளை ரொட்டி', unit: 'pc', price: 80.00 },
    { sku: 'RIC001', barcode: '1234567890126', name_en: 'Basmati Rice', name_si: 'බාස්මති බත්', name_ta: 'பாஸ்மதி அரிசி', unit: 'kg', price: 200.00 },
    { sku: 'OIL001', barcode: '1234567890127', name_en: 'Coconut Oil', name_si: 'පොල් තෙල්', name_ta: 'தேங்காய் எண்ணெய்', unit: 'l', price: 300.00 },
    { sku: 'SUG001', barcode: '1234567890128', name_en: 'White Sugar', name_si: 'සුදු සීනි', name_ta: 'வெள்ளை சர்க்கரை', unit: 'kg', price: 100.00 },
    { sku: 'SAL001', barcode: '1234567890129', name_en: 'Table Salt', name_si: 'මේස ලුණු', name_ta: 'மேசை உப்பு', unit: 'kg', price: 50.00 },
    { sku: 'TEA001', barcode: '1234567890130', name_en: 'Ceylon Tea', name_si: 'ශ්‍රී ලංකා තේ', name_ta: 'இலங்கை தேயிலை', unit: 'kg', price: 400.00 },
    { sku: 'COF001', barcode: '1234567890131', name_en: 'Coffee Beans', name_si: 'කෝපි බෝංචි', name_ta: 'காபி பீன்ஸ்', unit: 'kg', price: 500.00 },
    { sku: 'WAT001', barcode: '1234567890132', name_en: 'Bottled Water', name_si: 'බෝතල් ජලය', name_ta: 'பாட்டில் தண்ணீர்', unit: 'pc', price: 30.00 }
  ];
  
  for (const product of products) {
    createProduct.run(
      product.sku,
      product.barcode,
      product.name_en,
      product.name_si,
      product.name_ta,
      product.unit,
      product.price,
      product.price * 0.8, // wholesale
      product.price * 1.2, // credit
      product.price * 0.9, // other
      1, // is_active
      1  // category_id
    );
  }
  
  // Create more products for realistic testing
  for (let i = 1; i <= 100; i++) {
    const sku = `PROD${i.toString().padStart(3, '0')}`;
    const barcode = `1234567890${(100 + i).toString().padStart(3, '0')}`;
    const name = `Test Product ${i}`;
    
    createProduct.run(
      sku,
      barcode,
      name,
      name,
      name,
      'pc',
      Math.random() * 500 + 10, // Random price 10-510
      Math.random() * 400 + 8,  // wholesale
      Math.random() * 600 + 12, // credit
      Math.random() * 450 + 9,  // other
      1, // is_active
      1  // category_id
    );
  }
  
  console.log(`✅ Created ${products.length + 100} test products`);
  
  // Create some test invoices
  console.log('📊 Creating test invoices...');
  
  const createInvoice = db.prepare(`
    INSERT INTO invoices (
      receipt_no, customer_id, subtotal, tax_amount, total_amount,
      payment_method, cashier_id, shift_id, status, request_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const createInvoiceLine = db.prepare(`
    INSERT INTO invoice_lines (
      invoice_id, product_id, quantity, unit_price, total_price, request_id
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  // Get some product IDs
  const productIds = db.prepare('SELECT id FROM products LIMIT 10').all() as { id: number }[];
  
  for (let i = 1; i <= 50; i++) {
    const receiptNo = `TEST-${i.toString().padStart(3, '0')}`;
    const subtotal = Math.random() * 1000 + 100;
    const taxAmount = subtotal * 0.15;
    const totalAmount = subtotal + taxAmount;
    
    const invoiceResult = createInvoice.run(
      receiptNo,
      1, // customer_id
      subtotal,
      taxAmount,
      totalAmount,
      'cash',
      1, // cashier_id
      1, // shift_id
      'completed',
      'test-setup'
    );
    
    const invoiceId = invoiceResult.lastInsertRowid;
    
    // Add 2-5 random items
    const itemCount = Math.floor(Math.random() * 4) + 2;
    for (let j = 0; j < itemCount; j++) {
      const product = productIds[Math.floor(Math.random() * productIds.length)];
      const quantity = Math.floor(Math.random() * 5) + 1;
      const unitPrice = Math.random() * 200 + 10;
      const totalPrice = unitPrice * quantity;
      
      createInvoiceLine.run(
        invoiceId,
        product.id,
        quantity,
        unitPrice,
        totalPrice,
        'test-setup'
      );
    }
  }
  
  console.log('✅ Created 50 test invoices');
  console.log('🎉 Test data setup complete!');
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('setup-test-data.ts')) {
  setupTestData().catch(console.error);
}

export { setupTestData };
















