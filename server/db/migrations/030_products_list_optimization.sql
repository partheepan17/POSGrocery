-- Products List Optimization Migration
-- This migration ensures optimal indexes for the products list endpoint

-- Core search indexes (case-insensitive search optimization)
CREATE INDEX IF NOT EXISTS idx_products_name_en_lower ON products(LOWER(name_en));
CREATE INDEX IF NOT EXISTS idx_products_sku_lower ON products(LOWER(sku));
CREATE INDEX IF NOT EXISTS idx_products_barcode_lower ON products(LOWER(barcode));

-- Composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_products_active_category_sort ON products(is_active, category_id, created_at);
CREATE INDEX IF NOT EXISTS idx_products_category_active_sort ON products(category_id, is_active, created_at);
CREATE INDEX IF NOT EXISTS idx_products_scale_active_sort ON products(is_scale_item, is_active, created_at);

-- Sorting indexes (if not already present)
CREATE INDEX IF NOT EXISTS idx_products_name_en_sort ON products(name_en);
CREATE INDEX IF NOT EXISTS idx_products_sku_sort ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode_sort ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_created_at_sort ON products(created_at);

-- Search performance indexes
CREATE INDEX IF NOT EXISTS idx_products_search_composite ON products(is_active, category_id, name_en, sku, barcode);

-- Ensure we have the basic indexes for the products list
CREATE INDEX IF NOT EXISTS idx_products_name_en ON products(name_en);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
