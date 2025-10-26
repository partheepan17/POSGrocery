-- Add version column to stock_lots for optimistic locking
-- Migration: 033_add_stock_lots_version.sql

-- Add version column to stock_lots table
ALTER TABLE stock_lots ADD COLUMN version INTEGER DEFAULT 1;

-- Update existing records to have version 1
UPDATE stock_lots SET version = 1 WHERE version IS NULL;

-- Create index on version for better performance
CREATE INDEX IF NOT EXISTS idx_stock_lots_version ON stock_lots(version);

-- Add trigger to automatically increment version on updates
CREATE TRIGGER IF NOT EXISTS stock_lots_version_trigger
  AFTER UPDATE ON stock_lots
  FOR EACH ROW
  WHEN NEW.quantity_remaining != OLD.quantity_remaining
BEGIN
  UPDATE stock_lots 
  SET version = version + 1 
  WHERE id = NEW.id;
END;


