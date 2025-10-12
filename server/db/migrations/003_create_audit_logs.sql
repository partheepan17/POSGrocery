-- Create audit_logs table for compliance and post-incident analysis
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    request_id TEXT NOT NULL,
    actor_id TEXT, -- User ID or system identifier
    actor_type TEXT NOT NULL DEFAULT 'user', -- 'user', 'system', 'api'
    action TEXT NOT NULL, -- Event type (DISCOUNT_OVERRIDE, REFUND_CREATED, etc.)
    entity_type TEXT, -- Type of entity affected (product, order, cash_drawer, etc.)
    entity_id TEXT, -- ID of the affected entity
    data_summary TEXT, -- JSON summary of non-sensitive data
    ip_address TEXT,
    user_agent TEXT,
    session_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id, actor_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_time ON audit_logs(actor_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_time ON audit_logs(action, timestamp);




