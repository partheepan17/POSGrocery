-- Migration: Create GRN (Goods Received Note) tables
-- This creates the GRN system for receiving goods from suppliers

-- GRN header table
CREATE TABLE IF NOT EXISTS grn (
    id INTEGER PRIMARY KEY,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
    grn_no TEXT UNIQUE, -- human-readable number e.g., GRN-2025-000123
    datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    received_by INTEGER REFERENCES users(id),
    note TEXT,
    status TEXT DEFAULT 'OPEN' CHECK(status IN ('OPEN','POSTED','VOID')),
    subtotal DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    other DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) DEFAULT 0
);

-- GRN lines table
CREATE TABLE IF NOT EXISTS grn_lines (
    id INTEGER PRIMARY KEY,
    grn_id INTEGER NOT NULL REFERENCES grn(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    qty DECIMAL(10,3) NOT NULL CHECK(qty > 0),
    unit_cost DECIMAL(10,2) NOT NULL CHECK(unit_cost >= 0),
    mrp DECIMAL(10,2) NULL,
    batch_no TEXT NULL,
    expiry_date DATE NULL,
    line_total DECIMAL(10,2) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_grn_datetime ON grn(datetime);
CREATE INDEX IF NOT EXISTS idx_grn_supplier ON grn(supplier_id);
CREATE INDEX IF NOT EXISTS idx_grn_status ON grn(status);
CREATE INDEX IF NOT EXISTS idx_grn_grn_no ON grn(grn_no);

CREATE INDEX IF NOT EXISTS idx_grn_lines_grn ON grn_lines(grn_id);
CREATE INDEX IF NOT EXISTS idx_grn_lines_product ON grn_lines(product_id);

-- Ensure RECEIVE type exists in inventory_movements
-- For SQLite, we'll assume the application layer handles validation
-- or the enum is flexible enough to accept 'RECEIVE' as a valid type
-- In a real scenario, this would be handled by the application's type system
