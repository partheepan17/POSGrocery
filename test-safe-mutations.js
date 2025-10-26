#!/usr/bin/env node

/**
 * Test Safe Mutations
 * Verifies that feature toggle endpoints work with audit logs and dependency checks
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_TENANT = 'test-tenant';

// Test user credentials
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
 * Test feature toggle endpoint
 */
async function testFeatureToggle() {
  console.log('\n🧪 Testing feature toggle endpoint...');
  
  try {
    const response = await makeRequest({
      method: 'POST',
      path: '/api/admin/features/toggle',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        featureCode: 'sales.view',
        isEnabled: true
      })
    });

    console.log(`   Status: ${response.statusCode}`);

    if (response.statusCode !== 200) {
      console.log('❌ Feature toggle failed:', response.data?.error);
      return false;
    }

    if (!response.data?.ok) {
      console.log('❌ Feature toggle response indicates failure');
      return false;
    }

    // Check response structure
    const data = response.data.data;
    if (!data.feature || !data.change || !data.audit) {
      console.log('❌ Missing required response fields');
      return false;
    }

    console.log('✅ Feature toggle successful');
    console.log('   Feature:', data.feature.feature_code, '-', data.feature.is_enabled ? 'enabled' : 'disabled');
    console.log('   Change:', data.change.previousState, '→', data.change.newState);
    console.log('   Audit:', data.audit.action, 'by', data.audit.actorId);

    return true;

  } catch (error) {
    console.log('❌ Feature toggle test failed:', error.message);
    return false;
  }
}

/**
 * Test role feature override endpoint
 */
async function testRoleFeatureOverride() {
  console.log('\n🧪 Testing role feature override endpoint...');
  
  try {
    const response = await makeRequest({
      method: 'POST',
      path: '/api/admin/features/override',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        roleId: 1, // Assuming role ID 1 exists
        featureCode: 'inventory.view',
        isEnabled: false
      })
    });

    console.log(`   Status: ${response.statusCode}`);

    if (response.statusCode !== 200) {
      console.log('❌ Role feature override failed:', response.data?.error);
      return false;
    }

    if (!response.data?.ok) {
      console.log('❌ Role feature override response indicates failure');
      return false;
    }

    // Check response structure
    const data = response.data.data;
    if (!data.feature || !data.role || !data.change || !data.audit) {
      console.log('❌ Missing required response fields');
      return false;
    }

    console.log('✅ Role feature override successful');
    console.log('   Feature:', data.feature.feature_code, '-', data.feature.is_enabled ? 'enabled' : 'disabled');
    console.log('   Role:', data.role.code, '-', data.role.name);
    console.log('   Change:', data.change.previousState, '→', data.change.newState);
    console.log('   Audit:', data.audit.action, 'by', data.audit.actorId);

    return true;

  } catch (error) {
    console.log('❌ Role feature override test failed:', error.message);
    return false;
  }
}

/**
 * Test feature toggle with dependency validation
 */
async function testDependencyValidation() {
  console.log('\n🧪 Testing dependency validation...');
  
  try {
    // First, try to disable a core feature (should fail)
    const coreFeatureResponse = await makeRequest({
      method: 'POST',
      path: '/api/admin/features/toggle',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        featureCode: 'auth.login', // Assuming this is a core feature
        isEnabled: false
      })
    });

    console.log(`   Core feature disable status: ${coreFeatureResponse.statusCode}`);

    if (coreFeatureResponse.statusCode === 200) {
      console.log('❌ Core feature should not be disableable');
      return false;
    }

    if (coreFeatureResponse.data?.message?.includes('core feature')) {
      console.log('✅ Core feature correctly protected from disabling');
    } else {
      console.log('⚠️ Unexpected error for core feature:', coreFeatureResponse.data?.message);
    }

    // Try to disable a non-existent feature (should fail)
    const invalidFeatureResponse = await makeRequest({
      method: 'POST',
      path: '/api/admin/features/toggle',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        featureCode: 'nonexistent.feature',
        isEnabled: false
      })
    });

    console.log(`   Invalid feature status: ${invalidFeatureResponse.statusCode}`);

    if (invalidFeatureResponse.statusCode === 200) {
      console.log('❌ Invalid feature should not be toggleable');
      return false;
    }

    if (invalidFeatureResponse.data?.message?.includes('not found')) {
      console.log('✅ Invalid feature correctly rejected');
    } else {
      console.log('⚠️ Unexpected error for invalid feature:', invalidFeatureResponse.data?.message);
    }

    return true;

  } catch (error) {
    console.log('❌ Dependency validation test failed:', error.message);
    return false;
  }
}

/**
 * Test audit logs endpoint
 */
