const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

async function fixMigrationSystem() {
  try {
    const dbPath = path.join(__dirname, 'data', 'pos-grocery.db');
    console.log('Database path:', dbPath);
    
    const db = new Database(dbPath);
    
    // Check current migration status
    console.log('1. Checking current migration status...');
    const migrations = db.prepare('SELECT name FROM _migrations ORDER BY id').all();
    const appliedNames = new Set(migrations.map(m => m.name));
    console.log('Applied migrations:', appliedNames.size);
    
    // Check if the problematic migration is marked as applied
    const problemMigration = '017_categories_constraints.sql';
    const isApplied = appliedNames.has(problemMigration);
    console.log(`Migration ${problemMigration} applied:`, isApplied);
    
    // Check if the index exists
    const indexExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='index' AND name = 'idx_categories_name_unique'
    `).get();
    console.log('Index exists:', !!indexExists);
    
    if (isApplied && indexExists) {
      console.log('2. Migration is applied and index exists. This should work.');
    } else if (!isApplied && !indexExists) {
      console.log('2. Migration not applied and index missing. Applying migration...');
      
      // Apply the migration
      const migrationPath = path.join(__dirname, 'db', 'migrations', problemMigration);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      try {
        db.exec(migrationSQL);
        db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(problemMigration);
        console.log('✓ Migration applied successfully');
      } catch (error) {
        console.log('✗ Migration failed:', error.message);
      }
    } else if (!isApplied && indexExists) {
      console.log('2. Migration not applied but index exists. Marking as applied...');
      
      // Mark migration as applied
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(problemMigration);
      console.log('✓ Migration marked as applied');
    } else if (isApplied && !indexExists) {
      console.log('2. Migration applied but index missing. This is inconsistent.');
      
      // Try to create the index
      try {
        db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_unique ON categories(LOWER(name))');
        console.log('✓ Index created successfully');
      } catch (error) {
        console.log('✗ Index creation failed:', error.message);
      }
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

fixMigrationSystem();
