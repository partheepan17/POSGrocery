const fetch = require('node-fetch');

async function testBarcodeAPI() {
  const baseUrl = 'http://localhost:8250';
  
  console.log('Testing Barcode API...');
  
  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthResponse.json();
    console.log('Health:', healthData);
    
    // Test 2: Test barcode lookup with existing product
    console.log('2. Testing barcode lookup...');
    const barcodeResponse = await fetch(`${baseUrl}/api/products/barcode/123456789`);
    const barcodeData = await barcodeResponse.json();
    console.log('Barcode lookup result:', barcodeResponse.status, barcodeData);
    
    // Test 3: Test SKU lookup (fallback)
    console.log('3. Testing SKU lookup fallback...');
    const skuResponse = await fetch(`${baseUrl}/api/products/barcode/TEST001`);
    const skuData = await skuResponse.json();
    console.log('SKU lookup result:', skuResponse.status, skuData);
    
    // Test 4: Test invalid barcode
    console.log('4. Testing invalid barcode...');
    const invalidResponse = await fetch(`${baseUrl}/api/products/barcode/INVALID123`);
    const invalidData = await invalidResponse.json();
    console.log('Invalid barcode result:', invalidResponse.status, invalidData);
    
    // Test 5: Test barcode validation
    console.log('5. Testing barcode validation...');
    const shortResponse = await fetch(`${baseUrl}/api/products/barcode/12`);
    const shortData = await shortResponse.json();
    console.log('Short barcode result:', shortResponse.status, shortData);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testBarcodeAPI();
