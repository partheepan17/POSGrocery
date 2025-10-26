const { initDatabase, getDatabase } = require('./dist/db');

initDatabase();
const db = getDatabase();

console.log('Creating terminals table...');

try {
  // Create terminals table
  db.exec(`
    CREATE TABLE IF NOT EXISTS terminals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        last_activity TEXT,
        created_by INTEGER,
        FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);

  // Create terminal_settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS terminal_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        terminal_id INTEGER NOT NULL,
        setting_key TEXT NOT NULL,
        setting_value TEXT,
        setting_type TEXT DEFAULT 'string',
        description TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (terminal_id) REFERENCES terminals(id) ON DELETE CASCADE,
        UNIQUE(terminal_id, setting_key)
    );
  `);

  // Add terminal columns to invoices
  try {
    db.exec(`ALTER TABLE invoices ADD COLUMN terminal_id INTEGER;`);
    console.log('Added terminal_id to invoices');
  } catch (e) {
    if (e.message.includes('duplicate column name')) {
      console.log('terminal_id already exists in invoices');
    } else {
      throw e;
    }
  }

  try {
    db.exec(`ALTER TABLE invoices ADD COLUMN terminal_name TEXT;`);
    console.log('Added terminal_name to invoices');
  } catch (e) {
    if (e.message.includes('duplicate column name')) {
      console.log('terminal_name already exists in invoices');
    } else {
      throw e;
    }
  }

  // Add terminal columns to quick_sales_sessions
  try {
    db.exec(`ALTER TABLE quick_sales_sessions ADD COLUMN terminal_id INTEGER;`);
    console.log('Added terminal_id to quick_sales_sessions');
  } catch (e) {
    if (e.message.includes('duplicate column name')) {
      console.log('terminal_id already exists in quick_sales_sessions');
    } else {
      throw e;
    }
  }

  try {
    db.exec(`ALTER TABLE quick_sales_sessions ADD COLUMN terminal_name TEXT;`);
    console.log('Added terminal_name to quick_sales_sessions');
  } catch (e) {
    if (e.message.includes('duplicate column name')) {
      console.log('terminal_name already exists in quick_sales_sessions');
    } else {
      throw e;
    }
  }

  // Add terminal columns to quick_sales_lines
  try {
    db.exec(`ALTER TABLE quick_sales_lines ADD COLUMN terminal_id INTEGER;`);
    console.log('Added terminal_id to quick_sales_lines');
  } catch (e) {
    if (e.message.includes('duplicate column name')) {
      console.log('terminal_id already exists in quick_sales_lines');
    } else {
      throw e;
    }
  }

  try {
    db.exec(`ALTER TABLE quick_sales_lines ADD COLUMN terminal_name TEXT;`);
    console.log('Added terminal_name to quick_sales_lines');
  } catch (e) {
    if (e.message.includes('duplicate column name')) {
      console.log('terminal_name already exists in quick_sales_lines');
    } else {
      throw e;
    }
  }

  // Create indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_terminals_active ON terminals(is_active);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_terminals_created_at ON terminals(created_at);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_terminal_settings_terminal_id ON terminal_settings(terminal_id);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_terminal_settings_key ON terminal_settings(setting_key);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_invoices_terminal_id ON invoices(terminal_id);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_quick_sales_sessions_terminal_id ON quick_sales_sessions(terminal_id);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_quick_sales_lines_terminal_id ON quick_sales_lines(terminal_id);`);

  // Insert default terminal
  db.exec(`
    INSERT OR IGNORE INTO terminals (id, name, description, created_by) 
    VALUES (1, 'Main Terminal', 'Default terminal for single-terminal setups', 1);
  `);

  // Insert default terminal settings
  db.exec(`
    INSERT OR IGNORE INTO terminal_settings (terminal_id, setting_key, setting_value, setting_type, description) VALUES
    (1, 'receipt_printer_enabled', 'true', 'boolean', 'Enable receipt printing for this terminal'),
    (1, 'cash_drawer_enabled', 'true', 'boolean', 'Enable cash drawer for this terminal'),
    (1, 'barcode_scanner_enabled', 'true', 'boolean', 'Enable barcode scanner for this terminal'),
    (1, 'display_mode', 'portrait', 'string', 'Display orientation: portrait or landscape'),
    (1, 'auto_receipt_print', 'false', 'boolean', 'Automatically print receipts after each sale'),
    (1, 'receipt_footer_text', 'Thank you for your business!', 'string', 'Custom footer text for receipts');
  `);

  console.log('✅ Terminals table and related structures created successfully!');

  // Verify the tables exist
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='terminals'").all();
  console.log('Terminals table exists:', tables.length > 0);

  const terminalSettings = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='terminal_settings'").all();
  console.log('Terminal settings table exists:', terminalSettings.length > 0);

} catch (error) {
  console.error('❌ Error creating terminals table:', error.message);
}











