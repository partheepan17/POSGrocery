-- Database Cleanup Script
-- This script removes all test data and keeps only user-related tables
-- Run this script to clean the database while preserving user authentication

-- First, let's see what tables exist
-- (This is just for reference - the actual cleanup starts below)

-- ==============================================
-- CLEANUP SCRIPT - REMOVE ALL NON-USER DATA
-- ==============================================

-- Disable foreign key constraints temporarily
PRAGMA foreign_keys = OFF;

-- Drop all non-user related tables
DROP TABLE IF EXISTS quick_sales_lines;
DROP TABLE IF EXISTS quick_sales_sessions;
DROP TABLE IF EXISTS invoice_payments;
DROP TABLE IF EXISTS invoice_lines;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS customers;

-- Drop any other tables that might exist (in case of future migrations)
DROP TABLE IF EXISTS stock_movements;
DROP TABLE IF EXISTS stock_levels;
DROP TABLE IF EXISTS grn_headers;
DROP TABLE IF EXISTS grn_lines;
DROP TABLE IF EXISTS purchase_orders;
DROP TABLE IF EXISTS purchase_order_lines;
DROP TABLE IF EXISTS returns;
DROP TABLE IF EXISTS return_lines;
DROP TABLE IF EXISTS discounts;
DROP TABLE IF EXISTS pricing_rules;
DROP TABLE IF EXISTS labels;
DROP TABLE IF EXISTS stocktake_sessions;
DROP TABLE IF EXISTS stocktake_lines;
DROP TABLE IF EXISTS shifts;
DROP TABLE IF EXISTS cash_events;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS sale_lines;
DROP TABLE IF EXISTS refunds;
DROP TABLE IF EXISTS refund_lines;

-- Re-enable foreign key constraints
PRAGMA foreign_keys = ON;

-- ==============================================
-- PRESERVE USER-RELATED TABLES
-- ==============================================

-- The following tables are preserved:
-- 1. users - Main user authentication table
-- 2. user_preferences - User preferences and settings
-- 3. audit_logs - Audit trail for user actions
-- 4. system_config - System configuration

-- ==============================================
-- RESET USER DATA TO DEFAULTS
-- ==============================================

-- Clear all users except default admin
DELETE FROM users WHERE id > 1;

-- Reset admin user to default values
UPDATE users SET 
    username = 'admin',
    name = 'Administrator',
    role = 'admin',
    is_active = 1,
    pin = '9999',
    email = 'admin@posgrocery.com',
    phone = NULL,
    last_login = NULL,
    failed_login_attempts = 0,
    locked_until = NULL,
    created_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- If admin user doesn't exist, create it
INSERT OR IGNORE INTO users (
    id, username, name, role, is_active, pin, email, 
    failed_login_attempts, created_at
) VALUES (
    1, 'admin', 'Administrator', 'admin', 1, '9999', 'admin@posgrocery.com',
    0, CURRENT_TIMESTAMP
);

-- Add default manager and cashier users
INSERT OR IGNORE INTO users (
    username, name, role, is_active, pin, email, 
    failed_login_attempts, created_at
) VALUES 
('manager', 'Manager', 'manager', 1, '9999', 'manager@posgrocery.com', 0, CURRENT_TIMESTAMP),
('cashier1', 'Cashier 1', 'cashier', 1, '1234', 'cashier1@posgrocery.com', 0, CURRENT_TIMESTAMP),
('cashier2', 'Cashier 2', 'cashier', 1, '5678', 'cashier2@posgrocery.com', 0, CURRENT_TIMESTAMP);

-- Clear user preferences
DELETE FROM user_preferences;

-- Clear audit logs (optional - you might want to keep some for compliance)
DELETE FROM audit_logs;

-- Reset system configuration to defaults
DELETE FROM system_config;

-- Insert default system configuration
INSERT INTO system_config (config_key, config_value, description) VALUES
('store_name', 'My Grocery Store', 'Store name displayed on receipts'),
('store_address', '123 Main Street\nColombo 01\nSri Lanka', 'Store address for receipts'),
('store_phone', '+94 11 234 5678', 'Store contact number'),
('tax_rate', '0.15', 'Default tax rate (15%)'),
('currency', 'LKR', 'Default currency code'),
('receipt_footer', 'Thank you for your business!', 'Footer text for receipts'),
('backup_enabled', 'true', 'Whether automated backups are enabled'),
('backup_retention_days', '30', 'Number of days to retain backups'),
('default_language', 'EN', 'Default system language'),
('theme', 'auto', 'Default theme setting'),
('auto_logout_minutes', '30', 'Auto logout after inactivity (minutes)');

-- ==============================================
-- VERIFICATION
-- ==============================================

-- Show remaining tables
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;

-- Show user data
SELECT id, username, name, role, is_active, pin, email FROM users;

-- Show system configuration
SELECT config_key, config_value FROM system_config ORDER BY config_key;

-- Show table counts
SELECT 
    (SELECT COUNT(*) FROM users) as user_count,
    (SELECT COUNT(*) FROM user_preferences) as preferences_count,
    (SELECT COUNT(*) FROM audit_logs) as audit_count,
    (SELECT COUNT(*) FROM system_config) as config_count;

PRAGMA integrity_check;
