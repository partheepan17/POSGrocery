const Database = require('better-sqlite3');

try {
  const db = new Database('./data/pos-grocery.db');
  
  console.log('📊 Database Tables:');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  tables.forEach(table => console.log(`  - ${table.name}`));
  
  console.log('\n📋 Suppliers Table Schema:');
  const suppliersSchema = db.prepare('PRAGMA table_info(suppliers)').all();
  suppliersSchema.forEach(col => console.log(`  - ${col.name}: ${col.type} (nullable: ${col.notnull === 0})`));
  
  console.log('\n📋 Categories Table Schema:');
  const categoriesSchema = db.prepare('PRAGMA table_info(categories)').all();
  categoriesSchema.forEach(col => console.log(`  - ${col.name}: ${col.type} (nullable: ${col.notnull === 0})`));
  
  console.log('\n🔍 Applied Migrations:');
  const migrations = db.prepare('SELECT name FROM _migrations ORDER BY name').all();
  migrations.forEach(migration => console.log(`  - ${migration.name}`));
  
  db.close();
} catch (error) {
  console.error('❌ Database check failed:', error.message);
}
