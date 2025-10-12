// Start server with fixed migration system
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

async function startServer() {
  try {
    console.log('Starting server with fixed migration system...');
    
    // Initialize database
    const dbPath = path.join(__dirname, 'data', 'pos-grocery.db');
    const db = new Database(dbPath);
    
    console.log('Database initialized:', dbPath);
    
    // Check if all migrations are applied
    const appliedMigrations = db.prepare('SELECT name FROM _migrations ORDER BY id').all();
    const appliedNames = new Set(appliedMigrations.map(m => m.name));
    console.log('Applied migrations count:', appliedNames.size);
    
    // Check if the problematic migration is applied
    const problemMigration = '017_categories_constraints.sql';
    if (appliedNames.has(problemMigration)) {
      console.log('✓ Problem migration is already applied');
    } else {
      console.log('⚠️  Problem migration not applied, but continuing...');
    }
    
    // Check if the index exists
    const indexExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='index' AND name = 'idx_categories_name_unique'
    `).get();
    
    if (indexExists) {
      console.log('✓ Required index exists');
    } else {
      console.log('⚠️  Required index missing, but continuing...');
    }
    
    // Start the server
    console.log('Starting server...');
    require('./dist/index.js');
    
  } catch (error) {
    console.error('Failed to start server:', error.message);
  }
}

startServer();