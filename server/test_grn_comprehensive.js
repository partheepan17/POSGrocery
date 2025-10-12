const fetch = require('node-fetch');

const API_BASE = 'http://localhost:8250';

async function testGRNAPI() {
  console.log('🧪 Testing GRN API Comprehensive...\n');

  try {
    // Test 1: Happy path GRN creation
    console.log('1. Testing happy path GRN creation...');
    const happyResponse = await fetch(`${API_BASE}/api/purchasing/grn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplier_id: 1,
        grn_date: '2025-10-12',
        lines: [
          {
            product_id: 1,
            quantity_received: 5,
            cost_cents: 9000, // 90.00 in cents
            batch_number: 'BATCH001',
            expiry_date: '2026-10-12'
          },
          {
            product_id: 2,
            quantity_received: 3,
            cost_cents: 15000, // 150.00 in cents
            batch_number: 'BATCH002'
          }
        ],
        freight_cost: 50.00,
        duty_cost: 25.00,
        misc_cost: 10.00,
        notes: 'Test GRN for comprehensive testing'
      })
    });
    
    const happyData = await happyResponse.json();
    if (happyResponse.ok) {
      console.log(`✅ Status: ${happyResponse.status}`);
      console.log(`📦 Created GRN: ${happyData.grn.grn_number} (ID: ${happyData.grn.id})`);
      console.log(`📊 Total Quantity: ${happyData.grn.total_quantity}`);
      console.log(`💰 Total Value: ${happyData.grn.total_value}`);
      var grnId = happyData.grn.id;
    } else {
      console.log(`❌ Status: ${happyResponse.status}`);
      console.log(`Error:`, happyData);
      return;
    }

    // Test 2: Invalid supplier ID (expect 404)
    console.log('\n2. Testing invalid supplier ID...');
    const invalidSupplierResponse = await fetch(`${API_BASE}/api/purchasing/grn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplier_id: 99999,
        grn_date: '2025-10-12',
        lines: [{ product_id: 1, quantity_received: 1, cost_cents: 100 }]
      })
    });
    
    const invalidSupplierData = await invalidSupplierResponse.json();
    if (invalidSupplierResponse.status === 404) {
      console.log(`✅ Status: ${invalidSupplierResponse.status} (Expected not found)`);
      console.log(`📝 Message: ${invalidSupplierData.error || invalidSupplierData.message}`);
    } else {
      console.log(`❌ Status: ${invalidSupplierResponse.status} (Expected 404)`);
      console.log(`Data:`, invalidSupplierData);
    }

    // Test 3: Invalid product ID (expect 404)
    console.log('\n3. Testing invalid product ID...');
    const invalidProductResponse = await fetch(`${API_BASE}/api/purchasing/grn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplier_id: 1,
        grn_date: '2025-10-12',
        lines: [{ product_id: 99999, quantity_received: 1, cost_cents: 100 }]
      })
    });
    
    const invalidProductData = await invalidProductResponse.json();
    if (invalidProductResponse.status === 404) {
      console.log(`✅ Status: ${invalidProductResponse.status} (Expected not found)`);
      console.log(`📝 Message: ${invalidProductData.error || invalidProductData.message}`);
    } else {
      console.log(`❌ Status: ${invalidProductResponse.status} (Expected 404)`);
      console.log(`Data:`, invalidProductData);
    }

    // Test 4: Invalid quantity (expect 400)
    console.log('\n4. Testing invalid quantity...');
    const invalidQtyResponse = await fetch(`${API_BASE}/api/purchasing/grn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplier_id: 1,
        grn_date: '2025-10-12',
        lines: [{ product_id: 1, quantity_received: 0, cost_cents: 100 }]
      })
    });
    
    const invalidQtyData = await invalidQtyResponse.json();
    if (invalidQtyResponse.status === 400) {
      console.log(`✅ Status: ${invalidQtyResponse.status} (Expected validation error)`);
      console.log(`📝 Message: ${invalidQtyData.error || invalidQtyData.message}`);
    } else {
      console.log(`❌ Status: ${invalidQtyResponse.status} (Expected 400)`);
      console.log(`Data:`, invalidQtyData);
    }

    // Test 5: Invalid date format (expect 400)
    console.log('\n5. Testing invalid date format...');
    const invalidDateResponse = await fetch(`${API_BASE}/api/purchasing/grn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplier_id: 1,
        grn_date: '12-10-2025', // Wrong format
        lines: [{ product_id: 1, quantity_received: 1, cost_cents: 100 }]
      })
    });
    
    const invalidDateData = await invalidDateResponse.json();
    if (invalidDateResponse.status === 400) {
      console.log(`✅ Status: ${invalidDateResponse.status} (Expected validation error)`);
      console.log(`📝 Message: ${invalidDateData.error || invalidDateData.message}`);
    } else {
      console.log(`❌ Status: ${invalidDateResponse.status} (Expected 400)`);
      console.log(`Data:`, invalidDateData);
    }

    // Test 6: Missing required fields (expect 400)
    console.log('\n6. Testing missing required fields...');
    const missingFieldsResponse = await fetch(`${API_BASE}/api/purchasing/grn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplier_id: 1
        // Missing grn_date and lines
      })
    });
    
    const missingFieldsData = await missingFieldsResponse.json();
    if (missingFieldsResponse.status === 400) {
      console.log(`✅ Status: ${missingFieldsResponse.status} (Expected validation error)`);
      console.log(`📝 Message: ${missingFieldsData.error || missingFieldsData.message}`);
    } else {
      console.log(`❌ Status: ${missingFieldsResponse.status} (Expected 400)`);
      console.log(`Data:`, missingFieldsData);
    }

    // Test 7: List GRNs
    console.log('\n7. Testing GRN list...');
    const listResponse = await fetch(`${API_BASE}/api/purchasing/grn?page=1&pageSize=10`);
    const listData = await listResponse.json();
    
    if (listResponse.ok) {
      console.log(`✅ Status: ${listResponse.status}`);
      console.log(`📊 GRNs found: ${listData.grn?.length || listData.grns?.length || 0}`);
      console.log(`📄 Pagination:`, listData.pagination);
    } else {
      console.log(`❌ Status: ${listResponse.status}`);
      console.log(`Error:`, listData);
    }

    // Test 8: Get GRN details
    if (grnId) {
      console.log('\n8. Testing GRN details...');
      const detailsResponse = await fetch(`${API_BASE}/api/purchasing/grn/${grnId}`);
      const detailsData = await detailsResponse.json();
      
      if (detailsResponse.ok) {
        console.log(`✅ Status: ${detailsResponse.status}`);
        console.log(`📦 GRN: ${detailsData.grn.grn_number}`);
        console.log(`📊 Lines: ${detailsData.grn.lines?.length || 0}`);
        console.log(`💰 Total Value: ${detailsData.grn.total_value}`);
      } else {
        console.log(`❌ Status: ${detailsResponse.status}`);
        console.log(`Error:`, detailsData);
      }
    }

    // Test 9: Idempotency test
    console.log('\n9. Testing idempotency...');
    const idempotencyKey = `test-${Date.now()}`;
    
    const idempotentResponse1 = await fetch(`${API_BASE}/api/purchasing/grn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplier_id: 1,
        grn_date: '2025-10-12',
        lines: [{ product_id: 1, quantity_received: 1, cost_cents: 100 }],
        idempotency_key: idempotencyKey
      })
    });
    
    const idempotentData1 = await idempotentResponse1.json();
    console.log(`First request: ${idempotentResponse1.status} - ${idempotentData1.grn?.grn_number || 'Error'}`);
    
    const idempotentResponse2 = await fetch(`${API_BASE}/api/purchasing/grn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplier_id: 1,
        grn_date: '2025-10-12',
        lines: [{ product_id: 1, quantity_received: 1, cost_cents: 100 }],
        idempotency_key: idempotencyKey
      })
    });
    
    const idempotentData2 = await idempotentResponse2.json();
    console.log(`Second request: ${idempotentResponse2.status} - ${idempotentData2.grn?.grn_number || 'Error'}`);
    
    if (idempotentData1.grn?.id === idempotentData2.grn?.id) {
      console.log(`✅ Idempotency working: Same GRN ID returned`);
    } else {
      console.log(`❌ Idempotency failed: Different GRN IDs`);
    }

    console.log('\n🎉 GRN API testing completed!');

  } catch (error) {
    console.error('❌ GRN test failed:', error.message);
  }
}

// Run the tests
testGRNAPI();
