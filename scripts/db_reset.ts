import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection
const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/pos.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

async function resetAndSeedAdmin() {
  console.log('🧹 Starting database cleanup …');

  // 🚫 Prevent accidental production wipe
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Aborted – cleanup is blocked in production mode');
    process.exit(1);
  }

  try {
    // --- Transactional wipe ---
    console.log('🗑️  Clearing transactional tables...');
    
    // Delete transactional / volatile tables
    db.exec(`
      DELETE FROM invoice_lines;
      DELETE FROM invoices;
      DELETE FROM inventory_movements;
      DELETE FROM grn_lines;
      DELETE FROM grn;
      DELETE FROM stocktake_sessions;
      DELETE FROM stocktake_items;
      DELETE FROM quick_sales;
      DELETE FROM sales;
      DELETE FROM returns;
      DELETE FROM payments;
      DELETE FROM audit_logs;
      DELETE FROM cash_movements;
      DELETE FROM shifts;
      DELETE FROM hold_items;
      DELETE FROM holds;
    `);

    console.log('🗑️  Clearing master data tables...');
    
    // Delete master data (keep reference tables like roles, features)
    db.exec(`
      DELETE FROM products;
      DELETE FROM suppliers;
      DELETE FROM customers;
      DELETE FROM user_roles;
      DELETE FROM users;
    `);

    console.log('✅ Tables cleared');

    // --- Seed Admin role ---
    console.log('👤 Creating admin role...');
    
    const adminRole = db.prepare(`
      INSERT OR IGNORE INTO roles (code, name, description, is_active)
      VALUES ('ADMIN', 'Administrator', 'System Administrator with full access', 1)
    `).run();

    // Get the admin role ID
    const roleResult = db.prepare('SELECT id FROM roles WHERE code = ?').get('ADMIN') as { id: number };
    const roleId = roleResult.id;

    // --- Seed Admin user ---
    console.log('👤 Creating admin user...');
    
    const hash = await bcrypt.hash('1234', 10);

    const userResult = db.prepare(`
      INSERT INTO users (username, full_name, email, password_hash, is_active, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run('admin', 'System Administrator', 'admin@virtualpos.local', hash, 1, 'admin');

    const userId = userResult.lastInsertRowid as number;

    // Assign admin role to user
    db.prepare(`
      INSERT INTO user_roles (user_id, role_id)
      VALUES (?, ?)
    `).run(userId, roleId);

    console.log('👤 Admin user created → username: admin | password: 1234');
    console.log('🎯 Cleanup and seed complete');

    // Close database connection
    db.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    db.close();
    process.exit(1);
  }
}

resetAndSeedAdmin().catch((err) => {
  console.error('❌ Error during cleanup:', err);
  db.close();
  process.exit(1);
});
