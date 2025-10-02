-- Migration: Create users table for cashier authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('CASHIER', 'MANAGER')) NOT NULL DEFAULT 'CASHIER',
    pin VARCHAR(10) NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
CREATE INDEX IF NOT EXISTS idx_users_pin ON users(pin);

-- Insert default users
INSERT INTO users (name, role, pin, active) VALUES
('Manager', 'MANAGER', '9999', true),
('Cashier 1', 'CASHIER', '1234', true),
('Cashier 2', 'CASHIER', '5678', true)
ON CONFLICT DO NOTHING;


