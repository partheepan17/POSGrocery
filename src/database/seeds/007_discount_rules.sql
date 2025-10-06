-- Seed: Discount Rules
INSERT INTO discount_rules (
    name, applies_to, target_id, type, value, max_qty_or_weight, 
    active_from, active_to, priority, reason_required, active
) VALUES 
('Sugar Cap 3kg', 'PRODUCT', 2, 'AMOUNT', 10.00, 3.000, '2025-01-01', '2026-01-01', 10, false, true)
ON CONFLICT DO NOTHING;









