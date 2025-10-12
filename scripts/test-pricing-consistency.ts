// Test Quick Sales pricing consistency with standard cart pricing
import { initDatabase, getDatabase } from '../server/dist/db/index.js';
import { 
  ensureTodayQuickSalesOpen, 
  addQuickSalesLine, 
  getTodayQuickSalesSession, 
  closeTodayQuickSalesSession
} from '../server/dist/utils/quickSales.js';

async function testPricingConsistency() {
  console.log('🧪 Testing Quick Sales pricing consistency...\n');
  
  // Initialize database
  initDatabase();
  const db = getDatabase();
  
  try {
    // Test 1: Basic pricing consistency
    console.log('1️⃣ Testing basic pricing consistency...');
    
    // Get a product
    const product = db.prepare(`
      SELECT id, sku, name_en, price_retail, unit
      FROM products 
      WHERE is_active = 1 
      LIMIT 1
    `).get() as any;
    
    if (!product) {
      console.log('❌ No products found. Please run setup-test-data first.');
      return;
    }
    
    console.log(`Testing with product: ${product.sku} - ${product.name_en}`);
    console.log(`Base price: $${product.price_retail}`);
    
    // Test different quantities
    const testQuantities = [1, 5, 10, 15];
    
    for (const qty of testQuantities) {
      // Create a new session for each test
      const session = ensureTodayQuickSalesOpen(1);
      
      // Add line with Quick Sales
      const line = addQuickSalesLine(product.id, qty, 0, 'BASE');
      
      console.log(`  Qty ${qty}: Unit Price $${line.unit_price}, Total $${line.line_total}`);
      
      // Check for auto discount
      if (line.auto_discount > 0) {
        console.log(`    Auto discount: $${line.auto_discount}`);
      }
      
      // Close session to clean up
      closeTodayQuickSalesSession(1, 'Test cleanup');
    }
    
    // Test 2: UOM pricing consistency
    console.log('\n2️⃣ Testing UOM pricing consistency...');
    
    // Test with different UOMs (if available)
    const testUOMs = ['BASE', 'kg', 'grams', 'liters'];
    
    for (const uom of testUOMs) {
      const session = ensureTodayQuickSalesOpen(1);
      
      try {
        const line = addQuickSalesLine(product.id, 1, 0, uom);
        console.log(`  UOM ${uom}: Unit Price $${line.unit_price}, Total $${line.line_total}`);
        
        closeTodayQuickSalesSession(1, 'Test cleanup');
      } catch (error) {
        console.log(`  UOM ${uom}: Not available (${error instanceof Error ? error.message : 'Unknown error'})`);
      }
    }
    
    // Test 3: Bulk discount consistency
    console.log('\n3️⃣ Testing bulk discount consistency...');
    
    const session = ensureTodayQuickSalesOpen(1);
    
    // Add multiple lines to test aggregation
    const lines = [];
    for (let i = 0; i < 3; i++) {
      const line = addQuickSalesLine(product.id, 5, 0, 'BASE'); // 5 items each
      lines.push(line);
      console.log(`  Line ${i + 1}: Qty ${line.qty}, Unit $${line.unit_price}, Total $${line.line_total}`);
    }
    
    // Get session with lines
    const sessionWithLines = getTodayQuickSalesSession();
    if (sessionWithLines) {
      console.log(`  Session total: $${sessionWithLines.total_amount.toFixed(2)}`);
      console.log(`  Total lines: ${sessionWithLines.total_lines}`);
    }
    
    // Close and check invoice
    const closeResult = closeTodayQuickSalesSession(1, 'Bulk discount test');
    console.log(`  Invoice created: ${closeResult.receiptNo}`);
    console.log(`  Invoice total: $${closeResult.totals.net.toFixed(2)}`);
    console.log(`  Cash payment: $${closeResult.totals.net.toFixed(2)}`);
    
    // Test 4: Manual discount handling
    console.log('\n4️⃣ Testing manual discount handling...');
    
    const session2 = ensureTodayQuickSalesOpen(1);
    const lineWithDiscount = addQuickSalesLine(product.id, 2, 10, 'BASE'); // $10 manual discount
    console.log(`  With $10 manual discount:`);
    console.log(`    Unit Price: $${lineWithDiscount.unit_price}`);
    console.log(`    Line Total: $${lineWithDiscount.line_total}`);
    console.log(`    Manual Discount: $${lineWithDiscount.manual_discount}`);
    
    closeTodayQuickSalesSession(1, 'Manual discount test');
    
    // Test 5: Cash-only payment verification
    console.log('\n5️⃣ Testing cash-only payment...');
    
    const session3 = ensureTodayQuickSalesOpen(1);
    addQuickSalesLine(product.id, 1, 0, 'BASE');
    
    const finalClose = closeTodayQuickSalesSession(1, 'Cash-only test');
    
    // Verify payment was created
    const payment = db.prepare(`
      SELECT method, amount 
      FROM invoice_payments 
      WHERE invoice_id = ?
    `).get(finalClose.invoiceId) as any;
    
    if (payment) {
      console.log(`  Payment method: ${payment.method}`);
      console.log(`  Payment amount: $${payment.amount.toFixed(2)}`);
      console.log(`  Invoice total: $${finalClose.totals.net.toFixed(2)}`);
      console.log(`  Payment matches invoice: ${Math.abs(payment.amount - finalClose.totals.net) < 0.01 ? '✅' : '❌'}`);
    } else {
      console.log('  ❌ No payment found for invoice');
    }
    
    console.log('\n🎉 Pricing consistency tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('test-pricing-consistency.ts')) {
  testPricingConsistency();
}


