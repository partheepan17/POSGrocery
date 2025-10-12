const Database = require('better-sqlite3');
const db = new Database('server/data/pos.db');

console.log('Fixing all stock triggers...');

// Drop all existing triggers
db.exec('DROP TRIGGER IF EXISTS validate_sale_stock');
db.exec('DROP TRIGGER IF EXISTS update_stock_on_sale');
db.exec('DROP TRIGGER IF EXISTS validate_return_stock');
db.exec('DROP TRIGGER IF EXISTS update_stock_on_return');

// Create corrected triggers
db.exec(`
CREATE TRIGGER validate_sale_stock
    BEFORE INSERT ON invoice_lines
    FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN (SELECT COALESCE(stock_qty, 0) FROM products WHERE id = NEW.product_id) < NEW.qty
        THEN RAISE(ABORT, 'Insufficient stock for sale')
    END;
END
`);

db.exec(`
CREATE TRIGGER update_stock_on_sale
    AFTER INSERT ON invoice_lines
    FOR EACH ROW
BEGIN
    INSERT INTO stock_movements (
        product_id, movement_type, reference_id, reference_type,
        quantity, created_at
    )
    VALUES (
        NEW.product_id, 'sale', NEW.invoice_id, 'invoice',
        -NEW.qty, CURRENT_TIMESTAMP
    );
    
    UPDATE products 
    SET stock_qty = stock_qty - NEW.qty,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.product_id;
END
`);

db.exec(`
CREATE TRIGGER validate_return_stock
    BEFORE INSERT ON invoice_lines
    FOR EACH ROW
    WHEN NEW.qty < 0
BEGIN
    SELECT CASE
        WHEN ABS(NEW.qty) > 1000
        THEN RAISE(ABORT, 'Return quantity too large')
    END;
END
`);

db.exec(`
CREATE TRIGGER update_stock_on_return
    AFTER INSERT ON invoice_lines
    FOR EACH ROW
    WHEN NEW.qty < 0
BEGIN
    INSERT INTO stock_movements (
        product_id, movement_type, reference_id, reference_type,
        quantity, created_at
    )
    VALUES (
        NEW.product_id, 'return', NEW.invoice_id, 'invoice',
        -NEW.qty, CURRENT_TIMESTAMP
    );
    
    UPDATE products 
    SET stock_qty = stock_qty - NEW.qty,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.product_id;
END
`);

console.log('All triggers fixed successfully');

// Test the validation trigger
console.log('\nTesting stock validation...');
try {
    db.exec(`
        INSERT INTO invoice_lines (invoice_id, product_id, qty, unit_price, line_discount, tax, total)
        VALUES (999, 1, 1, 1.50, 0, 0, 1.50)
    `);
    console.log('Test insert succeeded - trigger may not be working');
} catch (error) {
    console.log('Test insert failed as expected:', error.message);
}

db.close();
