-- Add idempotency support to GRN headers
-- This migration adds idempotency_key column to grn_headers table

-- Add idempotency_key column
ALTER TABLE grn_headers ADD COLUMN idempotency_key VARCHAR(255) NULL;

-- Create index for idempotency lookups
CREATE INDEX IF NOT EXISTS idx_grn_idempotency ON grn_headers(idempotency_key);

-- Add unique constraint to prevent duplicate idempotency keys
CREATE UNIQUE INDEX IF NOT EXISTS idx_grn_idempotency_unique ON grn_headers(idempotency_key) WHERE idempotency_key IS NOT NULL;
