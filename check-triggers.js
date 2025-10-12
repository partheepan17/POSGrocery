const Database = require('better-sqlite3');
const db = new Database('data/pos.db');

console.log('Checking stock triggers...');
const triggers = db.prepare('SELECT name FROM sqlite_master WHERE type="trigger" AND name LIKE "%stock%"').all();
console.log('Stock triggers:', triggers);

console.log('\nChecking product_stock table...');
const stock = db.prepare('SELECT * FROM product_stock WHERE product_id = 1').get();
console.log('Product 1 stock:', stock);

console.log('\nChecking recent invoice_lines...');
const lines = db.prepare('SELECT * FROM invoice_lines ORDER BY id DESC LIMIT 5').all();
console.log('Recent invoice lines:', lines);

db.close();
