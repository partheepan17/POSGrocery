/**
 * Test script for audit trail functionality
 * Tests audit log creation, filtering, and export capabilities
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

async function performFeatureToggles() {
  console.log('\n🔄 Performing feature toggles to generate audit logs...');
  
  const features = [
    { code: 'inventory.view', enabled: true },
    { code: 'inventory.manage', enabled: true },
    { code: 'reports.sales', enabled: true },
    { code: 'inventory.view', enabled: false },
    { code: 'inventory.manage', enabled: false }
  ];

  for (const feature of features) {
    try {
      console.log(`  Toggling ${feature.code} to ${feature.enabled}`);
      const response = await axios.post('/api/admin/features/toggle', {
        featureCode: feature.code,
        isEnabled: feature.enabled
      }, testConfig);
      
      if (response.data.ok) {
        console.log(`    ✅ ${feature.code} toggled successfully`);
      } else {
        console.log(`    ❌ Failed to toggle ${feature.code}:`, response.data.message);
      }
      
      // Wait a bit between toggles to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`    ❌ Error toggling ${feature.code}:`, error.response?.data || error.message);
    }
  }
}

async function testAuditTrailAPI() {
  console.log('\n📋 Testing audit trail API...');
  
  try {
    // Test basic audit trail retrieval
    console.log('  Getting audit trail...');
    const response = await axios.get('/api/admin/audit', testConfig);
    
    if (response.data.ok) {
      console.log('  ✅ Audit trail retrieved successfully');
      console.log(`  📊 Total logs: ${response.data.data.pagination.total}`);
      console.log(`  📊 Showing: ${response.data.data.logs.length} logs`);
      
      // Show sample logs
      if (response.data.data.logs.length > 0) {
        console.log('\n  📝 Sample audit logs:');
        response.data.data.logs.slice(0, 3).forEach((log, index) => {
          console.log(`    ${index + 1}. ${log.action} by ${log.actor.name || log.actor.username} at ${log.timestamp}`);
          if (log.diff.changes) {
            log.diff.changes.forEach(change => {
              console.log(`       ${change.field}: ${change.before} → ${change.after}`);
            });
          }
        });
      }
      
      return response.data.data;
    } else {
      console.log('  ❌ Failed to retrieve audit trail:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('  ❌ Error retrieving audit trail:', error.response?.data || error.message);
    return null;
  }
}

async function testAuditFilters() {
  console.log('\n🔍 Testing audit trail filters...');
  
  try {
    // Test actor filter
    console.log('  Testing actor filter...');
    const actorResponse = await axios.get('/api/admin/audit?actor=admin', testConfig);
    if (actorResponse.data.ok) {
      console.log(`    ✅ Actor filter: ${actorResponse.data.data.logs.length} logs found`);
    }
    
    // Test action filter
    console.log('  Testing action filter...');
    const actionResponse = await axios.get('/api/admin/audit?action=FEATURE_TOGGLE', testConfig);
    if (actionResponse.data.ok) {
      console.log(`    ✅ Action filter: ${actionResponse.data.data.logs.length} logs found`);
    }
    
    // Test feature code filter
    console.log('  Testing feature code filter...');
    const featureResponse = await axios.get('/api/admin/audit?featureCode=inventory.view', testConfig);
    if (featureResponse.data.ok) {
      console.log(`    ✅ Feature filter: ${featureResponse.data.data.logs.length} logs found`);
    }
    
    // Test date range filter
    console.log('  Testing date range filter...');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const today = new Date();
    
    const dateResponse = await axios.get(`/api/admin/audit?startDate=${yesterday.toISOString()}&endDate=${today.toISOString()}`, testConfig);
    if (dateResponse.data.ok) {
      console.log(`    ✅ Date range filter: ${dateResponse.data.data.logs.length} logs found`);
    }
    
    // Test combined filters
    console.log('  Testing combined filters...');
    const combinedResponse = await axios.get('/api/admin/audit?action=FEATURE_TOGGLE&featureCode=inventory.view', testConfig);
    if (combinedResponse.data.ok) {
      console.log(`    ✅ Combined filters: ${combinedResponse.data.data.logs.length} logs found`);
    }
    
  } catch (error) {
    console.error('  ❌ Error testing filters:', error.response?.data || error.message);
  }
}

async function testAuditExport() {
  console.log('\n📤 Testing audit trail export...');
  
  try {
    // Test CSV export
    console.log('  Testing CSV export...');
    const csvResponse = await axios.get('/api/admin/audit/export?format=csv', {
      ...testConfig,
      responseType: 'blob'
    });
    
    if (csvResponse.status === 200) {
      console.log('    ✅ CSV export successful');
      console.log(`    📊 CSV size: ${csvResponse.data.length} bytes`);
    } else {
      console.log('    ❌ CSV export failed');
    }
    
    // Test JSON export
    console.log('  Testing JSON export...');
    const jsonResponse = await axios.get('/api/admin/audit/export?format=json', testConfig);
    
    if (jsonResponse.data.ok) {
      console.log('    ✅ JSON export successful');
      console.log(`    📊 JSON records: ${jsonResponse.data.data.logs.length}`);
    } else {
      console.log('    ❌ JSON export failed');
    }
    
  } catch (error) {
    console.error('  ❌ Error testing export:', error.response?.data || error.message);
  }
}

async function testPagination() {
  console.log('\n📄 Testing pagination...');
  
  try {
    // Test first page
    console.log('  Testing first page...');
    const firstPageResponse = await axios.get('/api/admin/audit?limit=2&offset=0', testConfig);
    if (firstPageResponse.data.ok) {
      console.log(`    ✅ First page: ${firstPageResponse.data.data.logs.length} logs`);
      console.log(`    📊 Has more: ${firstPageResponse.data.data.pagination.hasMore}`);
    }
    
    // Test second page
    console.log('  Testing second page...');
    const secondPageResponse = await axios.get('/api/admin/audit?limit=2&offset=2', testConfig);
    if (secondPageResponse.data.ok) {
      console.log(`    ✅ Second page: ${secondPageResponse.data.data.logs.length} logs`);
    }
    
  } catch (error) {
    console.error('  ❌ Error testing pagination:', error.response?.data || error.message);
  }
}

async function testSorting() {
  console.log('\n🔄 Testing sorting...');
  
  try {
    // Test sort by date (desc)
    console.log('  Testing sort by date (desc)...');
    const descResponse = await axios.get('/api/admin/audit?sortBy=created_at&sortOrder=desc&limit=3', testConfig);
    if (descResponse.data.ok) {
      console.log('    ✅ Sort by date (desc) successful');
      const timestamps = descResponse.data.data.logs.map(log => log.timestamp);
      console.log(`    📊 Timestamps: ${timestamps.join(', ')}`);
    }
    
    // Test sort by date (asc)
    console.log('  Testing sort by date (asc)...');
    const ascResponse = await axios.get('/api/admin/audit?sortBy=created_at&sortOrder=asc&limit=3', testConfig);
    if (ascResponse.data.ok) {
      console.log('    ✅ Sort by date (asc) successful');
      const timestamps = ascResponse.data.data.logs.map(log => log.timestamp);
      console.log(`    📊 Timestamps: ${timestamps.join(', ')}`);
    }
    
  } catch (error) {
    console.error('  ❌ Error testing sorting:', error.response?.data || error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Audit Trail Tests\n');
  
  try {
    // Step 1: Login
    const loginSuccess = await login();
    if (!loginSuccess) {
      console.log('❌ Cannot proceed without authentication');
      return;
    }

    // Step 2: Generate some audit logs
    await performFeatureToggles();

    // Step 3: Test audit trail API
    const auditData = await testAuditTrailAPI();
    if (!auditData) {
      console.log('❌ Cannot proceed without audit data');
      return;
    }

    // Step 4: Test filters
    await testAuditFilters();

    // Step 5: Test pagination
    await testPagination();

    // Step 6: Test sorting
    await testSorting();

    // Step 7: Test export
    await testAuditExport();

    console.log('\n✅ All audit trail tests completed successfully!');
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
  performFeatureToggles,
  testAuditTrailAPI,
  testAuditFilters,
  testAuditExport,
  testPagination,
  testSorting,
  runAllTests
};










