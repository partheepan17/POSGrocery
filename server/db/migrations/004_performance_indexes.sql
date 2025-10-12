-- Performance optimization indexes for high-load scenarios
-- Target: ≥500 invoices/day, ≥1,000 products, multiple concurrent tills

-- Critical product lookup indexes (P95 ≤ 50ms for barcode lookup)
CREATE INDEX IF NOT EXISTS idx_products_barcode_lookup ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_sku_lookup ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_name_prefix ON products(name_en);

-- Invoice performance indexes (P95 ≤ 100ms for invoice creation)
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id ON invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_product_id ON invoice_lines(product_id);
-- CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);

-- Returns performance (only if returns table exists)
-- CREATE INDEX IF NOT EXISTS idx_returns_original_invoice_id ON returns(original_invoice_id);

-- Cash movements and shifts (Z Report P95 ≤ 500ms) - only if tables exist
-- CREATE INDEX IF NOT EXISTS idx_cash_movements_shift_at ON cash_movements(shift_id, created_at);
-- CREATE INDEX IF NOT EXISTS idx_shifts_opened_at ON shifts(opened_at);

-- Product search optimization (P95 ≤ 200ms for prefix search)
CREATE INDEX IF NOT EXISTS idx_products_search_en ON products(name_en);
CREATE INDEX IF NOT EXISTS idx_products_search_si ON products(name_si);
CREATE INDEX IF NOT EXISTS idx_products_search_ta ON products(name_ta);

-- Audit log performance (only if audit_logs table exists)
-- CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
-- CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON audit_logs(request_id);
-- CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id, actor_type);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_products_active_search ON products(is_active, name_en) WHERE is_active = 1;
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_product_qty ON invoice_lines(product_id, qty);

-- FTS5 virtual table for advanced product search (contains queries)
CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
  name_en, name_si, name_ta, sku, barcode,
  content='products',
  content_rowid='id'
);

-- Populate FTS table
INSERT OR IGNORE INTO products_fts(products_fts) VALUES('rebuild');
