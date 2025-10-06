-- Migration: Create returns and return_lines tables for Returns & Refunds v1
-- This creates a separate returns system as requested, independent of the existing sales-based refunds

-- Create returns table
CREATE TABLE IF NOT EXISTS returns (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER NOT NULL REFERENCES sales(id),
    datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cashier_id INTEGER REFERENCES users(id),
    manager_id INTEGER NULL REFERENCES users(id),
    refund_cash DECIMAL(10,2) DEFAULT 0,
    refund_card DECIMAL(10,2) DEFAULT 0,
    refund_wallet DECIMAL(10,2) DEFAULT 0,
    refund_store_credit DECIMAL(10,2) DEFAULT 0,
    reason_summary TEXT NULL,
    language CHAR(2) DEFAULT 'EN' CHECK (language IN ('EN', 'SI', 'TA')),
    terminal_name TEXT
);

-- Create return_lines table
CREATE TABLE IF NOT EXISTS return_lines (
    id SERIAL PRIMARY KEY,
    return_id INTEGER NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
    sale_line_id INTEGER NOT NULL REFERENCES sale_lines(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    qty DECIMAL(10,3) NOT NULL CHECK(qty > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    line_refund DECIMAL(10,2) NOT NULL,
    reason_code TEXT NOT NULL CHECK (reason_code IN ('DAMAGED', 'EXPIRED', 'WRONG_ITEM', 'CUSTOMER_CHANGE', 'OTHER'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_returns_sale_id ON returns(sale_id);
CREATE INDEX IF NOT EXISTS idx_returns_datetime ON returns(datetime);
CREATE INDEX IF NOT EXISTS idx_returns_cashier_id ON returns(cashier_id);
CREATE INDEX IF NOT EXISTS idx_returns_manager_id ON returns(manager_id);

CREATE INDEX IF NOT EXISTS idx_return_lines_return_id ON return_lines(return_id);
CREATE INDEX IF NOT EXISTS idx_return_lines_sale_line_id ON return_lines(sale_line_id);
CREATE INDEX IF NOT EXISTS idx_return_lines_product_id ON return_lines(product_id);

-- Add RETURN type to inventory_movements if not present
-- First check if the constraint exists and add RETURN if needed
DO $$
BEGIN
    -- Check if RETURN is already in the constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'inventory_movements_type_check' 
        AND check_clause LIKE '%RETURN%'
    ) THEN
        -- Drop the existing constraint
        ALTER TABLE inventory_movements DROP CONSTRAINT IF EXISTS inventory_movements_type_check;
        -- Add the new constraint with RETURN included
        ALTER TABLE inventory_movements ADD CONSTRAINT inventory_movements_type_check 
        CHECK (type IN ('RECEIVE', 'ADJUST', 'WASTE', 'RETURN'));
    END IF;
END $$;


