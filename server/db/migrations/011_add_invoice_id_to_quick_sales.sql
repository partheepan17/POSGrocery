-- Migration to add invoice_id column to quick_sales_sessions table
ALTER TABLE quick_sales_sessions ADD COLUMN invoice_id INTEGER REFERENCES invoices(id);


