-- Migration: 023_stock_ledger_fifo_average.sql
-- Implements deterministic stock ledger with FIFO/Average cost policy

-- Create stock_lots table for FIFO tracking
CREATE TABLE IF NOT EXISTS stock_lots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    lot_number TEXT,
    quantity_received INTEGER NOT NULL,
    quantity_remaining INTEGER NOT NULL,
    unit_cost INTEGER NOT NULL, -- in cents
    received_date TEXT DEFAULT CURRENT_TIMESTAMP,
    expiry_date TEXT,
    supplier_id INTEGER,
    grn_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (grn_id) REFERENCES grn_headers(id)
);

-- Create stock_movements table for complete audit trail
CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    movement_type TEXT NOT NULL, -- 'purchase', 'sale', 'return', 'adjustment', 'transfer'
    reference_id INTEGER, -- ID of the transaction (sale, grn, etc.)
    reference_type TEXT, -- 'sale', 'grn', 'adjustment', 'transfer'
    lot_id INTEGER, -- For FIFO tracking
    quantity INTEGER NOT NULL, -- positive for incoming, negative for outgoing
    unit_cost INTEGER, -- in cents
    total_cost INTEGER, -- in cents
    balance_after INTEGER NOT NULL, -- quantity after this movement
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (lot_id) REFERENCES stock_lots(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create product_cost_policy table to track cost calculation method
CREATE TABLE IF NOT EXISTS product_cost_policy (
    product_id INTEGER PRIMARY KEY,
    cost_method TEXT NOT NULL DEFAULT 'AVERAGE', -- 'FIFO', 'AVERAGE', 'LIFO'
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_lots_product_id ON stock_lots(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_lots_received_date ON stock_lots(received_date);
CREATE INDEX IF NOT EXISTS idx_stock_lots_expiry_date ON stock_lots(expiry_date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);

-- Insert default cost policies for existing products
INSERT OR IGNORE INTO product_cost_policy (product_id, cost_method)
SELECT id, 'AVERAGE' FROM products WHERE id NOT IN (SELECT product_id FROM product_cost_policy);

-- Create view for current stock levels by product
CREATE VIEW IF NOT EXISTS v_product_stock AS
SELECT 
    p.id as product_id,
    p.sku,
    p.name_en,
    COALESCE(SUM(sl.quantity_remaining), 0) as total_quantity,
    COALESCE(AVG(sl.unit_cost), 0) as average_cost,
    COUNT(DISTINCT sl.id) as lot_count
FROM products p
LEFT JOIN stock_lots sl ON p.id = sl.product_id AND sl.quantity_remaining > 0
GROUP BY p.id, p.sku, p.name_en;

-- Create view for FIFO lot selection
CREATE VIEW IF NOT EXISTS v_fifo_lots AS
SELECT 
    sl.*,
    ROW_NUMBER() OVER (PARTITION BY sl.product_id ORDER BY sl.received_date ASC, sl.id ASC) as fifo_rank
FROM stock_lots sl
WHERE sl.quantity_remaining > 0;

-- Create function to get FIFO lots for a product (SQLite doesn't support functions, so we'll use a view)
CREATE VIEW IF NOT EXISTS v_fifo_lots_available AS
SELECT 
    product_id,
    id as lot_id,
    lot_number,
    quantity_remaining,
    unit_cost,
    received_date,
    expiry_date,
    fifo_rank
FROM v_fifo_lots
WHERE fifo_rank <= 10; -- Limit to top 10 lots for performance
