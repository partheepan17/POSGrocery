-- Migration: 034_perf_indexes.sql
-- Performance indexes for critical report queries

-- Stock movements composite index for product_id + created_at
-- This is critical for stock ledger queries and product movement history
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_created_at ON stock_movements(product_id, created_at);

-- Invoices (sales) created_at index for date-based reporting
-- This is critical for sales reports and date range queries
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);

-- Invoice lines (sales_lines) product_id index for product-based reporting
-- This is critical for product sales analysis and COGS calculations
CREATE INDEX IF NOT EXISTS idx_invoice_lines_product_id ON invoice_lines(product_id);

-- Products barcode index for barcode lookups (if not already exists)
-- This is critical for POS barcode scanning performance
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;

-- Products name index for product search (if not already exists)
-- This is critical for product search and autocomplete
CREATE INDEX IF NOT EXISTS idx_products_name_en ON products(name_en);

-- Additional composite indexes for common query patterns

-- Stock movements with movement type for filtering
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_type_created ON stock_movements(product_id, movement_type, created_at);

-- Invoice lines with invoice and product for sales analysis
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_product_created ON invoice_lines(invoice_id, product_id, created_at);

-- Invoices with cashier and date for cashier performance reports
CREATE INDEX IF NOT EXISTS idx_invoices_cashier_created_at ON invoices(cashier_id, created_at);

-- Invoices with customer and date for customer analysis
CREATE INDEX IF NOT EXISTS idx_invoices_customer_created_at ON invoices(customer_id, created_at);

-- Products with category and active status for product listings
CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category_id, is_active);

-- Products with scale item flag for scale item reports
CREATE INDEX IF NOT EXISTS idx_products_scale_active ON products(is_scale_item, is_active);

-- Stock movements with reference for transaction tracing
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference_created ON stock_movements(reference_type, reference_id, created_at);

-- Invoice lines with quantity for quantity-based analysis
CREATE INDEX IF NOT EXISTS idx_invoice_lines_product_qty ON invoice_lines(product_id, qty);

-- Invoices with price tier for pricing analysis
CREATE INDEX IF NOT EXISTS idx_invoices_price_tier_created ON invoices(price_tier, created_at);

-- Products with cost for cost analysis
CREATE INDEX IF NOT EXISTS idx_products_cost ON products(cost) WHERE cost IS NOT NULL;

-- Products with retail price for pricing reports
CREATE INDEX IF NOT EXISTS idx_products_price_retail ON products(price_retail);

-- Stock movements with lot_id for FIFO tracking
CREATE INDEX IF NOT EXISTS idx_stock_movements_lot_created ON stock_movements(lot_id, created_at) WHERE lot_id IS NOT NULL;

-- Invoice lines with unit price for pricing analysis
CREATE INDEX IF NOT EXISTS idx_invoice_lines_unit_price ON invoice_lines(unit_price);

-- Invoice lines with total for revenue analysis
CREATE INDEX IF NOT EXISTS idx_invoice_lines_total ON invoice_lines(total);

-- Invoices with net amount for revenue reporting
CREATE INDEX IF NOT EXISTS idx_invoices_net ON invoices(net);

-- Invoices with gross amount for gross revenue analysis
CREATE INDEX IF NOT EXISTS idx_invoices_gross ON invoices(gross);

-- Products with updated_at for change tracking
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at);

-- Invoice lines with created_at for temporal analysis
CREATE INDEX IF NOT EXISTS idx_invoice_lines_created_at ON invoice_lines(created_at);

-- Stock movements with created_by for user activity tracking
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_by ON stock_movements(created_by);

-- Invoices with terminal for multi-terminal analysis
CREATE INDEX IF NOT EXISTS idx_invoices_terminal_created ON invoices(terminal_id, created_at) WHERE terminal_id IS NOT NULL;

-- Products with supplier for supplier analysis
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(preferred_supplier_id) WHERE preferred_supplier_id IS NOT NULL;

-- Composite index for product search (name + sku + barcode)
CREATE INDEX IF NOT EXISTS idx_products_search_composite ON products(name_en, sku, barcode);

-- Composite index for sales analysis (product + date + quantity)
CREATE INDEX IF NOT EXISTS idx_invoice_lines_product_date_qty ON invoice_lines(product_id, created_at, qty);

-- Composite index for stock analysis (product + type + date)
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_type_date ON stock_movements(product_id, movement_type, created_at);

-- Composite index for revenue analysis (date + net + gross)
CREATE INDEX IF NOT EXISTS idx_invoices_date_revenue ON invoices(created_at, net, gross);

-- Partial indexes for active records only
CREATE INDEX IF NOT EXISTS idx_products_active_barcode ON products(barcode) WHERE is_active = 1 AND barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_active_name ON products(name_en) WHERE is_active = 1;
CREATE INDEX IF NOT EXISTS idx_products_active_sku ON products(sku) WHERE is_active = 1;

-- Partial indexes for non-zero values
CREATE INDEX IF NOT EXISTS idx_invoice_lines_non_zero_qty ON invoice_lines(product_id, qty) WHERE qty != 0;
CREATE INDEX IF NOT EXISTS idx_stock_movements_non_zero_qty ON stock_movements(product_id, quantity) WHERE quantity != 0;

-- Indexes for foreign key lookups
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_fk ON invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_product_fk ON invoice_lines(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_fk ON stock_movements(product_id);

-- Indexes for unique constraints and lookups
CREATE INDEX IF NOT EXISTS idx_products_sku_unique ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode_unique ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_receipt_no_unique ON invoices(receipt_no);










