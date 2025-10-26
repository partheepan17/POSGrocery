-- Invoice and Stock Movement System
-- This migration creates tables for invoice management and inventory tracking

-- Invoice headers table
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT UNIQUE NOT NULL,
    customer_id INTEGER,
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL,
    payment_reference TEXT,
    cashier_id INTEGER NOT NULL,
    terminal_id TEXT,
    status TEXT DEFAULT 'completed',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (cashier_id) REFERENCES users(id)
);

-- Invoice lines table
CREATE TABLE IF NOT EXISTS invoice_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    product_sku TEXT,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_rate DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Inventory movements table
CREATE TABLE IF NOT EXISTS inventory_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    movement_type TEXT NOT NULL, -- SALE, RETURN, ADJUSTMENT, GRN, STOCKTAKE, TRANSFER
    quantity DECIMAL(10,3) NOT NULL,
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    reference_type TEXT, -- INVOICE, GRN, STOCKTAKE, ADJUSTMENT
    reference_id INTEGER,
    reason TEXT,
    notes TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Stock levels table (denormalized for performance)
CREATE TABLE IF NOT EXISTS stock_levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER UNIQUE NOT NULL,
    current_stock DECIMAL(10,3) NOT NULL DEFAULT 0,
    reserved_stock DECIMAL(10,3) NOT NULL DEFAULT 0,
    available_stock DECIMAL(10,3) NOT NULL DEFAULT 0,
    last_movement_at DATETIME,
    last_movement_type TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Movement reasons enum table
CREATE TABLE IF NOT EXISTS movement_reasons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    movement_type TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert movement reasons
INSERT OR IGNORE INTO movement_reasons (code, name, description, movement_type) VALUES
('SALE', 'Sale', 'Product sold to customer', 'SALE'),
('RETURN', 'Return', 'Product returned by customer', 'RETURN'),
('ADJUSTMENT', 'Stock Adjustment', 'Manual stock adjustment', 'ADJUSTMENT'),
('GRN', 'Goods Received', 'Stock received from supplier', 'GRN'),
('STOCKTAKE', 'Stock Take', 'Stock count adjustment', 'STOCKTAKE'),
('TRANSFER', 'Transfer', 'Stock transferred between locations', 'TRANSFER'),
('DAMAGE', 'Damage', 'Stock written off due to damage', 'ADJUSTMENT'),
('THEFT', 'Theft', 'Stock written off due to theft', 'ADJUSTMENT'),
('EXPIRED', 'Expired', 'Stock written off due to expiry', 'ADJUSTMENT');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_cashier_id ON invoices(cashier_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id ON invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_product_id ON invoice_lines(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_movement_type ON inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference ON inventory_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_levels_product_id ON stock_levels(product_id);
CREATE INDEX IF NOT EXISTS idx_movement_reasons_code ON movement_reasons(code);
CREATE INDEX IF NOT EXISTS idx_movement_reasons_movement_type ON movement_reasons(movement_type);

-- Triggers to update stock levels
CREATE TRIGGER IF NOT EXISTS update_stock_after_movement
AFTER INSERT ON inventory_movements
BEGIN
    INSERT OR REPLACE INTO stock_levels (
        product_id, 
        current_stock, 
        last_movement_at, 
        last_movement_type,
        updated_at
    )
    SELECT 
        NEW.product_id,
        COALESCE(SUM(
            CASE 
                WHEN movement_type IN ('SALE', 'DAMAGE', 'THEFT', 'EXPIRED') THEN -quantity
                ELSE quantity
            END
        ), 0),
        NEW.created_at,
        NEW.movement_type,
        NEW.created_at
    FROM inventory_movements 
    WHERE product_id = NEW.product_id;
    
    -- Update available stock (current - reserved)
    UPDATE stock_levels 
    SET available_stock = current_stock - reserved_stock
    WHERE product_id = NEW.product_id;
END;

-- Function to generate invoice number
CREATE TRIGGER IF NOT EXISTS generate_invoice_number
AFTER INSERT ON invoices
WHEN NEW.invoice_number IS NULL OR NEW.invoice_number = ''
BEGIN
    UPDATE invoices 
    SET invoice_number = 'INV-' || strftime('%Y%m%d', 'now') || '-' || printf('%06d', NEW.id)
    WHERE id = NEW.id;
END;










