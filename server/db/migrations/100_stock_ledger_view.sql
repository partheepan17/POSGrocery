-- Migration: 100_stock_ledger_view.sql
-- Creates comprehensive stock ledger view with running quantities and valuations

-- Drop existing view if it exists
DROP VIEW IF EXISTS vw_stock_ledger;

-- Create comprehensive stock ledger view
CREATE VIEW vw_stock_ledger AS
WITH stock_calculations AS (
  SELECT 
    sm.product_id,
    sm.created_at,
    sm.qty,
    sm.type,
    sm.reason,
    sm.unit_cost,
    sm.terminal,
    sm.cashier,
    sm.note,
    -- Calculate running balance
    SUM(sm.qty) OVER (
      PARTITION BY sm.product_id 
      ORDER BY sm.created_at, sm.id
      ROWS UNBOUNDED PRECEDING
    ) as running_qty,
    -- Calculate running value (using unit_cost when available)
    SUM(COALESCE(sm.unit_cost * sm.qty, 0)) OVER (
      PARTITION BY sm.product_id 
      ORDER BY sm.created_at, sm.id
      ROWS UNBOUNDED PRECEDING
    ) as running_value,
    -- Calculate average cost
    CASE 
      WHEN SUM(sm.qty) OVER (PARTITION BY sm.product_id ORDER BY sm.created_at, sm.id ROWS UNBOUNDED PRECEDING) > 0
      THEN SUM(COALESCE(sm.unit_cost * sm.qty, 0)) OVER (
        PARTITION BY sm.product_id 
        ORDER BY sm.created_at, sm.id
        ROWS UNBOUNDED PRECEDING
      ) / SUM(sm.qty) OVER (
        PARTITION BY sm.product_id 
        ORDER BY sm.created_at, sm.id
        ROWS UNBOUNDED PRECEDING
      )
      ELSE 0
    END as avg_cost
  FROM stock_movements sm
),
latest_balances AS (
  SELECT 
    product_id,
    MAX(created_at) as last_movement_date,
    MAX(running_qty) as current_qty,
    MAX(running_value) as current_value,
    MAX(avg_cost) as current_avg_cost
  FROM stock_calculations
  GROUP BY product_id
)
SELECT 
  p.id as product_id,
  p.sku,
  p.barcode,
  p.name_en,
  p.name_si,
  p.name_ta,
  p.unit,
  c.name as category_name,
  s.supplier_name,
  COALESCE(lb.current_qty, 0) as current_stock,
  COALESCE(lb.current_value, 0) as current_value,
  COALESCE(lb.current_avg_cost, 0) as avg_cost,
  p.price_retail,
  p.price_wholesale,
  p.price_credit,
  p.cost as last_cost,
  p.reorder_level,
  CASE 
    WHEN COALESCE(lb.current_qty, 0) <= 0 THEN 'OUT_OF_STOCK'
    WHEN COALESCE(lb.current_qty, 0) <= p.reorder_level THEN 'LOW_STOCK'
    ELSE 'IN_STOCK'
  END as stock_status,
  lb.last_movement_date,
  p.is_active,
  p.created_at as product_created_at,
  p.updated_at as product_updated_at
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN suppliers s ON p.preferred_supplier_id = s.id
LEFT JOIN latest_balances lb ON p.id = lb.product_id
WHERE p.is_active = 1;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vw_stock_ledger_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_vw_stock_ledger_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_vw_stock_ledger_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_vw_stock_ledger_supplier ON products(preferred_supplier_id);
CREATE INDEX IF NOT EXISTS idx_vw_stock_ledger_status ON products(is_active);

-- Create a simpler view for quick stock checks
CREATE VIEW vw_stock_summary AS
SELECT 
  product_id,
  sku,
  name_en,
  current_stock,
  stock_status,
  avg_cost,
  price_retail,
  reorder_level
FROM vw_stock_ledger
WHERE current_stock <= reorder_level OR stock_status = 'OUT_OF_STOCK';

-- Create view for FIFO lot tracking (if stock_lots table exists)
CREATE VIEW IF NOT EXISTS vw_fifo_lots AS
SELECT 
  sl.id as lot_id,
  sl.product_id,
  p.sku,
  p.name_en,
  sl.lot_number,
  sl.quantity_received,
  sl.quantity_remaining,
  sl.unit_cost_cents,
  sl.received_date,
  sl.expiry_date,
  s.supplier_name,
  CASE 
    WHEN sl.expiry_date IS NOT NULL AND date(sl.expiry_date) <= date('now', '+7 days') THEN 'EXPIRING_SOON'
    WHEN sl.expiry_date IS NOT NULL AND date(sl.expiry_date) <= date('now') THEN 'EXPIRED'
    WHEN sl.quantity_remaining <= 0 THEN 'EMPTY'
    ELSE 'ACTIVE'
  END as lot_status,
  sl.created_at
FROM stock_lots sl
JOIN products p ON sl.product_id = p.id
LEFT JOIN suppliers s ON sl.supplier_id = s.id
WHERE sl.quantity_remaining > 0
ORDER BY sl.product_id, sl.received_date ASC;







