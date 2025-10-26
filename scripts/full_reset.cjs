// Complete database reset and admin user creation
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

async function fullReset() {
  console.log('🧹 Starting complete database reset...');
  
  // Step 1: Clean up any existing database files
  console.log('🗑️  Cleaning up existing database files...');
  const dataDir = path.join(__dirname, '../data');
  const dbFiles = ['pos.db', 'pos.db-wal', 'pos.db-shm'];
  
  dbFiles.forEach(file => {
    const filePath = path.join(dataDir, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ Deleted ${file}`);
    }
  });
  
  // Step 2: Create a fresh database with basic schema
  console.log('📊 Creating fresh database...');
  const dbPath = path.join(dataDir, 'pos.db');
  const db = new Database(dbPath);
  
  try {
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Create basic tables
    console.log('🏗️  Creating basic tables...');
    
    // Users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT,
        password_hash TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        role TEXT DEFAULT 'cashier',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    
    // Roles table
    db.exec(`
      CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
    
    // User roles junction table
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        role_id INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        UNIQUE(user_id, role_id)
      )
    `);
    
    // System config table
    db.exec(`
      CREATE TABLE IF NOT EXISTS system_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    
    // Products table
    db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sku TEXT UNIQUE NOT NULL,
        name_en TEXT NOT NULL,
        name_ar TEXT,
        description TEXT,
        category_id INTEGER,
        cost REAL DEFAULT 0,
        price REAL NOT NULL,
        stock_qty INTEGER DEFAULT 0,
        min_stock_level INTEGER DEFAULT 0,
        max_stock_level INTEGER DEFAULT 0,
        barcode TEXT,
        unit TEXT DEFAULT 'pcs',
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    
    // Categories table
    db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
    
    // Suppliers table
    db.exec(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact_person TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    
    // Customers table
    db.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    
    // Invoices table
    db.exec(`
      CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT UNIQUE NOT NULL,
        customer_id INTEGER,
        subtotal REAL NOT NULL,
        tax_amount REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        total REAL NOT NULL,
        payment_method TEXT,
        status TEXT DEFAULT 'completed',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )
    `);
    
    // Invoice lines table
    db.exec(`
      CREATE TABLE IF NOT EXISTS invoice_lines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        qty INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total REAL NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);
    
    // Create indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
      CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
      CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
      CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id ON invoice_lines(invoice_id);
    `);
    
    console.log('✅ Basic schema created');
    
    // Step 3: Create admin role
    console.log('👤 Creating admin role...');
    db.exec(`
      INSERT OR IGNORE INTO roles (code, name, description, is_active)
      VALUES ('ADMIN', 'Administrator', 'System Administrator with full access', 1)
    `);
    
    // Step 4: Create admin user
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
    
    // Step 5: Insert basic system settings
    console.log('⚙️  Inserting system settings...');
    const settings = [
      ['company_name', 'Virtual POS', 'Company name for receipts and reports'],
      ['company_address', '123 Main St, City, State 12345', 'Company address for receipts'],
      ['company_phone', '(555) 123-4567', 'Company phone number'],
      ['tax_rate', '0.08', 'Default tax rate (8%)'],
      ['currency_symbol', '$', 'Currency symbol for display'],
      ['receipt_footer', 'Thank you for your business!', 'Footer text for receipts'],
      ['default_valuation_method', 'FIFO', 'Default inventory valuation method'],
      ['enable_cogs_calculation', 'true', 'Enable COGS calculation on sales'],
      ['enable_stock_movements', 'true', 'Enable stock movement tracking']
    ];
    
    settings.forEach(([key, value, description]) => {
      db.prepare(`
        INSERT OR IGNORE INTO system_config (key, value, description)
        VALUES (?, ?, ?)
      `).run(key, value, description);
    });
    
    // Step 6: Insert some basic categories
    console.log('📁 Creating basic categories...');
    const categories = [
      ['General', 'General merchandise'],
      ['Food & Beverages', 'Food and beverage items'],
      ['Electronics', 'Electronic devices and accessories'],
      ['Clothing', 'Clothing and apparel'],
      ['Home & Garden', 'Home and garden products']
    ];
    
    categories.forEach(([name, description]) => {
      db.prepare(`
        INSERT OR IGNORE INTO categories (name, description, is_active)
        VALUES (?, ?, 1)
      `).run(name, description);
    });
    
    // Step 7: Insert some basic suppliers
    console.log('🏢 Creating basic suppliers...');
    const suppliers = [
      ['General Supplier', 'John Doe', 'john@generalsupplier.com', '(555) 111-1111', '123 Supplier St, City, State 12345'],
      ['Food Distributor', 'Jane Smith', 'jane@fooddist.com', '(555) 222-2222', '456 Food Ave, City, State 12345'],
      ['Electronics Wholesale', 'Bob Johnson', 'bob@electronics.com', '(555) 333-3333', '789 Tech Blvd, City, State 12345']
    ];
    
    suppliers.forEach(([name, contact, email, phone, address]) => {
      db.prepare(`
        INSERT OR IGNORE INTO suppliers (name, contact_person, email, phone, address, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(name, contact, email, phone, address);
    });
    
    console.log('✅ Database reset complete!');
    console.log('👤 Admin user created:');
    console.log('   Username: admin');
    console.log('   Password: 1234');
    console.log('   Email: admin@virtualpos.local');
    console.log('🎯 Database is ready for use!');
    
  } catch (error) {
    console.error('❌ Error during database reset:', error);
  } finally {
    db.close();
  }
}

fullReset().catch(console.error);









