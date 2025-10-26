const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Create database directory if it doesn't exist
const dbDir = path.join(__dirname, 'server', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'pos-grocery.db');
console.log('🗄️  Initializing fresh database...');

// Remove existing database if it exists
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('✅ Removed existing database');
}

// Create new database
const db = new Database(dbPath);
console.log('✅ Created new database:', dbPath);

// Run core migration
const coreMigration = fs.readFileSync(path.join(__dirname, 'server', 'db', 'migrations', '001_core.sql'), 'utf8');
db.exec(coreMigration);
console.log('✅ Applied core migration');

// Add additional user fields safely
try {
  db.exec(`
    ALTER TABLE users ADD COLUMN pin TEXT;
    ALTER TABLE users ADD COLUMN email TEXT;
    ALTER TABLE users ADD COLUMN phone TEXT;
    ALTER TABLE users ADD COLUMN last_login DATETIME;
    ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
    ALTER TABLE users ADD COLUMN locked_until DATETIME;
  `);
  console.log('✅ Added user management fields');
} catch (error) {
  console.log('⚠️  Some user fields may already exist:', error.message);
}

// Add user preferences table
db.exec(`
  CREATE TABLE IF NOT EXISTS user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    preference_key TEXT NOT NULL,
    preference_value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);
console.log('✅ Created user preferences table');

// Add system configuration table
db.exec(`
  CREATE TABLE IF NOT EXISTS system_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key TEXT UNIQUE NOT NULL,
    config_value TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
console.log('✅ Created system configuration table');

// Insert default admin user
const insertUser = db.prepare(`
  INSERT INTO users (username, name, role, pin, email, phone, is_active)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

try {
  insertUser.run('admin', 'Administrator', 'admin', '1234', 'admin@pos.com', '+1234567890', 1);
  console.log('✅ Created default admin user (username: admin, pin: 1234)');
} catch (error) {
  console.log('⚠️  Admin user may already exist:', error.message);
}

// Insert default cashier user
try {
  insertUser.run('cashier', 'Cashier', 'cashier', '0000', 'cashier@pos.com', '+1234567891', 1);
  console.log('✅ Created default cashier user (username: cashier, pin: 0000)');
} catch (error) {
  console.log('⚠️  Cashier user may already exist:', error.message);
}

// Insert default system configuration
const insertConfig = db.prepare(`
  INSERT OR REPLACE INTO system_config (config_key, config_value, description)
  VALUES (?, ?, ?)
`);

const defaultConfigs = [
  ['store_name', 'POS Grocery Store', 'Store name'],
  ['store_address', '123 Main Street, City', 'Store address'],
  ['store_phone', '+1234567890', 'Store phone number'],
  ['tax_rate', '0.15', 'Default tax rate'],
  ['currency', 'LKR', 'Default currency'],
  ['date_format', 'YYYY-MM-DD', 'Date format'],
  ['time_format', '24h', 'Time format'],
  ['receipt_footer', 'Thank you for your business!', 'Receipt footer text']
];

defaultConfigs.forEach(([key, value, description]) => {
  insertConfig.run(key, value, description);
});
console.log('✅ Inserted default system configuration');

// Insert default categories
const insertCategory = db.prepare(`
  INSERT INTO categories (name) VALUES (?)
`);

const defaultCategories = [
  'Fruits & Vegetables',
  'Dairy & Eggs',
  'Meat & Seafood',
  'Bakery',
  'Beverages',
  'Snacks',
  'Household',
  'Personal Care',
  'Other'
];

defaultCategories.forEach(category => {
  try {
    insertCategory.run(category);
  } catch (error) {
    // Category may already exist
  }
});
console.log('✅ Inserted default categories');

// Insert default supplier
const insertSupplier = db.prepare(`
  INSERT INTO suppliers (supplier_name, contact_phone, contact_email, address, active)
  VALUES (?, ?, ?, ?, ?)
`);

try {
  insertSupplier.run('Default Supplier', '+1234567890', 'supplier@example.com', '123 Supplier Street', 1);
  console.log('✅ Created default supplier');
} catch (error) {
  console.log('⚠️  Default supplier may already exist:', error.message);
}

db.close();
console.log('🎉 Database initialization completed successfully!');
console.log('📊 Database location:', dbPath);
console.log('👤 Default users:');
console.log('   - Admin: username=admin, pin=1234');
console.log('   - Cashier: username=cashier, pin=0000');










