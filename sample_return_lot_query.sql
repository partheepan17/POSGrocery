-- Sample Query: Return-Lot Demonstration
-- This query shows how return lots are stored separately with original unit costs

-- 1. First, let's see a sample sale with its original unit costs
SELECT 
    i.receipt_number,
    i.sale_date,
    il.product_id,
    p.name_en as product_name,
    il.qty as quantity_sold,
    il.unit_price,
    il.unit_cost_cents / 100.0 as original_unit_cost,
    il.total as line_total
FROM invoices i
JOIN invoice_lines il ON i.id = il.invoice_id
JOIN products p ON il.product_id = p.id
WHERE i.receipt_number = 'SALE20241201001'  -- Replace with actual receipt number
ORDER BY il.id;

-- 2. Now let's see the return lots created for this sale
SELECT 
    sl.id as lot_id,
    sl.product_id,
    p.name_en as product_name,
    sl.lot_number,
    sl.quantity_received,
    sl.quantity_remaining,
    sl.unit_cost / 100.0 as unit_cost,
    sl.source,
    sl.received_date,
    r.return_receipt_no,
    r.original_receipt_no
FROM stock_lots sl
JOIN products p ON sl.product_id = p.id
LEFT JOIN returns r ON sl.lot_number LIKE 'RET-' || r.return_receipt_no || '-%'
WHERE sl.source = 'return'
ORDER BY sl.created_at DESC;

-- 3. Compare return lots with original purchase lots for the same product
SELECT 
    sl.id as lot_id,
    sl.product_id,
    p.name_en as product_name,
    sl.lot_number,
    sl.quantity_received,
    sl.quantity_remaining,
    sl.unit_cost / 100.0 as unit_cost,
    sl.source,
    sl.received_date,
    CASE 
        WHEN sl.source = 'return' THEN 'RETURN LOT (Original Cost Preserved)'
        WHEN sl.source = 'purchase' THEN 'PURCHASE LOT (GRN Cost)'
        ELSE 'OTHER'
    END as lot_type
FROM stock_lots sl
JOIN products p ON sl.product_id = p.id
WHERE sl.product_id = 1  -- Replace with actual product ID
ORDER BY sl.source, sl.created_at DESC;

-- 4. Show stock movements for returns with lot references
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
    sl.lot_number,
    sl.source as lot_source
FROM stock_movements sm
JOIN products p ON sm.product_id = p.id
LEFT JOIN stock_lots sl ON sm.lot_id = sl.id
WHERE sm.movement_type = 'return'
ORDER BY sm.created_at DESC;

-- 5. Show return details with lot information
SELECT 
    r.id as return_id,
    r.return_receipt_no,
    r.original_receipt_no,
    r.total_value / 100.0 as total_value,
    r.created_at as return_date,
    rl.product_id,
    p.name_en as product_name,
    rl.quantity as returned_quantity,
    rl.reason,
    sl.lot_number as return_lot_number,
    sl.unit_cost / 100.0 as return_lot_unit_cost,
    sl.source as lot_source
FROM returns r
JOIN return_lines rl ON r.id = rl.return_id
JOIN products p ON rl.product_id = p.id
LEFT JOIN stock_lots sl ON sl.product_id = rl.product_id 
    AND sl.source = 'return' 
    AND sl.lot_number LIKE 'RET-' || r.return_receipt_no || '-%'
ORDER BY r.created_at DESC, rl.id;

-- 6. Summary: Return lots vs Purchase lots for inventory valuation
SELECT 
    p.id as product_id,
    p.name_en as product_name,
    COUNT(CASE WHEN sl.source = 'purchase' THEN 1 END) as purchase_lots,
    COUNT(CASE WHEN sl.source = 'return' THEN 1 END) as return_lots,
    SUM(CASE WHEN sl.source = 'purchase' THEN sl.quantity_remaining ELSE 0 END) as purchase_qty_remaining,
    SUM(CASE WHEN sl.source = 'return' THEN sl.quantity_remaining ELSE 0 END) as return_qty_remaining,
    AVG(CASE WHEN sl.source = 'purchase' THEN sl.unit_cost ELSE NULL END) / 100.0 as avg_purchase_cost,
    AVG(CASE WHEN sl.source = 'return' THEN sl.unit_cost ELSE NULL END) / 100.0 as avg_return_cost
FROM products p
LEFT JOIN stock_lots sl ON p.id = sl.product_id
GROUP BY p.id, p.name_en
HAVING COUNT(sl.id) > 0
ORDER BY p.name_en;










