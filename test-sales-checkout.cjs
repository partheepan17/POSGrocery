const Database = require('better-sqlite3');
const db = new Database('server/data/pos.db');

console.log('🧪 Testing Sales Checkout System\n');

// Test 1: Check current stock
console.log('1. Checking current stock...');
const stock = db.prepare('SELECT id, name_en, stock_qty FROM products WHERE id = 1').get();
console.log('   Product 1 stock:', stock);

// Test 2: Test direct database trigger
console.log('\n2. Testing direct database trigger...');
try {
    db.exec(`
        INSERT INTO invoice_lines (invoice_id, product_id, qty, unit_price, line_discount, tax, total)
        VALUES (999, 1, 1, 1.50, 0, 0, 1.50)
    `);
    console.log('   ❌ Direct insert succeeded - trigger not working');
} catch (error) {
    console.log('   ✅ Direct insert failed as expected:', error.message);
}

// Test 3: Add some stock first
console.log('\n3. Adding stock to product 1...');
db.exec('UPDATE products SET stock_qty = 10 WHERE id = 1');
const newStock = db.prepare('SELECT stock_qty FROM products WHERE id = 1').get();
console.log('   New stock:', newStock.stock_qty);

// Test 4: Test valid sale (create invoice first)
console.log('\n4. Testing valid sale...');
try {
    // Create invoice first
    const invoiceResult = db.prepare(`
        INSERT INTO invoices (receipt_no, customer_id, gross, discount, tax, net, cashier_id, language, price_tier)
        VALUES ('TEST001', 1, 7.50, 0, 1.13, 8.63, 1, 'EN', 'Retail')
    `).run();
    const invoiceId = invoiceResult.lastInsertRowid;
    
    db.exec(`
        INSERT INTO invoice_lines (invoice_id, product_id, qty, unit_price, line_discount, tax, total)
        VALUES (?, 1, 5, 1.50, 0, 0, 7.50)
    `, [invoiceId]);
    console.log('   ✅ Valid sale succeeded');
    
    const updatedStock = db.prepare('SELECT stock_qty FROM products WHERE id = 1').get();
    console.log('   Stock after sale:', updatedStock.stock_qty);
    
    const movements = db.prepare('SELECT * FROM stock_movements WHERE product_id = 1 ORDER BY created_at DESC LIMIT 1').get();
    console.log('   Stock movement recorded:', movements);
} catch (error) {
    console.log('   ❌ Valid sale failed:', error.message);
}

// Test 5: Test insufficient stock
console.log('\n5. Testing insufficient stock...');
try {
    // Create invoice first
    const invoiceResult = db.prepare(`
        INSERT INTO invoices (receipt_no, customer_id, gross, discount, tax, net, cashier_id, language, price_tier)
        VALUES ('TEST002', 1, 15.00, 0, 2.25, 17.25, 1, 'EN', 'Retail')
    `).run();
    const invoiceId = invoiceResult.lastInsertRowid;
    
    db.exec(`
        INSERT INTO invoice_lines (invoice_id, product_id, qty, unit_price, line_discount, tax, total)
        VALUES (?, 1, 10, 1.50, 0, 0, 15.00)
    `, [invoiceId]);
    console.log('   ❌ Insufficient stock sale succeeded - trigger not working');
} catch (error) {
    console.log('   ✅ Insufficient stock sale failed as expected:', error.message);
}

// Test 6: Test API endpoint
console.log('\n6. Testing API endpoint...');
const fetch = require('node-fetch');

async function testAPI() {
    try {
        const response = await fetch('http://localhost:8250/api/invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerId: 1,
                items: [{ productId: 1, quantity: 10 }],
                payments: [{ method: 'cash', amount: 17.25 }]
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            console.log('   ❌ API allowed insufficient stock sale:', data);
        } else {
            console.log('   ✅ API correctly rejected insufficient stock:', data);
        }
    } catch (error) {
        console.log('   ❌ API test failed:', error.message);
    }
}

testAPI().then(() => {
    console.log('\n🏁 Sales Checkout Test Complete');
    db.close();
});
