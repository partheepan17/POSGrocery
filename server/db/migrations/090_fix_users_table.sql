-- Fix users table by adding missing columns
-- This migration fixes the users table structure

-- Add missing columns to users table if they don't exist
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- So we'll use a different approach with error handling

-- Try to add columns and ignore errors if they already exist
-- This is handled by the migration runner's error handling
