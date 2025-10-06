-- Seed: Categories
INSERT INTO categories (name) VALUES 
('Grocery'),
('Produce'),
('Bakery')
ON CONFLICT (name) DO NOTHING;









