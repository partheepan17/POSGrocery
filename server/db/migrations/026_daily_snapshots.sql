-- Daily Stock Snapshots System
-- Creates tables for automated daily inventory snapshots

-- Stock snapshots table
CREATE TABLE IF NOT EXISTS stock_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_date TEXT NOT NULL,                    -- YYYY-MM-DD format
    product_id INTEGER NOT NULL,                    -- Reference to products table
    sku TEXT NOT NULL,                              -- Product SKU (denormalized for performance)
    name_en TEXT NOT NULL,                          -- Product name in English (denormalized)
    name_si TEXT,                                   -- Product name in Sinhala (denormalized)
    name_ta TEXT,                                   -- Product name in Tamil (denormalized)
    unit TEXT NOT NULL,                             -- Product unit (denormalized)
    category_id INTEGER,                            -- Category ID (denormalized)
    category_name TEXT,                             -- Category name (denormalized)
    qty_on_hand REAL NOT NULL DEFAULT 0,            -- Quantity on hand at snapshot time
    value_cents INTEGER NOT NULL DEFAULT 0,         -- Value in cents at snapshot time
    valuation_method TEXT NOT NULL DEFAULT 'AVERAGE', -- FIFO, AVERAGE, or LIFO
    has_unknown_cost INTEGER NOT NULL DEFAULT 0,    -- 1 if cost is unknown, 0 if known
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Stock snapshot summaries table
CREATE TABLE IF NOT EXISTS stock_snapshot_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_date TEXT NOT NULL UNIQUE,             -- YYYY-MM-DD format
    total_products INTEGER NOT NULL DEFAULT 0,      -- Total number of products
    total_value_cents INTEGER NOT NULL DEFAULT 0,   -- Total inventory value in cents
    products_with_stock INTEGER NOT NULL DEFAULT 0, -- Products with qty > 0
    products_out_of_stock INTEGER NOT NULL DEFAULT 0, -- Products with qty = 0
    products_low_stock INTEGER NOT NULL DEFAULT 0,  -- Products with qty <= 10
    valuation_method TEXT NOT NULL DEFAULT 'AVERAGE', -- FIFO, AVERAGE, or LIFO
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_snapshots_date ON stock_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_snapshots_product ON stock_snapshots(product_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_sku ON stock_snapshots(sku);
CREATE INDEX IF NOT EXISTS idx_snapshots_category ON stock_snapshots(category_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_qty ON stock_snapshots(qty_on_hand);
CREATE INDEX IF NOT EXISTS idx_snapshots_value ON stock_snapshots(value_cents);

CREATE INDEX IF NOT EXISTS idx_snapshot_summaries_date ON stock_snapshot_summaries(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_snapshot_summaries_value ON stock_snapshot_summaries(total_value_cents);

-- Create a view for easy snapshot analysis
CREATE VIEW IF NOT EXISTS v_snapshot_analysis AS
SELECT 
    s.snapshot_date,
    s.total_products,
    s.total_value_cents,
    s.products_with_stock,
    s.products_out_of_stock,
    s.products_low_stock,
    s.valuation_method,
    s.created_at,
    ROUND(s.total_value_cents / 100.0, 2) as total_value_lkr,
    ROUND((s.products_with_stock * 100.0) / s.total_products, 2) as stock_availability_pct,
    ROUND((s.products_low_stock * 100.0) / s.total_products, 2) as low_stock_pct
FROM stock_snapshot_summaries s
ORDER BY s.snapshot_date DESC;

-- Create a view for product snapshot trends
CREATE VIEW IF NOT EXISTS v_product_snapshot_trends AS
SELECT 
    p.id as product_id,
    p.sku,
    p.name_en,
    p.unit,
    s.snapshot_date,
    s.qty_on_hand,
    s.value_cents,
    s.valuation_method,
    ROUND(s.value_cents / 100.0, 2) as value_lkr,
    LAG(s.qty_on_hand) OVER (PARTITION BY p.id ORDER BY s.snapshot_date) as prev_qty,
    s.qty_on_hand - LAG(s.qty_on_hand) OVER (PARTITION BY p.id ORDER BY s.snapshot_date) as qty_change,
    LAG(s.value_cents) OVER (PARTITION BY p.id ORDER BY s.snapshot_date) as prev_value,
    s.value_cents - LAG(s.value_cents) OVER (PARTITION BY p.id ORDER BY s.snapshot_date) as value_change
FROM stock_snapshots s
JOIN products p ON s.product_id = p.id
ORDER BY p.name_en, s.snapshot_date DESC;

-- Insert initial snapshot if no snapshots exist
INSERT OR IGNORE INTO stock_snapshot_summaries (
    snapshot_date, total_products, total_value_cents, products_with_stock,
    products_out_of_stock, products_low_stock, valuation_method, created_at
)
SELECT 
    date('now') as snapshot_date,
    COUNT(*) as total_products,
    0 as total_value_cents,
    0 as products_with_stock,
    0 as products_out_of_stock,
    0 as products_low_stock,
    'AVERAGE' as valuation_method,
    datetime('now') as created_at
FROM products
WHERE is_active = 1
AND NOT EXISTS (SELECT 1 FROM stock_snapshot_summaries WHERE snapshot_date = date('now'));
