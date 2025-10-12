const Database = require('better-sqlite3');
const db = new Database('server/data/pos.db');

console.log('Fixing stock validation trigger...');

// Drop the old trigger
db.exec('DROP TRIGGER IF EXISTS validate_sale_stock');

// Create the corrected trigger
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

console.log('Trigger fixed successfully');

// Test the trigger
console.log('\nTesting trigger...');
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
