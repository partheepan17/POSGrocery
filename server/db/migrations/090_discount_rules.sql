-- Discount Rules System
-- This migration creates the discount_rules table for managing product, category, and supplier discounts

CREATE TABLE IF NOT EXISTS discount_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    applies_to TEXT NOT NULL DEFAULT 'PRODUCT', -- PRODUCT, CATEGORY, SUPPLIER
    level TEXT NOT NULL DEFAULT 'PRODUCT', -- PRODUCT, GROUP, SUPPLIER
    target_id INTEGER NOT NULL, -- ID of the product, category, or supplier
    type TEXT NOT NULL DEFAULT 'PERCENT', -- PERCENT, AMOUNT
    value REAL NOT NULL, -- Discount value (percentage or fixed amount)
    channel TEXT NOT NULL DEFAULT 'BOTH', -- RETAIL, WHOLESALE, BOTH
    stack_mode TEXT NOT NULL DEFAULT 'EXCLUSIVE', -- EXCLUSIVE, STACKABLE
    apply_quantity_rule BOOLEAN NOT NULL DEFAULT 1, -- Whether to apply quantity-based rules
    max_qty_or_weight REAL, -- Maximum quantity/weight for the discount
    active BOOLEAN NOT NULL DEFAULT 1,
    active_from DATETIME, -- Start date for the discount
    active_to DATETIME, -- End date for the discount
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_discount_rules_target ON discount_rules(target_id);
CREATE INDEX IF NOT EXISTS idx_discount_rules_level ON discount_rules(level);
CREATE INDEX IF NOT EXISTS idx_discount_rules_active ON discount_rules(active);
CREATE INDEX IF NOT EXISTS idx_discount_rules_channel ON discount_rules(channel);
CREATE INDEX IF NOT EXISTS idx_discount_rules_dates ON discount_rules(active_from, active_to);

-- Insert some sample discount rules
INSERT OR IGNORE INTO discount_rules (name, applies_to, level, target_id, type, value, channel, stack_mode, active) VALUES
('Bulk Discount - Electronics', 'CATEGORY', 'GROUP', 1, 'PERCENT', 5.0, 'BOTH', 'EXCLUSIVE', 1),
('Supplier Special - Fresh Foods', 'SUPPLIER', 'SUPPLIER', 1, 'PERCENT', 10.0, 'RETAIL', 'EXCLUSIVE', 1),
('Weekend Sale - All Products', 'PRODUCT', 'PRODUCT', 0, 'PERCENT', 15.0, 'BOTH', 'EXCLUSIVE', 0),
('Wholesale Volume Discount', 'CATEGORY', 'GROUP', 2, 'PERCENT', 8.0, 'WHOLESALE', 'STACKABLE', 1);

-- Create a view for active discount rules
CREATE VIEW IF NOT EXISTS v_active_discount_rules AS
SELECT 
    dr.*,
    CASE 
        WHEN dr.level = 'PRODUCT' THEN p.name_en
        WHEN dr.level = 'GROUP' THEN c.name
        WHEN dr.level = 'SUPPLIER' THEN s.supplier_name
        ELSE 'Unknown'
    END as target_name
FROM discount_rules dr
LEFT JOIN products p ON dr.level = 'PRODUCT' AND dr.target_id = p.id
LEFT JOIN categories c ON dr.level = 'GROUP' AND dr.target_id = c.id
LEFT JOIN suppliers s ON dr.level = 'SUPPLIER' AND dr.target_id = s.id
WHERE dr.active = 1 
    AND (dr.active_from IS NULL OR dr.active_from <= datetime('now'))
    AND (dr.active_to IS NULL OR dr.active_to >= datetime('now'));







