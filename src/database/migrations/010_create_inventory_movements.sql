-- Migration: Create inventory_movements table
CREATE TABLE IF NOT EXISTS inventory_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    qty DECIMAL(10,3) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('RECEIVE', 'ADJUST', 'WASTE')) NOT NULL,
    reason VARCHAR(255),
    note TEXT,
    created_at TIMESTAMP DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at);




