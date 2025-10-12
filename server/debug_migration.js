const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

async function debugMigration() {
  try {
    const dbPath = path.join(__dirname, 'data', 'pos-grocery.db');
    console.log('Database path:', dbPath);
    
    const db = new Database(dbPath);
    
    // Check migration table
    console.log('1. Checking migration table...');
    const migrations = db.prepare('SELECT * FROM _migrations ORDER BY id').all();
    console.log('Migrations:', migrations.length);
    migrations.forEach(m => {
      console.log(`  - ${m.id}: ${m.name}`);
    });
    
    // Check if the problematic migration is there
    const problemMigration = db.prepare('SELECT * FROM _migrations WHERE name = ?').get('017_categories_constraints.sql');
    console.log('Problem migration:', problemMigration);
    
    // Check indexes
    console.log('2. Checking indexes...');
    const indexes = db.prepare(`
      SELECT name, sql FROM sqlite_master 
      WHERE type='index' AND name LIKE '%categories%'
    `).all();
    console.log('Category indexes:', indexes.length);
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${idx.sql}`);
    });
    
    // Try to run the migration manually
    console.log('3. Testing migration manually...');
    try {
      const migrationPath = path.join(__dirname, 'db', 'migrations', '017_categories_constraints.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      console.log('Migration SQL:', migrationSQL);
      
      // Try to execute the migration
      db.exec(migrationSQL);
      console.log('✓ Migration executed successfully');
    } catch (error) {
      console.log('✗ Migration failed:', error.message);
    }
    
    db.close();
    
  } catch (error) {
    console.log('✗ Error:', error.message);
  }
}

debugMigration();
