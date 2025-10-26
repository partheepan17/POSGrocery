-- Migration: 035_add_source_to_stock_lots.sql
-- Adds source column to stock_lots table to track return lots separately

-- Add source column to stock_lots table
ALTER TABLE stock_lots ADD COLUMN source TEXT DEFAULT 'purchase' CHECK (source IN ('purchase', 'return', 'adjustment', 'transfer'));

-- Create index for source lookups
CREATE INDEX IF NOT EXISTS idx_stock_lots_source ON stock_lots(source);

-- Update existing records to have 'purchase' as default source
UPDATE stock_lots SET source = 'purchase' WHERE source IS NULL;










