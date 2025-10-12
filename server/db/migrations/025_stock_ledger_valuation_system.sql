-- Migration: 025_stock_ledger_valuation_system.sql
-- Implements comprehensive stock ledger with FIFO/Average cost valuation

-- Create proper stock_ledger table (replaces basic stock_movements)
CREATE TABLE IF NOT EXISTS stock_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    delta_qty REAL NOT NULL,                    -- positive for GRN, negative for SALE/RETURN etc.
    reason TEXT NOT NULL,                       -- 'GRN' | 'SALE' | 'RETURN' | 'ADJUST' | 'OPENING'
    ref_id INTEGER,                             -- links to grn/sale/adjustment id
    unit_cost_cents INTEGER,                    -- optional, for FIFO and valuation
    lot_id INTEGER,                             -- optional, if lots/batches are tracked
    balance_after REAL NOT NULL,                -- running balance after this movement
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by INTEGER,
    notes TEXT,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (lot_id) REFERENCES stock_lots(id)
);

-- Create stock_lots table for FIFO tracking
CREATE TABLE IF NOT EXISTS stock_lots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    lot_number TEXT,
    quantity_received INTEGER NOT NULL,
    quantity_remaining INTEGER NOT NULL,
    unit_cost_cents INTEGER NOT NULL, -- in cents
    received_date TEXT DEFAULT (datetime('now')),
    expiry_date TEXT,
    supplier_id INTEGER,
    grn_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (grn_id) REFERENCES grn_headers(id)
);

-- Create product_cost_policy table
CREATE TABLE IF NOT EXISTS product_cost_policy (
    product_id INTEGER PRIMARY KEY,
    cost_method TEXT NOT NULL DEFAULT 'AVERAGE', -- 'FIFO', 'AVERAGE', 'LIFO'
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Create stock_snapshots table for daily snapshots
CREATE TABLE IF NOT EXISTS stock_snapshots (
    date TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    qty_on_hand REAL NOT NULL,
    value_cents INTEGER NOT NULL,
    method TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY(date, product_id, method),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ledger_product ON stock_ledger(product_id);
CREATE INDEX IF NOT EXISTS idx_ledger_product_ts ON stock_ledger(product_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ledger_reason ON stock_ledger(reason);
CREATE INDEX IF NOT EXISTS idx_ledger_ref ON stock_ledger(ref_id, reason);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON stock_ledger(created_at);

CREATE INDEX IF NOT EXISTS idx_lots_product ON stock_lots(product_id);
CREATE INDEX IF NOT EXISTS idx_lots_received_date ON stock_lots(received_date);
CREATE INDEX IF NOT EXISTS idx_lots_expiry_date ON stock_lots(expiry_date);
CREATE INDEX IF NOT EXISTS idx_lots_remaining ON stock_lots(product_id, quantity_remaining) WHERE quantity_remaining > 0;

CREATE INDEX IF NOT EXISTS idx_snapshots_date ON stock_snapshots(date);
CREATE INDEX IF NOT EXISTS idx_snapshots_product ON stock_snapshots(product_id);

-- Migrate existing stock_movements to stock_ledger
INSERT OR IGNORE INTO stock_ledger (
    product_id, delta_qty, reason, ref_id, unit_cost_cents, 
    balance_after, created_at, created_by, notes
)
SELECT 
    product_id,
    quantity as delta_qty,
    CASE 
        WHEN movement_type = 'sale' THEN 'SALE'
        WHEN movement_type = 'purchase' THEN 'GRN'
        WHEN movement_type = 'adjustment' THEN 'ADJUST'
        WHEN movement_type = 'return' THEN 'RETURN'
        ELSE 'ADJUST'
    END as reason,
    reference_id as ref_id,
    NULL as unit_cost_cents, -- No cost data in old system
    (
        SELECT COALESCE(SUM(sm2.quantity), 0) 
        FROM stock_movements sm2 
        WHERE sm2.product_id = sm.product_id 
        AND (sm2.created_at < sm.created_at OR (sm2.created_at = sm.created_at AND sm2.id <= sm.id))
    ) as balance_after,
    created_at,
    created_by,
    notes
FROM stock_movements sm
ORDER BY sm.product_id, sm.created_at, sm.id;

-- Set default cost policies for all products
INSERT OR IGNORE INTO product_cost_policy (product_id, cost_method)
SELECT id, 'AVERAGE' FROM products WHERE id NOT IN (SELECT product_id FROM product_cost_policy);

-- Create trigger to prevent negative stock (for SALE only)
CREATE TRIGGER IF NOT EXISTS prevent_negative_stock
BEFORE INSERT ON stock_ledger
WHEN NEW.reason = 'SALE' AND NEW.delta_qty < 0
BEGIN
    SELECT CASE
        WHEN (
            SELECT COALESCE(SUM(delta_qty), 0) 
            FROM stock_ledger 
            WHERE product_id = NEW.product_id
        ) + NEW.delta_qty < 0
        THEN RAISE(ABORT, 'Insufficient stock: Cannot reduce stock below zero')
    END;
END;

-- Create trigger to automatically calculate balance_after
CREATE TRIGGER IF NOT EXISTS calculate_balance_after
BEFORE INSERT ON stock_ledger
BEGIN
    SELECT CASE
        WHEN NEW.balance_after IS NULL OR NEW.balance_after = 0
        THEN RAISE(ABORT, 'balance_after must be calculated and provided')
    END;
END;

-- Create view for current stock levels
CREATE VIEW IF NOT EXISTS v_product_stock AS
SELECT 
    p.id as product_id,
    p.sku,
    p.name_en,
    p.name_si,
    p.name_ta,
    p.unit,
    p.category_id,
    c.name as category_name,
    COALESCE(SUM(sl.delta_qty), 0) as qty_on_hand,
    pcp.cost_method,
    p.is_active,
    p.created_at
FROM products p
LEFT JOIN stock_ledger sl ON p.id = sl.product_id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN product_cost_policy pcp ON p.id = pcp.product_id
GROUP BY p.id, p.sku, p.name_en, p.name_si, p.name_ta, p.unit, p.category_id, c.name, pcp.cost_method, p.is_active, p.created_at;

-- Create view for FIFO lots (ordered by received_date)
CREATE VIEW IF NOT EXISTS v_fifo_lots AS
SELECT 
    sl.*,
    ROW_NUMBER() OVER (PARTITION BY sl.product_id ORDER BY sl.received_date ASC, sl.id ASC) as fifo_rank
FROM stock_lots sl
WHERE sl.quantity_remaining > 0;
