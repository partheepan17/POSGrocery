-- Seed: Customers
INSERT INTO customers (customer_name, phone, customer_type, note, active) VALUES 
('Walk-in Customer', NULL, 'Retail', 'General retail customer', true),
('Kumar Traders', '+94-77-123-4567', 'Wholesale', 'Bulk purchase customer', true),
('Arul Credit Shop', '+94-77-234-5678', 'Credit', 'Credit account customer', true),
('Maria Silva', '+94-77-345-6789', 'Retail', 'Regular customer', true),
('Rajesh Stores', '+94-77-456-7890', 'Other', 'Special pricing customer', true),
('Priya Restaurant', '+94-77-567-8901', 'Wholesale', 'Restaurant bulk orders', true)
ON CONFLICT DO NOTHING;




