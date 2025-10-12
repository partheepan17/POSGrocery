const Database = require('better-sqlite3');
const path = require('path');

async function markMigrationApplied() {
  try {
    const dbPath = path.join(__dirname, 'data', 'pos-grocery.db');
    console.log('Database path:', dbPath);
    
    const db = new Database(dbPath);
    
    // Check if migration is already applied
    const migration = db.prepare(`
      SELECT name FROM _migrations WHERE name = '017_categories_constraints.sql'
    `).get();
    
    if (migration) {
      console.log('Migration already applied:', migration.name);
    } else {
      // Mark migration as applied
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run('017_categories_constraints.sql');
      console.log('✓ Migration marked as applied');
    }
    
    // Check all applied migrations
    const migrations = db.prepare('SELECT name FROM _migrations ORDER BY id').all();
    console.log('Applied migrations:', migrations.length);
    migrations.forEach(m => {
      console.log(`  - ${m.name}`);
    });
    
    db.close();
    
  } catch (error) {
    console.log('✗ Error:', error.message);
  }
}

markMigrationApplied();
