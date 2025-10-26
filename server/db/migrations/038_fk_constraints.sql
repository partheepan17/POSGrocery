-- Migration: 038_fk_constraints.sql
-- Adds foreign key constraints with ON DELETE RESTRICT to prevent deletion of products with dependencies

-- Enable foreign key constraints (if not already enabled)
PRAGMA foreign_keys = ON;

-- Drop existing foreign key constraints that allow CASCADE deletes
-- and recreate them with RESTRICT to prevent deletion of products with dependencies

-- 1. invoice_lines table - prevent deletion if product has sales
DROP INDEX IF EXISTS idx_invoice_lines_invoice_id;
DROP INDEX IF EXISTS idx_invoice_lines_product_id;

-- Recreate invoice_lines table with proper FK constraints
CREATE TABLE IF NOT EXISTS invoice_lines_new (
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
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- Copy data from old table
INSERT INTO invoice_lines_new 
SELECT * FROM invoice_lines;

-- Drop old table and rename new one
DROP TABLE invoice_lines;
ALTER TABLE invoice_lines_new RENAME TO invoice_lines;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id ON invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_product_id ON invoice_lines(product_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_product ON invoice_lines(invoice_id, product_id);

-- 2. stock_movements table - prevent deletion if product has movements
-- Note: This table already has ON DELETE CASCADE, we need to change it to RESTRICT
DROP INDEX IF EXISTS idx_stock_movements_product ON stock_movements;
DROP INDEX IF EXISTS idx_stock_movements_type ON stock_movements;
DROP INDEX IF EXISTS idx_stock_movements_reference ON stock_movements;

-- Recreate stock_movements table with RESTRICT constraint
CREATE TABLE IF NOT EXISTS stock_movements_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('sale', 'purchase', 'adjustment', 'return')),
    quantity INTEGER NOT NULL,
    reference_id INTEGER,
    reference_type TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Copy data from old table
INSERT INTO stock_movements_new 
SELECT * FROM stock_movements;

-- Drop old table and rename new one
DROP TABLE stock_movements;
ALTER TABLE stock_movements_new RENAME TO stock_movements;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_id, reference_type);

-- 3. grn_lines table - prevent deletion if product has GRN entries
DROP INDEX IF EXISTS idx_grn_lines_grn ON grn_lines;
DROP INDEX IF EXISTS idx_grn_lines_product ON grn_lines;

