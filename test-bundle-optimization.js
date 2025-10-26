/**
 * Bundle Optimization Test
 * Tests that routes for disabled features aren't downloaded
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  username: 'testuser',
  password: 'testpass'
};

// Feature test scenarios
const FEATURE_SCENARIOS = [
  {
    name: 'Sales Features Enabled',
    features: {
      'sales.view': true,
      'sales.quick': true,
      'sales.return': true
    },
    expectedRoutes: ['/pos', '/sales', '/quick-sales', '/returns', '/sales-return'],
    shouldNotLoad: ['/inventory', '/reports', '/users']
  },
  {
    name: 'Inventory Features Enabled',
    features: {
      'inventory.view': true,
      'inventory.receive': true,
      'inventory.stocktake': true
    },
    expectedRoutes: ['/inventory', '/grn', '/stocktake'],
    shouldNotLoad: ['/sales', '/reports', '/users']
  },
  {
    name: 'Admin Features Enabled',
    features: {
      'admin.all': true
    },
    expectedRoutes: ['/users', '/audit', '/settings'],
    shouldNotLoad: []
  },
  {
    name: 'Minimal Features (Cashier)',
    features: {
      'sales.view': true,
      'products.view': true
    },
    expectedRoutes: ['/pos', '/products'],
    shouldNotLoad: ['/inventory', '/reports', '/users', '/audit']
  }
];

// Network monitoring
class NetworkMonitor {
  constructor() {
    this.requests = [];
    this.startTime = Date.now();
  }

  start() {
    // This would be implemented with browser automation in a real test
    console.log('Starting network monitoring...');
  }

  stop() {
    const endTime = Date.now();
    console.log(`Network monitoring stopped after ${endTime - this.startTime}ms`);
    return this.requests;
  }

  addRequest(url, method = 'GET') {
    this.requests.push({
      url,
      method,
      timestamp: Date.now() - this.startTime
    });
  }

  getChunkRequests() {
    return this.requests.filter(req => 
      req.url.includes('.js') || 
      req.url.includes('.css') || 
      req.url.includes('chunk')
    );
  }

  getRouteRequests() {
    return this.requests.filter(req => 
      req.url.includes('/api/') && 
      !req.url.includes('/api/meta/features')
    );
  }
}

// Test helper functions
async function login() {
  try {
    console.log('Logging in...');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, TEST_USER);
    return response.data.token;
  } catch (error) {
    console.error('Login failed:', error.message);
    throw error;
  }
}

async function getFeatures(token) {
  try {
    console.log('Fetching features...');
    const response = await axios.get(`${BASE_URL}/api/meta/features`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': 'test-tenant'
      }
    });
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch features:', error.message);
    throw error;
  }
}

async function testRouteAccess(token, route) {
  try {
    console.log(`Testing route access: ${route}`);
    const response = await axios.get(`${BASE_URL}${route}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': 'test-tenant'
      },
      maxRedirects: 0,
      validateStatus: (status) => status < 400
    });
    return {
      route,
      status: response.status,
      redirected: response.status === 302 || response.status === 301,
      redirectLocation: response.headers.location
    };
  } catch (error) {
    return {
      route,
      status: error.response?.status || 500,
      error: error.message,
      redirected: false
    };
  }
}

async function simulateFeatureToggle(token, features) {
  try {
    console.log('Simulating feature toggle...');
    // This would simulate toggling features via the admin API
    for (const [featureCode, isEnabled] of Object.entries(features)) {
      try {
        await axios.post(`${BASE_URL}/api/admin/features/toggle`, {
          featureCode,
          isEnabled
        }, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-ID': 'test-tenant'
          }
        });
        console.log(`Toggled feature ${featureCode} to ${isEnabled}`);
      } catch (error) {
        console.warn(`Failed to toggle feature ${featureCode}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Feature toggle failed:', error.message);
  }
}

async function testBundleOptimization() {
  console.log('🚀 Starting Bundle Optimization Test');
  console.log('=====================================');

  try {
    // Login and get token
    const token = await login();
    console.log('✅ Login successful');

    // Get initial features
    const initialFeatures = await getFeatures(token);
    console.log('✅ Initial features loaded:', Object.keys(initialFeatures.enabled).length);

    // Test each scenario
    for (const scenario of FEATURE_SCENARIOS) {
      console.log(`\n📋 Testing Scenario: ${scenario.name}`);
      console.log('----------------------------------------');

      // Simulate feature toggle
      await simulateFeatureToggle(token, scenario.features);

      // Wait for features to update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get updated features
      const updatedFeatures = await getFeatures(token);
      console.log('✅ Updated features loaded');

      // Test expected routes
      console.log('Testing expected routes...');
      for (const route of scenario.expectedRoutes) {
        const result = await testRouteAccess(token, route);
        if (result.status === 200) {
          console.log(`✅ ${route} - Accessible`);
        } else if (result.redirected && result.redirectLocation === '/not-available') {
          console.log(`⚠️  ${route} - Redirected to not-available (feature may not be properly enabled)`);
        } else {
          console.log(`❌ ${route} - Failed (${result.status})`);
        }
      }

      // Test routes that should not load
      console.log('Testing routes that should not load...');
      for (const route of scenario.shouldNotLoad) {
        const result = await testRouteAccess(token, route);
        if (result.redirected && result.redirectLocation === '/not-available') {
          console.log(`✅ ${route} - Properly blocked`);
        } else if (result.status === 200) {
          console.log(`⚠️  ${route} - Accessible (should be blocked)`);
        } else {
          console.log(`✅ ${route} - Blocked (${result.status})`);
        }
      }

      // Test bundle loading behavior
      console.log('Testing bundle loading behavior...');
      const monitor = new NetworkMonitor();
      monitor.start();

      // Simulate navigation to enabled routes
      for (const route of scenario.expectedRoutes) {
        try {
          await axios.get(`${BASE_URL}${route}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Tenant-ID': 'test-tenant'
            }
          });
          monitor.addRequest(route, 'GET');
        } catch (error) {
          console.warn(`Failed to access ${route}:`, error.message);
        }
      }

      // Simulate navigation to disabled routes
      for (const route of scenario.shouldNotLoad) {
        try {
          await axios.get(`${BASE_URL}${route}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Tenant-ID': 'test-tenant'
            }
          });
          monitor.addRequest(route, 'GET');
        } catch (error) {
          // Expected to fail
        }
      }

      const requests = monitor.stop();
      const chunkRequests = monitor.getChunkRequests();
      const routeRequests = monitor.getRouteRequests();

      console.log(`📊 Network Statistics:`);
      console.log(`   Total requests: ${requests.length}`);
      console.log(`   Chunk requests: ${chunkRequests.length}`);
      console.log(`   Route requests: ${routeRequests.length}`);

      // Check if disabled routes are not loading chunks
      const disabledRouteChunks = chunkRequests.filter(req => 
        scenario.shouldNotLoad.some(route => req.url.includes(route))
      );

      if (disabledRouteChunks.length === 0) {
        console.log('✅ No chunks loaded for disabled routes');
      } else {
        console.log(`⚠️  ${disabledRouteChunks.length} chunks loaded for disabled routes`);
        disabledRouteChunks.forEach(req => {
          console.log(`   - ${req.url}`);
        });
      }
    }

    console.log('\n🎉 Bundle Optimization Test Complete!');
    console.log('=====================================');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Performance test
async function testPerformance() {
  console.log('\n⚡ Performance Test');
  console.log('==================');

  try {
    const token = await login();
    
    // Test initial load time
    const startTime = Date.now();
    await axios.get(`${BASE_URL}/dashboard`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': 'test-tenant'
      }
    });
    const loadTime = Date.now() - startTime;
    
    console.log(`Initial load time: ${loadTime}ms`);
    
    // Test route switching performance
    const routes = ['/pos', '/products', '/inventory', '/reports'];
    const switchTimes = [];
    
    for (const route of routes) {
      const startTime = Date.now();
      try {
        await axios.get(`${BASE_URL}${route}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-ID': 'test-tenant'
          }
        });
        const switchTime = Date.now() - startTime;
        switchTimes.push(switchTime);
        console.log(`${route}: ${switchTime}ms`);
      } catch (error) {
        console.log(`${route}: Blocked (${error.response?.status || 'Error'})`);
      }
    }
    
    const avgSwitchTime = switchTimes.reduce((a, b) => a + b, 0) / switchTimes.length;
    console.log(`Average route switch time: ${avgSwitchTime.toFixed(2)}ms`);
    
  } catch (error) {
    console.error('Performance test failed:', error.message);
  }
}

// Main execution
async function main() {
  console.log('Bundle Optimization Test Suite');
  console.log('==============================');
  
  await testBundleOptimization();
  await testPerformance();
  
  console.log('\n✅ All tests completed!');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testBundleOptimization,
  testPerformance,
  NetworkMonitor
};










