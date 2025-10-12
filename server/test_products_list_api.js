const fetch = require('node-fetch');

const API_BASE = 'http://localhost:8250';

async function testProductsListAPI() {
  console.log('Testing Products List API...\n');

  try {
    // Test 1: Basic products list with pagination
    console.log('1. Testing basic products list with pagination...');
    const response1 = await fetch(`${API_BASE}/api/products?page=1&pageSize=10`);
    const data1 = await response1.json();
    
    if (response1.ok) {
      console.log(`✅ Status: ${response1.status}`);
      console.log(`📊 Products returned: ${data1.products?.length || 0}`);
      console.log(`📄 Pagination:`, data1.pagination);
      console.log(`🔢 Total: ${data1.total || 0}`);
    } else {
      console.log(`❌ Status: ${response1.status}`);
      console.log(`Error:`, data1);
    }

    // Test 2: Search functionality
    console.log('\n2. Testing search functionality...');
    const response2 = await fetch(`${API_BASE}/api/products?search=test&page=1&pageSize=5`);
    const data2 = await response2.json();
    
    if (response2.ok) {
      console.log(`✅ Status: ${response2.status}`);
      console.log(`🔍 Search results: ${data2.products?.length || 0} products found`);
      console.log(`📄 Pagination:`, data2.pagination);
    } else {
      console.log(`❌ Status: ${response2.status}`);
      console.log(`Error:`, data2);
    }

    // Test 3: Sorting functionality
    console.log('\n3. Testing sorting functionality...');
    const response3 = await fetch(`${API_BASE}/api/products?sortBy=name_en&sortOrder=desc&page=1&pageSize=5`);
    const data3 = await response3.json();
    
    if (response3.ok) {
      console.log(`✅ Status: ${response3.status}`);
      console.log(`📊 Sorted products: ${data3.products?.length || 0}`);
      console.log(`🔤 First product name: ${data3.products?.[0]?.name_en || 'N/A'}`);
    } else {
      console.log(`❌ Status: ${response3.status}`);
      console.log(`Error:`, data3);
    }

    // Test 4: Category filtering
    console.log('\n4. Testing category filtering...');
    const response4 = await fetch(`${API_BASE}/api/products?category_id=1&page=1&pageSize=5`);
    const data4 = await response4.json();
    
    if (response4.ok) {
      console.log(`✅ Status: ${response4.status}`);
      console.log(`📊 Category filtered products: ${data4.products?.length || 0}`);
    } else {
      console.log(`❌ Status: ${response4.status}`);
      console.log(`Error:`, data4);
    }

    // Test 5: Scale items filter
    console.log('\n5. Testing scale items filter...');
    const response5 = await fetch(`${API_BASE}/api/products?scale_items_only=true&page=1&pageSize=5`);
    const data5 = await response5.json();
    
    if (response5.ok) {
      console.log(`✅ Status: ${response5.status}`);
      console.log(`📊 Scale items: ${data5.products?.length || 0}`);
    } else {
      console.log(`❌ Status: ${response5.status}`);
      console.log(`Error:`, data5);
    }

    // Test 6: Active status filter
    console.log('\n6. Testing active status filter...');
    const response6 = await fetch(`${API_BASE}/api/products?status=active&page=1&pageSize=5`);
    const data6 = await response6.json();
    
    if (response6.ok) {
      console.log(`✅ Status: ${response6.status}`);
      console.log(`📊 Active products: ${data6.products?.length || 0}`);
    } else {
      console.log(`❌ Status: ${response6.status}`);
      console.log(`Error:`, data6);
    }

    // Test 7: Large page size
    console.log('\n7. Testing large page size...');
    const response7 = await fetch(`${API_BASE}/api/products?page=1&pageSize=100`);
    const data7 = await response7.json();
    
    if (response7.ok) {
      console.log(`✅ Status: ${response7.status}`);
      console.log(`📊 Large page results: ${data7.products?.length || 0}`);
      console.log(`📄 Pagination:`, data7.pagination);
    } else {
      console.log(`❌ Status: ${response7.status}`);
      console.log(`Error:`, data7);
    }

    // Test 8: Invalid page number
    console.log('\n8. Testing invalid page number...');
    const response8 = await fetch(`${API_BASE}/api/products?page=999&pageSize=10`);
    const data8 = await response8.json();
    
    if (response8.ok) {
      console.log(`✅ Status: ${response8.status}`);
      console.log(`📊 Invalid page results: ${data8.products?.length || 0} (should be 0)`);
    } else {
      console.log(`❌ Status: ${response8.status}`);
      console.log(`Error:`, data8);
    }

    console.log('\n🎉 Products List API testing completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testProductsListAPI();
