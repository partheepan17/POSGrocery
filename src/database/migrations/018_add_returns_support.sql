-- Migration: Add returns and refunds support to existing sales structure
-- Add type column to distinguish sales from refunds
ALTER TABLE sales ADD COLUMN IF NOT EXISTS type VARCHAR(10) CHECK (type IN ('SALE', 'REFUND')) DEFAULT 'SALE';

-- Add reference to original sale for refunds
ALTER TABLE sales ADD COLUMN IF NOT EXISTS original_sale_id INTEGER REFERENCES sales(id);

-- Add voided tracking
ALTER TABLE sales ADD COLUMN IF NOT EXISTS voided_at TIMESTAMP NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS voided_by INTEGER REFERENCES users(id);

-- Add reference to original line for refund lines
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS original_line_id INTEGER REFERENCES sale_items(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_type ON sales(type);
CREATE INDEX IF NOT EXISTS idx_sales_original_sale_id ON sales(original_sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_voided_at ON sales(voided_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_original_line_id ON sale_items(original_line_id);


