const Database = require('better-sqlite3');
const path = require('path');

async function fixCategories() {
  try {
    const dbPath = path.join(__dirname, 'data', 'pos-grocery.db');
    console.log('Database path:', dbPath);
    
    const db = new Database(dbPath);
    
    // Check current categories
    console.log('1. Checking current categories...');
    const categories = db.prepare('SELECT id, name FROM categories ORDER BY name').all();
    console.log('Categories found:', categories.length);
    
    categories.forEach(cat => {
      console.log(`  - ID: ${cat.id}, Name: "${cat.name}"`);
    });
    
    // Check for duplicates (case-insensitive)
    console.log('2. Checking for duplicate names...');
    const duplicates = db.prepare(`
      SELECT LOWER(name) as lower_name, COUNT(*) as count
      FROM categories 
      GROUP BY LOWER(name) 
      HAVING COUNT(*) > 1
    `).all();
    
    console.log('Duplicates found:', duplicates.length);
    duplicates.forEach(dup => {
      console.log(`  - "${dup.lower_name}" appears ${dup.count} times`);
    });
    
    // Fix duplicates by adding numbers
    if (duplicates.length > 0) {
      console.log('3. Fixing duplicates...');
      
      for (const dup of duplicates) {
        const cats = db.prepare(`
          SELECT id, name FROM categories 
          WHERE LOWER(name) = ? 
          ORDER BY id
        `).all(dup.lower_name);
        
        console.log(`Fixing duplicates for "${dup.lower_name}":`);
        
        // Keep the first one, rename the rest
        for (let i = 1; i < cats.length; i++) {
          const newName = `${cats[i].name} (${i})`;
          console.log(`  - Renaming ID ${cats[i].id} from "${cats[i].name}" to "${newName}"`);
          
          db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(newName, cats[i].id);
        }
      }
    }
    
    // Now try to create the unique index
    console.log('4. Creating unique index...');
    try {
      db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_unique ON categories(LOWER(name))');
      console.log('✓ Unique index created successfully');
    } catch (error) {
      console.log('✗ Failed to create unique index:', error.message);
    }
    
    db.close();
    
  } catch (error) {
    console.log('✗ Error:', error.message);
  }
}

fixCategories();
