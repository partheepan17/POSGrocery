const db = require('better-sqlite3')('data/pos-grocery.db');

console.log('All tables:');
const tables = db.prepare('SELECT name FROM sqlite_master WHERE type=\'table\'').all();
console.log(tables.map(t => t.name));

console.log('\nMigrations table:');
try {
  const migrations = db.prepare('SELECT * FROM _migrations ORDER BY id').all();
  console.log(migrations);
} catch (error) {
  console.log('No _migrations table found:', error.message);
}

db.close();