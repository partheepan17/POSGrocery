const fetch = require('node-fetch');

async function testSimple() {
  const baseUrl = 'http://localhost:8250';
  
  console.log('Testing simple API...');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthResponse.json();
    console.log('Health:', healthData.ok ? 'OK' : 'FAIL');
    
    // Test suppliers endpoint
    console.log('2. Testing suppliers endpoint...');
    const suppliersResponse = await fetch(`${baseUrl}/api/suppliers`);
    const suppliersData = await suppliersResponse.json();
    console.log('Suppliers response:', suppliersData.ok ? 'OK' : 'FAIL');
    console.log('Suppliers count:', suppliersData.suppliers?.length || 0);
    
    // Test products endpoint
    console.log('3. Testing products endpoint...');
    const productsResponse = await fetch(`${baseUrl}/api/products`);
    const productsData = await productsResponse.json();
    console.log('Products response:', productsData.ok ? 'OK' : 'FAIL');
    console.log('Products count:', productsData.products?.length || 0);
    
  } catch (error) {
    console.log('✗ Error:', error.message);
  }
}

testSimple();
