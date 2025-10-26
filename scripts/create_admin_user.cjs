// Simple script to create admin user after server starts
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');

async function createAdminUser() {
  console.log('👤 Creating admin user...');
  
  const dbPath = path.join(__dirname, '../data/pos.db');
  
  // Wait for database to be created
  let db;
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    try {
      if (require('fs').existsSync(dbPath)) {
        db = new Database(dbPath);
        break;
      }
    } catch (error) {
      // Database not ready yet
    }
    
    console.log(`⏳ Waiting for database... (${attempts + 1}/${maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }
  
  if (!db) {
    console.error('❌ Database not found after 30 seconds');
    return;
  }
  
  try {
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Clear existing users
    console.log('🗑️  Clearing existing users...');
    db.exec('DELETE FROM user_roles');
    db.exec('DELETE FROM users');
    
    // Create admin role if it doesn't exist
    console.log('👤 Creating admin role...');
    db.exec(`
      INSERT OR IGNORE INTO roles (code, name, description, is_active)
      VALUES ('ADMIN', 'Administrator', 'System Administrator with full access', 1)
    `);
    
    // Create admin user
    console.log('👤 Creating admin user...');
    const hash = await bcrypt.hash('1234', 10);
    
    const userResult = db.prepare(`
      INSERT INTO users (username, full_name, email, password_hash, is_active, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run('admin', 'System Administrator', 'admin@virtualpos.local', hash, 1, 'admin');
    
    const userId = userResult.lastInsertRowid;
    
    // Assign admin role
    const roleId = db.prepare('SELECT id FROM roles WHERE code = ?').get('ADMIN').id;
    db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)').run(userId, roleId);
    
    console.log('✅ Admin user created successfully!');
    console.log('👤 Username: admin');
    console.log('🔑 Password: 1234');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    if (db) {
      db.close();
    }
  }
}

createAdminUser().catch(console.error);









