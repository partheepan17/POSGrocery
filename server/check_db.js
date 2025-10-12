const Database = require('better-sqlite3');
const db = new Database('./db/pos.db');

console.log('Available tables:');
const tables = db.prepare('SELECT name FROM sqlite_master WHERE type=?').all('table');
console.log(tables.map(t => t.name));

console.log('\nProducts table structure:');
const productsInfo = db.prepare('PRAGMA table_info(products)').all();
console.log(productsInfo);

console.log('\nSuppliers table structure:');
const suppliersInfo = db.prepare('PRAGMA table_info(suppliers)').all();
console.log(suppliersInfo);

console.log('\nGRN Headers table structure:');
const grnHeadersInfo = db.prepare('PRAGMA table_info(grn_headers)').all();
console.log(grnHeadersInfo);

console.log('\nGRN Lines table structure:');
const grnLinesInfo = db.prepare('PRAGMA table_info(grn_lines)').all();
console.log(grnLinesInfo);

console.log('\nStock Ledger table structure:');
const stockLedgerInfo = db.prepare('PRAGMA table_info(stock_ledger)').all();
console.log(stockLedgerInfo);

db.close();
