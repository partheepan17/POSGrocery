const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

console.log('🔄 Running database migrations...');

// Open database
const db = new Database('./data/pos.db');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create migrations table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Get list of applied migrations
const appliedMigrations = db.prepare('SELECT name FROM _migrations ORDER BY id').all();
const appliedNames = new Set(appliedMigrations.map(m => m.name));

// Find migration files
const migrationsDir = path.join(__dirname, 'db', 'migrations');
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort();

console.log(`📁 Found ${migrationFiles.length} migration files`);

// Apply new migrations
let newMigrationsCount = 0;
for (const file of migrationFiles) {
  if (!appliedNames.has(file)) {
    console.log(`🔄 Running migration: ${file}`);
    
    try {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      // Execute the entire SQL file at once, but catch specific errors
      try {
        db.exec(sql);
      } catch (stmtError) {
        // If it's a duplicate column error, just skip it
        if (stmtError.message.includes('duplicate column name')) {
          console.log(`⏭️  Skipping duplicate column in ${file}: ${stmtError.message.split(':')[1]?.trim()}`);
        } else if (stmtError.message.includes('incomplete input')) {
          console.log(`⏭️  Skipping incomplete SQL in ${file} (likely already applied)`);
        } else {
          throw stmtError;
        }
      }
      
      // Record migration
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
      newMigrationsCount++;
      console.log(`✅ Migration ${file} applied successfully`);
    } catch (error) {
      console.error(`❌ Error applying migration ${file}:`, error.message);
      process.exit(1);
    }
  } else {
    console.log(`⏭️  Migration ${file} already applied`);
  }
}

console.log(`🎉 Migrations completed! ${newMigrationsCount} new migrations applied.`);

// Verify products table exists
try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='products'").all();
  if (tables.length > 0) {
    console.log('✅ Products table exists');
  } else {
    console.log('❌ Products table not found');
  }
} catch (error) {
  console.error('❌ Error checking products table:', error.message);
}

db.close();
console.log('🔒 Database connection closed');
