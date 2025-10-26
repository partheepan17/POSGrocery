#!/usr/bin/env node

/**
 * Test Realtime Updates
 * Verifies that feature toggling emits events and subscribers receive them
 */

const http = require('http');
const https = require('https');
const EventSource = require('eventsource');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_TENANT = 'test-tenant';

// Test user credentials
const TEST_USER = {
  username: 'admin',
  password: 'admin123'
};

let authToken = null;
let sseConnection = null;
let receivedEvents = [];
let testResults = [];

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
 * Set up SSE connection
 */
async function setupSSEConnection() {
  console.log('\n📡 Setting up SSE connection...');
  
  return new Promise((resolve, reject) => {
    const sseUrl = `${BASE_URL}/api/realtime/events/${TEST_TENANT}?token=${authToken}`;
    
    try {
      sseConnection = new EventSource(sseUrl);
      
      sseConnection.onopen = () => {
        console.log('✅ SSE connection established');
        resolve(true);
      };
      
      sseConnection.onerror = (error) => {
        console.log('❌ SSE connection error:', error);
        reject(error);
      };
      
      sseConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          receivedEvents.push({
            type: event.type || 'message',
            data,
            timestamp: new Date().toISOString()
          });
          
          console.log(`📨 Received event: ${event.type || 'message'}`, data);
        } catch (error) {
          console.log('⚠️ Failed to parse SSE message:', event.data);
        }
      };
      
      // Listen for specific events
      sseConnection.addEventListener('features:update', (event) => {
        try {
          const data = JSON.parse(event.data);
          receivedEvents.push({
            type: 'features:update',
            data,
            timestamp: new Date().toISOString()
          });
          
          console.log('🎯 Features update event received:', data);
        } catch (error) {
          console.log('⚠️ Failed to parse features update event:', event.data);
        }
      });
      
      sseConnection.addEventListener('connected', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('🔗 Connected to realtime stream:', data);
        } catch (error) {
          console.log('⚠️ Failed to parse connection event:', event.data);
        }
      });
      
      sseConnection.addEventListener('heartbeat', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('💓 Heartbeat received:', data.timestamp);
        } catch (error) {
          console.log('⚠️ Failed to parse heartbeat event:', event.data);
        }
      });
      
    } catch (error) {
      console.log('❌ Failed to create SSE connection:', error.message);
      reject(error);
    }
  });
}

/**
 * Test feature toggling
 */
async function testFeatureToggle() {
  console.log('\n🧪 Testing feature toggle...');
  
  try {
    // Toggle a test feature
    const response = await makeRequest({
      method: 'POST',
      path: '/api/features/toggle',
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

    console.log('✅ Feature toggle successful');
    console.log('   Response:', response.data.data);

    // Wait a moment for the event to be received
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if we received the features:update event
    const featuresUpdateEvents = receivedEvents.filter(e => e.type === 'features:update');
    
    if (featuresUpdateEvents.length > 0) {
      console.log('✅ Features update event received');
      console.log('   Event data:', featuresUpdateEvents[featuresUpdateEvents.length - 1].data);
      return true;
    } else {
      console.log('❌ No features update event received');
      console.log('   Received events:', receivedEvents.map(e => e.type));
      return false;
    }

  } catch (error) {
    console.log('❌ Feature toggle test failed:', error.message);
    return false;
  }
}

/**
 * Test bulk feature toggle
 */
async function testBulkFeatureToggle() {
  console.log('\n🧪 Testing bulk feature toggle...');
  
  try {
    const response = await makeRequest({
      method: 'POST',
      path: '/api/features/bulk-toggle',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        features: [
          { featureCode: 'inventory.view', isEnabled: true },
          { featureCode: 'reports.view', isEnabled: false }
        ]
      })
    });

    console.log(`   Status: ${response.statusCode}`);

    if (response.statusCode !== 200) {
      console.log('❌ Bulk feature toggle failed:', response.data?.error);
      return false;
    }

    if (!response.data?.ok) {
      console.log('❌ Bulk feature toggle response indicates failure');
      return false;
    }

    console.log('✅ Bulk feature toggle successful');
    console.log('   Summary:', response.data.data.summary);

    // Wait a moment for the event to be received
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if we received the features:update event
    const featuresUpdateEvents = receivedEvents.filter(e => e.type === 'features:update');
    
    if (featuresUpdateEvents.length > 0) {
      console.log('✅ Features update event received for bulk operation');
      return true;
    } else {
      console.log('❌ No features update event received for bulk operation');
      return false;
    }

  } catch (error) {
    console.log('❌ Bulk feature toggle test failed:', error.message);
    return false;
  }
}

