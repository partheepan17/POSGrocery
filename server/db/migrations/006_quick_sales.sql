-- Quick Sales Session System
-- Durable one-per-day sessions that accumulate lines and close into one invoice

-- Quick Sales Sessions table
CREATE TABLE IF NOT EXISTS quick_sales_sessions (
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

-- Quick Sales Lines table
CREATE TABLE IF NOT EXISTS quick_sales_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    uom TEXT DEFAULT 'pcs',
    qty DECIMAL(10,3) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    auto_discount DECIMAL(10,2) DEFAULT 0,
    manual_discount DECIMAL(10,2) DEFAULT 0,
    line_total DECIMAL(10,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (session_id) REFERENCES quick_sales_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Unique constraint: only one open session per session_date
CREATE UNIQUE INDEX IF NOT EXISTS idx_quick_sales_sessions_date_status 
ON quick_sales_sessions(session_date, status) 
WHERE status = 'open';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quick_sales_sessions_date ON quick_sales_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_quick_sales_sessions_status ON quick_sales_sessions(status);
CREATE INDEX IF NOT EXISTS idx_quick_sales_sessions_opened_by ON quick_sales_sessions(opened_by);

CREATE INDEX IF NOT EXISTS idx_quick_sales_lines_session_id ON quick_sales_lines(session_id);
CREATE INDEX IF NOT EXISTS idx_quick_sales_lines_product_id ON quick_sales_lines(product_id);
CREATE INDEX IF NOT EXISTS idx_quick_sales_lines_created_at ON quick_sales_lines(created_at);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS quick_sales_sessions_updated_at 
AFTER UPDATE ON quick_sales_sessions
BEGIN
    UPDATE quick_sales_sessions 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;
