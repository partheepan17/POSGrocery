-- Seed: Terminals
INSERT INTO terminals (name, is_server, ip_last) VALUES 
('Counter-Server', true, '127.0.0.1'),
('Counter-1', false, '192.168.1.100')
ON CONFLICT (name) DO NOTHING;




