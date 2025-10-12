-- Add indexes for products list performance
-- This migration adds indexes to support fast filtering, sorting, and pagination

-- Search indexes (for name, SKU, barcode searches)
CREATE INDEX IF NOT EXISTS idx_products_name_en_search ON products(name_en);
CREATE INDEX IF NOT EXISTS idx_products_name_si_search ON products(name_si);
CREATE INDEX IF NOT EXISTS idx_products_name_ta_search ON products(name_ta);
CREATE INDEX IF NOT EXISTS idx_products_sku_search ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode_search ON products(barcode);

-- Category filter index
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- Status filter index
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- Scale items filter index
CREATE INDEX IF NOT EXISTS idx_products_is_scale_item ON products(is_scale_item);

-- Sorting indexes
CREATE INDEX IF NOT EXISTS idx_products_price_retail ON products(price_retail);
CREATE INDEX IF NOT EXISTS idx_products_price_wholesale ON products(price_wholesale);
CREATE INDEX IF NOT EXISTS idx_products_price_credit ON products(price_credit);
CREATE INDEX IF NOT EXISTS idx_products_price_other ON products(price_other);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at);

-- Composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_products_active_category ON products(is_active, category_id);
CREATE INDEX IF NOT EXISTS idx_products_active_scale ON products(is_active, is_scale_item);
CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category_id, is_active);

-- Full-text search index (if supported)
-- Note: SQLite FTS requires a separate virtual table, which is complex to implement
-- The LIKE queries with the above indexes should be sufficient for most use cases
