-- Migration: Create utility views
CREATE OR REPLACE VIEW view_sales_summary_by_day AS
SELECT 
    DATE(datetime) as date,
    COUNT(*) as invoices,
    SUM(gross) as gross,
    SUM(discount) as discount,
    SUM(tax) as tax,
    SUM(net) as net,
    SUM(pay_cash) as cash,
    SUM(pay_card) as card,
    SUM(pay_wallet) as wallet
FROM sales
GROUP BY DATE(datetime)
ORDER BY date DESC;

CREATE OR REPLACE VIEW view_top_products_last_7d AS
SELECT 
    sl.product_id,
    p.sku,
    p.name_en,
    SUM(sl.qty) as qty,
    SUM(sl.total) as net
FROM sale_lines sl
JOIN sales s ON sl.sale_id = s.id
JOIN products p ON sl.product_id = p.id
WHERE s.datetime >= NOW() - INTERVAL '7 days'
GROUP BY sl.product_id, p.sku, p.name_en
ORDER BY qty DESC;









