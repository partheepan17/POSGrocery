-- UOM Conversions System
-- Migration: 035_add_uom_conversions.sql

-- Create product_uom table for unit conversions
CREATE TABLE IF NOT EXISTS product_uom (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    base_unit TEXT NOT NULL,           -- Base unit (e.g., 'pc', 'kg', 'g')
    alt_unit TEXT NOT NULL,            -- Alternative unit (e.g., 'carton', 'box', 'lb')
    multiplier REAL NOT NULL,          -- Conversion factor (e.g., 12 for carton->pc, 1000 for kg->g)
    is_active BOOLEAN DEFAULT 1,       -- Whether this conversion is active
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate conversions
    UNIQUE(product_id, base_unit, alt_unit)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_uom_product_id ON product_uom(product_id);
CREATE INDEX IF NOT EXISTS idx_product_uom_base_unit ON product_uom(base_unit);
CREATE INDEX IF NOT EXISTS idx_product_uom_alt_unit ON product_uom(alt_unit);
CREATE INDEX IF NOT EXISTS idx_product_uom_active ON product_uom(is_active);

-- Add UOM conversion columns to stock_lots
ALTER TABLE stock_lots ADD COLUMN received_unit TEXT DEFAULT 'pc';
ALTER TABLE stock_lots ADD COLUMN received_quantity REAL;
ALTER TABLE stock_lots ADD COLUMN conversion_multiplier REAL DEFAULT 1.0;

-- Add UOM conversion columns to grn_lines
ALTER TABLE grn_lines ADD COLUMN received_unit TEXT DEFAULT 'pc';
ALTER TABLE grn_lines ADD COLUMN received_quantity REAL;
ALTER TABLE grn_lines ADD COLUMN conversion_multiplier REAL DEFAULT 1.0;

-- Create view for UOM conversions with product details
CREATE VIEW IF NOT EXISTS product_uom_with_details AS
SELECT 
    pu.id,
    pu.product_id,
    p.name_en as product_name,
    p.sku,
    pu.base_unit,
    pu.alt_unit,
    pu.multiplier,
    pu.is_active,
    pu.created_at,
    pu.updated_at
FROM product_uom pu
JOIN products p ON pu.product_id = p.id
WHERE pu.is_active = 1;

-- Create function to get conversion multiplier
-- Note: SQLite doesn't support functions, so we'll handle this in application code

-- Insert some common UOM conversions as examples
-- Only insert if products exist
INSERT OR IGNORE INTO product_uom (product_id, base_unit, alt_unit, multiplier, is_active) 
SELECT 1, 'pc', 'carton', 12.0, 1 WHERE EXISTS (SELECT 1 FROM products WHERE id = 1)
UNION ALL
SELECT 1, 'pc', 'box', 24.0, 1 WHERE EXISTS (SELECT 1 FROM products WHERE id = 1)
UNION ALL
SELECT 2, 'kg', 'g', 1000.0, 1 WHERE EXISTS (SELECT 1 FROM products WHERE id = 2)
UNION ALL
SELECT 2, 'kg', 'lb', 2.20462, 1 WHERE EXISTS (SELECT 1 FROM products WHERE id = 2)
UNION ALL
SELECT 3, 'pc', 'dozen', 12.0, 1 WHERE EXISTS (SELECT 1 FROM products WHERE id = 3)
UNION ALL
SELECT 3, 'pc', 'gross', 144.0, 1 WHERE EXISTS (SELECT 1 FROM products WHERE id = 3);

-- Update existing stock_lots to have default values
UPDATE stock_lots SET 
    received_unit = 'pc',
    received_quantity = quantity_received,
    conversion_multiplier = 1.0
WHERE received_unit IS NULL;

-- Update existing grn_lines to have default values
UPDATE grn_lines SET 
    received_unit = 'pc',
    received_quantity = quantity_received,
    conversion_multiplier = 1.0
WHERE received_unit IS NULL;


