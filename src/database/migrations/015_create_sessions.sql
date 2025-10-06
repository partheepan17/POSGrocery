-- Migration: Create sessions table for shift tracking
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    cashier_id INTEGER NOT NULL REFERENCES users(id),
    terminal VARCHAR(255) NOT NULL,
    started_at TIMESTAMP DEFAULT now(),
    ended_at TIMESTAMP NULL,
    opening_float DECIMAL(10,2) NOT NULL DEFAULT 0,
    closing_cash DECIMAL(10,2) NULL,
    notes TEXT,
    status VARCHAR(20) CHECK (status IN ('OPEN', 'CLOSED')) DEFAULT 'OPEN',
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sessions_cashier_id ON sessions(cashier_id);
CREATE INDEX IF NOT EXISTS idx_sessions_terminal ON sessions(terminal);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_cashier_terminal ON sessions(cashier_id, terminal);
CREATE INDEX IF NOT EXISTS idx_sessions_open ON sessions(status) WHERE status = 'OPEN';







