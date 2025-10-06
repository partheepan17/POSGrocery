-- Migration: Add hold support to existing sales structure
-- Add status column to distinguish different sale types
ALTER TABLE sales ADD COLUMN IF NOT EXISTS status VARCHAR(10) CHECK (status IN ('HELD', 'SALE', 'REFUND', 'VOID')) DEFAULT 'SALE';

-- Add hold-specific fields
ALTER TABLE sales ADD COLUMN IF NOT EXISTS hold_name TEXT NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS hold_note TEXT NULL;

-- Add indexes for hold operations
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_status_terminal ON sales(status, terminal_name, created_at);
CREATE INDEX IF NOT EXISTS idx_sales_expires_at ON sales(expires_at);

-- Update existing type column to be compatible with status
UPDATE sales SET status = COALESCE(type, 'SALE') WHERE status IS NULL;







