-- Sales Stock Validation and Atomic Transactions
-- This migration adds stock validation and atomic stock updates for sales

-- Add stock validation trigger for sales
CREATE TRIGGER IF NOT EXISTS validate_sale_stock
    BEFORE INSERT ON invoice_lines
    FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN (SELECT COALESCE(stock_qty, 0) FROM products WHERE id = NEW.product_id) < NEW.qty
        THEN RAISE(ABORT, 'Insufficient stock for sale')
    END;
END;

-- Add stock movement trigger for sales
CREATE TRIGGER IF NOT EXISTS update_stock_on_sale
    AFTER INSERT ON invoice_lines
    FOR EACH ROW
BEGIN
    -- Insert into stock movements
    INSERT INTO stock_movements (
        product_id, movement_type, reference_id, reference_type,
        quantity, created_at
    )
    VALUES (
        NEW.product_id, 'sale', NEW.invoice_id, 'invoice',
        -NEW.qty, CURRENT_TIMESTAMP
    );
    
    -- Update product stock
    UPDATE products 
    SET stock_qty = stock_qty - NEW.qty,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.product_id;
END;

-- Add stock validation trigger for returns
CREATE TRIGGER IF NOT EXISTS validate_return_stock
    BEFORE INSERT ON invoice_lines
    FOR EACH ROW
    WHEN NEW.qty < 0  -- Negative quantity indicates return
BEGIN
    -- For returns, we don't need to validate stock availability
    -- Just ensure the return quantity is reasonable
    SELECT CASE
        WHEN ABS(NEW.qty) > 1000  -- Arbitrary limit for returns
        THEN RAISE(ABORT, 'Return quantity too large')
    END;
END;

-- Add stock movement trigger for returns
CREATE TRIGGER IF NOT EXISTS update_stock_on_return
    AFTER INSERT ON invoice_lines
    FOR EACH ROW
    WHEN NEW.qty < 0  -- Negative quantity indicates return
BEGIN
    -- Insert into stock movements for return
    INSERT INTO stock_movements (
        product_id, movement_type, reference_id, reference_type,
        quantity, created_at
    )
    VALUES (
        NEW.product_id, 'return', NEW.invoice_id, 'invoice',
        -NEW.qty,  -- Negative qty becomes positive for return
        CURRENT_TIMESTAMP
    );
    
    -- Update product stock for return
    UPDATE products 
    SET stock_qty = stock_qty - NEW.qty,  -- Negative qty adds stock
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.product_id;
END;

-- Create index for better stock validation performance
CREATE INDEX IF NOT EXISTS idx_products_stock_qty ON products(id, stock_qty);
CREATE INDEX IF NOT EXISTS idx_stock_movements_sales ON stock_movements(movement_type, reference_type, reference_id);
