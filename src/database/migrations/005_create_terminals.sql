-- Migration: Create terminals table
CREATE TABLE IF NOT EXISTS terminals (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    is_server BOOLEAN DEFAULT false,
    ip_last VARCHAR(45),
    created_at TIMESTAMP DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_terminals_name ON terminals(name);
CREATE INDEX IF NOT EXISTS idx_terminals_is_server ON terminals(is_server);









