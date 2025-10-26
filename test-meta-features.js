#!/usr/bin/env node

/**
 * Test Meta Features Endpoint
 * Verifies that the /api/meta/features endpoint returns non-empty enabled and permissions maps
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_TENANT = 'test-tenant';

// Test user credentials (you may need to adjust these based on your auth setup)
const TEST_USER = {
  username: 'admin',
  password: 'admin123'
};

let authToken = null;

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
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': TEST_TENANT,
        ...options.headers
      }
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
 * Authenticate and get token
 */
async function authenticate() {
  console.log('🔐 Authenticating user...');
  
  try {
    const response = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: JSON.stringify(TEST_USER)
    });

    if (response.statusCode === 200 && response.data?.ok) {
      authToken = response.data.token;
      console.log('✅ Authentication successful');
      return true;
    } else {
      console.log('❌ Authentication failed:', response.data?.error || 'Unknown error');
      return false;
    }
  } catch (error) {
    console.log('❌ Authentication error:', error.message);
    return false;
  }
}

/**
 * Test the meta features endpoint
 */
async function testMetaFeatures() {
  console.log('\n🧪 Testing /api/meta/features endpoint...');
  
  try {
    const response = await makeRequest({
      method: 'GET',
      path: '/api/meta/features',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    console.log(`   Status: ${response.statusCode}`);

    if (response.statusCode !== 200) {
      console.log('❌ Endpoint returned non-200 status');
      console.log('   Response:', response.data);
      return false;
    }

    if (!response.data?.ok) {
      console.log('❌ Response indicates failure');
      console.log('   Error:', response.data?.error);
      return false;
    }

    const data = response.data.data;
    
    // Check required fields
    const requiredFields = ['enabled', 'permissions', 'dependencies'];
    const missingFields = requiredFields.filter(field => !(field in data));
    
    if (missingFields.length > 0) {
      console.log('❌ Missing required fields:', missingFields);
      return false;
    }

    console.log('✅ All required fields present');

    // Check enabled features
    const enabledFeatures = data.enabled;
    if (typeof enabledFeatures !== 'object' || enabledFeatures === null) {
      console.log('❌ enabled field is not an object');
      return false;
    }

    const enabledCount = Object.values(enabledFeatures).filter(Boolean).length;
    console.log(`   📊 Enabled features: ${enabledCount}`);

    if (enabledCount === 0) {
      console.log('❌ No enabled features found');
      return false;
    }

    // Check permissions
    const permissions = data.permissions;
    if (typeof permissions !== 'object' || permissions === null) {
      console.log('❌ permissions field is not an object');
      return false;
    }

    const permissionCount = Object.values(permissions).filter(Boolean).length;
    console.log(`   📊 Enabled permissions: ${permissionCount}`);

    if (permissionCount === 0) {
      console.log('❌ No enabled permissions found');
      return false;
    }

    // Check dependencies
    const dependencies = data.dependencies;
    if (typeof dependencies !== 'object' || dependencies === null) {
      console.log('❌ dependencies field is not an object');
      return false;
    }

    const dependencyCount = Object.keys(dependencies).length;
    console.log(`   📊 Feature dependencies: ${dependencyCount}`);

    // Check user info
    if (data.user) {
      console.log(`   👤 User: ${data.user.username} (${data.user.role})`);
    }

    // Check tenant info
    if (data.tenant) {
      console.log(`   🏢 Tenant: ${data.tenant}`);
    }

    // Check summary
    if (data.summary) {
      console.log(`   📈 Summary: ${data.summary.enabledFeatures}/${data.summary.totalFeatures} features, ${data.summary.enabledPermissions}/${data.summary.totalPermissions} permissions`);
    }

    console.log('✅ Meta features endpoint test passed!');
    return true;

  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
    return false;
  }
}

/**
 * Test the meta features summary endpoint
 */
async function testMetaFeaturesSummary() {
  console.log('\n🧪 Testing /api/meta/features/summary endpoint...');
  
  try {
    const response = await makeRequest({
      method: 'GET',
      path: '/api/meta/features/summary',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    console.log(`   Status: ${response.statusCode}`);

    if (response.statusCode !== 200) {
      console.log('❌ Summary endpoint returned non-200 status');
      return false;
    }

    if (!response.data?.ok) {
      console.log('❌ Summary response indicates failure');
      return false;
    }

    const data = response.data.data;
    
    // Check required fields
    const requiredFields = ['user', 'tenant', 'access'];
    const missingFields = requiredFields.filter(field => !(field in data));
    
    if (missingFields.length > 0) {
      console.log('❌ Missing required fields in summary:', missingFields);
      return false;
    }

    console.log('✅ Summary endpoint test passed!');
    return true;

  } catch (error) {
    console.log('❌ Summary test failed with error:', error.message);
    return false;
  }
}

/**
 * Test the meta features check endpoint
 */
async function testMetaFeaturesCheck() {
  console.log('\n🧪 Testing /api/meta/features/check endpoint...');
  
  try {
    const testFeatures = ['sales.view', 'inventory.view', 'reports.view'];
    const testPermissions = ['sales.view', 'inventory.view', 'admin.users.view'];

    const response = await makeRequest({
      method: 'POST',
      path: '/api/meta/features/check',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        features: testFeatures,
        permissions: testPermissions
      })
    });

    console.log(`   Status: ${response.statusCode}`);

    if (response.statusCode !== 200) {
      console.log('❌ Check endpoint returned non-200 status');
      return false;
    }

    if (!response.data?.ok) {
      console.log('❌ Check response indicates failure');
      return false;
    }

    const data = response.data.data;
    
    // Check required fields
    if (!data.features || !data.permissions) {
      console.log('❌ Missing features or permissions in check response');
      return false;
    }

    console.log('✅ Check endpoint test passed!');
    return true;

  } catch (error) {
    console.log('❌ Check test failed with error:', error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Meta Features Tests');
  console.log(`📍 Testing against: ${BASE_URL}`);
  console.log(`🏢 Test tenant: ${TEST_TENANT}`);

  // Authenticate first
  const authSuccess = await authenticate();
  if (!authSuccess) {
    console.log('\n💥 Authentication failed. Cannot proceed with tests.');
    process.exit(1);
  }

  const results = [];
  
  // Test main endpoint
  const mainTest = await testMetaFeatures();
  results.push({ name: 'Main Features Endpoint', passed: mainTest });
  
  // Test summary endpoint
  const summaryTest = await testMetaFeaturesSummary();
  results.push({ name: 'Features Summary Endpoint', passed: summaryTest });
  
  // Test check endpoint
  const checkTest = await testMetaFeaturesCheck();
  results.push({ name: 'Features Check Endpoint', passed: checkTest });

  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    console.log(`${result.passed ? '✅' : '❌'} ${result.name}`);
  });
  
  console.log(`\n✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Meta features endpoint is working correctly.');
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

module.exports = { runAllTests, testMetaFeatures, testMetaFeaturesSummary, testMetaFeaturesCheck };










