-- Shift Management Tables
-- Migration: 025_create_shifts_tables.sql

-- shifts (header)
CREATE TABLE IF NOT EXISTS shifts (
  id INTEGER PRIMARY KEY,
  terminal_name TEXT NOT NULL,                -- from settings/pos state
  cashier_id INTEGER NOT NULL REFERENCES users(id),
  opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL,
  opening_cash DECIMAL(10,2) NOT NULL DEFAULT 0,
  declared_cash DECIMAL(10,2) NULL,           -- user counted cash at close
  variance_cash DECIMAL(10,2) NULL,           -- declared - expected
  note TEXT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','CLOSED','VOID'))
);

-- shift_movements: cash drawer ops & non-sale cash
CREATE TABLE IF NOT EXISTS shift_movements (
  id INTEGER PRIMARY KEY,
  shift_id INTEGER NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  type TEXT NOT NULL CHECK(type IN ('CASH_IN','CASH_OUT','DROP','PICKUP','PETTY')),
  amount DECIMAL(10,2) NOT NULL CHECK(amount>=0),
  reason TEXT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shifts_open ON shifts(status,opened_at);
CREATE INDEX IF NOT EXISTS idx_shifts_cashier ON shifts(cashier_id);
CREATE INDEX IF NOT EXISTS idx_shifts_terminal ON shifts(terminal_name);
CREATE INDEX IF NOT EXISTS idx_shift_movements_shift ON shift_movements(shift_id);

-- sales linkage: ensure 'sales' has a nullable shift_id
-- Check if column exists, if not add it
-- Note: This is handled in the database service initialization


