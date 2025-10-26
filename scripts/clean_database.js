// Simple database cleanup script
// This script can be run with: node -e "require('./scripts/clean_database.js')"

const fs = require('fs');
const path = require('path');

console.log('🧹 Starting database cleanup...');

// Delete the database file
const dbPath = path.join(__dirname, '../data/pos.db');
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('✅ Database file deleted');
} else {
  console.log('ℹ️  Database file does not exist');
}

// Delete any backup files
const backupDir = path.join(__dirname, '../data/backups');
if (fs.existsSync(backupDir)) {
  const files = fs.readdirSync(backupDir);
  files.forEach(file => {
    if (file.endsWith('.db')) {
      fs.unlinkSync(path.join(backupDir, file));
      console.log(`✅ Deleted backup file: ${file}`);
    }
  });
}

console.log('🎯 Database cleanup complete');
console.log('💡 Now start the server with: npm run dev:server');
console.log('👤 The server will create a fresh database with admin user (admin/1234)');









