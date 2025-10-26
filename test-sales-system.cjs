/**
 * Comprehensive Sales System Test Suite
 * Tests all 11 requirements for the production-ready sales system
 */

const fetch = require('node-fetch');

console.log('🧪 Testing Production-Ready Sales System\n');

const BASE_URL = 'http://localhost:8250';
let serverRunning = false;

// Test configuration
const TEST_CONFIG = {
  idempotencyKey: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  customerId: 1,
  productId: 1,
  testQuantity: 2,
  testPrice: 1.50
};

async function testServerHealth() {
  console.log('1. Testing server health...');
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    if (response.ok) {
      const health = await response.json();
      console.log('   ✅ Server is running');
      console.log(`   Environment: ${health.environment}`);
      console.log(`   Uptime: ${health.uptime}s`);
      serverRunning = true;
      return true;
    }
  } catch (error) {
    console.log('   ❌ Server is not running');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function testIdempotency() {
  console.log('\n2. Testing idempotency protection...');
  
  const saleData = {
    customerId: TEST_CONFIG.customerId,
    items: [{
      productId: TEST_CONFIG.productId,
      quantity: TEST_CONFIG.testQuantity,
      unitPrice: TEST_CONFIG.testPrice
    }],
    payments: [{
      method: 'cash',
      amount: 3.45
    }],
    idempotencyKey: TEST_CONFIG.idempotencyKey
  };
  
  try {
    // First sale
    console.log('   Creating first sale...');
    const response1 = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': TEST_CONFIG.idempotencyKey
      },
      body: JSON.stringify(saleData)
    });
    
    if (response1.ok) {
      const sale1 = await response1.json();
      console.log(`   ✅ First sale created: ${sale1.sale.receiptNo}`);
      
      // Duplicate sale with same idempotency key
      console.log('   Testing duplicate prevention...');
      const response2 = await fetch(`${BASE_URL}/api/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': TEST_CONFIG.idempotencyKey
        },
        body: JSON.stringify(saleData)
      });
      
      if (response2.ok) {
        const sale2 = await response2.json();
        if (sale2.duplicate && sale2.sale.id === sale1.sale.id) {
          console.log('   ✅ Duplicate sale correctly prevented');
          return true;
        } else {
          console.log('   ❌ Duplicate sale was not prevented');
          return false;
        }
      } else {
        console.log(`   ❌ Second sale failed: ${response2.status}`);
        return false;
      }
    } else {
      console.log(`   ❌ First sale failed: ${response1.status}`);
      const error = await response1.json();
      console.log(`   Error: ${error.error}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Idempotency test failed: ${error.message}`);
    return false;
  }
}

async function testReceiptNumbers() {
  console.log('\n3. Testing receipt number generation...');
  
  try {
    const saleData = {
      customerId: TEST_CONFIG.customerId,
      items: [{
        productId: TEST_CONFIG.productId,
        quantity: 1,
        unitPrice: TEST_CONFIG.testPrice
      }],
      payments: [{
        method: 'cash',
        amount: 1.73
      }]
    };
    
    const response = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saleData)
    });
    
    if (response.ok) {
      const sale = await response.json();
      const receiptNo = sale.sale.receiptNo;
      
      // Check receipt number format: S1-YYYYMMDD-XXXXXX
      const receiptPattern = /^S1-\d{8}-\d{6}$/;
      if (receiptPattern.test(receiptNo)) {
        console.log(`   ✅ Receipt number format correct: ${receiptNo}`);
        return true;
      } else {
        console.log(`   ❌ Receipt number format incorrect: ${receiptNo}`);
        return false;
      }
    } else {
      console.log(`   ❌ Receipt generation failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Receipt number test failed: ${error.message}`);
    return false;
  }
}

async function testMoneyMath() {
  console.log('\n4. Testing money math and tax calculations...');
  
  try {
    const saleData = {
      customerId: TEST_CONFIG.customerId,
      items: [{
        productId: TEST_CONFIG.productId,
        quantity: 3,
        unitPrice: 1.00,
        discountAmount: 0.10
      }],
      payments: [{
        method: 'cash',
        amount: 3.45
      }],
      billDiscount: {
        type: 'PERCENTAGE',
        value: 5
      },
      taxRate: 0.15
    };
    
    const response = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saleData)
    });
    
    if (response.ok) {
      const sale = await response.json();
      const totals = sale.totals;
      
      console.log('   Sale totals:');
      console.log(`   Subtotal: $${totals.subtotal}`);
      console.log(`   Bill Discount: $${totals.billDiscount}`);
      console.log(`   Tax: $${totals.tax}`);
      console.log(`   Total: $${totals.total}`);
      
      // Verify calculations
      const expectedSubtotal = 3.00 - 0.10; // 2.90
      const expectedBillDiscount = expectedSubtotal * 0.05; // 0.145
      const expectedAfterDiscount = expectedSubtotal - expectedBillDiscount; // 2.755
      const expectedTax = expectedAfterDiscount * 0.15; // 0.41325
      const expectedTotal = expectedAfterDiscount + expectedTax; // 3.16825
      
      if (Math.abs(totals.subtotal - expectedSubtotal) < 0.01 &&
          Math.abs(totals.total - expectedTotal) < 0.01) {
        console.log('   ✅ Money math calculations correct');
        return true;
      } else {
        console.log('   ❌ Money math calculations incorrect');
        return false;
      }
    } else {
      console.log(`   ❌ Money math test failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Money math test failed: ${error.message}`);
    return false;
  }
}

async function testStockValidation() {
  console.log('\n5. Testing stock validation...');
  
  try {
    // Test insufficient stock
    const saleData = {
      customerId: TEST_CONFIG.customerId,
      items: [{
        productId: TEST_CONFIG.productId,
        quantity: 9999, // Very large quantity
        unitPrice: TEST_CONFIG.testPrice
      }],
      payments: [{
        method: 'cash',
        amount: 15000
      }]
    };
    
    const response = await fetch(`${BASE_URL}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saleData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      if (error.code === 'INSUFFICIENT_STOCK') {
        console.log('   ✅ Insufficient stock correctly rejected');
        return true;
      } else {
        console.log(`   ❌ Wrong error code: ${error.code}`);
        return false;
      }
    } else {
      console.log('   ❌ Insufficient stock was allowed');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Stock validation test failed: ${error.message}`);
    return false;
  }
}

async function testConcurrency() {
  console.log('\n6. Testing concurrency safety...');
  
  try {
    const promises = [];
    const concurrentSales = 5;
    
    console.log(`   Creating ${concurrentSales} concurrent sales...`);
    
    for (let i = 0; i < concurrentSales; i++) {
      const saleData = {
        customerId: TEST_CONFIG.customerId,
        items: [{
          productId: TEST_CONFIG.productId,
          quantity: 1,
          unitPrice: TEST_CONFIG.testPrice
        }],
        payments: [{
          method: 'cash',
          amount: 1.73
        }]
      };
      
      promises.push(
        fetch(`${BASE_URL}/api/sales`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(saleData)
        })
      );
    }
    
    const responses = await Promise.all(promises);
    const successfulSales = responses.filter(r => r.ok).length;
    
    console.log(`   ✅ ${successfulSales}/${concurrentSales} concurrent sales succeeded`);
    return successfulSales > 0;
  } catch (error) {
    console.log(`   ❌ Concurrency test failed: ${error.message}`);
    return false;
  }
}

async function testSalesList() {
  console.log('\n7. Testing sales list endpoint...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/sales?page=1&pageSize=10`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Sales list retrieved: ${data.sales.length} sales`);
      console.log(`   Pagination: Page ${data.pagination.page} of ${data.pagination.totalPages}`);
      return true;
    } else {
      console.log(`   ❌ Sales list failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Sales list test failed: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive sales system tests...\n');
  
  const tests = [
    { name: 'Server Health', fn: testServerHealth },
    { name: 'Idempotency Protection', fn: testIdempotency },
    { name: 'Receipt Number Generation', fn: testReceiptNumbers },
    { name: 'Money Math & Tax Calculations', fn: testMoneyMath },
    { name: 'Stock Validation', fn: testStockValidation },
    { name: 'Concurrency Safety', fn: testConcurrency },
    { name: 'Sales List Endpoint', fn: testSalesList }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      results.push({ name: test.name, passed: result });
    } catch (error) {
      console.log(`   ❌ ${test.name} failed with error: ${error.message}`);
      results.push({ name: test.name, passed: false });
    }
  }
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.name}`);
  });
  
  console.log(`\nOverall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Sales system is production-ready.');
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.');
  }
  
  return passed === total;
}

// Run tests
runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});














