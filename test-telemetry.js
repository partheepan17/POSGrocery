/**
 * Test script for telemetry system
 * Verifies feature usage tracking and analytics
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const TEST_TENANT = 'test-tenant-telemetry';

// Test configuration
const testConfig = {
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Tenant-ID': TEST_TENANT
  }
};

let authToken = '';

async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post('/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    }, testConfig);
    
    authToken = response.data.data.token;
    testConfig.headers['Authorization'] = `Bearer ${authToken}`;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function testFeatureUsageTracking() {
  console.log('\n📊 Testing feature usage tracking...');
  
  try {
    // Test various feature usage events
    const events = [
      {
        featureCode: 'sales.view',
        eventType: 'route_visit',
        metadata: {
          route: '/sales',
          component: 'Router'
        }
      },
      {
        featureCode: 'sales.checkout',
        eventType: 'action_click',
        metadata: {
          action: 'checkout_button',
          component: 'CheckoutButton'
        }
      },
      {
        featureCode: 'inventory.view',
        eventType: 'ui_interaction',
        metadata: {
          action: 'search_products',
          component: 'ProductSearch',
          duration: 1500
        }
      },
      {
        featureCode: 'reports.sales',
        eventType: 'api_call',
        metadata: {
          action: 'generate_report',
          component: 'ReportGenerator',
          duration: 3000,
          success: true
        }
      }
    ];

    for (const event of events) {
      const response = await axios.post('/api/telemetry/feature-usage', event, testConfig);
      console.log(`✅ Tracked ${event.eventType} for ${event.featureCode}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Feature usage tracking failed:', error.response?.data || error.message);
    return false;
  }
}

async function testUsageAnalytics() {
  console.log('\n📈 Testing usage analytics...');
  
  try {
    // Get usage analytics
    const response = await axios.get('/api/telemetry/usage-analytics', testConfig);
    const analytics = response.data.data;
    
    console.log('✅ Usage analytics retrieved');
    console.log(`   Total features: ${analytics.metadata.totalFeatures}`);
    console.log(`   Data points: ${analytics.metadata.totalDataPoints}`);
    console.log(`   Period: ${analytics.period.start} to ${analytics.period.end}`);
    
    // Display top features
    if (analytics.summary && analytics.summary.length > 0) {
      console.log('\n📊 Top Features:');
      analytics.summary.slice(0, 5).forEach((feature, index) => {
        console.log(`   ${index + 1}. ${feature.featureCode}: ${feature.totalUsage} uses`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Usage analytics failed:', error.response?.data || error.message);
    return false;
  }
}

async function testFeatureRecommendations() {
  console.log('\n🤖 Testing feature recommendations...');
  
  try {
    const response = await axios.get('/api/telemetry/feature-recommendations', testConfig);
    const recommendations = response.data.data.recommendations;
    
    console.log('✅ Feature recommendations retrieved');
    console.log(`   Recommendations: ${recommendations.length}`);
    
    if (recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec.feature_code}: ${rec.recommendation} (${Math.round(rec.confidence * 100)}% confidence)`);
        console.log(`      Reasoning: ${rec.reasoning}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Feature recommendations failed:', error.response?.data || error.message);
    return false;
  }
}

async function testBulkUsageTracking() {
  console.log('\n🔄 Testing bulk usage tracking...');
  
  try {
    // Generate multiple usage events
    const events = [];
    const features = ['sales.view', 'inventory.view', 'reports.sales', 'admin.features'];
    const eventTypes = ['route_visit', 'action_click', 'ui_interaction', 'api_call'];
    
    for (let i = 0; i < 20; i++) {
      const feature = features[Math.floor(Math.random() * features.length)];
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      
      events.push({
        featureCode: feature,
        eventType: eventType,
        metadata: {
          action: `test_action_${i}`,
          component: 'TestComponent',
          duration: Math.floor(Math.random() * 5000)
        }
      });
    }
    
    // Send bulk events
    const response = await axios.post('/api/telemetry/feature-usage', events, testConfig);
    console.log(`✅ Tracked ${events.length} bulk events`);
    
    return true;
  } catch (error) {
    console.error('❌ Bulk usage tracking failed:', error.response?.data || error.message);
    return false;
  }
}

async function testAnalyticsFiltering() {
  console.log('\n🔍 Testing analytics filtering...');
  
  try {
    // Test different filters
    const filters = [
      { featureCode: 'sales.view' },
      { groupBy: 'week' },
      { limit: 10 }
    ];
    
    for (const filter of filters) {
      const queryParams = new URLSearchParams(filter);
      const response = await axios.get(`/api/telemetry/usage-analytics?${queryParams}`, testConfig);
      console.log(`✅ Analytics with filter ${JSON.stringify(filter)}: ${response.data.data.metadata.totalDataPoints} data points`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Analytics filtering failed:', error.response?.data || error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Telemetry System Tests');
  console.log('==================================');
  
  const tests = [
    { name: 'Login', fn: login },
    { name: 'Feature Usage Tracking', fn: testFeatureUsageTracking },
    { name: 'Usage Analytics', fn: testUsageAnalytics },
    { name: 'Feature Recommendations', fn: testFeatureRecommendations },
    { name: 'Bulk Usage Tracking', fn: testBulkUsageTracking },
    { name: 'Analytics Filtering', fn: testAnalyticsFiltering }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const success = await test.fn();
      results.push({ name: test.name, success });
    } catch (error) {
      console.error(`❌ ${test.name} failed with error:`, error.message);
      results.push({ name: test.name, success: false });
    }
  }
  
  // Summary
  console.log('\n📋 Test Results Summary');
  console.log('======================');
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.name}`);
  });
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Telemetry system is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Please check the errors above.');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  testFeatureUsageTracking,
  testUsageAnalytics,
  testFeatureRecommendations
};