-- Recreate grn_lines table with RESTRICT constraint
CREATE TABLE IF NOT EXISTS grn_lines_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grn_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity_received INTEGER NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    batch_number VARCHAR(50),
    expiry_date DATE,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grn_id) REFERENCES grn_headers(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- Copy data from old table
INSERT INTO grn_lines_new 
SELECT * FROM grn_lines;

-- Drop old table and rename new one
DROP TABLE grn_lines;
ALTER TABLE grn_lines_new RENAME TO grn_lines;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_grn_lines_grn ON grn_lines(grn_id);
CREATE INDEX IF NOT EXISTS idx_grn_lines_product ON grn_lines(product_id);

-- 4. return_lines table - prevent deletion if product has returns
DROP INDEX IF EXISTS idx_return_lines_return_id ON return_lines;
DROP INDEX IF EXISTS idx_return_lines_product_id ON return_lines;

-- Recreate return_lines table with RESTRICT constraint
CREATE TABLE IF NOT EXISTS return_lines_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    return_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    reason TEXT,
    condition TEXT DEFAULT 'good',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- Copy data from old table
INSERT INTO return_lines_new 
SELECT * FROM return_lines;

-- Drop old table and rename new one
DROP TABLE return_lines;
ALTER TABLE return_lines_new RENAME TO return_lines;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_return_lines_return_id ON return_lines(return_id);
CREATE INDEX IF NOT EXISTS idx_return_lines_product_id ON return_lines(product_id);

-- 5. quick_sales_lines table - prevent deletion if product has quick sales
DROP INDEX IF EXISTS idx_quick_sales_lines_session ON quick_sales_lines;
DROP INDEX IF EXISTS idx_quick_sales_lines_product ON quick_sales_lines;

-- Recreate quick_sales_lines table with RESTRICT constraint
CREATE TABLE IF NOT EXISTS quick_sales_lines_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES quick_sales_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- Copy data from old table
INSERT INTO quick_sales_lines_new 
SELECT * FROM quick_sales_lines;

-- Drop old table and rename new one
DROP TABLE quick_sales_lines;
ALTER TABLE quick_sales_lines_new RENAME TO quick_sales_lines;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_quick_sales_lines_session ON quick_sales_lines(session_id);
CREATE INDEX IF NOT EXISTS idx_quick_sales_lines_product ON quick_sales_lines(product_id);

-- 6. product_stock table - prevent deletion if product has stock
-- This should remain as CASCADE since it's directly related to the product
-- No changes needed for product_stock

-- 7. Add soft delete support to products table
ALTER TABLE products ADD COLUMN deleted_at TEXT;
ALTER TABLE products ADD COLUMN deleted_by INTEGER;

-- Create index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products(deleted_at);
CREATE INDEX IF NOT EXISTS idx_products_active_not_deleted ON products(is_active, deleted_at) WHERE deleted_at IS NULL;

-- 8. Create view for active products (excluding soft deleted)
CREATE VIEW IF NOT EXISTS v_active_products AS
SELECT * FROM products 
WHERE deleted_at IS NULL;

-- 9. Create view for deleted products
CREATE VIEW IF NOT EXISTS v_deleted_products AS
SELECT * FROM products 
WHERE deleted_at IS NOT NULL;

-- 10. Add triggers to prevent hard deletion of products with dependencies
CREATE TRIGGER IF NOT EXISTS prevent_product_deletion_with_sales
    BEFORE DELETE ON products
    FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN EXISTS (SELECT 1 FROM invoice_lines WHERE product_id = OLD.id)
        THEN RAISE(ABORT, 'Cannot delete product: has sales records')
    END;
END;

CREATE TRIGGER IF NOT EXISTS prevent_product_deletion_with_movements
    BEFORE DELETE ON products
    FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN EXISTS (SELECT 1 FROM stock_movements WHERE product_id = OLD.id)
        THEN RAISE(ABORT, 'Cannot delete product: has stock movements')
    END;
END;

CREATE TRIGGER IF NOT EXISTS prevent_product_deletion_with_grn
    BEFORE DELETE ON products
    FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN EXISTS (SELECT 1 FROM grn_lines WHERE product_id = OLD.id)
        THEN RAISE(ABORT, 'Cannot delete product: has GRN records')
    END;
END;

CREATE TRIGGER IF NOT EXISTS prevent_product_deletion_with_returns
    BEFORE DELETE ON products
    FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN EXISTS (SELECT 1 FROM return_lines WHERE product_id = OLD.id)
        THEN RAISE(ABORT, 'Cannot delete product: has return records')
    END;
END;

CREATE TRIGGER IF NOT EXISTS prevent_product_deletion_with_quick_sales
    BEFORE DELETE ON products
    FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN EXISTS (SELECT 1 FROM quick_sales_lines WHERE product_id = OLD.id)
        THEN RAISE(ABORT, 'Cannot delete product: has quick sales records')
    END;
END;

-- 11. Create function to check if product can be deleted
-- This will be used by the application layer
CREATE VIEW IF NOT EXISTS v_product_deletion_status AS
SELECT 
    p.id,
    p.name_en,
    p.sku,
    p.deleted_at,
    CASE 
        WHEN p.deleted_at IS NOT NULL THEN 'already_deleted'
        WHEN EXISTS (SELECT 1 FROM invoice_lines WHERE product_id = p.id) THEN 'has_sales'
        WHEN EXISTS (SELECT 1 FROM stock_movements WHERE product_id = p.id) THEN 'has_movements'
        WHEN EXISTS (SELECT 1 FROM grn_lines WHERE product_id = p.id) THEN 'has_grn'
        WHEN EXISTS (SELECT 1 FROM return_lines WHERE product_id = p.id) THEN 'has_returns'
        WHEN EXISTS (SELECT 1 FROM quick_sales_lines WHERE product_id = p.id) THEN 'has_quick_sales'
        ELSE 'can_delete'
    END as deletion_status,
    (SELECT COUNT(*) FROM invoice_lines WHERE product_id = p.id) as sales_count,
    (SELECT COUNT(*) FROM stock_movements WHERE product_id = p.id) as movements_count,
    (SELECT COUNT(*) FROM grn_lines WHERE product_id = p.id) as grn_count,
    (SELECT COUNT(*) FROM return_lines WHERE product_id = p.id) as returns_count,
    (SELECT COUNT(*) FROM quick_sales_lines WHERE product_id = p.id) as quick_sales_count
FROM products p;

-- 12. Add audit logging for product deletion attempts
CREATE TRIGGER IF NOT EXISTS log_product_deletion_attempt
    AFTER UPDATE OF deleted_at ON products
    FOR EACH ROW
    WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL
BEGIN
    INSERT INTO audit_logs (
        table_name, 
        record_id, 
        action, 
        old_values, 
        new_values, 
        user_id, 
        created_at
    ) VALUES (
        'products',
        NEW.id,
        'soft_delete',
        json_object('deleted_at', OLD.deleted_at, 'deleted_by', OLD.deleted_by),
        json_object('deleted_at', NEW.deleted_at, 'deleted_by', NEW.deleted_by),
        NEW.deleted_by,
        datetime('now')
    );
END;










