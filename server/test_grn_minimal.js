const fetch = require('node-fetch');

async function testGRNMinimal() {
  const baseUrl = 'http://localhost:8250';
  
  console.log('Testing minimal GRN API...');
  
  try {
    // Test with minimal payload
    const grnPayload = {
      supplier_id: 1,
      lines: [
        {
          product_id: 1,
          quantity_received: 1,
          unit_cost: 1.00
        }
      ]
    };
    
    console.log('Sending GRN payload:', JSON.stringify(grnPayload, null, 2));
    
    const response = await fetch(`${baseUrl}/api/purchasing/grn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(grnPayload)
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✓ GRN Created:', data.grn?.grn_number);
    } else {
      console.log('✗ GRN Creation Failed');
    }
    
  } catch (error) {
    console.log('✗ Error:', error.message);
  }
}

testGRNMinimal();
