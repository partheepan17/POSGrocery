const fetch = require('node-fetch');

async function testHealth() {
  try {
    const response = await fetch('http://localhost:8250/api/health');
    const data = await response.json();
    console.log('Health check:', response.status, data);
  } catch (error) {
    console.log('Health check failed:', error.message);
  }
}

testHealth();
