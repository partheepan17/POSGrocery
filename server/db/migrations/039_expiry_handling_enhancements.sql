-- Migration: 039_expiry_handling_enhancements.sql
-- Enhances expiry handling with FEFO logic and expiry alerts

-- Ensure expiry_date columns exist and are properly indexed
-- (These may already exist from previous migrations, but we'll ensure they're properly set up)

-- Add expiry_date to grn_lines if it doesn't exist
ALTER TABLE grn_lines ADD COLUMN expiry_date DATE;

-- Add expiry_date to stock_lots if it doesn't exist  
ALTER TABLE stock_lots ADD COLUMN expiry_date TEXT;

-- Create indexes for expiry date queries
CREATE INDEX IF NOT EXISTS idx_grn_lines_expiry ON grn_lines(expiry_date);
CREATE INDEX IF NOT EXISTS idx_stock_lots_expiry ON stock_lots(expiry_date);
CREATE INDEX IF NOT EXISTS idx_stock_lots_product_expiry ON stock_lots(product_id, expiry_date);

-- Create a view for products with expiry information
CREATE VIEW IF NOT EXISTS vw_products_with_expiry AS
SELECT 
    p.id as product_id,
    p.sku,
    p.name_en,
    p.name_si,
    p.name_ta,
    p.unit,
    p.is_active,
    c.name as category_name,
    sl.lot_id,
    sl.lot_number,
    sl.quantity_remaining,
    sl.expiry_date,
    sl.unit_cost_cents,
    sl.received_date,
    CASE 
        WHEN sl.expiry_date IS NULL THEN NULL
        ELSE CAST((julianday(sl.expiry_date) - julianday('now')) AS INTEGER)
    END as days_to_expiry,
    CASE 
        WHEN sl.expiry_date IS NULL THEN 'No Expiry'
        WHEN julianday(sl.expiry_date) < julianday('now') THEN 'Expired'
        WHEN julianday(sl.expiry_date) <= julianday('now', '+30 days') THEN 'Near Expiry'
        ELSE 'Fresh'
    END as expiry_status
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN stock_lots sl ON p.id = sl.product_id AND sl.quantity_remaining > 0
WHERE p.is_active = 1;

-- Create a view for near-expiry products
CREATE VIEW IF NOT EXISTS vw_near_expiry_products AS
SELECT 
    product_id,
    sku,
    name_en,
    name_si,
    name_ta,
    unit,
    category_name,
    lot_id,
    lot_number,
    quantity_remaining,
    expiry_date,
    days_to_expiry,
    expiry_status,
    unit_cost_cents,
    received_date
FROM vw_products_with_expiry
WHERE expiry_status IN ('Near Expiry', 'Expired')
ORDER BY days_to_expiry ASC, product_id, lot_id;

-- Create a view for FEFO lot selection
CREATE VIEW IF NOT EXISTS vw_fefo_lots AS
SELECT 
    product_id,
    lot_id,
    lot_number,
    quantity_remaining,
    expiry_date,
    unit_cost_cents,
    received_date,
    ROW_NUMBER() OVER (
        PARTITION BY product_id 
        ORDER BY 
            CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END, -- Non-expiring items last
            expiry_date ASC, -- Earlier expiry first
            received_date ASC -- Earlier received first for same expiry
    ) as fefo_priority
FROM stock_lots
WHERE quantity_remaining > 0;

-- Create a function to get FEFO lots for a product (SQLite doesn't support functions, so we'll use a view)
CREATE VIEW IF NOT EXISTS vw_fefo_lots_by_product AS
SELECT 
    product_id,
    lot_id,
    lot_number,
    quantity_remaining,
    expiry_date,
    unit_cost_cents,
    received_date,
    fefo_priority,
    SUM(quantity_remaining) OVER (
        PARTITION BY product_id 
        ORDER BY fefo_priority 
        ROWS UNBOUNDED PRECEDING
    ) as cumulative_quantity
FROM vw_fefo_lots;

