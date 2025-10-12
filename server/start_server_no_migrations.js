// Start server without running migrations
const Database = require('better-sqlite3');
const path = require('path');

async function startServer() {
  try {
    console.log('Starting server without migrations...');
    
    // Initialize database without migrations
    const dbPath = path.join(__dirname, 'data', 'pos-grocery.db');
    const db = new Database(dbPath);
    
    console.log('Database initialized:', dbPath);
    
    // Start the actual server
    const { initDatabase } = require('./dist/db/index');
    
    // Override the migration system to skip migrations
    const originalInitDatabase = initDatabase;
    initDatabase = async () => {
      console.log('Skipping migrations...');
      return db;
    };
    
    // Start the server
    require('./dist/index.js');
    
  } catch (error) {
    console.error('Failed to start server:', error.message);
  }
}

startServer();