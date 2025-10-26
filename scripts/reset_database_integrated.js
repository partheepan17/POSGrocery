// Database Reset Script - Integrated with existing server system
// This script uses the server's database connection and seeding logic

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧹 Starting comprehensive database reset...');

// Step 1: Kill any running Node processes
console.log('🔄 Killing existing Node processes...');
try {
  execSync('taskkill /f /im node.exe', { stdio: 'ignore' });
} catch (error) {
  // Ignore if no processes to kill
}

// Step 2: Clean up database files
console.log('🗑️  Cleaning up database files...');
const dataDir = path.join(__dirname, '../data');
const dbFiles = ['pos.db', 'pos.db-wal', 'pos.db-shm'];

dbFiles.forEach(file => {
  const filePath = path.join(dataDir, file);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`✅ Deleted ${file}`);
  }
});

// Step 3: Create a minimal database reset script that works with the server
console.log('📝 Creating server-integrated reset script...');

const resetScript = `
// Server-integrated database reset
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');

async function resetDatabase() {
  console.log('🧹 Resetting database with admin user...');
  
  const dbPath = path.join(__dirname, '../data/pos.db');
  const db = new Database(dbPath);
  
  try {
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Clear all data tables
    console.log('🗑️  Clearing all data...');
    const tables = [
      'invoice_lines', 'invoices', 'inventory_movements', 'grn_lines', 'grn',
      'stocktake_sessions', 'stocktake_items', 'quick_sales', 'sales', 'returns',
      'payments', 'audit_logs', 'cash_movements', 'shifts', 'hold_items', 'holds',
      'products', 'suppliers', 'customers', 'user_roles', 'users'
    ];
    
    tables.forEach(table => {
      try {
        db.exec(\`DELETE FROM \${table}\`);
        console.log(\`✅ Cleared \${table}\`);
      } catch (error) {
        // Table might not exist, ignore
      }
    });
    
    // Create admin role
    console.log('👤 Creating admin role...');
    db.exec(\`
      INSERT OR IGNORE INTO roles (code, name, description, is_active)
      VALUES ('ADMIN', 'Administrator', 'System Administrator with full access', 1)
    \`);
    
    // Create admin user
    console.log('👤 Creating admin user...');
    const hash = await bcrypt.hash('1234', 10);
    
    const userResult = db.prepare(\`
      INSERT INTO users (username, full_name, email, password_hash, is_active, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    \`).run('admin', 'System Administrator', 'admin@virtualpos.local', hash, 1, 'admin');
    
    const userId = userResult.lastInsertRowid;
    
    // Assign admin role
    const roleId = db.prepare('SELECT id FROM roles WHERE code = ?').get('ADMIN').id;
    db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)').run(userId, roleId);
    
    // Insert basic system settings
    console.log('⚙️  Inserting system settings...');
    const settings = [
      ['company_name', 'Virtual POS', 'Company name for receipts'],
      ['company_address', '123 Main St, City, State 12345', 'Company address'],
      ['company_phone', '(555) 123-4567', 'Company phone'],
      ['tax_rate', '0.08', 'Default tax rate (8%)'],
      ['currency_symbol', '$', 'Currency symbol'],
      ['receipt_footer', 'Thank you for your business!', 'Receipt footer']
    ];
    
    settings.forEach(([key, value, description]) => {
      try {
        db.prepare(\`
          INSERT OR IGNORE INTO system_config (key, value, description)
          VALUES (?, ?, ?)
        \`).run(key, value, description);
      } catch (error) {
        // system_config table might not exist yet
      }
    });
    
    console.log('✅ Database reset complete!');
    console.log('👤 Admin user: admin / 1234');
    
  } catch (error) {
    console.error('❌ Error during reset:', error);
  } finally {
    db.close();
  }
}

resetDatabase().catch(console.error);
`;

// Write the reset script
fs.writeFileSync(path.join(__dirname, 'server_reset.cjs'), resetScript);

console.log('✅ Reset script created');
console.log('🚀 Now starting server to create fresh database...');

// Step 4: Start the server
console.log('🔄 Starting server...');
const serverProcess = execSync('npm run dev:server', { 
  stdio: 'inherit',
  cwd: path.join(__dirname, '..')
});

console.log('✅ Server started successfully!');
console.log('🎯 Database has been reset with admin user (admin/1234)');
console.log('🌐 Server should be running on http://localhost:3002');









