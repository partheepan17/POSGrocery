-- Migration: Create GRN (Goods Received Note) tables
-- GRN headers table
CREATE TABLE IF NOT EXISTS grn_headers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
    ref_no TEXT NOT NULL,
    note TEXT,
    status TEXT CHECK (status IN ('DRAFT', 'POSTED')) DEFAULT 'DRAFT',
    grn_date DATE NOT NULL,
    posted_at TIMESTAMP NULL,
    by_user INTEGER REFERENCES users(id),
    approval_user INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GRN lines table
CREATE TABLE IF NOT EXISTS grn_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grn_id INTEGER NOT NULL REFERENCES grn_headers(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    qty DECIMAL(10,3) NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_grn_headers_status ON grn_headers(status);
CREATE INDEX IF NOT EXISTS idx_grn_headers_supplier ON grn_headers(supplier_id);
CREATE INDEX IF NOT EXISTS idx_grn_headers_date ON grn_headers(grn_date);
CREATE INDEX IF NOT EXISTS idx_grn_headers_ref ON grn_headers(ref_no);
CREATE INDEX IF NOT EXISTS idx_grn_lines_grn ON grn_lines(grn_id);
CREATE INDEX IF NOT EXISTS idx_grn_lines_product ON grn_lines(product_id);


