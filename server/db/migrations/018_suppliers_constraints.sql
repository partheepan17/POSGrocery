-- Add constraints and indexes for suppliers table
-- This migration improves data integrity for supplier management

-- Add case-insensitive unique constraint on supplier names
CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_name_unique ON suppliers(LOWER(supplier_name));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_suppliers_name_lookup ON suppliers(supplier_name);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(active);
CREATE INDEX IF NOT EXISTS idx_suppliers_created_at ON suppliers(created_at);

-- Add index for email lookups (if email is provided)
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(contact_email) WHERE contact_email IS NOT NULL;

-- Add index for phone lookups (if phone is provided)
CREATE INDEX IF NOT EXISTS idx_suppliers_phone ON suppliers(contact_phone) WHERE contact_phone IS NOT NULL;
