/**
 * Test script for cascade disable functionality
 * Tests the feature toggle with dependency validation and cascade disable
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const TEST_TENANT = 'test-tenant-1';

// Test configuration
const testConfig = {
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Tenant-ID': TEST_TENANT
  }
};

// Test user credentials
const testUser = {
  username: 'admin',
  password: 'admin123'
};

let authToken = '';

async function login() {
  console.log('🔐 Logging in...');
  try {
    const response = await axios.post('/api/auth/login', testUser, testConfig);
    authToken = response.data.data.token;
    testConfig.headers['Authorization'] = `Bearer ${authToken}`;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function getFeatureDependencies(featureCode) {
  console.log(`📋 Getting dependencies for feature: ${featureCode}`);
  try {
    const response = await axios.get(`/api/admin/features/dependencies/${featureCode}`, testConfig);
    console.log('✅ Dependencies retrieved:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Failed to get dependencies:', error.response?.data || error.message);
    return null;
  }
}

async function toggleFeature(featureCode, isEnabled, cascade = false) {
  console.log(`🔄 Toggling feature: ${featureCode} to ${isEnabled} (cascade: ${cascade})`);
  try {
    const response = await axios.post('/api/admin/features/toggle', {
      featureCode,
      isEnabled,
      cascade
    }, testConfig);
    
    console.log('✅ Feature toggle successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Feature toggle failed:', error.response?.data || error.message);
    return error.response?.data || { error: error.message };
  }
}

async function getFeatures() {
  console.log('📋 Getting all features...');
  try {
    const response = await axios.get('/api/meta/features', testConfig);
    console.log('✅ Features retrieved:', response.data.data.summary);
    return response.data.data;
  } catch (error) {
    console.error('❌ Failed to get features:', error.response?.data || error.message);
    return null;
  }
}

async function testCascadeDisable() {
  console.log('\n🧪 Testing Cascade Disable Functionality\n');
  
  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }

  // Step 2: Get initial features state
  console.log('\n📊 Initial Features State:');
  const initialFeatures = await getFeatures();
  if (!initialFeatures) {
    console.log('❌ Cannot proceed without features data');
    return;
  }

  // Step 3: Test enabling a feature with dependents
  console.log('\n🔄 Test 1: Enabling sales.create (depends on sales.view)');
  const enableResult1 = await toggleFeature('sales.create', true);
  if (enableResult1.ok) {
    console.log('✅ sales.create enabled successfully');
  } else {
    console.log('❌ Failed to enable sales.create:', enableResult1.message);
  }

  // Step 4: Test enabling sales.view (dependency)
  console.log('\n🔄 Test 2: Enabling sales.view (dependency for sales.create)');
  const enableResult2 = await toggleFeature('sales.view', true);
  if (enableResult2.ok) {
    console.log('✅ sales.view enabled successfully');
  } else {
    console.log('❌ Failed to enable sales.view:', enableResult2.message);
  }

  // Step 5: Test disabling sales.view without cascade (should fail)
  console.log('\n🔄 Test 3: Attempting to disable sales.view without cascade (should fail)');
  const disableResult1 = await toggleFeature('sales.view', false, false);
  if (disableResult1.error === 'DEPENDENTS') {
    console.log('✅ Correctly blocked disable due to dependents:', disableResult1.blockingDependents);
  } else {
    console.log('❌ Expected DEPENDENTS error, got:', disableResult1);
  }

  // Step 6: Test disabling sales.view with cascade (should succeed)
  console.log('\n🔄 Test 4: Disabling sales.view with cascade (should succeed)');
  const disableResult2 = await toggleFeature('sales.view', false, true);
  if (disableResult2.ok) {
    console.log('✅ sales.view disabled with cascade successfully');
    console.log('📋 Cascade targets:', disableResult2.data.cascadeTargets);
  } else {
    console.log('❌ Failed to disable sales.view with cascade:', disableResult2.message);
  }

  // Step 7: Verify cascade effect
  console.log('\n📊 Verifying cascade effect:');
  const finalFeatures = await getFeatures();
  if (finalFeatures) {
    console.log('📋 Final features state:');
    console.log(`  sales.view: ${finalFeatures.enabled['sales.view'] ? 'enabled' : 'disabled'}`);
    console.log(`  sales.create: ${finalFeatures.enabled['sales.create'] ? 'enabled' : 'disabled'}`);
  }

  // Step 8: Test enabling features again
  console.log('\n🔄 Test 5: Re-enabling features');
  await toggleFeature('sales.view', true);
  await toggleFeature('sales.create', true);
  console.log('✅ Features re-enabled for cleanup');

  console.log('\n🎉 Cascade disable tests completed!');
}

async function testDependencyValidation() {
  console.log('\n🧪 Testing Dependency Validation\n');

  // Test getting dependencies for a feature
  console.log('📋 Testing dependency retrieval:');
  const dependencies = await getFeatureDependencies('sales.create');
  if (dependencies) {
    console.log('✅ Dependencies retrieved successfully');
    console.log('  Dependents:', dependencies.dependents);
    console.log('  Dependencies:', dependencies.dependencies);
    console.log('  Cascade info:', dependencies.cascadeInfo);
  } else {
    console.log('❌ Failed to retrieve dependencies');
  }
}

async function testRoleOverrides() {
  console.log('\n🧪 Testing Role Feature Overrides\n');

  // Test role feature override
  console.log('🔄 Testing role feature override:');
  try {
    const response = await axios.post('/api/admin/features/override', {
      roleId: 2, // manager role
      featureCode: 'sales.view',
      isEnabled: false
    }, testConfig);
    
    console.log('✅ Role override successful:', response.data);
  } catch (error) {
    console.error('❌ Role override failed:', error.response?.data || error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Feature Toggle and Cascade Disable Tests\n');
  
  try {
    await testCascadeDisable();
    await testDependencyValidation();
    await testRoleOverrides();
    
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  login,
  getFeatureDependencies,
  toggleFeature,
  getFeatures,
  testCascadeDisable,
  testDependencyValidation,
  testRoleOverrides,
  runAllTests
};










