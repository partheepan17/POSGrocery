-- Add invoice counters table for daily sequence receipt numbers
-- This table tracks the last sequence number used for each day
-- Format: DDMMYY001, DDMMYY002, etc.

CREATE TABLE IF NOT EXISTS invoice_counters (
  date TEXT PRIMARY KEY,           -- Date in YYYY-MM-DD format
  last_seq INTEGER NOT NULL DEFAULT 0  -- Last sequence number used for this date
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_invoice_counters_date ON invoice_counters(date);

-- Insert initial counter for today (if not exists)
INSERT OR IGNORE INTO invoice_counters (date, last_seq) 
VALUES (date('now'), 0);

