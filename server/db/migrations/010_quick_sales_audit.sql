-- Create Quick Sales audit logs table
CREATE TABLE IF NOT EXISTS quick_sales_audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    session_id INTEGER,
    line_id INTEGER,
    product_id INTEGER,
    product_sku TEXT,
    product_name TEXT,
    quantity DECIMAL(10,3),
    unit_price DECIMAL(10,2),
    line_total DECIMAL(10,2),
    reason TEXT,
    totals TEXT, -- JSON string
    invoice_id INTEGER,
    request_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    user_role TEXT NOT NULL,
    timestamp DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (session_id) REFERENCES quick_sales_sessions(id),
    FOREIGN KEY (line_id) REFERENCES quick_sales_lines(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quick_sales_audit_action ON quick_sales_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_quick_sales_audit_session ON quick_sales_audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_quick_sales_audit_user ON quick_sales_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_quick_sales_audit_timestamp ON quick_sales_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_quick_sales_audit_request ON quick_sales_audit_logs(request_id);

-- PIN column already added in migration 002_user_management.sql
-- Index for PIN lookups already created in migration 002

