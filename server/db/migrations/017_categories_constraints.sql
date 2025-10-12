-- Add constraints and indexes for categories table
-- This migration improves data integrity for category management

-- Add case-insensitive unique constraint on category names
-- Check if index already exists before creating
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_unique ON categories(LOWER(name));

-- Add check constraint for name length (1-100 characters)
-- Note: SQLite doesn't support CHECK constraints in ALTER TABLE, so we'll add validation in the application layer
-- The unique index above will prevent duplicates regardless of case

-- Add index for faster lookups by name
CREATE INDEX IF NOT EXISTS idx_categories_name_lookup ON categories(name);

-- Add index for created_at for sorting
CREATE INDEX IF NOT EXISTS idx_categories_created_at ON categories(created_at);
