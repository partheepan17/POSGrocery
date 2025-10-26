-- EXPLAIN Plans Analysis for Performance Indexes
-- This file contains EXPLAIN QUERY PLAN commands for critical report queries

-- 1. Stock Movements by Product and Date
-- Expected to use: idx_stock_movements_product_created_at
EXPLAIN QUERY PLAN
SELECT sm.*, p.name_en, p.sku
FROM stock_movements sm
JOIN products p ON sm.product_id = p.id
WHERE sm.product_id = 1 
  AND sm.created_at >= '2024-01-01'
  AND sm.created_at <= '2024-12-31'
ORDER BY sm.created_at DESC;

-- 2. Sales by Date Range
-- Expected to use: idx_invoices_created_at
EXPLAIN QUERY PLAN
SELECT i.*, c.customer_name, u.username as cashier_name
FROM invoices i
LEFT JOIN customers c ON i.customer_id = c.id
LEFT JOIN users u ON i.cashier_id = u.id
WHERE i.created_at >= '2024-01-01'
  AND i.created_at <= '2024-12-31'
ORDER BY i.created_at DESC;

-- 3. Product Sales Analysis
-- Expected to use: idx_invoice_lines_product_id, idx_invoice_lines_created_at
EXPLAIN QUERY PLAN
SELECT il.product_id, p.name_en, p.sku,
       SUM(il.qty) as total_qty,
       SUM(il.total) as total_revenue,
       AVG(il.unit_price) as avg_price
FROM invoice_lines il
JOIN products p ON il.product_id = p.id
WHERE il.created_at >= '2024-01-01'
  AND il.created_at <= '2024-12-31'
GROUP BY il.product_id, p.name_en, p.sku
ORDER BY total_revenue DESC;

-- 4. Product Search by Barcode
-- Expected to use: idx_products_barcode
EXPLAIN QUERY PLAN
SELECT * FROM products 
WHERE barcode = '1234567890123'
  AND is_active = 1;

-- 5. Product Search by Name
-- Expected to use: idx_products_name_en
EXPLAIN QUERY PLAN
SELECT * FROM products 
WHERE name_en LIKE '%Coca%'
  AND is_active = 1
ORDER BY name_en;

-- 6. Stock Movements with Movement Type
-- Expected to use: idx_stock_movements_product_type_created
EXPLAIN QUERY PLAN
SELECT sm.*, p.name_en
FROM stock_movements sm
JOIN products p ON sm.product_id = p.id
WHERE sm.movement_type = 'sale'
  AND sm.created_at >= '2024-01-01'
ORDER BY sm.created_at DESC;

-- 7. Cashier Performance Report
-- Expected to use: idx_invoices_cashier_created_at
EXPLAIN QUERY PLAN
SELECT u.username, u.name,
       COUNT(*) as total_sales,
       SUM(i.net) as total_revenue,
       AVG(i.net) as avg_sale_amount
FROM invoices i
JOIN users u ON i.cashier_id = u.id
WHERE i.created_at >= '2024-01-01'
  AND i.created_at <= '2024-12-31'
GROUP BY u.id, u.username, u.name
ORDER BY total_revenue DESC;

-- 8. Customer Analysis
-- Expected to use: idx_invoices_customer_created_at
EXPLAIN QUERY PLAN
SELECT c.customer_name,
       COUNT(*) as total_purchases,
       SUM(i.net) as total_spent,
       AVG(i.net) as avg_purchase
FROM invoices i
JOIN customers c ON i.customer_id = c.id
WHERE i.created_at >= '2024-01-01'
  AND i.created_at <= '2024-12-31'
GROUP BY c.id, c.customer_name
ORDER BY total_spent DESC;

-- 9. Product Category Analysis
-- Expected to use: idx_products_category_active, idx_invoice_lines_product_id
EXPLAIN QUERY PLAN
SELECT cat.name as category_name,
       COUNT(DISTINCT p.id) as product_count,
       COUNT(il.id) as sales_count,
       SUM(il.qty) as total_qty_sold,
       SUM(il.total) as total_revenue
FROM invoice_lines il
JOIN products p ON il.product_id = p.id
JOIN categories cat ON p.category_id = cat.id
WHERE il.created_at >= '2024-01-01'
  AND il.created_at <= '2024-12-31'
GROUP BY cat.id, cat.name
ORDER BY total_revenue DESC;

-- 10. Scale Items Report
-- Expected to use: idx_products_scale_active, idx_invoice_lines_product_id
EXPLAIN QUERY PLAN
SELECT p.name_en, p.sku, p.unit,
       SUM(il.qty) as total_qty_sold,
       SUM(il.total) as total_revenue
FROM invoice_lines il
JOIN products p ON il.product_id = p.id
WHERE p.is_scale_item = 1
  AND il.created_at >= '2024-01-01'
  AND il.created_at <= '2024-12-31'
GROUP BY p.id, p.name_en, p.sku, p.unit
ORDER BY total_qty_sold DESC;

-- 11. Stock Ledger View Performance Test
-- Expected to use: idx_stock_movements_product_created_at
EXPLAIN QUERY PLAN
SELECT 
    product_id,
    movement_type,
    qty,
    unit_cost,
    created_at,
    running_qty,
    running_value,
    running_avg_cost
