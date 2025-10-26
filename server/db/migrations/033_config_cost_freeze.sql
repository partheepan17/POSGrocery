-- Cost Freeze Configuration
-- Migration: 034_config_cost_freeze.sql

-- Add cost freeze configuration to system_config
INSERT OR IGNORE INTO system_config (key, value, description, created_at, updated_at) 
VALUES (
  'inventory.cost_freeze_after_days', 
  '0', 
  'Number of days after which to freeze historical COGS calculations. 0 = never freeze, 7 = freeze after 7 days',
  datetime('now'),
  datetime('now')
);

-- Add cost_freeze_date column to stock_lots to track when cost was frozen
ALTER TABLE stock_lots ADD COLUMN cost_freeze_date DATETIME;

-- Add index for efficient cost freeze queries
CREATE INDEX IF NOT EXISTS idx_stock_lots_cost_freeze ON stock_lots(cost_freeze_date);

-- Add cost_freeze_date column to stock_ledger for audit trail
ALTER TABLE stock_ledger ADD COLUMN cost_freeze_date DATETIME;

-- Create view for cost freeze status
CREATE VIEW IF NOT EXISTS cost_freeze_status AS
SELECT 
  p.id as product_id,
  p.name_en as product_name,
  p.sku,
  MAX(sl.received_date) as last_grn_date,
  MAX(sl.cost_freeze_date) as last_freeze_date,
  MAX(il.created_at) as last_sale_date,
  CASE 
    WHEN MAX(sl.cost_freeze_date) IS NOT NULL THEN MAX(sl.cost_freeze_date)
    WHEN MAX(il.created_at) IS NOT NULL THEN MAX(il.created_at)
    ELSE MAX(sl.received_date)
  END as effective_freeze_date,
  CASE 
    WHEN MAX(sl.cost_freeze_date) IS NOT NULL THEN 'FROZEN'
    WHEN MAX(il.created_at) IS NOT NULL THEN 'SALE_LOCKED'
    ELSE 'OPEN'
  END as freeze_status
FROM products p
LEFT JOIN stock_lots sl ON p.id = sl.product_id
LEFT JOIN invoice_lines il ON p.id = il.product_id
GROUP BY p.id, p.name_en, p.sku;


