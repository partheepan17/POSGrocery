-- Migration: Create products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    barcode VARCHAR(100),
    name_en VARCHAR(255) NOT NULL,
    name_si VARCHAR(255),
    name_ta VARCHAR(255),
    unit VARCHAR(10) CHECK (unit IN ('pc', 'kg')) NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    is_scale_item BOOLEAN DEFAULT false,
    tax_code VARCHAR(50),
    price_retail DECIMAL(10,2) NOT NULL,
    price_wholesale DECIMAL(10,2) NOT NULL,
    price_credit DECIMAL(10,2) NOT NULL,
    price_other DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2),
    reorder_level INTEGER,
    preferred_supplier_id INTEGER REFERENCES suppliers(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now()
);

-- Create indexes as specified
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_preferred_supplier ON products(preferred_supplier_id);