FROM vw_stock_ledger
WHERE product_id = 1
  AND created_at >= '2024-01-01'
ORDER BY created_at DESC;

-- 12. Inventory Adjustments Performance Test
-- Expected to use: idx_stock_movements_product_created_at
EXPLAIN QUERY PLAN
SELECT 
    sm.*,
    p.name_en as product_name,
    u.username as created_by_username
FROM stock_movements sm
JOIN products p ON sm.product_id = p.id
JOIN users u ON sm.created_by = u.id
WHERE sm.movement_type = 'adjustment'
  AND sm.created_at >= '2024-01-01'
ORDER BY sm.created_at DESC;

-- 13. Product Search Composite
-- Expected to use: idx_products_search_composite
EXPLAIN QUERY PLAN
SELECT * FROM products 
WHERE (name_en LIKE '%Coca%' OR sku LIKE '%COCA%' OR barcode LIKE '%123%')
  AND is_active = 1
ORDER BY name_en;

-- 14. Sales Analysis by Product and Date
-- Expected to use: idx_invoice_lines_product_date_qty
EXPLAIN QUERY PLAN
SELECT 
    il.product_id,
    p.name_en,
    DATE(il.created_at) as sale_date,
    SUM(il.qty) as daily_qty,
    SUM(il.total) as daily_revenue
FROM invoice_lines il
JOIN products p ON il.product_id = p.id
WHERE il.created_at >= '2024-01-01'
  AND il.created_at <= '2024-12-31'
GROUP BY il.product_id, p.name_en, DATE(il.created_at)
ORDER BY sale_date DESC, daily_revenue DESC;

-- 15. Revenue Analysis by Date
-- Expected to use: idx_invoices_date_revenue
EXPLAIN QUERY PLAN
SELECT 
    DATE(created_at) as sale_date,
    COUNT(*) as total_sales,
    SUM(net) as total_net,
    SUM(gross) as total_gross,
    AVG(net) as avg_sale
FROM invoices
WHERE created_at >= '2024-01-01'
  AND created_at <= '2024-12-31'
GROUP BY DATE(created_at)
ORDER BY sale_date DESC;

-- 16. Product Performance by Movement Type
-- Expected to use: idx_stock_movements_product_type_date
EXPLAIN QUERY PLAN
SELECT 
    sm.product_id,
    p.name_en,
    sm.movement_type,
    COUNT(*) as movement_count,
    SUM(sm.quantity) as total_qty,
    SUM(sm.total_cost) as total_cost
FROM stock_movements sm
JOIN products p ON sm.product_id = p.id
WHERE sm.created_at >= '2024-01-01'
  AND sm.created_at <= '2024-12-31'
GROUP BY sm.product_id, p.name_en, sm.movement_type
ORDER BY total_qty DESC;

-- 17. Active Products with Recent Activity
-- Expected to use: idx_products_active_name, idx_invoice_lines_product_id
EXPLAIN QUERY PLAN
SELECT 
    p.id,
    p.name_en,
    p.sku,
    p.barcode,
    COUNT(il.id) as recent_sales,
    MAX(il.created_at) as last_sale_date
FROM products p
LEFT JOIN invoice_lines il ON p.id = il.product_id 
    AND il.created_at >= '2024-01-01'
WHERE p.is_active = 1
GROUP BY p.id, p.name_en, p.sku, p.barcode
ORDER BY recent_sales DESC, last_sale_date DESC;

-- 18. Terminal Performance Analysis
-- Expected to use: idx_invoices_terminal_created
EXPLAIN QUERY PLAN
SELECT 
    i.terminal_name,
    COUNT(*) as total_sales,
    SUM(i.net) as total_revenue,
    AVG(i.net) as avg_sale
FROM invoices i
WHERE i.terminal_id IS NOT NULL
  AND i.created_at >= '2024-01-01'
  AND i.created_at <= '2024-12-31'
GROUP BY i.terminal_id, i.terminal_name
ORDER BY total_revenue DESC;

-- 19. Supplier Performance Analysis
-- Expected to use: idx_products_supplier, idx_invoice_lines_product_id
EXPLAIN QUERY PLAN
SELECT 
    s.name as supplier_name,
    COUNT(DISTINCT p.id) as products_supplied,
    COUNT(il.id) as sales_count,
    SUM(il.qty) as total_qty_sold,
    SUM(il.total) as total_revenue
FROM invoice_lines il
JOIN products p ON il.product_id = p.id
JOIN suppliers s ON p.preferred_supplier_id = s.id
WHERE il.created_at >= '2024-01-01'
  AND il.created_at <= '2024-12-31'
GROUP BY s.id, s.name
ORDER BY total_revenue DESC;

-- 20. Cost Analysis
-- Expected to use: idx_products_cost, idx_invoice_lines_product_id
EXPLAIN QUERY PLAN
SELECT 
    p.name_en,
    p.cost,
    AVG(il.unit_price) as avg_selling_price,
    (AVG(il.unit_price) - p.cost) as profit_margin,
    COUNT(il.id) as sales_count
FROM invoice_lines il
JOIN products p ON il.product_id = p.id
WHERE p.cost IS NOT NULL
  AND il.created_at >= '2024-01-01'
  AND il.created_at <= '2024-12-31'
GROUP BY p.id, p.name_en, p.cost
ORDER BY profit_margin DESC;










