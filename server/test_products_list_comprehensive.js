const fetch = require('node-fetch');

async function testProductsListComprehensive() {
  const baseUrl = 'http://localhost:8250';
  
  console.log('🧪 Testing Products List Comprehensive...\n');
  
  try {
    // Test 1: Basic page 1
    console.log('1. Testing basic page 1...');
    const basicResponse = await fetch(`${baseUrl}/api/products?page=1&pageSize=20`);
    const basicData = await basicResponse.json();
    console.log(`✅ Status: ${basicResponse.status}`);
    console.log(`📦 Products: ${basicData.products?.length || 0}`);
    console.log(`📊 Meta: page=${basicData.meta?.page}, total=${basicData.meta?.total}, pages=${basicData.meta?.pages}`);
    
    // Test 2: Search by name/SKU/barcode
    console.log('\n2. Testing search functionality...');
    const searchResponse = await fetch(`${baseUrl}/api/products?search=test&page=1&pageSize=10`);
    const searchData = await searchResponse.json();
    console.log(`✅ Status: ${searchResponse.status}`);
    console.log(`🔍 Search results: ${searchData.products?.length || 0} products found`);
    console.log(`📊 Total matching: ${searchData.meta?.total || 0}`);
    
    // Test 3: Category filter + inactive
    console.log('\n3. Testing category and status filters...');
    const filterResponse = await fetch(`${baseUrl}/api/products?category_id=1&status=inactive&page=1&pageSize=10`);
    const filterData = await filterResponse.json();
    console.log(`✅ Status: ${filterResponse.status}`);
    console.log(`📊 Filtered results: ${filterData.products?.length || 0} products`);
    console.log(`📊 Total matching filters: ${filterData.meta?.total || 0}`);
    
    // Test 4: Sort by name asc
    console.log('\n4. Testing sort by name ascending...');
    const sortResponse = await fetch(`${baseUrl}/api/products?sortBy=name_en&sortOrder=asc&page=1&pageSize=10`);
    const sortData = await sortResponse.json();
    console.log(`✅ Status: ${sortResponse.status}`);
    console.log(`📊 Sorted results: ${sortData.products?.length || 0} products`);
    if (sortData.products?.length > 0) {
      console.log(`📝 First product: ${sortData.products[0].name_en}`);
    }
    
    // Test 5: Sort by created_at desc
    console.log('\n5. Testing sort by created_at descending...');
    const sortDateResponse = await fetch(`${baseUrl}/api/products?sortBy=created_at&sortOrder=desc&page=1&pageSize=10`);
    const sortDateData = await sortDateResponse.json();
    console.log(`✅ Status: ${sortDateResponse.status}`);
    console.log(`📊 Sorted by date: ${sortDateData.products?.length || 0} products`);
    if (sortDateData.products?.length > 0) {
      console.log(`📅 First product created: ${sortDateData.products[0].created_at}`);
    }
    
    // Test 6: No results case
    console.log('\n6. Testing no results case...');
    const noResultsResponse = await fetch(`${baseUrl}/api/products?search=__nope__&page=1&pageSize=10`);
    const noResultsData = await noResultsResponse.json();
    console.log(`✅ Status: ${noResultsResponse.status}`);
    console.log(`📊 No results: ${noResultsData.products?.length || 0} products`);
    console.log(`📊 Total: ${noResultsData.meta?.total || 0}`);
    
    // Test 7: Invalid pageSize validation
    console.log('\n7. Testing invalid pageSize validation...');
    const invalidPageSizeResponse = await fetch(`${baseUrl}/api/products?pageSize=15`);
    console.log(`✅ Status: ${invalidPageSizeResponse.status} (Expected 400)`);
    if (invalidPageSizeResponse.status === 400) {
      const errorData = await invalidPageSizeResponse.json();
      console.log(`❌ Error: ${errorData.message}`);
    }
    
    // Test 8: Invalid sortBy validation
    console.log('\n8. Testing invalid sortBy validation...');
    const invalidSortResponse = await fetch(`${baseUrl}/api/products?sortBy=invalid_field`);
    console.log(`✅ Status: ${invalidSortResponse.status} (Expected 400)`);
    if (invalidSortResponse.status === 400) {
      const errorData = await invalidSortResponse.json();
      console.log(`❌ Error: ${errorData.message}`);
    }
    
    // Test 9: Invalid status validation
    console.log('\n9. Testing invalid status validation...');
    const invalidStatusResponse = await fetch(`${baseUrl}/api/products?status=invalid_status`);
    console.log(`✅ Status: ${invalidStatusResponse.status} (Expected 400)`);
    if (invalidStatusResponse.status === 400) {
      const errorData = await invalidStatusResponse.json();
      console.log(`❌ Error: ${errorData.message}`);
    }
    
    // Test 10: Performance test (multiple requests)
    console.log('\n10. Testing performance (5 concurrent requests)...');
    const startTime = Date.now();
    const promises = Array(5).fill().map(() => 
      fetch(`${baseUrl}/api/products?page=1&pageSize=20`)
    );
    const responses = await Promise.all(promises);
    const endTime = Date.now();
    const allSuccessful = responses.every(r => r.status === 200);
    console.log(`✅ All successful: ${allSuccessful}`);
    console.log(`⏱️  Total time: ${endTime - startTime}ms`);
    console.log(`⚡ Average per request: ${(endTime - startTime) / 5}ms`);
    
    // Test 11: Pagination test
    console.log('\n11. Testing pagination...');
    const page1Response = await fetch(`${baseUrl}/api/products?page=1&pageSize=2`);
    const page1Data = await page1Response.json();
    console.log(`✅ Page 1: ${page1Data.products?.length || 0} products, hasNext: ${page1Data.meta?.hasNext}`);
    
    if (page1Data.meta?.hasNext) {
      const page2Response = await fetch(`${baseUrl}/api/products?page=2&pageSize=2`);
      const page2Data = await page2Response.json();
      console.log(`✅ Page 2: ${page2Data.products?.length || 0} products, hasPrev: ${page2Data.meta?.hasPrev}`);
    }
    
    console.log('\n🎉 Products List API comprehensive testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testProductsListComprehensive();
