const Database = require('better-sqlite3');
const path = require('path');

async function debugPosDb() {
  try {
    const dbPath = path.join(__dirname, 'data', 'pos.db');
    console.log('Database path:', dbPath);
    
    const db = new Database(dbPath);
    
    // Check if database exists and is accessible
    console.log('1. Testing database connection...');
    const testQuery = db.prepare('SELECT 1 as test').get();
    console.log('Database test query result:', testQuery);
    
    // Check migration table
    console.log('2. Checking migration table...');
    const migrations = db.prepare('SELECT * FROM _migrations ORDER BY id').all();
    console.log('Total migrations in database:', migrations.length);
    
    // Check specific migration
    const problemMigration = '017_categories_constraints.sql';
    const problemMigrationRecord = db.prepare('SELECT * FROM _migrations WHERE name = ?').get(problemMigration);
    console.log(`Migration ${problemMigration} record:`, problemMigrationRecord);
    
    // Check if the index exists
    const indexExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='index' AND name = 'idx_categories_name_unique'
    `).get();
    console.log('Index exists:', !!indexExists);
    
    // Check categories table
    console.log('3. Checking categories table...');
    const categories = db.prepare('SELECT COUNT(*) as count FROM categories').get();
    console.log('Categories count:', categories.count);
    
    // Check for duplicate category names
    const duplicates = db.prepare(`
      SELECT LOWER(name) as lower_name, COUNT(*) as count 
      FROM categories 
      GROUP BY LOWER(name) 
      HAVING COUNT(*) > 1
    `).all();
    console.log('Duplicate category names:', duplicates);
    
    db.close();
    
  } catch (error) {
    console.log('✗ Error:', error.message);
  }
}

debugPosDb();
