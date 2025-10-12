// Debug __dirname resolution
const path = require('path');
const fs = require('fs');

console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);
console.log('__filename:', __filename);

// Test the migration directory paths
const migrationsDir1 = path.join(__dirname, 'migrations');
const migrationsDir2 = path.join(process.cwd(), 'server', 'db', 'migrations');

console.log('Migrations dir 1 (__dirname/migrations):', migrationsDir1);
console.log('Exists:', fs.existsSync(migrationsDir1));

console.log('Migrations dir 2 (cwd/server/db/migrations):', migrationsDir2);
console.log('Exists:', fs.existsSync(migrationsDir2));

// Check what's in the current directory
console.log('Contents of __dirname:');
try {
  const contents = fs.readdirSync(__dirname);
  contents.forEach(item => {
    const fullPath = path.join(__dirname, item);
    const isDir = fs.statSync(fullPath).isDirectory();
    console.log(`  ${isDir ? '[DIR]' : '[FILE]'} ${item}`);
  });
} catch (error) {
  console.log('Error reading directory:', error.message);
}
