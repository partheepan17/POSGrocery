#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Simple SQLite implementation without better-sqlite3
const DB_PATH = './data/pos-grocery.db';

// Create the discount_rules table SQL
const createTableSQL = `
CREATE TABLE IF NOT EXISTS discount_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    applies_to TEXT NOT NULL DEFAULT 'PRODUCT',
    level TEXT NOT NULL DEFAULT 'PRODUCT',
    target_id INTEGER NOT NULL,
    type TEXT NOT NULL DEFAULT 'PERCENT',
    value REAL NOT NULL,
    channel TEXT NOT NULL DEFAULT 'BOTH',
    stack_mode TEXT NOT NULL DEFAULT 'EXCLUSIVE',
    apply_quantity_rule BOOLEAN NOT NULL DEFAULT 1,
    max_qty_or_weight REAL,
    active BOOLEAN NOT NULL DEFAULT 1,
    active_from DATETIME,
    active_to DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_discount_rules_target ON discount_rules(target_id);
CREATE INDEX IF NOT EXISTS idx_discount_rules_level ON discount_rules(level);
CREATE INDEX IF NOT EXISTS idx_discount_rules_active ON discount_rules(active);
CREATE INDEX IF NOT EXISTS idx_discount_rules_channel ON discount_rules(channel);
CREATE INDEX IF NOT EXISTS idx_discount_rules_dates ON discount_rules(active_from, active_to);

-- Insert some sample discount rules
INSERT OR IGNORE INTO discount_rules (name, applies_to, level, target_id, type, value, channel, stack_mode, active) VALUES
('Bulk Discount - Electronics', 'CATEGORY', 'GROUP', 1, 'PERCENT', 5.0, 'BOTH', 'EXCLUSIVE', 1),
('Supplier Special - Fresh Foods', 'SUPPLIER', 'SUPPLIER', 1, 'PERCENT', 10.0, 'RETAIL', 'EXCLUSIVE', 1),
('Weekend Sale - All Products', 'PRODUCT', 'PRODUCT', 0, 'PERCENT', 15.0, 'BOTH', 'EXCLUSIVE', 0),
('Wholesale Volume Discount', 'CATEGORY', 'GROUP', 2, 'PERCENT', 8.0, 'WHOLESALE', 'STACKABLE', 1);
`;

// Write the SQL to a file that can be executed
const sqlFile = './temp-create-discount-table.sql';
fs.writeFileSync(sqlFile, createTableSQL);

console.log('✅ Created SQL file for discount_rules table');
console.log('📁 File location:', sqlFile);
console.log('📋 SQL content:');
console.log(createTableSQL);
console.log('\n💡 You can execute this SQL manually in your database tool or when the server starts.');







