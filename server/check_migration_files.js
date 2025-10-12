const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

async function checkMigrationFiles() {
  try {
    const dbPath = path.join(__dirname, 'data', 'pos-grocery.db');
    console.log('Database path:', dbPath);
    
    const db = new Database(dbPath);
    
    // Check applied migrations
    console.log('1. Checking applied migrations...');
    const appliedMigrations = db.prepare('SELECT name FROM _migrations ORDER BY id').all();
    const appliedNames = new Set(appliedMigrations.map(m => m.name));
    console.log('Applied migrations:', appliedNames.size);
    appliedNames.forEach(name => console.log(`  - ${name}`));
    
    // Check migration files
    console.log('2. Checking migration files...');
    const migrationsDir = path.join(__dirname, 'db', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log('Migration files:', migrationFiles.length);
    migrationFiles.forEach(file => console.log(`  - ${file}`));
    
    // Check which files are not applied
    console.log('3. Checking unapplied migrations...');
    const unapplied = migrationFiles.filter(file => !appliedNames.has(file));
    console.log('Unapplied migrations:', unapplied.length);
    unapplied.forEach(file => console.log(`  - ${file}`));
    
    // Check specific migration
    console.log('4. Checking specific migration...');
    const targetMigration = '017_categories_constraints.sql';
    console.log(`Target migration: ${targetMigration}`);
    console.log(`In applied names: ${appliedNames.has(targetMigration)}`);
    console.log(`In migration files: ${migrationFiles.includes(targetMigration)}`);
    
    // Check if there are any case sensitivity issues
    console.log('5. Checking case sensitivity...');
    const caseInsensitiveMatch = migrationFiles.find(file => 
      file.toLowerCase() === targetMigration.toLowerCase()
    );
    console.log(`Case insensitive match: ${caseInsensitiveMatch}`);
    
    db.close();
    
  } catch (error) {
    console.log('✗ Error:', error.message);
  }
}

checkMigrationFiles();
