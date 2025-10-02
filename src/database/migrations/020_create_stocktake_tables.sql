-- Migration: Create stocktake tables for inventory counting
-- Stocktake sessions table
CREATE TABLE IF NOT EXISTS stocktake_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    note TEXT,
    status TEXT CHECK (status IN ('DRAFT', 'FINALIZED')) DEFAULT 'DRAFT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finalized_at TIMESTAMP NULL,
    by_user INTEGER REFERENCES users(id),
    approval_user INTEGER REFERENCES users(id)
);

-- Stocktake counts table
CREATE TABLE IF NOT EXISTS stocktake_counts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES stocktake_sessions(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    qty DECIMAL(10,3) NOT NULL DEFAULT 0,
    source TEXT CHECK (source IN ('scan', 'manual', 'csv')) DEFAULT 'manual',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, product_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stocktake_sessions_status ON stocktake_sessions(status);
CREATE INDEX IF NOT EXISTS idx_stocktake_sessions_created ON stocktake_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_stocktake_counts_session ON stocktake_counts(session_id);
CREATE INDEX IF NOT EXISTS idx_stocktake_counts_product ON stocktake_counts(product_id);
CREATE INDEX IF NOT EXISTS idx_stocktake_counts_session_product ON stocktake_counts(session_id, product_id);


