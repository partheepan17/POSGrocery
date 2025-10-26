-- Migration: 037_vw_stock_ledger.sql
-- Creates stock ledger view with running calculations using window functions

-- Drop view if it exists (for re-running migration)
DROP VIEW IF EXISTS vw_stock_ledger;

-- Create stock ledger view with running calculations
CREATE VIEW vw_stock_ledger AS
SELECT 
    sm.id,
    sm.product_id,
    p.name_en as product_name,
    p.sku,
    sm.movement_type,
    sm.quantity as qty,
    sm.unit_cost / 100.0 as unit_cost, -- Convert from cents to dollars
    sm.total_cost / 100.0 as total_cost, -- Convert from cents to dollars
    sm.reference_type as ref_type,
    sm.reference_id as ref_id,
    sm.notes,
    sm.created_at,
    sm.created_by,
    u.username as created_by_username,
    u.name as created_by_name,
    
    -- Running quantity (cumulative sum of quantity)
    SUM(sm.quantity) OVER (
        PARTITION BY sm.product_id 
        ORDER BY sm.created_at, sm.id 
        ROWS UNBOUNDED PRECEDING
    ) as running_qty,
    
    -- Running value (cumulative sum of total_cost)
    SUM(sm.total_cost) OVER (
        PARTITION BY sm.product_id 
        ORDER BY sm.created_at, sm.id 
        ROWS UNBOUNDED PRECEDING
    ) / 100.0 as running_value, -- Convert from cents to dollars
    
    -- Running average cost (running_value / running_qty when running_qty > 0)
    CASE 
        WHEN SUM(sm.quantity) OVER (
            PARTITION BY sm.product_id 
            ORDER BY sm.created_at, sm.id 
            ROWS UNBOUNDED PRECEDING
        ) > 0 
        THEN (
            SUM(sm.total_cost) OVER (
                PARTITION BY sm.product_id 
                ORDER BY sm.created_at, sm.id 
                ROWS UNBOUNDED PRECEDING
            ) / 100.0
        ) / (
            SUM(sm.quantity) OVER (
                PARTITION BY sm.product_id 
                ORDER BY sm.created_at, sm.id 
                ROWS UNBOUNDED PRECEDING
            )
        )
        ELSE 0
    END as running_avg_cost,
    
    -- Additional useful fields
    sm.balance_after,
    sl.lot_number,
    sl.source as lot_source,
    
    -- Movement direction indicator
    CASE 
        WHEN sm.quantity > 0 THEN 'IN'
        WHEN sm.quantity < 0 THEN 'OUT'
        ELSE 'ZERO'
    END as movement_direction,
    
    -- Movement type description
    CASE sm.movement_type
        WHEN 'purchase' THEN 'Purchase'
        WHEN 'sale' THEN 'Sale'
        WHEN 'return' THEN 'Return'
        WHEN 'adjustment' THEN 'Adjustment'
        WHEN 'transfer' THEN 'Transfer'
        ELSE sm.movement_type
    END as movement_type_desc

FROM stock_movements sm
LEFT JOIN products p ON sm.product_id = p.id
LEFT JOIN users u ON sm.created_by = u.id
LEFT JOIN stock_lots sl ON sm.lot_id = sl.id
ORDER BY sm.product_id, sm.created_at, sm.id;

-- Create indexes for better performance on the view
CREATE INDEX IF NOT EXISTS idx_vw_stock_ledger_product_id ON stock_movements(product_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_vw_stock_ledger_created_at ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_vw_stock_ledger_movement_type ON stock_movements(movement_type);

-- Create a materialized view for better performance on large datasets
-- This can be refreshed periodically for better performance
CREATE TABLE IF NOT EXISTS mv_stock_ledger AS 
SELECT * FROM vw_stock_ledger WHERE 1=0; -- Empty table with same structure

-- Create function to refresh materialized view (for future use)
-- This would be called periodically to update the materialized view
-- CREATE TRIGGER refresh_mv_stock_ledger
-- AFTER INSERT OR UPDATE OR DELETE ON stock_movements
-- BEGIN
--     DELETE FROM mv_stock_ledger;
--     INSERT INTO mv_stock_ledger SELECT * FROM vw_stock_ledger;
-- END;










