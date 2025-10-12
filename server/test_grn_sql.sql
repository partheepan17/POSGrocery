-- GRN Database Verification Queries
-- Run these queries to verify GRN system integrity

-- 1. Check GRN Headers
SELECT 
    'GRN Headers' as table_name,
    COUNT(*) as total_count,
    COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count
FROM grn_headers;

-- 2. Check GRN Lines
SELECT 
    'GRN Lines' as table_name,
    COUNT(*) as total_count,
    COUNT(DISTINCT grn_id) as unique_grns,
    SUM(quantity_received) as total_quantity,
    SUM(total_cost) as total_value
FROM grn_lines;

-- 3. Check Stock Ledger
SELECT 
    'Stock Ledger' as table_name,
    COUNT(*) as total_movements,
    COUNT(DISTINCT product_id) as products_with_movements,
    SUM(CASE WHEN movement_type = 'GRN' THEN quantity ELSE 0 END) as grn_quantity,
    SUM(CASE WHEN movement_type = 'SALE' THEN quantity ELSE 0 END) as sale_quantity
FROM stock_ledger;

-- 4. Verify GRN-Stock Ledger Consistency
SELECT 
    'GRN-Stock Consistency' as check_name,
    COUNT(*) as grn_count,
    COUNT(sl.id) as stock_movements,
    CASE 
        WHEN COUNT(*) = COUNT(sl.id) THEN 'PASS' 
        ELSE 'FAIL' 
    END as status
FROM grn_headers gh
LEFT JOIN stock_ledger sl ON sl.reference_id = gh.id AND sl.reference_type = 'GRN'
WHERE gh.status = 'completed';

-- 5. Check for Orphaned GRN Lines
SELECT 
    'Orphaned GRN Lines' as check_name,
    COUNT(*) as orphaned_count
FROM grn_lines gl
LEFT JOIN grn_headers gh ON gl.grn_id = gh.id
WHERE gh.id IS NULL;

-- 6. Check for Negative Stock
SELECT 
    'Negative Stock Check' as check_name,
    product_id,
    SUM(quantity) as current_balance
FROM stock_ledger
GROUP BY product_id
HAVING SUM(quantity) < 0;

-- 7. GRN Totals Verification
SELECT 
    gh.id,
    gh.grn_number,
    gh.total_quantity as header_qty,
    gh.total_value as header_value,
    SUM(gl.quantity_received) as calculated_qty,
    SUM(gl.total_cost) as calculated_value,
    CASE 
        WHEN gh.total_quantity = SUM(gl.quantity_received) 
         AND gh.total_value = SUM(gl.total_cost) 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END as totals_match
FROM grn_headers gh
LEFT JOIN grn_lines gl ON gh.id = gl.grn_id
GROUP BY gh.id, gh.grn_number, gh.total_quantity, gh.total_value;

-- 8. Recent GRN Activity
SELECT 
    'Recent GRN Activity' as info,
    gh.grn_number,
    gh.status,
    gh.total_quantity,
    gh.total_value,
    gh.created_at,
    COUNT(gl.id) as line_count
FROM grn_headers gh
LEFT JOIN grn_lines gl ON gh.id = gl.grn_id
WHERE gh.created_at >= datetime('now', '-1 day')
GROUP BY gh.id, gh.grn_number, gh.status, gh.total_quantity, gh.total_value, gh.created_at
ORDER BY gh.created_at DESC;

-- 9. Stock Movement Summary by Product
SELECT 
    p.sku,
    p.name_en,
    SUM(sl.quantity) as current_stock,
    COUNT(sl.id) as movement_count,
    MAX(sl.created_at) as last_movement
FROM products p
LEFT JOIN stock_ledger sl ON p.id = sl.product_id
GROUP BY p.id, p.sku, p.name_en
HAVING SUM(sl.quantity) > 0
ORDER BY current_stock DESC
LIMIT 10;

-- 10. Idempotency Key Usage
SELECT 
    'Idempotency Usage' as info,
    COUNT(*) as total_grns,
    COUNT(idempotency_key) as with_idempotency,
    COUNT(DISTINCT idempotency_key) as unique_keys
FROM grn_headers;
