-- Migration: 024_returns_system.sql
-- Creates tables for the returns system

-- Create returns table
CREATE TABLE IF NOT EXISTS returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    return_receipt_no TEXT NOT NULL UNIQUE,
    original_receipt_no TEXT NOT NULL,
    customer_id INTEGER,
    cashier_id INTEGER,
    total_value INTEGER NOT NULL, -- in cents
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (cashier_id) REFERENCES users(id)
);

-- Create return_lines table
CREATE TABLE IF NOT EXISTS return_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    return_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    reason TEXT,
    condition TEXT DEFAULT 'good', -- 'good', 'damaged', 'defective'
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_returns_receipt_no ON returns(return_receipt_no);
CREATE INDEX IF NOT EXISTS idx_returns_original_receipt ON returns(original_receipt_no);
CREATE INDEX IF NOT EXISTS idx_returns_customer_id ON returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_returns_created_at ON returns(created_at);
CREATE INDEX IF NOT EXISTS idx_return_lines_return_id ON return_lines(return_id);
CREATE INDEX IF NOT EXISTS idx_return_lines_product_id ON return_lines(product_id);

-- Create view for return summary
CREATE VIEW IF NOT EXISTS v_return_summary AS
SELECT 
    r.id,
    r.return_receipt_no,
    r.original_receipt_no,
    r.total_value,
    r.created_at,
    COUNT(rl.id) as item_count,
    SUM(rl.quantity) as total_quantity
FROM returns r
LEFT JOIN return_lines rl ON r.id = rl.return_id
GROUP BY r.id, r.return_receipt_no, r.original_receipt_no, r.total_value, r.created_at;
