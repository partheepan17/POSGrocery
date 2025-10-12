const Database = require('better-sqlite3');
const path = require('path');

async function checkIndexDetails() {
  try {
    const dbPath = path.join(__dirname, 'data', 'pos-grocery.db');
    console.log('Database path:', dbPath);
    
    const db = new Database(dbPath);
    
    // Check existing indexes with their SQL
    console.log('1. Checking existing indexes with SQL...');
    const indexes = db.prepare(`
      SELECT name, sql FROM sqlite_master 
      WHERE type='index' AND name LIKE '%categories%'
    `).all();
    
    console.log('Category indexes found:', indexes.length);
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${idx.sql}`);
    });
    
    // Try to drop the problematic index and recreate it
    console.log('2. Attempting to drop and recreate unique index...');
    try {
      db.exec('DROP INDEX IF EXISTS idx_categories_name_unique');
      console.log('✓ Dropped existing index');
      
      db.exec('CREATE UNIQUE INDEX idx_categories_name_unique ON categories(LOWER(name))');
      console.log('✓ Created new unique index');
    } catch (error) {
      console.log('✗ Error:', error.message);
    }
    
    db.close();
    
  } catch (error) {
    console.log('✗ Error:', error.message);
  }
}

checkIndexDetails();
