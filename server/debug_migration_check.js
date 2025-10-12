const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

async function debugMigrationCheck() {
  try {
    const dbPath = path.join(__dirname, 'data', 'pos-grocery.db');
    console.log('Database path:', dbPath);
    
    const db = new Database(dbPath);
    
    // Simulate the exact migration system logic
    console.log('1. Simulating migration system logic...');
    
    // Get list of applied migrations
    const appliedMigrations = db.prepare('SELECT name FROM _migrations ORDER BY id').all();
    const appliedNames = new Set(appliedMigrations.map(m => m.name));
    console.log('Applied migrations count:', appliedNames.size);
    
    // Check specific migration
    const targetMigration = '017_categories_constraints.sql';
    console.log(`Target migration: ${targetMigration}`);
    console.log(`In applied names: ${appliedNames.has(targetMigration)}`);
    
    // Find migration files - try both compiled and source locations
    let migrationsDir = path.join(__dirname, 'migrations');
    console.log('Trying migrations dir:', migrationsDir);
    console.log('Exists:', fs.existsSync(migrationsDir));
    
    if (!fs.existsSync(migrationsDir)) {
      // Try source location if compiled location doesn't exist
      migrationsDir = path.join(process.cwd(), 'server', 'db', 'migrations');
      console.log('Trying source dir:', migrationsDir);
      console.log('Exists:', fs.existsSync(migrationsDir));
    }
    
    if (!fs.existsSync(migrationsDir)) {
      console.log('No migrations directory found');
      return;
    }
    
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log('Migration files count:', migrationFiles.length);
    
    // Check which files are not applied
    const unapplied = migrationFiles.filter(file => !appliedNames.has(file));
    console.log('Unapplied migrations count:', unapplied.length);
    
    if (unapplied.length > 0) {
      console.log('Unapplied migrations:');
      unapplied.forEach(file => console.log(`  - ${file}`));
    }
    
    // Check if the target migration would be processed
    console.log(`\n2. Would target migration be processed?`);
    console.log(`In applied names: ${appliedNames.has(targetMigration)}`);
    console.log(`In migration files: ${migrationFiles.includes(targetMigration)}`);
    console.log(`Would be processed: ${!appliedNames.has(targetMigration)}`);
    
    // Check if there are any differences in the migration files
    console.log('\n3. Checking migration file differences...');
    const sourceDir = path.join(process.cwd(), 'server', 'db', 'migrations');
    const distDir = path.join(__dirname, 'migrations');
    
    console.log('Source dir exists:', fs.existsSync(sourceDir));
    console.log('Dist dir exists:', fs.existsSync(distDir));
    
    if (fs.existsSync(sourceDir) && fs.existsSync(distDir)) {
      const sourceFiles = fs.readdirSync(sourceDir).filter(f => f.endsWith('.sql')).sort();
      const distFiles = fs.readdirSync(distDir).filter(f => f.endsWith('.sql')).sort();
      
      console.log('Source files count:', sourceFiles.length);
      console.log('Dist files count:', distFiles.length);
      
      const differences = sourceFiles.filter(f => !distFiles.includes(f));
      if (differences.length > 0) {
        console.log('Files in source but not in dist:', differences);
      }
      
      const distDifferences = distFiles.filter(f => !sourceFiles.includes(f));
      if (distDifferences.length > 0) {
        console.log('Files in dist but not in source:', distDifferences);
      }
    }
    
    db.close();
    
  } catch (error) {
    console.log('✗ Error:', error.message);
  }
}

debugMigrationCheck();