console.log('Testing server startup...');

// Test 1: Check if we can import the main server file
try {
  console.log('1. Testing imports...');
  const express = require('express');
  console.log('   ✓ Express imported');
  
  const cors = require('cors');
  console.log('   ✓ CORS imported');
  
  const Database = require('better-sqlite3');
  console.log('   ✓ Better-sqlite3 imported');
  
} catch (error) {
  console.error('   ✗ Import failed:', error.message);
  process.exit(1);
}

// Test 2: Check database connection
try {
  console.log('2. Testing database...');
  const Database = require('better-sqlite3');
  const db = new Database('./data/pos.db');
  console.log('   ✓ Database opened');
  
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('   ✓ Tables found:', tables.length);
  
  db.close();
  console.log('   ✓ Database closed');
  
} catch (error) {
  console.error('   ✗ Database test failed:', error.message);
  process.exit(1);
}

// Test 3: Test basic Express server
try {
  console.log('3. Testing Express server...');
  const express = require('express');
  const app = express();
  
  app.get('/test', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  const server = app.listen(8250, () => {
    console.log('   ✓ Server listening on port 8250');
    
    // Test the endpoint
    const http = require('http');
    const req = http.get('http://localhost:8250/test', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('   ✓ Endpoint test successful:', data);
        server.close();
        console.log('   ✓ Server closed');
        console.log('\nAll tests passed! The issue might be in the application code.');
      });
    });
    
    req.on('error', (err) => {
      console.error('   ✗ Endpoint test failed:', err.message);
      server.close();
    });
  });
  
  server.on('error', (err) => {
    console.error('   ✗ Server failed to start:', err.message);
    process.exit(1);
  });
  
} catch (error) {
  console.error('   ✗ Express test failed:', error.message);
  process.exit(1);
}


