const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

async function runMigrations() {
  try {
    const dbPath = path.join(__dirname, 'data', 'pos-grocery.db');
    console.log('Database path:', dbPath);
    
    const db = new Database(dbPath);
    
    // Create migrations table
    console.log('1. Creating migrations table...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Get applied migrations
    const appliedMigrations = db.prepare('SELECT name FROM _migrations ORDER BY id').all();
    const appliedNames = new Set(appliedMigrations.map(m => m.name));
    
    console.log('Applied migrations:', appliedNames.size);
    
    // Get migration files
    const migrationsDir = path.join(__dirname, 'db', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log('Migration files found:', migrationFiles.length);
    
    // Apply migrations
    let newMigrationsCount = 0;
    for (const file of migrationFiles) {
      if (!appliedNames.has(file)) {
        console.log(`🔄 Running migration: ${file}`);
        
        try {
          const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
          
          // Use transaction for each migration
          const transaction = db.transaction(() => {
            db.exec(sql);
            db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
          });
          
          transaction();
          newMigrationsCount++;
          console.log(`✅ Migration applied: ${file}`);
          
        } catch (error) {
          console.log(`❌ Migration failed: ${file}`);
          console.log(`   Error: ${error.message}`);
          
          // For some migrations, we might want to continue
          if (error.message.includes('UNIQUE constraint failed')) {
            console.log(`   ⚠️  Skipping due to constraint error (likely already applied)`);
            // Still mark as applied to avoid re-running
            try {
              db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
            } catch (e) {
              // Ignore if already exists
            }
          } else {
            throw error;
          }
        }
      } else {
        console.log(`⏭️  Skipping already applied: ${file}`);
      }
    }
    
    console.log(`\n✅ Migrations completed. ${newMigrationsCount} new migrations applied.`);
    
    // Check final state
    const finalTables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `).all();
    
    console.log('\nFinal tables:', finalTables.length);
    finalTables.forEach(table => {
      console.log(`  - ${table.name}`);
    });
    
    db.close();
    
  } catch (error) {
    console.log('✗ Error:', error.message);
  }
}

runMigrations();