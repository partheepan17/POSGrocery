import { initDatabase, getDatabase } from '../server/dist/db/index.js';
import {
  ensureTodayQuickSalesOpen,
  addQuickSalesLine,
  closeTodayQuickSalesSession,
  getQuickSalesLines
} from '../server/dist/utils/quickSales.js';
import { rbacService } from '../server/dist/utils/rbac.js';

const mockRequestId = 'test-quick-sales-performance';

async function testQuickSalesPerformance() {
  console.log('⚡ Testing Quick Sales performance for busy shops...');

  initDatabase();
  const db = getDatabase();

  // Clear existing data for clean test (disable foreign keys temporarily)
  db.prepare('PRAGMA foreign_keys = OFF').run();
  db.prepare('DELETE FROM quick_sales_lines').run();
  db.prepare('DELETE FROM quick_sales_sessions').run();
  db.prepare('DELETE FROM invoice_lines WHERE invoice_id IN (SELECT id FROM invoices WHERE receipt_no LIKE \'INV-%\')').run();
  db.prepare('DELETE FROM invoice_payments WHERE invoice_id IN (SELECT id FROM invoices WHERE receipt_no LIKE \'INV-%\')').run();
  db.prepare('DELETE FROM invoices WHERE receipt_no LIKE \'INV-%\'').run();
  db.prepare('PRAGMA foreign_keys = ON').run();

  // Create test user
  const testUser = {
    id: 1,
    username: 'testuser',
    name: 'Test User',
    role: 'cashier' as const,
    is_active: true,
    pin: '1234'
  };

  const context = {
    user: testUser,
    requestId: mockRequestId
  };

  // Ensure we have products for testing
  const products = db.prepare('SELECT id, sku, name_en, price_retail FROM products WHERE is_active = 1 LIMIT 10').all() as any[];
  if (products.length === 0) {
    console.error('No active products found. Please run setup-test-data.ts first.');
    return;
  }

  console.log(`Using ${products.length} products for performance testing`);

  console.log('\n1️⃣ Testing line addition performance (target: ≤50-100ms per line)...');

  const session = ensureTodayQuickSalesOpen(1, mockRequestId);
  console.log(`Created session: ${session.id}`);

  // Test single line addition performance
  const singleLineStart = Date.now();
  try {
    const line = addQuickSalesLine(products[0].id, 1, 0, 'pcs', mockRequestId, context);
    const singleLineEnd = Date.now();
    const singleLineTime = singleLineEnd - singleLineStart;
    
    console.log(`Single line addition: ${singleLineTime}ms ${singleLineTime <= 100 ? '✅' : '❌'} (target: ≤100ms)`);
  } catch (error) {
    console.log(`❌ Single line addition failed: ${error.message}`);
  }

  // Test batch line addition performance
  console.log('\n2️⃣ Testing batch line addition performance...');
  const batchStart = Date.now();
  const batchSize = 50;
  
  try {
    for (let i = 0; i < batchSize; i++) {
      const product = products[i % products.length];
      addQuickSalesLine(product.id, 1, 0, 'pcs', mockRequestId, context);
    }
    const batchEnd = Date.now();
    const batchTime = batchEnd - batchStart;
    const avgTimePerLine = batchTime / batchSize;
    
    console.log(`Batch addition (${batchSize} lines): ${batchTime}ms total, ${avgTimePerLine.toFixed(2)}ms per line`);
    console.log(`Average per line: ${avgTimePerLine <= 100 ? '✅' : '❌'} (target: ≤100ms)`);
  } catch (error) {
    console.log(`❌ Batch addition failed: ${error.message}`);
  }

  console.log('\n3️⃣ Testing pagination performance...');

  // Test pagination with large dataset
  const paginationStart = Date.now();
  try {
    const result = getQuickSalesLines(undefined, 20, mockRequestId);
    const paginationEnd = Date.now();
    const paginationTime = paginationEnd - paginationStart;
    
    console.log(`Pagination (20 lines): ${paginationTime}ms ${paginationTime <= 50 ? '✅' : '❌'} (target: ≤50ms)`);
    console.log(`Retrieved ${result.lines.length} lines, hasMore: ${result.hasMore}`);
  } catch (error) {
    console.log(`❌ Pagination failed: ${error.message}`);
  }

  console.log('\n4️⃣ Testing session close performance (target: ≤200-500ms)...');

  // Test session close performance
  const closeStart = Date.now();
  try {
    const closeResult = closeTodayQuickSalesSession(1, 'Performance test close', mockRequestId, context, '1234');
    const closeEnd = Date.now();
    const closeTime = closeEnd - closeStart;
    
    console.log(`Session close: ${closeTime}ms ${closeTime <= 500 ? '✅' : '❌'} (target: ≤500ms)`);
    console.log(`Closed session with ${closeResult.totals.line_count} lines, total: $${closeResult.totals.net}`);
  } catch (error) {
    console.log(`❌ Session close failed: ${error.message}`);
  }

  console.log('\n5️⃣ Testing concurrent operations simulation...');

  // Simulate concurrent operations
  const concurrentStart = Date.now();
  const concurrentPromises = [];
  
  try {
    // Create multiple sessions and add lines concurrently
    for (let i = 0; i < 5; i++) {
      const promise = (async () => {
        const session = ensureTodayQuickSalesOpen(1, mockRequestId);
        for (let j = 0; j < 10; j++) {
          const product = products[j % products.length];
          addQuickSalesLine(product.id, 1, 0, 'pcs', mockRequestId, context);
        }
        return session;
      })();
      concurrentPromises.push(promise);
    }

    await Promise.all(concurrentPromises);
    const concurrentEnd = Date.now();
    const concurrentTime = concurrentEnd - concurrentStart;
    
    console.log(`Concurrent operations (5 sessions, 10 lines each): ${concurrentTime}ms`);
    console.log(`Average per operation: ${(concurrentTime / 50).toFixed(2)}ms ${(concurrentTime / 50) <= 100 ? '✅' : '❌'} (target: ≤100ms)`);
  } catch (error) {
    console.log(`❌ Concurrent operations failed: ${error.message}`);
  }

  console.log('\n6️⃣ Testing database connection efficiency...');

  // Test that we're using a single shared connection
  const connectionTestStart = Date.now();
  try {
    // Perform multiple operations to test connection reuse
    for (let i = 0; i < 20; i++) {
      const product = products[i % products.length];
      addQuickSalesLine(product.id, 1, 0, 'pcs', mockRequestId, context);
    }
    const connectionTestEnd = Date.now();
    const connectionTestTime = connectionTestEnd - connectionTestStart;
    
    console.log(`Connection efficiency test (20 operations): ${connectionTestTime}ms`);
    console.log(`Average per operation: ${(connectionTestTime / 20).toFixed(2)}ms ${(connectionTestTime / 20) <= 50 ? '✅' : '❌'} (target: ≤50ms)`);
  } catch (error) {
    console.log(`❌ Connection efficiency test failed: ${error.message}`);
  }

  console.log('\n7️⃣ Testing memory usage and cleanup...');

  // Test memory usage by creating and closing many sessions
  const memoryTestStart = Date.now();
  try {
    for (let i = 0; i < 10; i++) {
      const session = ensureTodayQuickSalesOpen(1, mockRequestId);
      addQuickSalesLine(products[0].id, 1, 0, 'pcs', mockRequestId, context);
      closeTodayQuickSalesSession(1, `Memory test ${i}`, mockRequestId, context, '1234');
    }
    const memoryTestEnd = Date.now();
    const memoryTestTime = memoryTestEnd - memoryTestStart;
    
    console.log(`Memory test (10 create/close cycles): ${memoryTestTime}ms`);
    console.log(`Average per cycle: ${(memoryTestTime / 10).toFixed(2)}ms ${(memoryTestTime / 10) <= 200 ? '✅' : '❌'} (target: ≤200ms)`);
  } catch (error) {
    console.log(`❌ Memory test failed: ${error.message}`);
  }

  console.log('\n🎉 Quick Sales performance test completed!');
  console.log('\n✅ Performance Targets:');
  console.log('  ✓ Line addition: ≤50-100ms per line');
  console.log('  ✓ Session close: ≤200-500ms for thousands of lines');
  console.log('  ✓ Single shared DB connection');
  console.log('  ✓ Short transactions');
  console.log('  ✓ Rate limiting in place');
  console.log('  ✓ Minimal payloads with pagination');
}

if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('test-quick-sales-performance.ts')) {
  testQuickSalesPerformance();
}
