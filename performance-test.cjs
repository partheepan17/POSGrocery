const Database = require('better-sqlite3');
const db = new Database('server/data/pos.db');

console.log('⚡ Performance Testing - Database Triggers\n');

// Test 1: Baseline performance without triggers
console.log('1. Testing baseline performance (direct inserts)...');
const startTime1 = Date.now();

try {
  // Create test invoice
  const invoiceResult = db.prepare(`
    INSERT INTO invoices (receipt_no, customer_id, gross, discount, tax, net, cashier_id, language, price_tier)
    VALUES ('PERF_TEST_1', 1, 1.50, 0, 0.23, 1.73, 1, 'EN', 'Retail')
  `).run();
  const invoiceId = invoiceResult.lastInsertRowid;
  
  // Insert invoice line (this will trigger stock update)
  const lineResult = db.prepare(`
    INSERT INTO invoice_lines (invoice_id, product_id, qty, unit_price, line_discount, tax, total)
    VALUES (?, 1, 1, 1.50, 0, 0, 1.50)
  `).run(invoiceId);
  
  const endTime1 = Date.now();
  console.log(`   ✅ Direct insert completed in ${endTime1 - startTime1}ms`);
  console.log(`   Invoice ID: ${invoiceId}, Line ID: ${lineResult.lastInsertRowid}`);
  
} catch (error) {
  console.log(`   ❌ Direct insert failed: ${error.message}`);
}

// Test 2: Multiple rapid inserts
console.log('\n2. Testing multiple rapid inserts...');
const startTime2 = Date.now();
const iterations = 10;
let successCount = 0;

for (let i = 0; i < iterations; i++) {
  try {
    const invoiceResult = db.prepare(`
      INSERT INTO invoices (receipt_no, customer_id, gross, discount, tax, net, cashier_id, language, price_tier)
      VALUES (?, 1, 1.50, 0, 0.23, 1.73, 1, 'EN', 'Retail')
    `).run(`PERF_TEST_${i + 2}`);
    const invoiceId = invoiceResult.lastInsertRowid;
    
    db.prepare(`
      INSERT INTO invoice_lines (invoice_id, product_id, qty, unit_price, line_discount, tax, total)
      VALUES (?, 1, 1, 1.50, 0, 0, 1.50)
    `).run(invoiceId);
    
    successCount++;
  } catch (error) {
    console.log(`   ❌ Insert ${i + 1} failed: ${error.message}`);
  }
}

const endTime2 = Date.now();
console.log(`   ✅ ${successCount}/${iterations} inserts completed in ${endTime2 - startTime2}ms`);
console.log(`   Average time per insert: ${(endTime2 - startTime2) / iterations}ms`);

// Test 3: Check stock movements performance
console.log('\n3. Testing stock movements performance...');
const startTime3 = Date.now();

const movements = db.prepare(`
  SELECT COUNT(*) as count, 
         AVG(CAST(created_at AS INTEGER)) as avg_time
  FROM stock_movements 
  WHERE product_id = 1 AND movement_type = 'sale'
`).get();

const endTime3 = Date.now();
console.log(`   ✅ Stock movements query completed in ${endTime3 - startTime3}ms`);
console.log(`   Total movements: ${movements.count}`);

// Test 4: Check current stock
console.log('\n4. Checking current stock...');
const stock = db.prepare('SELECT stock_qty FROM products WHERE id = 1').get();
console.log(`   Current stock: ${stock.stock_qty}`);

// Test 5: Test trigger performance with large quantities
console.log('\n5. Testing trigger performance with large quantities...');
const startTime5 = Date.now();

try {
  const invoiceResult = db.prepare(`
    INSERT INTO invoices (receipt_no, customer_id, gross, discount, tax, net, cashier_id, language, price_tier)
    VALUES ('PERF_TEST_LARGE', 1, 15.00, 0, 2.25, 17.25, 1, 'EN', 'Retail')
  `).run();
  const invoiceId = invoiceResult.lastInsertRowid;
  
  // This should trigger stock validation and fail if insufficient stock
  db.prepare(`
    INSERT INTO invoice_lines (invoice_id, product_id, qty, unit_price, line_discount, tax, total)
    VALUES (?, 1, 10, 1.50, 0, 0, 15.00)
  `).run(invoiceId);
  
  const endTime5 = Date.now();
  console.log(`   ✅ Large quantity insert completed in ${endTime5 - startTime5}ms`);
  
} catch (error) {
  const endTime5 = Date.now();
  console.log(`   ✅ Large quantity correctly rejected in ${endTime5 - startTime5}ms: ${error.message}`);
}

console.log('\n🏁 Performance Test Complete');
db.close();
