-- Add stock tracking to products table
ALTER TABLE products ADD COLUMN stock_qty INTEGER DEFAULT 0;

-- Add index for stock queries
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_qty);

-- Create stock movements table for audit trail
CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('sale', 'purchase', 'adjustment', 'return')),
    quantity INTEGER NOT NULL,
    reference_id INTEGER, -- invoice_id, purchase_id, etc.
    reference_type TEXT, -- 'invoice', 'purchase', 'adjustment'
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Index for stock movements
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_id, reference_type);


