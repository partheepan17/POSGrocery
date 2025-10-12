const fetch = require('node-fetch');

async function testGRN() {
  const baseUrl = 'http://localhost:8250';
  
  console.log('Testing GRN API...');
  
  try {
    // First, let's check if we have the required data
    console.log('1. Checking suppliers...');
    const suppliersResponse = await fetch(`${baseUrl}/api/suppliers`);
    const suppliersData = await suppliersResponse.json();
    console.log('Suppliers:', suppliersData.suppliers?.length || 0);
    
    console.log('2. Checking products...');
    const productsResponse = await fetch(`${baseUrl}/api/products`);
    const productsData = await productsResponse.json();
    console.log('Products:', productsData.products?.length || 0);
    
    // If no data, create some test data
    if (!suppliersData.suppliers || suppliersData.suppliers.length === 0) {
      console.log('3. Creating test supplier...');
      const supplierResponse = await fetch(`${baseUrl}/api/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_name: 'Test Supplier',
          contact_person: 'John Doe',
          email: 'john@test.com',
          phone: '1234567890',
          address: '123 Test St',
          active: true
        })
      });
      
      if (supplierResponse.ok) {
        const supplierData = await supplierResponse.json();
        console.log('✓ Test supplier created:', supplierData.supplier.id);
      } else {
        console.log('✗ Failed to create supplier');
        return;
      }
    }
    
    if (!productsData.products || productsData.products.length === 0) {
      console.log('4. Creating test product...');
      const productResponse = await fetch(`${baseUrl}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name_en: 'Test Product',
          sku: 'TEST001',
          barcode: '123456789',
          price_retail: 10.50,
          unit: 'pcs',
          is_active: true
        })
      });
      
      if (productResponse.ok) {
        const productData = await productResponse.json();
        console.log('✓ Test product created:', productData.product.id);
      } else {
        console.log('✗ Failed to create product');
        return;
      }
    }
    
    // Now test GRN creation
    console.log('5. Testing GRN creation...');
    const grnPayload = {
      supplier_id: 1,
      lines: [
        {
          product_id: 1,
          quantity_received: 5,
          unit_cost: 10.50
        }
      ],
      notes: 'Test GRN'
    };
    
    const response = await fetch(`${baseUrl}/api/purchasing/grn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(grnPayload)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✓ GRN Created:', data.grn.grn_number);
    } else {
      const error = await response.text();
      console.log('✗ GRN Creation Failed:', error);
    }
    
  } catch (error) {
    console.log('✗ Connection Error:', error.message);
  }
}

testGRN();
