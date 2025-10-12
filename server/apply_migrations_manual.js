const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

try {
  const db = new Database('./data/pos-grocery.db');
  
  console.log('🔧 Applying migrations manually...\n');
  
  // Read and apply suppliers enhancement migration
  const suppliersMigration = fs.readFileSync('./db/migrations/027_suppliers_enhancements.sql', 'utf8');
  console.log('📄 Applying suppliers enhancements...');
  
  try {
    db.exec(suppliersMigration);
    console.log('✅ Suppliers migration applied successfully');
  } catch (error) {
    console.log('⚠️ Suppliers migration error (may already be applied):', error.message);
  }
  
  // Read and apply categories enhancement migration
  const categoriesMigration = fs.readFileSync('./db/migrations/028_categories_enhancements.sql', 'utf8');
  console.log('📄 Applying categories enhancements...');
  
  try {
    db.exec(categoriesMigration);
    console.log('✅ Categories migration applied successfully');
  } catch (error) {
    console.log('⚠️ Categories migration error (may already be applied):', error.message);
  }
  
  // Update migrations table
  console.log('📝 Updating migrations table...');
  try {
    db.prepare('INSERT INTO _migrations (name) VALUES (?)').run('027_suppliers_enhancements.sql');
    console.log('✅ Added 027_suppliers_enhancements.sql to migrations table');
  } catch (error) {
    console.log('⚠️ Suppliers migration already recorded:', error.message);
  }
  
  try {
    db.prepare('INSERT INTO _migrations (name) VALUES (?)').run('028_categories_enhancements.sql');
    console.log('✅ Added 028_categories_enhancements.sql to migrations table');
  } catch (error) {
    console.log('⚠️ Categories migration already recorded:', error.message);
  }
  
  console.log('\n📊 Updated Suppliers Table Schema:');
  const suppliersSchema = db.prepare('PRAGMA table_info(suppliers)').all();
  suppliersSchema.forEach(col => console.log(`  - ${col.name}: ${col.type} (nullable: ${col.notnull === 0})`));
  
  console.log('\n📊 Updated Categories Table Schema:');
  const categoriesSchema = db.prepare('PRAGMA table_info(categories)').all();
  categoriesSchema.forEach(col => console.log(`  - ${col.name}: ${col.type} (nullable: ${col.notnull === 0})`));
  
  db.close();
  console.log('\n🎉 Manual migration application completed!');
  
} catch (error) {
  console.error('❌ Manual migration failed:', error.message);
}
