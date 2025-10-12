console.log('Starting minimal server...');

const express = require('express');
const cors = require('cors');

console.log('1. Basic imports successful');

const app = express();

console.log('2. Express app created');

// Basic middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:8103', 'http://localhost:8104', 'http://localhost:8105'],
  credentials: true
}));

console.log('3. CORS middleware added');

app.use(express.json());

console.log('4. JSON middleware added');

// Test database connection
try {
  console.log('5. Testing database...');
  const Database = require('better-sqlite3');
  const db = new Database('./data/pos.db');
  console.log('   ✓ Database connected');
  
  // Test a simple query
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('   ✓ Tables found:', tables.length);
  
  db.close();
  console.log('   ✓ Database closed');
} catch (error) {
  console.error('   ✗ Database error:', error.message);
  process.exit(1);
}

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

console.log('6. Health endpoint added');

// Products endpoint
app.get('/api/products', (req, res) => {
  try {
    const Database = require('better-sqlite3');
    const db = new Database('./data/pos.db');
    const products = db.prepare('SELECT * FROM products LIMIT 10').all();
    db.close();
    res.json({ products });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

console.log('7. Products endpoint added');

// Start server
const PORT = 8250;
const server = app.listen(PORT, () => {
  console.log(`8. Server running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Products: http://localhost:${PORT}/api/products`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

console.log('9. Server startup completed');
