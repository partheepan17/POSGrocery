-- Migration: Add security and audit features
-- Update users table with security fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('CASHIER', 'MANAGER', 'ADMIN', 'AUDITOR')) DEFAULT 'CASHIER';

-- Create audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER REFERENCES users(id),
    user_name TEXT NOT NULL,
    terminal TEXT,
    action TEXT NOT NULL,
    entity TEXT,
    entity_id TEXT,
    payload_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_at ON audit_logs(at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity, entity_id);

-- Update existing users with roles if they don't have them
UPDATE users SET role = 'MANAGER' WHERE name = 'Manager' AND role IS NULL;
UPDATE users SET role = 'CASHIER' WHERE name LIKE 'Cashier%' AND role IS NULL;


