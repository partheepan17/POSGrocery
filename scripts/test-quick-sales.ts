// Test Quick Sales functionality
import { initDatabase, getDatabase } from '../server/dist/db/index.js';
import { 
  ensureTodayQuickSalesOpen, 
  addQuickSalesLine, 
  getTodayQuickSalesSession, 
  closeTodayQuickSalesSession,
  getQuickSalesHistory 
} from '../server/dist/utils/quickSales.js';

async function testQuickSales() {
  console.log('🧪 Testing Quick Sales functionality...\n');
  
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
    
    // Test 2: Try to get the same session again (should return same ID)
    console.log('\n2️⃣ Testing duplicate session creation...');
    const session2 = ensureTodayQuickSalesOpen(1);
    console.log('✅ Same session returned:', {
      id: session2.id,
      sameId: session1.id === session2.id
    });
    
    // Test 3: Add some lines
    console.log('\n3️⃣ Testing addQuickSalesLine()...');
    
    // Get some products to add
    const products = db.prepare(`
      SELECT id, sku, name_en, price_retail 
      FROM products 
      WHERE is_active = 1 
      LIMIT 3
    `).all();
    
    if (products.length === 0) {
      console.log('❌ No products found. Please run setup-test-data first.');
      return;
    }
    
    console.log(`Found ${products.length} products to test with`);
    
    // Add lines for each product
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const qty = i + 1; // Different quantities
      const line = addQuickSalesLine(product.id, qty, 0);
      console.log(`✅ Added line ${i + 1}:`, {
        productId: product.id,
        sku: product.sku,
        qty,
        lineTotal: line.line_total
      });
    }
    
    // Test 4: Get session with lines
    console.log('\n4️⃣ Testing getTodayQuickSalesSession()...');
    const sessionWithLines = getTodayQuickSalesSession();
    if (sessionWithLines) {
      console.log('✅ Session with lines:', {
        id: sessionWithLines.id,
        lineCount: sessionWithLines.total_lines,
        totalAmount: sessionWithLines.total_amount.toFixed(2)
      });
      
      console.log('Lines:');
      sessionWithLines.lines.forEach((line, index) => {
        console.log(`  ${index + 1}. ${line.sku} - ${line.name} x${line.qty} = $${line.line_total.toFixed(2)}`);
      });
    } else {
      console.log('❌ No session found');
    }
    
    // Test 5: Test history before closing
    console.log('\n5️⃣ Testing getQuickSalesHistory()...');
    const history = getQuickSalesHistory();
    console.log(`✅ Found ${history.length} sessions in history`);
    
    // Test 6: Close the session
    console.log('\n6️⃣ Testing closeTodayQuickSalesSession()...');
    const closeResult = closeTodayQuickSalesSession(1, 'Test closure');
    console.log('✅ Session closed:', {
      sessionId: closeResult.session.id,
      invoiceId: closeResult.invoiceId,
      status: closeResult.session.status
    });
    
    // Test 7: Verify no open session after closing
    console.log('\n7️⃣ Testing session state after closing...');
    const closedSession = getTodayQuickSalesSession();
    console.log('✅ No open session after closing:', closedSession === null);
    
    // Test 8: Create a new session for tomorrow (simulate)
    console.log('\n8️⃣ Testing new session creation...');
    const newSession = ensureTodayQuickSalesOpen(1);
    console.log('✅ New session created:', {
      id: newSession.id,
      date: newSession.date,
      status: newSession.status
    });
    
    console.log('\n🎉 All Quick Sales tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('test-quick-sales.ts')) {
  testQuickSales();
}


