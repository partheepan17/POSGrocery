-- Migration: 025_suppliers_enhancements.sql
-- Enhance suppliers table with missing fields and improved schema

-- Add updated_at field to suppliers table
ALTER TABLE suppliers ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));

-- Add name_normalized virtual column for efficient duplicate checking
ALTER TABLE suppliers ADD COLUMN name_normalized TEXT GENERATED ALWAYS AS (LOWER(TRIM(supplier_name))) VIRTUAL;

-- Create unique index on normalized name for duplicate prevention
CREATE UNIQUE INDEX IF NOT EXISTS ux_suppliers_name_normalized ON suppliers(name_normalized);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_suppliers_updated_at ON suppliers(updated_at);
CREATE INDEX IF NOT EXISTS idx_suppliers_name_search ON suppliers(supplier_name);
CREATE INDEX IF NOT EXISTS idx_suppliers_phone_search ON suppliers(contact_phone) WHERE contact_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_email_search ON suppliers(contact_email) WHERE contact_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_tax_id_search ON suppliers(tax_id) WHERE tax_id IS NOT NULL;

-- Update existing records to have updated_at set to created_at
UPDATE suppliers SET updated_at = created_at WHERE updated_at IS NULL;
