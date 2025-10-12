-- Enhanced audit logging for compliance and performance monitoring
-- Adds request tracking and performance audit capabilities

-- Add request_id to all critical tables for audit trail (only if columns don't exist)
-- ALTER TABLE invoices ADD COLUMN request_id TEXT;
-- ALTER TABLE invoice_lines ADD COLUMN request_id TEXT;
-- ALTER TABLE invoice_payments ADD COLUMN request_id TEXT;
-- ALTER TABLE returns ADD COLUMN request_id TEXT;
-- ALTER TABLE cash_movements ADD COLUMN request_id TEXT;

-- Create indexes for request tracking (only if columns exist)
-- CREATE INDEX IF NOT EXISTS idx_invoices_request_id ON invoices(request_id);
-- CREATE INDEX IF NOT EXISTS idx_invoice_lines_request_id ON invoice_lines(request_id);
-- CREATE INDEX IF NOT EXISTS idx_invoice_payments_request_id ON invoice_payments(request_id);
-- CREATE INDEX IF NOT EXISTS idx_returns_request_id ON returns(request_id);
-- CREATE INDEX IF NOT EXISTS idx_cash_movements_request_id ON cash_movements(request_id);

-- Performance audit table for tracking operation timings
CREATE TABLE IF NOT EXISTS performance_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT NOT NULL,
    operation TEXT NOT NULL, -- 'BARCODE_LOOKUP', 'PRODUCT_SEARCH', 'INVOICE_CREATE', 'Z_REPORT'
    duration_ms INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    error_code TEXT,
    metadata TEXT, -- JSON with additional context
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_performance_audit_request_id ON performance_audit(request_id);
CREATE INDEX IF NOT EXISTS idx_performance_audit_operation ON performance_audit(operation, created_at);
CREATE INDEX IF NOT EXISTS idx_performance_audit_duration ON performance_audit(duration_ms, operation);

-- PIN verification audit table
CREATE TABLE IF NOT EXISTS pin_verification_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    failure_reason TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pin_verification_user ON pin_verification_audit(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pin_verification_success ON pin_verification_audit(success, created_at);
CREATE INDEX IF NOT EXISTS idx_pin_verification_request_id ON pin_verification_audit(request_id);
