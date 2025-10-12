const Database = require('better-sqlite3');
const fetch = require('node-fetch');

console.log('🧪 Testing Stock Frontend Integration\n');

const db = new Database('data/pos.db');

async function testStockAPI() {
  console.log('1️⃣ Testing Stock API Endpoints...\n');

  try {
    // Test 1: Stock SOH endpoint
    console.log('📊 Testing GET /api/stock/soh...');
    const sohResponse = await fetch('http://localhost:8250/api/stock/soh?page=1&pageSize=10&method=average');
    const sohData = await sohResponse.json();
    
    if (sohResponse.ok) {
      console.log('✅ Stock SOH endpoint working');
      console.log(`   Found ${sohData.items?.length || 0} products`);
      console.log(`   Total: ${sohData.meta?.total || 0} products`);
      console.log(`   Page: ${sohData.meta?.page || 1} of ${sohData.meta?.pages || 1}`);
      
      // Show sample data
      if (sohData.items && sohData.items.length > 0) {
        const sample = sohData.items[0];
        console.log(`   Sample: ${sample.sku} - ${sample.name_en} (${sample.qty_on_hand} ${sample.unit})`);
      }
    } else {
      console.log('❌ Stock SOH endpoint failed:', sohData.message);
      return false;
    }

    // Test 2: Stock valuation endpoint
    console.log('\n💰 Testing GET /api/stock/valuation...');
    const valuationResponse = await fetch('http://localhost:8250/api/stock/valuation?method=average');
    const valuationData = await valuationResponse.json();
    
    if (valuationResponse.ok) {
      console.log('✅ Stock valuation endpoint working');
      console.log(`   Total value: ${valuationData.total_value_cents || 0} cents`);
      console.log(`   Products valued: ${valuationData.total_products || 0}`);
      console.log(`   Unknown cost: ${valuationData.products_with_unknown_cost || 0}`);
    } else {
      console.log('❌ Stock valuation endpoint failed:', valuationData.message);
      return false;
    }

    // Test 3: Product movements endpoint (if we have products)
    if (sohData.items && sohData.items.length > 0) {
      const productId = sohData.items[0].product_id;
      console.log(`\n📈 Testing GET /api/stock/${productId}/movements...`);
      
      const movementsResponse = await fetch(`http://localhost:8250/api/stock/${productId}/movements?limit=10`);
      const movementsData = await movementsResponse.json();
      
      if (movementsResponse.ok) {
        console.log('✅ Product movements endpoint working');
        console.log(`   Found ${movementsData.movements?.length || 0} movements`);
        console.log(`   Product: ${movementsData.product?.sku} - ${movementsData.product?.name_en}`);
      } else {
        console.log('❌ Product movements endpoint failed:', movementsData.message);
        return false;
      }
    }

    return true;

  } catch (error) {
    console.log('❌ API test failed:', error.message);
    return false;
  }
}

async function testDatabaseConsistency() {
  console.log('\n2️⃣ Testing Database Consistency...\n');

  try {
    // Test 1: Check stock ledger data
    const ledgerCount = db.prepare('SELECT COUNT(*) as count FROM stock_ledger').get();
    console.log(`📊 Stock ledger records: ${ledgerCount.count}`);

    // Test 2: Check products with stock
    const productsWithStock = db.prepare(`
      SELECT 
        p.id, p.sku, p.name_en,
        COALESCE(SUM(sl.delta_qty), 0) as qty_on_hand
      FROM products p
      LEFT JOIN stock_ledger sl ON p.id = sl.product_id
      WHERE p.is_active = 1
      GROUP BY p.id, p.sku, p.name_en
      HAVING COALESCE(SUM(sl.delta_qty), 0) != 0
    `).all();

    console.log(`📦 Products with stock: ${productsWithStock.length}`);
    productsWithStock.forEach(item => {
      console.log(`   ${item.sku}: ${item.qty_on_hand} units`);
    });

    // Test 3: Check cost policies
    const policyCount = db.prepare('SELECT COUNT(*) as count FROM product_cost_policy').get();
    console.log(`⚙️  Cost policies: ${policyCount.count}`);

    // Test 4: Check for negative stock
    const negativeStock = db.prepare(`
      SELECT product_id, SUM(delta_qty) as total_qty
      FROM stock_ledger 
      GROUP BY product_id 
      HAVING SUM(delta_qty) < 0
    `).all();

    if (negativeStock.length > 0) {
      console.log(`⚠️  Negative stock: ${negativeStock.length} products`);
    } else {
      console.log('✅ No negative stock found');
    }

    return true;

  } catch (error) {
    console.log('❌ Database consistency test failed:', error.message);
    return false;
  }
}

async function testFrontendData() {
  console.log('\n3️⃣ Testing Frontend Data Format...\n');

  try {
    // Test the exact data format expected by frontend
    const frontendData = db.prepare(`
      SELECT 
        p.id as product_id,
        p.sku,
        p.name_en,
        p.name_si,
        p.name_ta,
        p.unit,
        p.category_id,
        c.name as category_name,
        COALESCE(SUM(sl.delta_qty), 0) as qty_on_hand,
        pcp.cost_method
      FROM products p
      LEFT JOIN stock_ledger sl ON p.id = sl.product_id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_cost_policy pcp ON p.id = pcp.product_id
      WHERE p.is_active = 1
      GROUP BY p.id, p.sku, p.name_en, p.name_si, p.name_ta, p.unit, p.category_id, c.name, pcp.cost_method
      ORDER BY p.name_en ASC
      LIMIT 5
    `).all();

    console.log('📋 Frontend data format test:');
    frontendData.forEach(item => {
      console.log(`   ${item.sku}: ${item.name_en} (${item.qty_on_hand} ${item.unit}) - ${item.cost_method}`);
    });

    // Test currency formatting
    const testValue = 123456; // 1234.56 LKR
    const formatted = new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(testValue / 100);
    console.log(`💰 Currency formatting: ${testValue} cents = ${formatted}`);

    return true;

  } catch (error) {
    console.log('❌ Frontend data test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Stock Frontend Integration Tests...\n');

  const results = {
    api: false,
    database: false,
    frontend: false
  };

  // Test API endpoints
  results.api = await testStockAPI();
  
  // Test database consistency
  results.database = await testDatabaseConsistency();
  
  // Test frontend data format
  results.frontend = await testFrontendData();

  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log(`   API Endpoints: ${results.api ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Database: ${results.database ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Frontend Data: ${results.frontend ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = results.api && results.database && results.frontend;
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! Stock Frontend Integration is ready.');
    console.log('\n📋 Next Steps:');
    console.log('   1. Start the frontend development server');
    console.log('   2. Navigate to /stock to view the Stock Dashboard');
    console.log('   3. Test the product detail modal');
    console.log('   4. Test search, filtering, and pagination');
    console.log('   5. Test export functionality');
  } else {
    console.log('\n❌ Some tests failed. Please check the errors above.');
  }

  return allPassed;
}

// Run the tests
runTests().then((success) => {
  db.close();
  process.exit(success ? 0 : 1);
}).catch((error) => {
  console.error('❌ Test suite failed:', error);
  db.close();
  process.exit(1);
});
