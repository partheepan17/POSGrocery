-- Sales Idempotency and Receipt Number System
-- This migration adds idempotency protection and robust receipt numbering

-- Create idempotency table
CREATE TABLE IF NOT EXISTS sales_idempotency (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  idempotency_key TEXT UNIQUE NOT NULL,
  sale_id INTEGER NOT NULL,
  customer_id INTEGER,
  total_amount INTEGER NOT NULL,
  items_signature TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME DEFAULT (datetime('now', '+24 hours')),
  FOREIGN KEY (sale_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Create receipt sequence table
CREATE TABLE IF NOT EXISTS receipt_sequence (
  store_id TEXT NOT NULL,
  business_date TEXT NOT NULL,
  last INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(store_id, business_date)
);

-- Add unique index on receipt numbers
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_receipt_no ON invoices(receipt_no);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_idempotency_key ON sales_idempotency(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_sales_idempotency_expires ON sales_idempotency(expires_at);
CREATE INDEX IF NOT EXISTS idx_receipt_sequence_lookup ON receipt_sequence(store_id, business_date);

-- Clean up expired idempotency keys (run daily)
CREATE TRIGGER IF NOT EXISTS cleanup_expired_idempotency
  AFTER INSERT ON sales_idempotency
BEGIN
  DELETE FROM sales_idempotency 
  WHERE expires_at < datetime('now', '-1 day');
END;
