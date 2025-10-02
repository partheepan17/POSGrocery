-- Seed: Users
INSERT INTO users (name, role, pin, active) VALUES 
('Cashier User', 'CASHIER', '1234', true),
('Manager User', 'MANAGER', '9999', true)
ON CONFLICT DO NOTHING;




