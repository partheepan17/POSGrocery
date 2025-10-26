-- Database Reset Script
-- This script clears all data and creates a fresh admin user

-- Clear all transactional data
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

-- Clear master data
DELETE FROM products;
DELETE FROM suppliers;
DELETE FROM customers;
DELETE FROM user_roles;
DELETE FROM users;

-- Insert admin role if it doesn't exist
INSERT OR IGNORE INTO roles (code, name, description, is_active)
VALUES ('ADMIN', 'Administrator', 'System Administrator with full access', 1);

-- Insert admin user
INSERT INTO users (username, full_name, email, password_hash, is_active, role, created_at, updated_at)
VALUES ('admin', 'System Administrator', 'admin@virtualpos.local', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, 'admin', datetime('now'), datetime('now'));

-- Assign admin role to user
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = 'admin' AND r.code = 'ADMIN';

-- Insert some basic system settings
INSERT OR IGNORE INTO system_config (key, value, description)
VALUES 
  ('default_valuation_method', 'FIFO', 'Default inventory valuation method: FIFO, LIFO, or AVERAGE'),
  ('enable_cogs_calculation', 'true', 'Enable COGS calculation on sales'),
  ('enable_stock_movements', 'true', 'Enable stock movement tracking'),
  ('company_name', 'Virtual POS', 'Company name for receipts and reports'),
  ('company_address', '123 Main St, City, State 12345', 'Company address for receipts'),
  ('company_phone', '(555) 123-4567', 'Company phone number'),
  ('tax_rate', '0.08', 'Default tax rate (8%)'),
  ('currency_symbol', '$', 'Currency symbol for display'),
  ('receipt_footer', 'Thank you for your business!', 'Footer text for receipts'),
  ('backup_retention_days', '30', 'Backup retention period in days'),
  ('backup_encryption_key', '', 'Backup encryption key');

-- Insert some basic categories
INSERT OR IGNORE INTO categories (name, description, is_active)
VALUES 
  ('General', 'General merchandise', 1),
  ('Food & Beverages', 'Food and beverage items', 1),
  ('Electronics', 'Electronic devices and accessories', 1),
  ('Clothing', 'Clothing and apparel', 1),
  ('Home & Garden', 'Home and garden products', 1);

-- Insert some basic suppliers
INSERT OR IGNORE INTO suppliers (name, contact_person, email, phone, address, is_active)
VALUES 
  ('General Supplier', 'John Doe', 'john@generalsupplier.com', '(555) 111-1111', '123 Supplier St, City, State 12345', 1),
  ('Food Distributor', 'Jane Smith', 'jane@fooddist.com', '(555) 222-2222', '456 Food Ave, City, State 12345', 1),
  ('Electronics Wholesale', 'Bob Johnson', 'bob@electronics.com', '(555) 333-3333', '789 Tech Blvd, City, State 12345', 1);

PRAGMA user_version = 1;









