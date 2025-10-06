import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'pos.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('synchronous = NORMAL');
sqlite.pragma('foreign_keys = ON');

export const db = {
  query<T = any>(sql: string, params: any[] = []): T[] {
    const stmt = sqlite.prepare(sql);
    return stmt.all(...params) as T[];
  },
  get<T = any>(sql: string, params: any[] = []): T | undefined {
    const stmt = sqlite.prepare(sql);
    return stmt.get(...params) as T | undefined;
  },
  run(sql: string, params: any[] = []): Database.RunResult {
    const stmt = sqlite.prepare(sql);
    return stmt.run(...params);
  }
};

// Initialize schema (minimal subset used by UI)
sqlite.exec(`
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_name TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  address TEXT,
  tax_id TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT UNIQUE NOT NULL,
  name_en TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pc',
  category_id INTEGER,
  price_retail REAL NOT NULL DEFAULT 0,
  price_wholesale REAL NOT NULL DEFAULT 0,
  price_credit REAL NOT NULL DEFAULT 0,
  price_other REAL NOT NULL DEFAULT 0,
  barcode TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS discount_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  applies_to TEXT NOT NULL CHECK (applies_to IN ('PRODUCT','CATEGORY')),
  target_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('PERCENT','AMOUNT')),
  value REAL NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  active_from TEXT,
  active_to TEXT,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_no TEXT UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  grand_total REAL NOT NULL DEFAULT 0,
  payment_type TEXT,
  customer_id INTEGER
);

-- Payments per invoice (allow negative amounts for refunds)
CREATE TABLE IF NOT EXISTS invoice_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  method TEXT NOT NULL,
  amount REAL NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(invoice_id) REFERENCES invoices(id)
);

CREATE TABLE IF NOT EXISTS returns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_no_return TEXT UNIQUE,
  original_invoice_id INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  total_refund REAL NOT NULL DEFAULT 0,
  reason TEXT,
  operator_id INTEGER,
  FOREIGN KEY(original_invoice_id) REFERENCES invoices(id)
);

-- Audit logs for sensitive actions (e.g., refund overrides)
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  actor_id INTEGER,
  meta TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS return_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  return_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  qty REAL NOT NULL,
  refund_amount REAL NOT NULL DEFAULT 0,
  restock_flag INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  FOREIGN KEY(return_id) REFERENCES returns(id)
);

CREATE TABLE IF NOT EXISTS shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operator_id INTEGER NOT NULL,
  opened_at TEXT DEFAULT CURRENT_TIMESTAMP,
  closed_at TEXT,
  starting_cash REAL NOT NULL DEFAULT 0,
  ending_cash REAL
);
 
-- Cash movements tied to a shift (sale, refund, cash_in, cash_out, safe_drop, opening_float, closing_float)
CREATE TABLE IF NOT EXISTS cash_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shift_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  note TEXT,
  at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(shift_id) REFERENCES shifts(id)
);

-- Purchasing: POs, GRNs, Supplier Returns
CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS po_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  po_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  uom TEXT NOT NULL DEFAULT 'pc',
  qty REAL NOT NULL,
  unit_cost REAL NOT NULL,
  FOREIGN KEY(po_id) REFERENCES purchase_orders(id),
  FOREIGN KEY(product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS grn_receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  po_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(po_id) REFERENCES purchase_orders(id)
);

CREATE TABLE IF NOT EXISTS grn_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grn_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  uom TEXT NOT NULL DEFAULT 'pc',
  qty_received REAL NOT NULL,
  unit_cost REAL NOT NULL,
  batch_id INTEGER,
  FOREIGN KEY(grn_id) REFERENCES grn_receipts(id),
  FOREIGN KEY(product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS supplier_returns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS supplier_return_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_return_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  uom TEXT NOT NULL DEFAULT 'pc',
  qty REAL NOT NULL,
  unit_cost REAL NOT NULL,
  reason TEXT,
  FOREIGN KEY(supplier_return_id) REFERENCES supplier_returns(id),
  FOREIGN KEY(product_id) REFERENCES products(id)
);

-- Cost history for landed cost adjustments and other cost changes
CREATE TABLE IF NOT EXISTS cost_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  old_cost REAL,
  new_cost REAL NOT NULL,
  reason TEXT,
  at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(product_id) REFERENCES products(id)
);

-- Batches & Expiry; stock movements referencing batches
CREATE TABLE IF NOT EXISTS batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  batch_code TEXT,
  expiry TEXT,
  qty_on_hand REAL NOT NULL DEFAULT 0,
  cost REAL,
  FOREIGN KEY(product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  batch_id INTEGER,
  qty REAL NOT NULL,
  reason TEXT,
  at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(product_id) REFERENCES products(id),
  FOREIGN KEY(batch_id) REFERENCES batches(id)
);

-- UOMs and per-product UOM mappings
CREATE TABLE IF NOT EXISTS uoms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product_uom (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  uom_id INTEGER NOT NULL,
  conv_to_base REAL NOT NULL, -- multiply by this to convert picked qty to base
  price_override REAL,        -- optional per-UOM unit price
  UNIQUE(product_id, uom_id),
  FOREIGN KEY(product_id) REFERENCES products(id),
  FOREIGN KEY(uom_id) REFERENCES uoms(id)
);

-- Accounts Receivable: customer ledger
CREATE TABLE IF NOT EXISTS customer_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  invoice_id INTEGER,
  payment_id INTEGER,
  amount REAL NOT NULL, -- positive=charge, negative=payment/credit
  at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Notifications: templates and reminder queue
CREATE TABLE IF NOT EXISTS message_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email','sms')),
  subject TEXT,
  body TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reminder_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  invoice_id INTEGER NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email','sms')),
  status TEXT NOT NULL DEFAULT 'queued', -- queued|sent|failed
  attempts INTEGER NOT NULL DEFAULT 0,
  scheduled_at TEXT DEFAULT CURRENT_TIMESTAMP,
  sent_at TEXT,
  last_error TEXT
);

-- Promotions: campaigns, rules and scopes
CREATE TABLE IF NOT EXISTS promotions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  active INTEGER NOT NULL DEFAULT 1,
  days_of_week TEXT, -- comma-separated 0..6
  start_at TEXT,
  end_at TEXT
);

CREATE TABLE IF NOT EXISTS promotion_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  promotion_id INTEGER NOT NULL,
  type TEXT NOT NULL, -- BUY_X_GET_Y | MIX_AND_MATCH_BUNDLE_PRICE | CHEAPEST_FREE
  params TEXT NOT NULL, -- JSON
  FOREIGN KEY(promotion_id) REFERENCES promotions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS promotion_scopes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  promotion_id INTEGER NOT NULL,
  scope_type TEXT NOT NULL, -- product | category | customer_tag
  target_id INTEGER NOT NULL,
  FOREIGN KEY(promotion_id) REFERENCES promotions(id) ON DELETE CASCADE
);

-- Users and RBAC
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  role TEXT, -- legacy direct role for PIN checks
  pin TEXT,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS user_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  UNIQUE(user_id, role_id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(role_id) REFERENCES roles(id)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER NOT NULL,
  permission TEXT NOT NULL,
  UNIQUE(role_id, permission),
  FOREIGN KEY(role_id) REFERENCES roles(id)
);

-- Multi-store: stores, terminals, per-store stock, and transfers
CREATE TABLE IF NOT EXISTS stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS terminals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  FOREIGN KEY(store_id) REFERENCES stores(id)
);

CREATE TABLE IF NOT EXISTS store_stock (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  store_id INTEGER NOT NULL,
  qty REAL NOT NULL DEFAULT 0,
  UNIQUE(product_id, store_id),
  FOREIGN KEY(product_id) REFERENCES products(id),
  FOREIGN KEY(store_id) REFERENCES stores(id)
);

CREATE TABLE IF NOT EXISTS transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_store INTEGER NOT NULL,
  to_store INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested', -- requested|in_transit|received
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(from_store) REFERENCES stores(id),
  FOREIGN KEY(to_store) REFERENCES stores(id)
);

CREATE TABLE IF NOT EXISTS transfer_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transfer_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  qty REAL NOT NULL,
  FOREIGN KEY(transfer_id) REFERENCES transfers(id) ON DELETE CASCADE,
  FOREIGN KEY(product_id) REFERENCES products(id)
);
`);


