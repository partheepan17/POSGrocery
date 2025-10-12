const Database = require('better-sqlite3');
const db = new Database('data/pos.db');

console.log('=== STOCK_LEDGER SCHEMA ===');
const stockLedgerSchema = db.prepare('SELECT sql FROM sqlite_master WHERE type=? AND name=?').get('table', 'stock_ledger');
console.log(stockLedgerSchema?.sql || 'Table not found');

console.log('\n=== STOCK_MOVEMENTS SCHEMA ===');
const stockMovementsSchema = db.prepare('SELECT sql FROM sqlite_master WHERE type=? AND name=?').get('table', 'stock_movements');
console.log(stockMovementsSchema?.sql || 'Table not found');

console.log('\n=== PRODUCT_STOCK SCHEMA ===');
const productStockSchema = db.prepare('SELECT sql FROM sqlite_master WHERE type=? AND name=?').get('table', 'product_stock');
console.log(productStockSchema?.sql || 'Table not found');

console.log('\n=== STOCK_LOTS SCHEMA ===');
const stockLotsSchema = db.prepare('SELECT sql FROM sqlite_master WHERE type=? AND name=?').get('table', 'stock_lots');
console.log(stockLotsSchema?.sql || 'Table not found');

console.log('\n=== ALL TABLES ===');
const allTables = db.prepare('SELECT name FROM sqlite_master WHERE type=? ORDER BY name').all('table');
console.log(allTables.map(t => t.name).join(', '));

db.close();
