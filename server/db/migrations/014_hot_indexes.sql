-- Hot Indexes for Performance Optimization
-- This migration adds critical performance indexes for frequently queried tables
-- These indexes are essential for sub-second query performance on large datasets

-- Invoice Lines Performance Indexes
-- Composite index for invoice line lookups (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_product ON invoice_lines(invoice_id, product_id);

-- Invoice Payments Performance Indexes  
-- Index for payment lookups by invoice (if not already created in migration 004)
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_lookup ON invoice_payments(invoice_id);

-- Returns Performance Indexes
-- Index for returns lookup by original invoice (only if returns table exists)
-- Note: This will be created when the returns table is added in a future migration

-- Shifts Performance Indexes
-- Index for shift queries by opening time (only if shifts table exists)
-- Note: This will be created when the shifts table is added in a future migration

-- Additional Performance Indexes for Common Query Patterns

-- Customer phone lookups (for returns and customer service)
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- Quick Sales session lookups
CREATE INDEX IF NOT EXISTS idx_quick_sales_sessions_date_status ON quick_sales_sessions(session_date, status);

-- Quick Sales lines by session
CREATE INDEX IF NOT EXISTS idx_quick_sales_lines_session ON quick_sales_lines(session_id);

-- Stock movements by product and date
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_date ON stock_movements(product_id, created_at);

-- Audit logs by entity and time (for compliance queries)
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_time ON audit_logs(entity_type, entity_id, timestamp);

-- Note: Some indexes are already created in previous migrations:
-- - idx_invoices_created_at_date (migration 004)
-- - idx_products_name_search (migration 004) 
-- - idx_users_last_login (migration 002)
-- - idx_system_config_key (migration 002)
