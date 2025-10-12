-- Update Quick Sales status constraint to include 'closing' status
-- This allows for concurrency control during session closing

-- Drop the existing constraint
DROP INDEX IF EXISTS idx_quick_sales_sessions_date_status;

-- Update the status constraint
-- Note: SQLite doesn't support ALTER COLUMN CHECK constraints directly
-- We need to recreate the table with the new constraint

-- Create new table with updated constraint
CREATE TABLE quick_sales_sessions_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_date TEXT NOT NULL, -- YYYY-MM-DD format
    opened_by INTEGER NOT NULL, -- user_id who opened the session
    opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_by INTEGER, -- user_id who closed the session
    closed_at DATETIME,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closing', 'closed')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (opened_by) REFERENCES users(id),
    FOREIGN KEY (closed_by) REFERENCES users(id)
);

-- Copy data from old table
INSERT INTO quick_sales_sessions_new 
SELECT * FROM quick_sales_sessions;

-- Drop old table
DROP TABLE quick_sales_sessions;

-- Rename new table
ALTER TABLE quick_sales_sessions_new RENAME TO quick_sales_sessions;

-- Recreate indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_quick_sales_sessions_date_status 
ON quick_sales_sessions(session_date, status) 
WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_quick_sales_sessions_date ON quick_sales_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_quick_sales_sessions_status ON quick_sales_sessions(status);
CREATE INDEX IF NOT EXISTS idx_quick_sales_sessions_opened_by ON quick_sales_sessions(opened_by);

-- Recreate trigger
CREATE TRIGGER IF NOT EXISTS quick_sales_sessions_updated_at 
AFTER UPDATE ON quick_sales_sessions
BEGIN
    UPDATE quick_sales_sessions 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;


