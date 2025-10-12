const fetch = require('node-fetch');

async function testBarcodeComprehensive() {
  const baseUrl = 'http://localhost:8250';
  
  console.log('🧪 Testing Barcode Search Comprehensive...\n');
  
  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health:', healthData.ok ? 'OK' : 'FAIL');
    
    // Test 2: Known barcode lookup
    console.log('\n2. Testing known barcode lookup...');
    const barcodeResponse = await fetch(`${baseUrl}/api/products/barcode/123456789`);
    const barcodeData = await barcodeResponse.json();
    console.log(`✅ Status: ${barcodeResponse.status}`);
    console.log(`📦 Product: ${barcodeData.product?.name_en || 'Not found'}`);
    console.log(`🏷️  SKU: ${barcodeData.product?.sku || 'N/A'}`);
    console.log(`💰 Price: ${barcodeData.product?.price_retail || 'N/A'}`);
    
    // Test 3: SKU fallback
    console.log('\n3. Testing SKU fallback...');
    const skuResponse = await fetch(`${baseUrl}/api/products/barcode/TEST001?fallback=sku`);
    const skuData = await skuResponse.json();
    console.log(`✅ Status: ${skuResponse.status}`);
    console.log(`📦 Product: ${skuData.product?.name_en || 'Not found'}`);
    console.log(`🔍 Lookup Type: ${skuData.product?.barcode === 'TEST001' ? 'barcode' : 'sku'}`);
    
    // Test 4: Invalid barcode (no fallback)
    console.log('\n4. Testing invalid barcode (no fallback)...');
    const invalidResponse = await fetch(`${baseUrl}/api/products/barcode/INVALID123`);
    const invalidData = await invalidResponse.json();
    console.log(`✅ Status: ${invalidResponse.status} (Expected 404)`);
    console.log(`❌ Error: ${invalidData.error || 'No error message'}`);
    
    // Test 5: Invalid barcode with fallback
    console.log('\n5. Testing invalid barcode with fallback...');
    const invalidFallbackResponse = await fetch(`${baseUrl}/api/products/barcode/INVALID123?fallback=sku`);
    const invalidFallbackData = await invalidFallbackResponse.json();
    console.log(`✅ Status: ${invalidFallbackResponse.status} (Expected 404)`);
    console.log(`❌ Error: ${invalidFallbackData.error || 'No error message'}`);
    
    // Test 6: Short barcode validation
    console.log('\n6. Testing short barcode validation...');
    const shortResponse = await fetch(`${baseUrl}/api/products/barcode/12`);
    const shortData = await shortResponse.json();
    console.log(`✅ Status: ${shortResponse.status} (Expected 400)`);
    console.log(`❌ Error: ${shortData.error || 'No error message'}`);
    
    // Test 7: Invalid characters validation
    console.log('\n7. Testing invalid characters validation...');
    const invalidCharResponse = await fetch(`${baseUrl}/api/products/barcode/123@456`);
    const invalidCharData = await invalidCharResponse.json();
    console.log(`✅ Status: ${invalidCharResponse.status} (Expected 400)`);
    console.log(`❌ Error: ${invalidCharData.error || 'No error message'}`);
    
    // Test 8: Empty barcode validation
    console.log('\n8. Testing empty barcode validation...');
    const emptyResponse = await fetch(`${baseUrl}/api/products/barcode/`);
    console.log(`✅ Status: ${emptyResponse.status} (Expected 404 - route not found)`);
    
    // Test 9: Performance test (multiple requests)
    console.log('\n9. Testing performance (5 concurrent requests)...');
    const startTime = Date.now();
    const promises = Array(5).fill().map(() => 
      fetch(`${baseUrl}/api/products/barcode/123456789`)
    );
    const responses = await Promise.all(promises);
    const endTime = Date.now();
    const allSuccessful = responses.every(r => r.status === 200);
    console.log(`✅ All successful: ${allSuccessful}`);
    console.log(`⏱️  Total time: ${endTime - startTime}ms`);
    console.log(`⚡ Average per request: ${(endTime - startTime) / 5}ms`);
    
    console.log('\n🎉 Barcode API comprehensive testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testBarcodeComprehensive();
