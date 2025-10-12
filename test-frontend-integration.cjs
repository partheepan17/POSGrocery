const fetch = require('node-fetch');

console.log('🧪 Testing Frontend Integration with Sales Checkout\n');

async function testFrontendIntegration() {
  const baseUrl = 'http://localhost:8250';
  
  try {
    // Test 1: Valid sale
    console.log('1. Testing valid sale...');
    const validSale = await fetch(`${baseUrl}/api/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: 1,
        items: [{ productId: 1, quantity: 1 }],
        payments: [{ method: 'cash', amount: 0.17 }]
      })
    });
    
    if (validSale.ok) {
      const result = await validSale.json();
      console.log('   ✅ Valid sale succeeded:', result.invoice.id);
    } else {
      const error = await validSale.json();
      console.log('   ❌ Valid sale failed:', error.message);
    }
    
    // Test 2: Insufficient stock
    console.log('\n2. Testing insufficient stock...');
    const insufficientStock = await fetch(`${baseUrl}/api/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: 1,
        items: [{ productId: 1, quantity: 100 }],
        payments: [{ method: 'cash', amount: 17.25 }]
      })
    });
    
    if (!insufficientStock.ok) {
      const error = await insufficientStock.json();
      console.log('   ✅ Insufficient stock correctly rejected');
      console.log('   Error code:', error.code);
      console.log('   Error message:', error.message);
      console.log('   Error details:', error.details);
    } else {
      console.log('   ❌ Insufficient stock was allowed');
    }
    
    // Test 3: Non-existent product
    console.log('\n3. Testing non-existent product...');
    const nonExistentProduct = await fetch(`${baseUrl}/api/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: 1,
        items: [{ productId: 999, quantity: 1 }],
        payments: [{ method: 'cash', amount: 1.00 }]
      })
    });
    
    if (!nonExistentProduct.ok) {
      const error = await nonExistentProduct.json();
      console.log('   ✅ Non-existent product correctly rejected');
      console.log('   Error code:', error.code);
      console.log('   Error message:', error.message);
    } else {
      console.log('   ❌ Non-existent product was allowed');
    }
    
    // Test 4: Invalid payment amount
    console.log('\n4. Testing invalid payment amount...');
    const invalidPayment = await fetch(`${baseUrl}/api/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: 1,
        items: [{ productId: 1, quantity: 1 }],
        payments: [{ method: 'cash', amount: 999.00 }]
      })
    });
    
    if (!invalidPayment.ok) {
      const error = await invalidPayment.json();
      console.log('   ✅ Invalid payment correctly rejected');
      console.log('   Error code:', error.code);
      console.log('   Error message:', error.message);
    } else {
      console.log('   ❌ Invalid payment was allowed');
    }
    
    // Test 5: Empty items array
    console.log('\n5. Testing empty items array...');
    const emptyItems = await fetch(`${baseUrl}/api/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: 1,
        items: [],
        payments: [{ method: 'cash', amount: 1.00 }]
      })
    });
    
    if (!emptyItems.ok) {
      const error = await emptyItems.json();
      console.log('   ✅ Empty items correctly rejected');
      console.log('   Error code:', error.code);
      console.log('   Error message:', error.message);
    } else {
      console.log('   ❌ Empty items was allowed');
    }
    
    console.log('\n🏁 Frontend Integration Test Complete');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFrontendIntegration();
