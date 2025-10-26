-- Sample Query: Inventory Adjustments System
-- This query demonstrates the inventory adjustments functionality

-- 1. Create a sample inventory adjustment
INSERT INTO inventory_adjustments (
    product_id, delta_qty, reason, notes, created_by, created_at
) VALUES (
    1, -- product_id
    -5, -- delta_qty (decrease by 5)
    'damage', -- reason
    'Items damaged during handling', -- notes
    1, -- created_by (user_id)
    datetime('now') -- created_at
);

-- 2. View all inventory adjustments with product details
SELECT 
    ia.id as adjustment_id,
    ia.product_id,
    p.name_en as product_name,
    p.sku,
    ia.delta_qty,
    ia.reason,
    ia.notes,
    ia.created_at,
    u.username as created_by_username,
    u.name as created_by_name,
    ps.current_quantity as current_stock
FROM inventory_adjustments ia
LEFT JOIN products p ON ia.product_id = p.id
LEFT JOIN users u ON ia.created_by = u.id
LEFT JOIN product_stock ps ON ia.product_id = ps.product_id
ORDER BY ia.created_at DESC;

-- 3. View adjustments by reason
SELECT 
    ia.reason,
    COUNT(*) as adjustment_count,
    SUM(ia.delta_qty) as total_quantity_change,
    COUNT(DISTINCT ia.product_id) as products_affected
FROM inventory_adjustments ia
GROUP BY ia.reason
ORDER BY adjustment_count DESC;

-- 4. View adjustments by user
SELECT 
    u.username,
    u.name,
    COUNT(*) as adjustments_made,
    SUM(CASE WHEN ia.delta_qty > 0 THEN ia.delta_qty ELSE 0 END) as total_increases,
    SUM(CASE WHEN ia.delta_qty < 0 THEN ABS(ia.delta_qty) ELSE 0 END) as total_decreases
FROM inventory_adjustments ia
LEFT JOIN users u ON ia.created_by = u.id
GROUP BY u.id, u.username, u.name
ORDER BY adjustments_made DESC;

-- 5. View recent adjustments for a specific product
SELECT 
    ia.*,
    p.name_en as product_name,
    p.sku,
    u.username as created_by_username,
    ps.current_quantity as current_stock
FROM inventory_adjustments ia
LEFT JOIN products p ON ia.product_id = p.id
LEFT JOIN users u ON ia.created_by = u.id
LEFT JOIN product_stock ps ON ia.product_id = ps.product_id
WHERE ia.product_id = 1  -- Replace with actual product ID
ORDER BY ia.created_at DESC
LIMIT 10;

-- 6. View adjustment statistics for the last 30 days
SELECT 
    COUNT(*) as total_adjustments,
    COUNT(DISTINCT product_id) as products_adjusted,
    SUM(CASE WHEN delta_qty > 0 THEN delta_qty ELSE 0 END) as total_increases,
    SUM(CASE WHEN delta_qty < 0 THEN ABS(delta_qty) ELSE 0 END) as total_decreases,
    COUNT(DISTINCT created_by) as users_made_adjustments,
    AVG(delta_qty) as average_adjustment
FROM inventory_adjustments
WHERE created_at >= datetime('now', '-30 days');

-- 7. View stock movements created by adjustments
SELECT 
    sm.id as movement_id,
    sm.product_id,
    p.name_en as product_name,
    sm.movement_type,
    sm.quantity,
    sm.unit_cost / 100.0 as unit_cost,
    sm.total_cost / 100.0 as total_cost,
    sm.balance_after,
    sm.notes,
    sm.created_at,
    u.username as created_by_username
FROM stock_movements sm
LEFT JOIN products p ON sm.product_id = p.id
LEFT JOIN users u ON sm.created_by = u.id
WHERE sm.movement_type = 'adjustment'
ORDER BY sm.created_at DESC;

-- 8. View products with most adjustments
SELECT 
    p.id as product_id,
    p.name_en as product_name,
    p.sku,
    COUNT(ia.id) as adjustment_count,
    SUM(ia.delta_qty) as net_quantity_change,
    ps.current_quantity as current_stock
FROM inventory_adjustments ia
LEFT JOIN products p ON ia.product_id = p.id
LEFT JOIN product_stock ps ON ia.product_id = ps.product_id
GROUP BY p.id, p.name_en, p.sku, ps.current_quantity
ORDER BY adjustment_count DESC
LIMIT 10;

-- 9. View adjustments by date range
SELECT 
    DATE(ia.created_at) as adjustment_date,
    COUNT(*) as adjustments_count,
    COUNT(DISTINCT ia.product_id) as products_adjusted,
    SUM(ia.delta_qty) as net_quantity_change
FROM inventory_adjustments ia
WHERE ia.created_at >= datetime('now', '-7 days')
GROUP BY DATE(ia.created_at)
ORDER BY adjustment_date DESC;

-- 10. View adjustment audit trail with before/after quantities
SELECT 
    ia.id as adjustment_id,
    ia.product_id,
    p.name_en as product_name,
    ia.delta_qty,
    ia.reason,
    ia.notes,
    ia.created_at,
    u.username as created_by_username,
    -- Calculate before quantity (current - delta)
    (ps.current_quantity - ia.delta_qty) as quantity_before,
    ps.current_quantity as quantity_after,
    ia.delta_qty as quantity_change
FROM inventory_adjustments ia
LEFT JOIN products p ON ia.product_id = p.id
LEFT JOIN users u ON ia.created_by = u.id
LEFT JOIN product_stock ps ON ia.product_id = ps.product_id
ORDER BY ia.created_at DESC;

-- 11. View adjustment reasons summary
SELECT 
    ia.reason,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM inventory_adjustments), 2) as percentage
FROM inventory_adjustments ia
GROUP BY ia.reason
ORDER BY count DESC;

-- 12. View monthly adjustment trends
SELECT 
    strftime('%Y-%m', ia.created_at) as month,
    COUNT(*) as adjustments_count,
    COUNT(DISTINCT ia.product_id) as products_adjusted,
    SUM(ia.delta_qty) as net_quantity_change,
    COUNT(DISTINCT ia.created_by) as active_users
FROM inventory_adjustments ia
WHERE ia.created_at >= datetime('now', '-12 months')
GROUP BY strftime('%Y-%m', ia.created_at)
ORDER BY month DESC;










