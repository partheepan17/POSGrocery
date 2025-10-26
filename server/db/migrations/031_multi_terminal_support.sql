-- Migration: 032_multi_terminal_support.sql
-- Implements multi-terminal support for POS system

-- Create terminals table
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

-- Create terminal_settings table for terminal-specific configurations
CREATE TABLE IF NOT EXISTS terminal_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    terminal_id INTEGER NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value TEXT,
    setting_type TEXT DEFAULT 'string', -- string, number, boolean, json
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (terminal_id) REFERENCES terminals(id) ON DELETE CASCADE,
    UNIQUE(terminal_id, setting_key)
);

-- Add terminal_id to invoices table
ALTER TABLE invoices ADD COLUMN terminal_id INTEGER;
ALTER TABLE invoices ADD COLUMN terminal_name TEXT;

-- Add terminal_id to quick_sales_sessions table
ALTER TABLE quick_sales_sessions ADD COLUMN terminal_id INTEGER;
ALTER TABLE quick_sales_sessions ADD COLUMN terminal_name TEXT;

-- Add terminal_id to quick_sales_lines table
ALTER TABLE quick_sales_lines ADD COLUMN terminal_id INTEGER;
ALTER TABLE quick_sales_lines ADD COLUMN terminal_name TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_terminals_active ON terminals(is_active);
CREATE INDEX IF NOT EXISTS idx_terminals_created_at ON terminals(created_at);
CREATE INDEX IF NOT EXISTS idx_terminal_settings_terminal_id ON terminal_settings(terminal_id);
CREATE INDEX IF NOT EXISTS idx_terminal_settings_key ON terminal_settings(setting_key);

CREATE INDEX IF NOT EXISTS idx_invoices_terminal_id ON invoices(terminal_id);
CREATE INDEX IF NOT EXISTS idx_quick_sales_sessions_terminal_id ON quick_sales_sessions(terminal_id);
CREATE INDEX IF NOT EXISTS idx_quick_sales_lines_terminal_id ON quick_sales_lines(terminal_id);

-- Insert default terminal
INSERT OR IGNORE INTO terminals (id, name, description, created_by) 
VALUES (1, 'Main Terminal', 'Default terminal for single-terminal setups', 1);

-- Insert default terminal settings
INSERT OR IGNORE INTO terminal_settings (terminal_id, setting_key, setting_value, setting_type, description) VALUES
(1, 'receipt_printer_enabled', 'true', 'boolean', 'Enable receipt printing for this terminal'),
(1, 'cash_drawer_enabled', 'true', 'boolean', 'Enable cash drawer for this terminal'),
(1, 'barcode_scanner_enabled', 'true', 'boolean', 'Enable barcode scanner for this terminal'),
(1, 'display_mode', 'portrait', 'string', 'Display orientation: portrait or landscape'),
(1, 'auto_receipt_print', 'false', 'boolean', 'Automatically print receipts after each sale'),
(1, 'receipt_footer_text', 'Thank you for your business!', 'string', 'Custom footer text for receipts');

-- Create view for terminal activity summary
CREATE VIEW IF NOT EXISTS v_terminal_activity AS
SELECT 
    t.id as terminal_id,
    t.name as terminal_name,
    t.description,
    t.is_active,
    t.created_at,
    t.last_activity,
    COUNT(DISTINCT i.id) as total_sales,
    COUNT(DISTINCT qs.id) as total_quick_sales,
    COALESCE(SUM(i.net), 0) as total_revenue,
    MAX(COALESCE(i.created_at, qs.created_at)) as last_sale_date
FROM terminals t
LEFT JOIN invoices i ON t.id = i.terminal_id
LEFT JOIN quick_sales_sessions qs ON t.id = qs.terminal_id
GROUP BY t.id, t.name, t.description, t.is_active, t.created_at, t.last_activity;

-- Create view for terminal settings with defaults
CREATE VIEW IF NOT EXISTS v_terminal_settings AS
SELECT 
    t.id as terminal_id,
    t.name as terminal_name,
    ts.setting_key,
    COALESCE(ts.setting_value, 
        CASE ts.setting_key
            WHEN 'receipt_printer_enabled' THEN 'true'
            WHEN 'cash_drawer_enabled' THEN 'true'
            WHEN 'barcode_scanner_enabled' THEN 'true'
            WHEN 'display_mode' THEN 'portrait'
            WHEN 'auto_receipt_print' THEN 'false'
            WHEN 'receipt_footer_text' THEN 'Thank you for your business!'
            ELSE NULL
        END
    ) as setting_value,
    COALESCE(ts.setting_type, 'string') as setting_type,
    ts.description
FROM terminals t
LEFT JOIN terminal_settings ts ON t.id = ts.terminal_id
WHERE t.is_active = 1;