/**
 * Test realtime status endpoint
 */
async function testRealtimeStatus() {
  console.log('\n🧪 Testing realtime status endpoint...');
  
  try {
    const response = await makeRequest({
      method: 'GET',
      path: '/api/realtime/status',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    console.log(`   Status: ${response.statusCode}`);

    if (response.statusCode !== 200) {
      console.log('❌ Realtime status failed:', response.data?.error);
      return false;
    }

    if (!response.data?.ok) {
      console.log('❌ Realtime status response indicates failure');
      return false;
    }

    console.log('✅ Realtime status retrieved');
    console.log('   Data:', response.data.data);

    return true;

  } catch (error) {
    console.log('❌ Realtime status test failed:', error.message);
    return false;
  }
}

/**
 * Test sending test message
 */
async function testSendMessage() {
  console.log('\n🧪 Testing send test message...');
  
  try {
    const response = await makeRequest({
      method: 'GET',
      path: `/api/realtime/test/${TEST_TENANT}?message=Test message from test script`,
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    console.log(`   Status: ${response.statusCode}`);

    if (response.statusCode !== 200) {
      console.log('❌ Send test message failed:', response.data?.error);
      return false;
    }

    if (!response.data?.ok) {
      console.log('❌ Send test message response indicates failure');
      return false;
    }

    console.log('✅ Test message sent');
    console.log('   Response:', response.data.data);

    // Wait a moment for the message to be received
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if we received the test message
    const testEvents = receivedEvents.filter(e => e.data?.message?.includes('Test message from test script'));
    
    if (testEvents.length > 0) {
      console.log('✅ Test message received via SSE');
      return true;
    } else {
      console.log('❌ Test message not received via SSE');
      return false;
    }

  } catch (error) {
    console.log('❌ Send test message failed:', error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Realtime Updates Tests');
  console.log(`📍 Testing against: ${BASE_URL}`);
  console.log(`🏢 Test tenant: ${TEST_TENANT}`);

  // Authenticate first
  const authSuccess = await authenticate();
  if (!authSuccess) {
    console.log('\n💥 Authentication failed. Cannot proceed with tests.');
    process.exit(1);
  }

  // Set up SSE connection
  try {
    await setupSSEConnection();
  } catch (error) {
    console.log('\n💥 Failed to set up SSE connection. Cannot proceed with tests.');
    process.exit(1);
  }

  const results = [];
  
  // Test realtime status
  const statusTest = await testRealtimeStatus();
  results.push({ name: 'Realtime Status', passed: statusTest });
  
  // Test feature toggle
  const toggleTest = await testFeatureToggle();
  results.push({ name: 'Feature Toggle', passed: toggleTest });
  
  // Test bulk feature toggle
  const bulkToggleTest = await testBulkFeatureToggle();
  results.push({ name: 'Bulk Feature Toggle', passed: bulkToggleTest });
  
  // Test send message
  const messageTest = await testSendMessage();
  results.push({ name: 'Send Test Message', passed: messageTest });

  // Close SSE connection
  if (sseConnection) {
    sseConnection.close();
    console.log('\n📡 SSE connection closed');
  }

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
  
  console.log('\n📨 Events Received:');
  receivedEvents.forEach((event, index) => {
    console.log(`   ${index + 1}. ${event.type} - ${event.timestamp}`);
  });
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Realtime updates are working correctly.');
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










