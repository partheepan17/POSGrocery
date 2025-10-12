-- Core tables for POS system
-- This migration creates the essential tables needed for basic functionality

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_name TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  address TEXT,
  tax_id TEXT,
  active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT UNIQUE NOT NULL,
  barcode TEXT UNIQUE,
  name_en TEXT NOT NULL,
  name_si TEXT,
  name_ta TEXT,
  unit TEXT DEFAULT 'pc' CHECK (unit IN ('pc', 'kg', 'g', 'l', 'ml')),
  category_id INTEGER,
  is_scale_item BOOLEAN DEFAULT 0,
  tax_code TEXT,
  price_retail DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_wholesale DECIMAL(10,2) DEFAULT 0,
  price_credit DECIMAL(10,2) DEFAULT 0,
  price_other DECIMAL(10,2) DEFAULT 0,
  cost DECIMAL(10,2),
  reorder_level INTEGER,
  preferred_supplier_id INTEGER,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (preferred_supplier_id) REFERENCES suppliers(id)
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_no TEXT UNIQUE NOT NULL,
  customer_id INTEGER,
  price_tier TEXT DEFAULT 'Retail' CHECK (price_tier IN ('Retail', 'Wholesale', 'Credit', 'Other')),
  cashier_id INTEGER NOT NULL,
  terminal_name TEXT,
  language TEXT DEFAULT 'EN' CHECK (language IN ('EN', 'SI', 'TA')),
  gross DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  net DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (cashier_id) REFERENCES users(id)
);

-- Invoice Lines
CREATE TABLE IF NOT EXISTS invoice_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  qty DECIMAL(10,3) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  line_discount DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Invoice Payments
CREATE TABLE IF NOT EXISTS invoice_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('cash', 'card', 'wallet')),
  amount DECIMAL(10,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Users (minimal for cashier_id references)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'cashier',
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Customers (minimal for customer_id references)
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  phone TEXT,
  customer_type TEXT DEFAULT 'Retail' CHECK (customer_type IN ('Retail', 'Wholesale', 'Credit', 'Other')),
  note TEXT,
  active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_invoices_receipt_no ON invoices(receipt_no);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id ON invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);

-- Insert default data
INSERT OR IGNORE INTO categories (id, name) VALUES (1, 'General');
INSERT OR IGNORE INTO suppliers (id, supplier_name, active) VALUES (1, 'Default Supplier', 1);
INSERT OR IGNORE INTO users (id, username, name, role) VALUES (1, 'admin', 'Administrator', 'admin');
INSERT OR IGNORE INTO customers (id, customer_name, customer_type) VALUES (1, 'Walk-in Customer', 'Retail');