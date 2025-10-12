-- Stock Alerts and Reorder Points System
-- Creates tables for stock alerts, reorder points, and supplier integration

-- Stock alerts table
CREATE TABLE IF NOT EXISTS stock_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    alert_type TEXT NOT NULL,                    -- 'LOW_STOCK', 'OUT_OF_STOCK', 'REORDER_POINT', 'EXPIRY_WARNING'
    current_quantity REAL NOT NULL,
    threshold_quantity REAL NOT NULL,
    message TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,        -- 1 if active, 0 if dismissed
    priority TEXT NOT NULL DEFAULT 'MEDIUM',     -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    dismissed_at TEXT,                           -- When alert was dismissed
    dismissed_by TEXT,                           -- Who dismissed the alert
    
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Reorder points table
CREATE TABLE IF NOT EXISTS reorder_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    supplier_id INTEGER,                         -- Optional supplier preference
    reorder_quantity REAL NOT NULL,              -- How much to reorder
    reorder_point REAL NOT NULL,                 -- When to trigger reorder
    lead_time_days INTEGER NOT NULL DEFAULT 7,   -- Supplier lead time
    is_active INTEGER NOT NULL DEFAULT 1,        -- 1 if active, 0 if disabled
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    UNIQUE(product_id)                           -- One reorder point per product
);

-- Stock alert rules table
CREATE TABLE IF NOT EXISTS stock_alert_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_name TEXT NOT NULL,
    alert_type TEXT NOT NULL,                    -- 'LOW_STOCK', 'OUT_OF_STOCK', 'EXPIRY_WARNING'
    condition_type TEXT NOT NULL,                -- 'QUANTITY_LESS_THAN', 'QUANTITY_EQUALS', 'DAYS_TO_EXPIRY'
    condition_value REAL NOT NULL,               -- Threshold value
    priority TEXT NOT NULL DEFAULT 'MEDIUM',     -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    is_active INTEGER NOT NULL DEFAULT 1,        -- 1 if active, 0 if disabled
    applies_to_all_products INTEGER NOT NULL DEFAULT 1, -- 1 if applies to all, 0 if specific products
    category_id INTEGER,                         -- If applies to specific category
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Stock alert rule products (for specific product rules)
CREATE TABLE IF NOT EXISTS stock_alert_rule_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (rule_id) REFERENCES stock_alert_rules(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE(rule_id, product_id)
);

-- Supplier performance tracking
CREATE TABLE IF NOT EXISTS supplier_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    total_orders INTEGER NOT NULL DEFAULT 0,
    successful_orders INTEGER NOT NULL DEFAULT 0,
    average_lead_time_days REAL NOT NULL DEFAULT 0,
    average_quality_score REAL,                  -- 1-5 rating
    last_order_date TEXT,
    last_delivery_date TEXT,
    on_time_delivery_rate REAL NOT NULL DEFAULT 0, -- Percentage
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE(supplier_id, product_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_alerts_product ON stock_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_type ON stock_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_active ON stock_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_priority ON stock_alerts(priority);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_created ON stock_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_reorder_points_product ON reorder_points(product_id);
CREATE INDEX IF NOT EXISTS idx_reorder_points_supplier ON reorder_points(supplier_id);
CREATE INDEX IF NOT EXISTS idx_reorder_points_active ON reorder_points(is_active);

CREATE INDEX IF NOT EXISTS idx_alert_rules_type ON stock_alert_rules(alert_type);
CREATE INDEX IF NOT EXISTS idx_alert_rules_active ON stock_alert_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_alert_rules_category ON stock_alert_rules(category_id);

CREATE INDEX IF NOT EXISTS idx_supplier_perf_supplier ON supplier_performance(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_perf_product ON supplier_performance(product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_perf_quality ON supplier_performance(average_quality_score);

-- Create views for easy querying
CREATE VIEW IF NOT EXISTS v_active_stock_alerts AS
SELECT 
    sa.id,
    sa.product_id,
    p.sku,
    p.name_en,
    p.unit,
    sa.alert_type,
    sa.current_quantity,
    sa.threshold_quantity,
    sa.message,
    sa.priority,
    sa.created_at,
    CASE 
        WHEN sa.alert_type = 'LOW_STOCK' THEN 'Low Stock'
        WHEN sa.alert_type = 'OUT_OF_STOCK' THEN 'Out of Stock'
        WHEN sa.alert_type = 'REORDER_POINT' THEN 'Reorder Point'
        WHEN sa.alert_type = 'EXPIRY_WARNING' THEN 'Expiry Warning'
        ELSE sa.alert_type
    END as alert_type_display
FROM stock_alerts sa
JOIN products p ON sa.product_id = p.id
WHERE sa.is_active = 1
ORDER BY 
    CASE sa.priority 
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
        ELSE 5
    END,
    sa.created_at DESC;

CREATE VIEW IF NOT EXISTS v_reorder_recommendations AS
SELECT 
    rp.id,
    rp.product_id,
    p.sku,
    p.name_en,
    p.unit,
    c.name as category_name,
    s.name as supplier_name,
    rp.reorder_quantity,
    rp.reorder_point,
    rp.lead_time_days,
    COALESCE(sl.qty_on_hand, 0) as current_quantity,
    CASE 
        WHEN COALESCE(sl.qty_on_hand, 0) <= rp.reorder_point THEN 'REORDER_NOW'
        WHEN COALESCE(sl.qty_on_hand, 0) <= (rp.reorder_point * 1.2) THEN 'REORDER_SOON'
        ELSE 'STOCK_OK'
    END as recommendation_status,
    rp.created_at,
    rp.updated_at
FROM reorder_points rp
JOIN products p ON rp.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN suppliers s ON rp.supplier_id = s.id
LEFT JOIN (
    SELECT 
        product_id,
        SUM(quantity) as qty_on_hand
    FROM stock_ledger
    GROUP BY product_id
) sl ON p.id = sl.product_id
WHERE rp.is_active = 1
ORDER BY recommendation_status, p.name_en;

-- Insert default alert rules
INSERT OR IGNORE INTO stock_alert_rules (
    rule_name, alert_type, condition_type, condition_value, priority, is_active, applies_to_all_products
) VALUES 
('Low Stock Alert', 'LOW_STOCK', 'QUANTITY_LESS_THAN', 10, 'MEDIUM', 1, 1),
('Out of Stock Alert', 'OUT_OF_STOCK', 'QUANTITY_EQUALS', 0, 'HIGH', 1, 1),
('Critical Low Stock', 'LOW_STOCK', 'QUANTITY_LESS_THAN', 5, 'CRITICAL', 1, 1);