-- Create a table for expiry alerts configuration
CREATE TABLE IF NOT EXISTS expiry_alerts_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_name TEXT NOT NULL UNIQUE,
    days_threshold INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Insert default expiry alert configurations
INSERT OR IGNORE INTO expiry_alerts_config (alert_name, days_threshold, is_active) VALUES
('Critical Expiry', 7, 1),
('Near Expiry', 30, 1),
('Expired', 0, 1);

-- Create a table for expiry alert history
CREATE TABLE IF NOT EXISTS expiry_alert_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    lot_id INTEGER,
    lot_number TEXT,
    expiry_date TEXT,
    days_to_expiry INTEGER,
    alert_type TEXT NOT NULL,
    alert_sent_at TEXT NOT NULL DEFAULT (datetime('now')),
    acknowledged_at TEXT,
    acknowledged_by INTEGER,
    notes TEXT,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (lot_id) REFERENCES stock_lots(id),
    FOREIGN KEY (acknowledged_by) REFERENCES users(id)
);

-- Create indexes for expiry alert history
CREATE INDEX IF NOT EXISTS idx_expiry_alert_history_product ON expiry_alert_history(product_id);
CREATE INDEX IF NOT EXISTS idx_expiry_alert_history_lot ON expiry_alert_history(lot_id);
CREATE INDEX IF NOT EXISTS idx_expiry_alert_history_type ON expiry_alert_history(alert_type);
CREATE INDEX IF NOT EXISTS idx_expiry_alert_history_sent ON expiry_alert_history(alert_sent_at);

-- Create a trigger to automatically create expiry alerts
CREATE TRIGGER IF NOT EXISTS trigger_expiry_alert_check
AFTER INSERT ON stock_lots
WHEN NEW.expiry_date IS NOT NULL
BEGIN
    -- Check if this lot should trigger an alert
    INSERT OR IGNORE INTO expiry_alert_history (
        product_id, lot_id, lot_number, expiry_date, days_to_expiry, alert_type
    )
    SELECT 
        NEW.product_id,
        NEW.id,
        NEW.lot_number,
        NEW.expiry_date,
        CAST((julianday(NEW.expiry_date) - julianday('now')) AS INTEGER),
        CASE 
            WHEN julianday(NEW.expiry_date) <= julianday('now') THEN 'Expired'
            WHEN julianday(NEW.expiry_date) <= julianday('now', '+7 days') THEN 'Critical Expiry'
            WHEN julianday(NEW.expiry_date) <= julianday('now', '+30 days') THEN 'Near Expiry'
            ELSE NULL
        END
    WHERE 
        CASE 
            WHEN julianday(NEW.expiry_date) <= julianday('now') THEN 'Expired'
            WHEN julianday(NEW.expiry_date) <= julianday('now', '+7 days') THEN 'Critical Expiry'
            WHEN julianday(NEW.expiry_date) <= julianday('now', '+30 days') THEN 'Near Expiry'
            ELSE NULL
        END IS NOT NULL;
END;

-- Create a view for current expiry alerts
CREATE VIEW IF NOT EXISTS vw_current_expiry_alerts AS
SELECT 
    eah.id as alert_id,
    eah.product_id,
    p.sku,
    p.name_en,
    p.name_si,
    p.name_ta,
    p.unit,
    c.name as category_name,
    eah.lot_id,
    eah.lot_number,
    eah.expiry_date,
    eah.days_to_expiry,
    eah.alert_type,
    eah.alert_sent_at,
    eah.acknowledged_at,
    eah.acknowledged_by,
    u.username as acknowledged_by_username,
    eah.notes,
    sl.quantity_remaining,
    sl.unit_cost_cents
FROM expiry_alert_history eah
JOIN products p ON eah.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN stock_lots sl ON eah.lot_id = sl.id
LEFT JOIN users u ON eah.acknowledged_by = u.id
WHERE eah.acknowledged_at IS NULL
ORDER BY eah.days_to_expiry ASC, eah.alert_sent_at DESC;










