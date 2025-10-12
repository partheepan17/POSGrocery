-- Add meta column to invoices table for Quick Sales labeling
ALTER TABLE invoices ADD COLUMN meta TEXT;

-- Add index for meta queries
CREATE INDEX IF NOT EXISTS idx_invoices_meta ON invoices(meta);


