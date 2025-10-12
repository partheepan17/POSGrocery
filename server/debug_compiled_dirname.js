// Debug __dirname resolution in compiled code
const path = require('path');
const fs = require('fs');

console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);
console.log('__filename:', __filename);

// Test the migration directory paths (same as compiled code)
let migrationsDir = path.join(__dirname, 'migrations');
console.log('Migrations dir 1 (__dirname/migrations):', migrationsDir);
console.log('Exists:', fs.existsSync(migrationsDir));

if (!fs.existsSync(migrationsDir)) {
  // Try compiled location (dist/db/migrations)
  migrationsDir = path.join(__dirname, 'dist', 'db', 'migrations');
  console.log('Migrations dir 2 (__dirname/dist/db/migrations):', migrationsDir);
  console.log('Exists:', fs.existsSync(migrationsDir));
  
  if (!fs.existsSync(migrationsDir)) {
    // Try source location if compiled location doesn't exist
    migrationsDir = path.join(process.cwd(), 'server', 'db', 'migrations');
    console.log('Migrations dir 3 (cwd/server/db/migrations):', migrationsDir);
    console.log('Exists:', fs.existsSync(migrationsDir));
  }
}

if (fs.existsSync(migrationsDir)) {
  console.log('✓ Found migrations directory:', migrationsDir);
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
  console.log('Migration files count:', files.length);
} else {
  console.log('✗ No migrations directory found');
}
