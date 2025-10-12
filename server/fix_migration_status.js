const Database = require('better-sqlite3');
const path = require('path');

async function fixMigrationStatus() {
  try {
    const dbPath = path.join(__dirname, 'data', 'pos-grocery.db');
    console.log('Database path:', dbPath);
    
    const db = new Database(dbPath);
    
    // Check current migration status
    console.log('1. Checking current migration status...');
    const migrations = db.prepare('SELECT name FROM _migrations ORDER BY id').all();
    console.log('Applied migrations:', migrations.length);
    
    // Check if the problematic migration is marked as applied
    const problemMigration = db.prepare(`
      SELECT name FROM _migrations WHERE name = '017_categories_constraints.sql'
    `).get();
    
    console.log('Problem migration applied:', !!problemMigration);
    
    // Check if the index actually exists
    const indexExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='index' AND name = 'idx_categories_name_unique'
    `).get();
    
    console.log('Index exists:', !!indexExists);
    
    if (indexExists && !problemMigration) {
      console.log('2. Index exists but migration not marked as applied. Fixing...');
      
      // Mark the migration as applied
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run('017_categories_constraints.sql');
      console.log('✓ Migration marked as applied');
    } else if (!indexExists && problemMigration) {
      console.log('2. Migration marked as applied but index missing. Fixing...');
      
      // Remove the migration record
      db.prepare('DELETE FROM _migrations WHERE name = ?').run('017_categories_constraints.sql');
      console.log('✓ Migration record removed');
    } else if (indexExists && problemMigration) {
      console.log('2. Both index and migration record exist. This should work.');
    } else {
      console.log('2. Neither index nor migration record exist. This is expected.');
    }
    
    // Final check
    console.log('3. Final status check...');
    const finalMigrations = db.prepare('SELECT name FROM _migrations ORDER BY id').all();
    console.log('Total applied migrations:', finalMigrations.length);
    
    const finalIndex = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='index' AND name = 'idx_categories_name_unique'
    `).get();
    
    console.log('Index exists:', !!finalIndex);
    
    db.close();
    
  } catch (error) {
    console.log('✗ Error:', error.message);
  }
}

fixMigrationStatus();
