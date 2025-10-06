-- Migration: Create discount_rules table
CREATE TABLE IF NOT EXISTS discount_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    applies_to VARCHAR(20) CHECK (applies_to IN ('PRODUCT', 'CATEGORY')) NOT NULL,
    target_id INTEGER NOT NULL,
    type VARCHAR(10) CHECK (type IN ('PERCENT', 'AMOUNT')) NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    max_qty_or_weight DECIMAL(10,3),
    active_from DATE NOT NULL,
    active_to DATE NOT NULL,
    priority INTEGER DEFAULT 10,
    reason_required BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true
);

-- Create indexes as specified
CREATE INDEX IF NOT EXISTS idx_discount_rules_target_id ON discount_rules(target_id);
CREATE INDEX IF NOT EXISTS idx_discount_rules_active_from ON discount_rules(active_from);
CREATE INDEX IF NOT EXISTS idx_discount_rules_active_to ON discount_rules(active_to);
CREATE INDEX IF NOT EXISTS idx_discount_rules_target_active ON discount_rules(target_id, active_from, active_to);
CREATE INDEX IF NOT EXISTS idx_discount_rules_active ON discount_rules(active);









