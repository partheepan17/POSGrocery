import { initDatabase, getDatabase } from '../server/dist/db/index.js';

initDatabase();
const db = getDatabase();

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name));

console.log('\nInvoice_payments structure:');
const invoicePaymentsStructure = db.prepare("PRAGMA table_info(invoice_payments)").all();
console.log(invoicePaymentsStructure);
