-- Add missing indexes for products table
-- This ensures proper constraints and performance

-- Ensure unique constraints exist
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
