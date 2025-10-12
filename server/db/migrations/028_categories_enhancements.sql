-- Migration: 026_categories_enhancements.sql
-- Enhance categories table with missing fields and improved schema

-- Add is_active field to categories table (if not exists)
ALTER TABLE categories ADD COLUMN is_active INTEGER DEFAULT 1;

-- Add updated_at field to categories table
ALTER TABLE categories ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));

-- Add name_normalized virtual column for efficient duplicate checking
ALTER TABLE categories ADD COLUMN name_normalized TEXT GENERATED ALWAYS AS (LOWER(TRIM(name))) VIRTUAL;

-- Create unique index on normalized name for duplicate prevention
CREATE UNIQUE INDEX IF NOT EXISTS ux_categories_name_normalized ON categories(name_normalized);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_categories_updated_at ON categories(updated_at);
CREATE INDEX IF NOT EXISTS idx_categories_name_search ON categories(name);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

-- Update existing records to have updated_at set to created_at and is_active = 1
UPDATE categories SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE categories SET is_active = 1 WHERE is_active IS NULL;
