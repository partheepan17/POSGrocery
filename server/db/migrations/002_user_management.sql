-- User Management and System Configuration
-- This migration adds additional user management features and system configuration

-- Add PIN and additional user fields (only if they don't exist)
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- We'll handle this in the migration runner
ALTER TABLE users ADD COLUMN pin TEXT;
ALTER TABLE users ADD COLUMN email TEXT;
ALTER TABLE users ADD COLUMN phone TEXT;
ALTER TABLE users ADD COLUMN last_login DATETIME;
ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until DATETIME;

-- Add user preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    preference_key TEXT NOT NULL,
    preference_value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, preference_key)
);

-- Add system configuration table
CREATE TABLE IF NOT EXISTS system_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key TEXT UNIQUE NOT NULL,
    config_value TEXT,
    description TEXT,
    is_encrypted BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default system configuration
INSERT OR IGNORE INTO system_config (config_key, config_value, description) VALUES
('store_name', 'My Grocery Store', 'Store name displayed on receipts'),
('store_address', '123 Main Street\nColombo 01\nSri Lanka', 'Store address for receipts'),
('store_phone', '+94 11 234 5678', 'Store contact number'),
('tax_rate', '0.15', 'Default tax rate (15%)'),
('currency', 'LKR', 'Default currency code'),
('receipt_footer', 'Thank you for your business!', 'Footer text for receipts'),
('backup_enabled', 'true', 'Whether automated backups are enabled'),
('backup_retention_days', '30', 'Number of days to retain backups');

-- Create indexes for user management
CREATE INDEX IF NOT EXISTS idx_users_pin ON users(pin);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(config_key);

