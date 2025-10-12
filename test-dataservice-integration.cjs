// Test dataService integration with new error responses
const fetch = require('node-fetch');

console.log('🧪 Testing dataService Integration\n');

async function testDataServiceIntegration() {
  const baseUrl = 'http://localhost:8250';
  
  try {
    // Test 1: Valid sale
    console.log('1. Testing valid sale through dataService...');
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
    
    // Test 2: Simulate dataService error handling
    console.log('\n2. Testing dataService error handling...');
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
      console.log('   ✅ Error response received');
      console.log('   Status:', insufficientStock.status);
      console.log('   Error code:', error.code);
      console.log('   Error message:', error.error);
      
      // Simulate dataService error handling
      let errorMessage;
      if (insufficientStock.status === 409 && error.code === 'INSUFFICIENT_STOCK') {
        errorMessage = `Insufficient stock: ${error.error}`;
      } else if (insufficientStock.status === 404 && error.code === 'PRODUCT_NOT_FOUND') {
        errorMessage = `Product not found: ${error.error}`;
      } else if (insufficientStock.status === 400 && error.code === 'PAYMENT_MISMATCH') {
        errorMessage = `Payment mismatch: ${error.error}`;
      } else {
        errorMessage = error.error || 'Failed to create invoice';
      }
      
      console.log('   Processed error message:', errorMessage);
    }
    
    console.log('\n🏁 dataService Integration Test Complete');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDataServiceIntegration();
