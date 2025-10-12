-- Optimize barcode lookup indexes for better performance
-- This migration removes conflicting indexes and creates optimized ones

-- Remove conflicting barcode indexes
DROP INDEX IF EXISTS idx_products_barcode;
DROP INDEX IF EXISTS idx_products_barcode_lookup;
DROP INDEX IF EXISTS idx_products_barcode_search;

-- Create optimized barcode indexes
-- 1. Unique index for barcode uniqueness (only for non-null barcodes)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode_unique ON products(barcode) WHERE barcode IS NOT NULL;

-- 2. Composite index for fast barcode lookups with active filter
CREATE INDEX IF NOT EXISTS idx_products_barcode_lookup ON products(barcode, is_active) WHERE barcode IS NOT NULL;

-- 3. Index for barcode search operations (for partial matches)
CREATE INDEX IF NOT EXISTS idx_products_barcode_search ON products(barcode) WHERE barcode IS NOT NULL;

-- 4. Index for SKU lookups (fallback for barcode search)
CREATE INDEX IF NOT EXISTS idx_products_sku_lookup ON products(sku, is_active) WHERE sku IS NOT NULL;

-- 5. Composite index for product search by barcode or SKU
CREATE INDEX IF NOT EXISTS idx_products_barcode_sku ON products(barcode, sku, is_active) WHERE barcode IS NOT NULL OR sku IS NOT NULL;
