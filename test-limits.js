// Test script for rate limiting and body size limits
const http = require('http');

// Test 1: Normal request (should work)
console.log('Test 1: Normal request');
makeRequest('GET', '/health', null, (res) => {
  console.log(`Status: ${res.statusCode}`);
  if (res.statusCode === 200) {
    console.log('✓ Normal request works');
  }
});

// Test 2: Large payload (should return 413)
console.log('\nTest 2: Large payload');
const largeData = 'x'.repeat(3 * 1024 * 1024); // 3MB
const largePayload = JSON.stringify({ data: largeData });
makeRequest('POST', '/api/health', largePayload, (res) => {
  console.log(`Status: ${res.statusCode}`);
  if (res.statusCode === 413) {
    console.log('✓ Large payload correctly rejected with 413');
  }
});

// Test 3: Rate limiting (make many requests quickly)
console.log('\nTest 3: Rate limiting');
let requestCount = 0;
const maxRequests = 80; // More than the limit (60 + 10 burst)

function makeManyRequests() {
  if (requestCount >= maxRequests) {
    console.log('Rate limiting test completed');
    return;
  }
  
  requestCount++;
  makeRequest('GET', '/health', null, (res) => {
    if (res.statusCode === 429) {
      console.log(`✓ Rate limit hit at request ${requestCount} with status 429`);
    } else if (res.statusCode === 200) {
      console.log(`Request ${requestCount}: OK`);
    }
    
    // Make next request after a short delay
    setTimeout(makeManyRequests, 50);
  });
}

makeManyRequests();

function makeRequest(method, path, data, callback) {
  const options = {
    hostname: 'localhost',
    port: 8250,
    path: path,
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data ? Buffer.byteLength(data) : 0
    }
  };

  const req = http.request(options, (res) => {
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    res.on('end', () => {
      callback(res);
    });
  });

  req.on('error', (err) => {
    console.error('Request error:', err.message);
  });

  if (data) {
    req.write(data);
  }
  req.end();
}




