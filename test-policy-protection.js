#!/usr/bin/env node

/**
 * Test Policy Protection
 * Verifies that protected routes return 403 JSON payload on permission denial
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_TENANT = 'test-tenant';

// Test cases for different protected routes
const testCases = [
  {
    name: 'Returns - Get Sale by Receipt',
    method: 'GET',
    path: '/api/returns/sale/TEST123',
    expectedStatus: 403,
    headers: {
      'X-Tenant-ID': TEST_TENANT,
      'Authorization': 'Bearer invalid-token'
    }
  },
  {
    name: 'Returns - Create Return',
    method: 'POST',
    path: '/api/returns/',
    expectedStatus: 403,
    headers: {
      'X-Tenant-ID': TEST_TENANT,
      'Authorization': 'Bearer invalid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      original_receipt_no: 'TEST123',
      lines: [{ sale_line_id: 1, product_id: 1, quantity: 1, reason: 'test' }]
    })
  },
  {
    name: 'GRN - Create GRN',
    method: 'POST',
    path: '/api/grn/',
    expectedStatus: 403,
    headers: {
      'X-Tenant-ID': TEST_TENANT,
      'Authorization': 'Bearer invalid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      supplier_id: 1,
      invoice_number: 'INV123',
      grn_date: '2024-01-01',
      lines: [{ product_id: 1, quantity: 1, unit_cost: 10, total_cost: 10 }]
    })
  },
  {
    name: 'Cash - Record Movement',
    method: 'POST',
    path: '/api/cash/movement',
    expectedStatus: 403,
    headers: {
      'X-Tenant-ID': TEST_TENANT,
      'Authorization': 'Bearer invalid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      movementType: 'deposit',
      amount: 100,
      reason: 'test',
      managerPin: '1234'
    })
  },
  {
    name: 'Discounts - Apply Override',
    method: 'POST',
    path: '/api/discounts/override',
    expectedStatus: 403,
    headers: {
      'X-Tenant-ID': TEST_TENANT,
      'Authorization': 'Bearer invalid-token',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      productId: 1,
      discountAmount: 10,
      reason: 'test',
      managerPin: '1234'
    })
  },
  {
    name: 'Stock Ledger - Get Ledger',
    method: 'GET',
    path: '/api/inventory/ledger/',
    expectedStatus: 403,
    headers: {
      'X-Tenant-ID': TEST_TENANT,
      'Authorization': 'Bearer invalid-token'
    }
  }
];

/**
 * Make HTTP request
 */
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.path, BASE_URL);
    const requestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method,
      headers: options.headers || {}
    };

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : null;
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

/**
 * Run a single test case
 */
async function runTest(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log(`   ${testCase.method} ${testCase.path}`);

  try {
    const response = await makeRequest(testCase);
    
    console.log(`   Status: ${response.statusCode} (expected: ${testCase.expectedStatus})`);
    
    if (response.statusCode === testCase.expectedStatus) {
      console.log(`   ✅ Status code matches expected`);
    } else {
      console.log(`   ❌ Status code mismatch`);
      return false;
    }

    // Check if response is JSON
    if (typeof response.data === 'object' && response.data !== null) {
      console.log(`   ✅ Response is valid JSON`);
      
      // Check for required fields in 403 response
      if (response.statusCode === 403) {
        const requiredFields = ['reason', 'code'];
        const hasRequiredFields = requiredFields.every(field => 
          response.data.hasOwnProperty(field)
        );
        
        if (hasRequiredFields) {
          console.log(`   ✅ 403 response has required fields: ${requiredFields.join(', ')}`);
          console.log(`   📝 Reason: ${response.data.reason}`);
          console.log(`   📝 Code: ${response.data.code}`);
        } else {
          console.log(`   ❌ 403 response missing required fields`);
          return false;
        }
      }
    } else {
      console.log(`   ❌ Response is not valid JSON`);
      return false;
    }

    return true;
  } catch (error) {
    console.log(`   ❌ Request failed: ${error.message}`);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Policy Protection Tests');
  console.log(`📍 Testing against: ${BASE_URL}`);
  console.log(`🏢 Test tenant: ${TEST_TENANT}`);

  const results = [];
  
  for (const testCase of testCases) {
    const passed = await runTest(testCase);
    results.push({ testCase, passed });
    
    // Add small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Policy protection is working correctly.');
    process.exit(0);
  } else {
    console.log('\n💥 Some tests failed. Check the output above for details.');
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests, runTest, testCases };










