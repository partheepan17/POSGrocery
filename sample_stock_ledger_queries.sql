-- Sample Queries: Stock Ledger View
-- Demonstrates the vw_stock_ledger view with running calculations

-- 1. View all stock ledger entries
SELECT 
    product_id,
    product_name,
    sku,
    movement_type,
    qty,
    unit_cost,
    total_cost,
    ref_type,
    ref_id,
    created_at,
    running_qty,
    running_value,
    running_avg_cost,
    movement_direction
FROM vw_stock_ledger
ORDER BY product_id, created_at, id;

-- 2. View stock ledger for a specific product
SELECT 
    product_id,
    product_name,
    sku,
    movement_type,
    qty,
    unit_cost,
    total_cost,
    ref_type,
    ref_id,
    created_at,
    running_qty,
    running_value,
    running_avg_cost,
    movement_direction,
    notes
FROM vw_stock_ledger
WHERE product_id = 1
ORDER BY created_at, id;

-- 3. View stock ledger for a date range
SELECT 
    product_id,
    product_name,
    sku,
    movement_type,
    qty,
    unit_cost,
    total_cost,
    ref_type,
    ref_id,
    created_at,
    running_qty,
    running_value,
    running_avg_cost,
    movement_direction
FROM vw_stock_ledger
WHERE created_at >= '2024-01-01' 
  AND created_at <= '2024-01-31'
ORDER BY product_id, created_at, id;

-- 4. View stock ledger by movement type
SELECT 
    product_id,
    product_name,
    sku,
    movement_type,
    qty,
    unit_cost,
    total_cost,
    ref_type,
    ref_id,
    created_at,
    running_qty,
    running_value,
    running_avg_cost,
    movement_direction
FROM vw_stock_ledger
WHERE movement_type = 'sale'
ORDER BY product_id, created_at, id;

-- 5. View current stock levels for all products
SELECT 
    product_id,
    product_name,
    sku,
    MAX(running_qty) as current_quantity,
    MAX(running_value) as current_value,
    MAX(running_avg_cost) as current_avg_cost,
    COUNT(*) as total_movements,
    MIN(created_at) as first_movement,
    MAX(created_at) as last_movement
FROM vw_stock_ledger
GROUP BY product_id, product_name, sku
ORDER BY current_quantity DESC;

-- 6. View stock movements summary by type
SELECT 
    movement_type,
    movement_type_desc,
    COUNT(*) as movement_count,
    COUNT(DISTINCT product_id) as products_affected,
    SUM(qty) as net_quantity_change,
    SUM(total_cost) as net_value_change,
    AVG(unit_cost) as avg_unit_cost,
    MIN(created_at) as first_movement,
    MAX(created_at) as last_movement
FROM vw_stock_ledger
GROUP BY movement_type, movement_type_desc
ORDER BY movement_count DESC;

-- 7. View daily stock movements
SELECT 
    DATE(created_at) as movement_date,
    COUNT(*) as movement_count,
    COUNT(DISTINCT product_id) as products_affected,
    SUM(qty) as net_quantity_change,
    SUM(total_cost) as net_value_change
FROM vw_stock_ledger
WHERE created_at >= date('now', '-30 days')
GROUP BY DATE(created_at)
ORDER BY movement_date DESC;

-- 8. View products with most stock movements
SELECT 
    product_id,
    product_name,
    sku,
    COUNT(*) as movement_count,
    SUM(qty) as net_quantity_change,
    SUM(total_cost) as net_value_change,
    MAX(running_qty) as current_quantity,
    MAX(running_avg_cost) as current_avg_cost
FROM vw_stock_ledger
GROUP BY product_id, product_name, sku
ORDER BY movement_count DESC
LIMIT 10;

-- 9. View stock movements by user
SELECT 
    created_by,
    created_by_username,
    created_by_name,
    COUNT(*) as movements_made,
    COUNT(DISTINCT product_id) as products_affected,
    SUM(qty) as net_quantity_change,
    SUM(total_cost) as net_value_change
FROM vw_stock_ledger
GROUP BY created_by, created_by_username, created_by_name
ORDER BY movements_made DESC;

-- 10. View stock movements with lot information
SELECT 
    product_id,
    product_name,
    sku,
    movement_type,
    qty,
    unit_cost,
    total_cost,
    lot_number,
    lot_source,
    created_at,
    running_qty,
    running_value,
    running_avg_cost
FROM vw_stock_ledger
WHERE lot_number IS NOT NULL
ORDER BY product_id, created_at, id;

-- 11. View stock movements by reference type
SELECT 
    ref_type,
    COUNT(*) as movement_count,
    COUNT(DISTINCT product_id) as products_affected,
    SUM(qty) as net_quantity_change,
    SUM(total_cost) as net_value_change,
    AVG(unit_cost) as avg_unit_cost
FROM vw_stock_ledger
WHERE ref_type IS NOT NULL
GROUP BY ref_type
ORDER BY movement_count DESC;

-- 12. View stock movements with running calculations for specific product
SELECT 
    id,
    movement_type,
    qty,
    unit_cost,
    total_cost,
    created_at,
    running_qty,
    running_value,
    running_avg_cost,
    CASE 
        WHEN running_qty > 0 
        THEN ROUND((running_value / running_qty), 2)
        ELSE 0 
    END as calculated_avg_cost
FROM vw_stock_ledger
WHERE product_id = 1
ORDER BY created_at, id;

-- 13. View stock movements with balance validation
SELECT 
    product_id,
    product_name,
    id,
    movement_type,
    qty,
    balance_after,
    running_qty,
    CASE 
        WHEN balance_after = running_qty THEN 'MATCH'
        ELSE 'MISMATCH'
    END as balance_status
FROM vw_stock_ledger
WHERE balance_after != running_qty
ORDER BY product_id, created_at, id;

-- 14. View monthly stock movement trends
SELECT 
    strftime('%Y-%m', created_at) as month,
    COUNT(*) as movement_count,
    COUNT(DISTINCT product_id) as products_affected,
    SUM(qty) as net_quantity_change,
    SUM(total_cost) as net_value_change,
    AVG(running_avg_cost) as avg_running_cost
FROM vw_stock_ledger
WHERE created_at >= date('now', '-12 months')
GROUP BY strftime('%Y-%m', created_at)
ORDER BY month DESC;

-- 15. View stock movements with cost variance analysis
SELECT 
    product_id,
    product_name,
    sku,
    movement_type,
    qty,
    unit_cost,
    running_avg_cost,
    ABS(unit_cost - running_avg_cost) as cost_variance,
    CASE 
        WHEN ABS(unit_cost - running_avg_cost) > 0.10 THEN 'HIGH_VARIANCE'
        WHEN ABS(unit_cost - running_avg_cost) > 0.05 THEN 'MEDIUM_VARIANCE'
        ELSE 'LOW_VARIANCE'
    END as variance_level
FROM vw_stock_ledger
WHERE running_avg_cost > 0
ORDER BY cost_variance DESC;










