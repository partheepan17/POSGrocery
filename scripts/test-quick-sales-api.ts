// Test Quick Sales API endpoints
import { initDatabase, getDatabase } from '../server/dist/db/index.js';
import { 
  ensureTodayQuickSalesOpen, 
  addQuickSalesLine, 
  getTodayQuickSalesSession, 
  closeTodayQuickSalesSession,
  getQuickSalesLines,
  removeQuickSalesLine
} from '../server/dist/utils/quickSales.js';

async function testQuickSalesAPI() {
  console.log('🧪 Testing Quick Sales API functionality...\n');
  
  // Initialize database
  initDatabase();
  const db = getDatabase();
  
  try {
    // Test 1: Ensure today's session is open
    console.log('1️⃣ Testing ensureTodayQuickSalesOpen()...');
    const session1 = ensureTodayQuickSalesOpen(1);
    console.log('✅ Created/retrieved session:', {
      id: session1.id,
      date: session1.session_date,
      status: session1.status
    });
    
    // Test 2: Get today's session
    console.log('\n2️⃣ Testing getTodayQuickSalesSession()...');
    const session2 = getTodayQuickSalesSession();
    if (session2) {
      console.log('✅ Session retrieved:', {
        id: session2.id,
        lineCount: session2.total_lines,
        totalAmount: session2.total_amount.toFixed(2)
      });
    } else {
      console.log('❌ No session found');
    }
    
    // Test 3: Add lines with different UOMs
    console.log('\n3️⃣ Testing addQuickSalesLine() with UOM...');
    
    // Get some products to add
    const products = db.prepare(`
      SELECT id, sku, name_en, price_retail, unit 
      FROM products 
      WHERE is_active = 1 
      LIMIT 3
    `).all();
    
    if (products.length === 0) {
      console.log('❌ No products found. Please run setup-test-data first.');
      return;
    }
    
    console.log(`Found ${products.length} products to test with`);
    
    // Add lines with different UOMs
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const qty = i + 1;
      const customUom = i === 0 ? 'kg' : i === 1 ? 'liters' : 'boxes';
      
      const line = addQuickSalesLine(product.id, qty, 0, customUom);
      console.log(`✅ Added line ${i + 1}:`, {
        productId: product.id,
        sku: product.sku,
        qty,
        uom: customUom,
        lineTotal: line.line_total
      });
    }
    
    // Test 4: Add duplicate product with different UOM
    console.log('\n4️⃣ Testing duplicate product with different UOM...');
    const duplicateLine = addQuickSalesLine(products[0].id, 2, 0, 'grams');
    console.log('✅ Added duplicate product with different UOM:', {
      productId: products[0].id,
      qty: 2,
      uom: 'grams',
      lineTotal: duplicateLine.line_total
    });
    
    // Test 5: Get paginated lines
    console.log('\n5️⃣ Testing getQuickSalesLines() pagination...');
    const linesResult = getQuickSalesLines(undefined, 2);
    console.log('✅ Paginated lines:', {
      count: linesResult.lines.length,
      hasMore: linesResult.hasMore,
      nextCursor: linesResult.nextCursor
    });
    
    // Show first page lines
    linesResult.lines.forEach((line, index) => {
      console.log(`  ${index + 1}. ${line.sku} - ${line.name} x${line.qty} ${line.uom} = $${line.line_total.toFixed(2)}`);
    });
    
    // Test 6: Get next page
    if (linesResult.hasMore && linesResult.nextCursor) {
      console.log('\n6️⃣ Testing next page...');
      const nextPage = getQuickSalesLines(linesResult.nextCursor, 2);
      console.log('✅ Next page:', {
        count: nextPage.lines.length,
        hasMore: nextPage.hasMore
      });
      
      nextPage.lines.forEach((line, index) => {
        console.log(`  ${index + 1}. ${line.sku} - ${line.name} x${line.qty} ${line.uom} = $${line.line_total.toFixed(2)}`);
      });
    }
    
    // Test 7: Remove a line (simulate manager action)
    console.log('\n7️⃣ Testing removeQuickSalesLine()...');
    const firstLine = linesResult.lines[0];
    if (firstLine) {
      const removed = removeQuickSalesLine(firstLine.id);
      console.log('✅ Line removed:', {
        lineId: firstLine.id,
        success: removed
      });
    }
    
    // Test 8: Close session with aggregation
    console.log('\n8️⃣ Testing closeTodayQuickSalesSession() with aggregation...');
    const closeResult = closeTodayQuickSalesSession(1, 'Test closure with aggregation');
    console.log('✅ Session closed:', {
      sessionId: closeResult.session.id,
      invoiceId: closeResult.invoiceId,
      receiptNo: closeResult.receiptNo,
      status: closeResult.session.status,
      totals: closeResult.totals
    });
    
    // Test 9: Verify no open session after closing
    console.log('\n9️⃣ Testing session state after closing...');
    const closedSession = getTodayQuickSalesSession();
    console.log('✅ No open session after closing:', closedSession === null);
    
    // Test 10: Test concurrency (simulate concurrent close attempts)
    console.log('\n🔟 Testing concurrency handling...');
    
    // Create a new session
    const newSession = ensureTodayQuickSalesOpen(1);
    addQuickSalesLine(products[0].id, 1, 0, 'pcs');
    
    // Simulate concurrent close attempts
    console.log('Simulating concurrent close attempts...');
    
    try {
      // First close should succeed
      const close1 = closeTodayQuickSalesSession(1, 'First close');
      console.log('✅ First close succeeded:', close1.invoiceId);
      
      // Second close should fail with CONFLICT
      const close2 = closeTodayQuickSalesSession(1, 'Second close');
      console.log('❌ Second close should have failed but succeeded:', close2.invoiceId);
    } catch (error) {
      if (error instanceof Error && error.message.includes('CONFLICT')) {
        console.log('✅ Second close correctly failed with CONFLICT');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
    console.log('\n🎉 All Quick Sales API tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('test-quick-sales-api.ts')) {
  testQuickSalesAPI();
}
















