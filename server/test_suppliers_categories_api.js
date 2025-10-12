const fetch = require('node-fetch');

const API_BASE = 'http://localhost:8250';

async function testSuppliersAPI() {
  console.log('🧪 Testing Suppliers API...\n');

  try {
    // Test 1: Create supplier
    console.log('1. Testing supplier creation...');
    const createResponse = await fetch(`${API_BASE}/api/suppliers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplier_name: 'Acme Traders',
        contact_phone: '0771234567',
        contact_email: 'contact@acme.com',
        address: '123 Main St, Colombo',
        tax_id: 'TAX123456',
        active: true
      })
    });
    
    const createData = await createResponse.json();
    if (createResponse.ok) {
      console.log(`✅ Status: ${createResponse.status}`);
      console.log(`📦 Created supplier: ${createData.supplier.supplier_name} (ID: ${createData.supplier.id})`);
      var supplierId = createData.supplier.id;
    } else {
      console.log(`❌ Status: ${createResponse.status}`);
      console.log(`Error:`, createData);
      return;
    }

    // Test 2: Duplicate supplier (expect 409)
    console.log('\n2. Testing duplicate supplier creation...');
    const duplicateResponse = await fetch(`${API_BASE}/api/suppliers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplier_name: 'acme traders', // Case insensitive duplicate
        contact_phone: '0779999999'
      })
    });
    
    const duplicateData = await duplicateResponse.json();
    if (duplicateResponse.status === 409) {
      console.log(`✅ Status: ${duplicateResponse.status} (Expected conflict)`);
      console.log(`📝 Message: ${duplicateData.message}`);
    } else {
      console.log(`❌ Status: ${duplicateResponse.status} (Expected 409)`);
      console.log(`Data:`, duplicateData);
    }

    // Test 3: List suppliers with pagination
    console.log('\n3. Testing suppliers list with pagination...');
    const listResponse = await fetch(`${API_BASE}/api/suppliers?page=1&pageSize=10&search=acme&status=active`);
    const listData = await listResponse.json();
    
    if (listResponse.ok) {
      console.log(`✅ Status: ${listResponse.status}`);
      console.log(`📊 Suppliers found: ${listData.suppliers.length}`);
      console.log(`📄 Pagination:`, listData.meta);
    } else {
      console.log(`❌ Status: ${listResponse.status}`);
      console.log(`Error:`, listData);
    }

    // Test 4: Update supplier
    console.log('\n4. Testing supplier update...');
    const updateResponse = await fetch(`${API_BASE}/api/suppliers/${supplierId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact_phone: '+94 77 000 0000',
        address: '456 Updated St, Colombo'
      })
    });
    
    const updateData = await updateResponse.json();
    if (updateResponse.ok) {
      console.log(`✅ Status: ${updateResponse.status}`);
      console.log(`📦 Updated supplier: ${updateData.supplier.supplier_name}`);
      console.log(`📞 New phone: ${updateData.supplier.contact_phone}`);
    } else {
      console.log(`❌ Status: ${updateResponse.status}`);
      console.log(`Error:`, updateData);
    }

    // Test 5: Supplier options (lightweight)
    console.log('\n5. Testing supplier options endpoint...');
    const optionsResponse = await fetch(`${API_BASE}/api/suppliers/options?search=acme`);
    const optionsData = await optionsResponse.json();
    
    if (optionsResponse.ok) {
      console.log(`✅ Status: ${optionsResponse.status}`);
      console.log(`📋 Options found: ${optionsData.suppliers.length}`);
      console.log(`📝 First option:`, optionsData.suppliers[0]);
    } else {
      console.log(`❌ Status: ${optionsResponse.status}`);
      console.log(`Error:`, optionsData);
    }

    // Test 6: Soft delete supplier
    console.log('\n6. Testing supplier soft delete...');
    const deleteResponse = await fetch(`${API_BASE}/api/suppliers/${supplierId}`, {
      method: 'DELETE'
    });
    
    const deleteData = await deleteResponse.json();
    if (deleteResponse.ok) {
      console.log(`✅ Status: ${deleteResponse.status}`);
      console.log(`🗑️ Delete result: ${deleteData.message}`);
      console.log(`🔄 Soft deleted: ${deleteData.softDeleted}`);
    } else {
      console.log(`❌ Status: ${deleteResponse.status}`);
      console.log(`Error:`, deleteData);
    }

    console.log('\n🎉 Suppliers API testing completed!');

  } catch (error) {
    console.error('❌ Suppliers test failed:', error.message);
  }
}

async function testCategoriesAPI() {
  console.log('\n🧪 Testing Categories API...\n');

  try {
    // Test 1: Create category
    console.log('1. Testing category creation...');
    const createResponse = await fetch(`${API_BASE}/api/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Beverages'
      })
    });
    
    const createData = await createResponse.json();
    if (createResponse.ok) {
      console.log(`✅ Status: ${createResponse.status}`);
      console.log(`📦 Created category: ${createData.category.name} (ID: ${createData.category.id})`);
      var categoryId = createData.category.id;
    } else {
      console.log(`❌ Status: ${createResponse.status}`);
      console.log(`Error:`, createData);
      return;
    }

    // Test 2: Duplicate category (expect 409)
    console.log('\n2. Testing duplicate category creation...');
    const duplicateResponse = await fetch(`${API_BASE}/api/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'beverages' // Case insensitive duplicate
      })
    });
    
    const duplicateData = await duplicateResponse.json();
    if (duplicateResponse.status === 409) {
      console.log(`✅ Status: ${duplicateResponse.status} (Expected conflict)`);
      console.log(`📝 Message: ${duplicateData.message}`);
    } else {
      console.log(`❌ Status: ${duplicateResponse.status} (Expected 409)`);
      console.log(`Data:`, duplicateData);
    }

    // Test 3: List categories with pagination
    console.log('\n3. Testing categories list with pagination...');
    const listResponse = await fetch(`${API_BASE}/api/categories?page=1&pageSize=10&search=bev&status=active`);
    const listData = await listResponse.json();
    
    if (listResponse.ok) {
      console.log(`✅ Status: ${listResponse.status}`);
      console.log(`📊 Categories found: ${listData.categories.length}`);
      console.log(`📄 Pagination:`, listData.meta);
    } else {
      console.log(`❌ Status: ${listResponse.status}`);
      console.log(`Error:`, listData);
    }

    // Test 4: Update category
    console.log('\n4. Testing category update...');
    const updateResponse = await fetch(`${API_BASE}/api/categories/${categoryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Beverages & Drinks',
        is_active: true
      })
    });
    
    const updateData = await updateResponse.json();
    if (updateResponse.ok) {
      console.log(`✅ Status: ${updateResponse.status}`);
      console.log(`📦 Updated category: ${updateData.category.name}`);
    } else {
      console.log(`❌ Status: ${updateResponse.status}`);
      console.log(`Error:`, updateData);
    }

    // Test 5: Category options (lightweight)
    console.log('\n5. Testing category options endpoint...');
    const optionsResponse = await fetch(`${API_BASE}/api/categories/options?search=bev`);
    const optionsData = await optionsResponse.json();
    
    if (optionsResponse.ok) {
      console.log(`✅ Status: ${optionsResponse.status}`);
      console.log(`📋 Options found: ${optionsData.categories.length}`);
      console.log(`📝 First option:`, optionsData.categories[0]);
    } else {
      console.log(`❌ Status: ${optionsResponse.status}`);
      console.log(`Error:`, optionsData);
    }

    // Test 6: Soft delete category
    console.log('\n6. Testing category soft delete...');
    const deleteResponse = await fetch(`${API_BASE}/api/categories/${categoryId}`, {
      method: 'DELETE'
    });
    
    const deleteData = await deleteResponse.json();
    if (deleteResponse.ok) {
      console.log(`✅ Status: ${deleteResponse.status}`);
      console.log(`🗑️ Delete result: ${deleteData.message}`);
      console.log(`🔄 Soft deleted: ${deleteData.softDeleted}`);
    } else {
      console.log(`❌ Status: ${deleteResponse.status}`);
      console.log(`Error:`, deleteData);
    }

    console.log('\n🎉 Categories API testing completed!');

  } catch (error) {
    console.error('❌ Categories test failed:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Suppliers & Categories API Tests...\n');
  
  await testSuppliersAPI();
  await testCategoriesAPI();
  
  console.log('\n✨ All tests completed!');
}

// Run the tests
runAllTests();
