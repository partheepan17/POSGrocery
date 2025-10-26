-- Migration: 031_cogs_system.sql
-- Implements COGS calculation and stock movement tracking for sales

-- Create system_config table for application settings
CREATE TABLE IF NOT EXISTS system_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Add COGS columns to invoice_lines table
ALTER TABLE invoice_lines ADD COLUMN unit_cost_cents INTEGER DEFAULT 0;
ALTER TABLE invoice_lines ADD COLUMN cogs_cents INTEGER DEFAULT 0;
ALTER TABLE invoice_lines ADD COLUMN gross_margin_cents INTEGER DEFAULT 0;

-- Create indexes for COGS queries
CREATE INDEX IF NOT EXISTS idx_invoice_lines_cogs ON invoice_lines(unit_cost_cents, cogs_cents);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_margin ON invoice_lines(gross_margin_cents);

-- Create index for system config lookups
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key);

-- Insert default valuation method
INSERT OR IGNORE INTO system_config (key, value, description) 
VALUES ('default_valuation_method', 'FIFO', 'Default inventory valuation method: FIFO, LIFO, or AVERAGE');

-- Insert default cost calculation settings
INSERT OR IGNORE INTO system_config (key, value, description) 
VALUES ('enable_cogs_calculation', 'true', 'Enable COGS calculation on sales');

INSERT OR IGNORE INTO system_config (key, value, description) 
VALUES ('enable_stock_movements', 'true', 'Enable stock movement tracking');

-- Create view for COGS reporting
CREATE VIEW IF NOT EXISTS v_sales_cogs AS
SELECT 
    il.id as line_id,
    il.invoice_id,
    il.product_id,
    p.sku,
    p.name_en as product_name,
    il.qty,
    il.unit_price,
    il.unit_cost_cents / 100.0 as unit_cost,
    il.cogs_cents / 100.0 as cogs,
    il.gross_margin_cents / 100.0 as gross_margin,
    il.total,
    (il.gross_margin_cents / 100.0) / (il.total) * 100 as margin_percentage,
    i.created_at as sale_date,
    i.receipt_no
FROM invoice_lines il
JOIN products p ON il.product_id = p.id
JOIN invoices i ON il.invoice_id = i.id
WHERE il.cogs_cents > 0;

-- Create view for product profitability
CREATE VIEW IF NOT EXISTS v_product_profitability AS
SELECT 
    p.id as product_id,
    p.sku,
    p.name_en as product_name,
    COUNT(il.id) as sales_count,
    SUM(il.qty) as total_qty_sold,
    AVG(il.unit_price) as avg_selling_price,
    AVG(il.unit_cost_cents / 100.0) as avg_unit_cost,
    SUM(il.cogs_cents / 100.0) as total_cogs,
    SUM(il.gross_margin_cents / 100.0) as total_gross_margin,
    AVG((il.gross_margin_cents / 100.0) / (il.total) * 100) as avg_margin_percentage
FROM products p
LEFT JOIN invoice_lines il ON p.id = il.product_id AND il.cogs_cents > 0
GROUP BY p.id, p.sku, p.name_en;

-- Create trigger to calculate COGS when invoice_lines are inserted
CREATE TRIGGER IF NOT EXISTS calculate_cogs_on_sale
AFTER INSERT ON invoice_lines
WHEN NEW.unit_cost_cents = 0  -- Only calculate if not already set
BEGIN
    -- This trigger will be replaced by application logic
    -- but provides a fallback for manual data entry
    UPDATE invoice_lines 
    SET 
        unit_cost_cents = COALESCE(
            (SELECT cost * 100 FROM products WHERE id = NEW.product_id), 
            0
        ),
        cogs_cents = NEW.qty * COALESCE(
            (SELECT cost * 100 FROM products WHERE id = NEW.product_id), 
            0
        ),
        gross_margin_cents = NEW.total * 100 - (NEW.qty * COALESCE(
            (SELECT cost * 100 FROM products WHERE id = NEW.product_id), 
            0
        ))
    WHERE id = NEW.id;
END;


