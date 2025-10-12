-- GRN (Goods Received Note) System Schema - Simplified
-- This migration creates the basic GRN and stock management system

-- GRN Headers table
CREATE TABLE IF NOT EXISTS grn_headers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grn_number VARCHAR(50) UNIQUE NOT NULL,
    po_id INTEGER,
    supplier_id INTEGER NOT NULL,
    grn_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    received_by INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    total_quantity INTEGER DEFAULT 0,
    total_value DECIMAL(10,2) DEFAULT 0,
    freight_cost DECIMAL(10,2) DEFAULT 0,
    duty_cost DECIMAL(10,2) DEFAULT 0,
    misc_cost DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (received_by) REFERENCES users(id)
);

-- GRN Lines table
CREATE TABLE IF NOT EXISTS grn_lines (
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
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Stock Ledger table for inventory tracking
CREATE TABLE IF NOT EXISTS stock_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    movement_type VARCHAR(20) NOT NULL,
    reference_id INTEGER,
    reference_type VARCHAR(20),
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    balance_quantity INTEGER NOT NULL,
    balance_value DECIMAL(10,2) NOT NULL,
    batch_number VARCHAR(50),
    expiry_date DATE,
    notes TEXT,
    created_by INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Product Stock table for current stock levels
CREATE TABLE IF NOT EXISTS product_stock (
    product_id INTEGER PRIMARY KEY,
    current_quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    available_quantity INTEGER NOT NULL DEFAULT 0,
    total_value DECIMAL(10,2) NOT NULL DEFAULT 0,
    average_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    last_movement_date DATETIME,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_grn_supplier ON grn_headers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_grn_status ON grn_headers(status);
CREATE INDEX IF NOT EXISTS idx_grn_date ON grn_headers(grn_date);
CREATE INDEX IF NOT EXISTS idx_grn_lines_grn ON grn_lines(grn_id);
CREATE INDEX IF NOT EXISTS idx_grn_lines_product ON grn_lines(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_product ON stock_ledger(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_type ON stock_ledger(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_reference ON stock_ledger(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_date ON stock_ledger(created_at);
