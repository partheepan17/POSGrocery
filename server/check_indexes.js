const Database = require('better-sqlite3');
const path = require('path');

async function checkIndexes() {
  try {
    const dbPath = path.join(__dirname, 'data', 'pos-grocery.db');
    console.log('Database path:', dbPath);
    
    const db = new Database(dbPath);
    
    // Check existing indexes
    console.log('1. Checking existing indexes...');
    const indexes = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='index' AND name LIKE '%categories%'
    `).all();
    
    console.log('Category indexes found:', indexes.length);
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}`);
    });
    
    // Check if the unique index exists
    const uniqueIndex = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='index' AND name = 'idx_categories_name_unique'
    `).get();
    
    console.log('Unique index exists:', !!uniqueIndex);
    
    // Check categories data
    console.log('2. Checking categories data...');
    const categories = db.prepare('SELECT id, name FROM categories ORDER BY name').all();
    console.log('Categories found:', categories.length);
    categories.forEach(cat => {
      console.log(`  - ID: ${cat.id}, Name: "${cat.name}"`);
    });
    
    // Check for duplicates (case-insensitive)
    console.log('3. Checking for case-insensitive duplicates...');
    const duplicates = db.prepare(`
      SELECT LOWER(name) as lower_name, COUNT(*) as count
      FROM categories 
      GROUP BY LOWER(name) 
      HAVING COUNT(*) > 1
    `).all();
    
    console.log('Case-insensitive duplicates found:', duplicates.length);
    duplicates.forEach(dup => {
      console.log(`  - "${dup.lower_name}" appears ${dup.count} times`);
    });
    
    db.close();
    
  } catch (error) {
    console.log('✗ Error:', error.message);
  }
}

checkIndexes();
