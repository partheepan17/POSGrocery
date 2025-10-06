-- Seed: Suppliers
INSERT INTO suppliers (supplier_name, contact_phone, contact_email, address, tax_id, active) VALUES 
('Sun Suppliers', '+94-11-234-5678', 'info@sunsuppliers.lk', '123 Main Street, Colombo 01', 'TAX001', true),
('Ocean Foods', '+94-11-345-6789', 'orders@oceanfoods.lk', '456 Ocean Drive, Negombo', 'TAX002', true),
('Green Farms', '+94-11-456-7890', 'sales@greenfarms.lk', '789 Farm Road, Kandy', 'TAX003', true),
('City Traders', '+94-11-567-8901', 'contact@citytraders.lk', '321 City Center, Galle', 'TAX004', true),
('Fresh Mills', '+94-11-678-9012', 'info@freshmills.lk', '654 Mill Lane, Anuradhapura', 'TAX005', true)
ON CONFLICT DO NOTHING;









