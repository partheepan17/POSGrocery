-- Add performance indexes for invoice operations
-- These indexes will improve query performance for invoice-related operations

-- Invoice lines composite index for invoice-product lookups
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_product ON invoice_lines(invoice_id, product_id);

-- Invoice payments index for invoice lookups
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON invoice_payments(invoice_id);

-- Returns index for original invoice lookups (if returns table exists)
-- Note: This will only create the index if the returns table exists
-- CREATE INDEX IF NOT EXISTS idx_returns_original ON returns(original_invoice_id);

-- Additional performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_invoices_cashier_date ON invoices(cashier_id, created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_price_tier ON invoices(price_tier);

-- Product performance indexes
CREATE INDEX IF NOT EXISTS idx_products_active_category ON products(is_active, category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(preferred_supplier_id);

-- Customer performance indexes
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(active);

-- Supplier performance indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(active);

-- User performance indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
