-- Migration: Add session and cashier tracking to sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cashier_id INTEGER REFERENCES users(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS session_id INTEGER REFERENCES sessions(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS terminal_name VARCHAR(255);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sales_cashier_id ON sales(cashier_id);
CREATE INDEX IF NOT EXISTS idx_sales_session_id ON sales(session_id);
CREATE INDEX IF NOT EXISTS idx_sales_terminal_name ON sales(terminal_name);







