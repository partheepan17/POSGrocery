-- Migration: Create sales table
CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    datetime TIMESTAMP DEFAULT now(),
    cashier_id INTEGER REFERENCES users(id),
    customer_id INTEGER REFERENCES customers(id),
    price_tier VARCHAR(20) CHECK (price_tier IN ('Retail', 'Wholesale', 'Credit', 'Other')) DEFAULT 'Retail',
    gross DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    net DECIMAL(10,2) NOT NULL,
    pay_cash DECIMAL(10,2) DEFAULT 0,
    pay_card DECIMAL(10,2) DEFAULT 0,
    pay_wallet DECIMAL(10,2) DEFAULT 0,
    language VARCHAR(2) CHECK (language IN ('EN', 'SI', 'TA')) DEFAULT 'EN',
    terminal_name VARCHAR(255)
);

-- Create indexes as specified
CREATE INDEX IF NOT EXISTS idx_sales_datetime ON sales(datetime);
CREATE INDEX IF NOT EXISTS idx_sales_price_tier ON sales(price_tier);
CREATE INDEX IF NOT EXISTS idx_sales_cashier_id ON sales(cashier_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_terminal_name ON sales(terminal_name);