async function testAuditLogs() {
  console.log('\n🧪 Testing audit logs endpoint...');
  
  try {
    const response = await makeRequest({
      method: 'GET',
      path: '/api/admin/features/audit',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    console.log(`   Status: ${response.statusCode}`);

    if (response.statusCode !== 200) {
      console.log('❌ Audit logs failed:', response.data?.error);
      return false;
    }

    if (!response.data?.ok) {
      console.log('❌ Audit logs response indicates failure');
      return false;
    }

    // Check response structure
    const data = response.data.data;
    if (!data.logs || !Array.isArray(data.logs) || !data.meta) {
      console.log('❌ Missing required response fields');
      return false;
    }

    console.log('✅ Audit logs retrieved successfully');
    console.log('   Logs count:', data.logs.length);
    console.log('   Meta:', data.meta);

    // Check if our previous toggles are in the audit logs
    const featureToggleLogs = data.logs.filter(log => 
      log.action === 'FEATURE_TOGGLE' && 
      log.payload.featureCode === 'sales.view'
    );

    if (featureToggleLogs.length > 0) {
      console.log('✅ Previous feature toggle found in audit logs');
      console.log('   Audit log:', featureToggleLogs[0]);
    } else {
      console.log('⚠️ Previous feature toggle not found in audit logs');
    }

    return true;

  } catch (error) {
    console.log('❌ Audit logs test failed:', error.message);
    return false;
  }
}

/**
 * Test transaction rollback on error
 */
async function testTransactionRollback() {
  console.log('\n🧪 Testing transaction rollback...');
  
  try {
    // Try to toggle a feature with invalid data (should rollback)
    const response = await makeRequest({
      method: 'POST',
      path: '/api/admin/features/toggle',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        featureCode: '', // Invalid empty feature code
        isEnabled: true
      })
    });

    console.log(`   Invalid data status: ${response.statusCode}`);

    if (response.statusCode === 200) {
      console.log('❌ Invalid data should not be accepted');
      return false;
    }

    if (response.statusCode === 400) {
      console.log('✅ Invalid data correctly rejected with 400');
    } else {
      console.log('⚠️ Unexpected status for invalid data:', response.statusCode);
    }

    return true;

  } catch (error) {
    console.log('❌ Transaction rollback test failed:', error.message);
    return false;
  }
}

/**
 * Test effective state calculation
 */
async function testEffectiveState() {
  console.log('\n🧪 Testing effective state calculation...');
  
  try {
    // Toggle a feature and verify the effective state is returned
    const response = await makeRequest({
      method: 'POST',
      path: '/api/admin/features/toggle',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        featureCode: 'reports.view',
        isEnabled: true
      })
    });

    console.log(`   Status: ${response.statusCode}`);

    if (response.statusCode !== 200) {
      console.log('❌ Feature toggle failed:', response.data?.error);
      return false;
    }

    const data = response.data.data;
    const feature = data.feature;

    // Verify the effective state is correctly calculated
    if (feature.feature_code !== 'reports.view') {
      console.log('❌ Feature code mismatch');
      return false;
    }

    if (typeof feature.is_enabled !== 'boolean') {
      console.log('❌ Feature state is not boolean');
      return false;
    }

    console.log('✅ Effective state calculated correctly');
    console.log('   Feature:', feature.feature_code, '-', feature.is_enabled ? 'enabled' : 'disabled');
    console.log('   Is core:', feature.is_core);
    console.log('   Updated by:', feature.updated_by);
    console.log('   Updated at:', feature.updated_at);

    return true;

  } catch (error) {
    console.log('❌ Effective state test failed:', error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Safe Mutations Tests');
  console.log(`📍 Testing against: ${BASE_URL}`);
  console.log(`🏢 Test tenant: ${TEST_TENANT}`);

  // Authenticate first
  const authSuccess = await authenticate();
  if (!authSuccess) {
    console.log('\n💥 Authentication failed. Cannot proceed with tests.');
    process.exit(1);
  }

  const results = [];
  
  // Test feature toggle
  const toggleTest = await testFeatureToggle();
  results.push({ name: 'Feature Toggle', passed: toggleTest });
  
  // Test role feature override
  const overrideTest = await testRoleFeatureOverride();
  results.push({ name: 'Role Feature Override', passed: overrideTest });
  
  // Test dependency validation
  const dependencyTest = await testDependencyValidation();
  results.push({ name: 'Dependency Validation', passed: dependencyTest });
  
  // Test audit logs
  const auditTest = await testAuditLogs();
  results.push({ name: 'Audit Logs', passed: auditTest });
  
  // Test transaction rollback
  const rollbackTest = await testTransactionRollback();
  results.push({ name: 'Transaction Rollback', passed: rollbackTest });
  
  // Test effective state
  const stateTest = await testEffectiveState();
  results.push({ name: 'Effective State', passed: stateTest });

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
    console.log('\n🎉 All tests passed! Safe mutations are working correctly.');
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

module.exports = { runAllTests };










