-- Migration: Create cash_events table for cash in/out tracking
CREATE TABLE IF NOT EXISTS cash_events (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions(id),
    type VARCHAR(10) CHECK (type IN ('IN', 'OUT')) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    created_by INTEGER REFERENCES users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cash_events_session_id ON cash_events(session_id);
CREATE INDEX IF NOT EXISTS idx_cash_events_type ON cash_events(type);
CREATE INDEX IF NOT EXISTS idx_cash_events_created_at ON cash_events(created_at);
CREATE INDEX IF NOT EXISTS idx_cash_events_session_type ON cash_events(session_id, type);


