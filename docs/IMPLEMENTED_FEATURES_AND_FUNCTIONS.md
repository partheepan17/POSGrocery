### Virtual POS — Implemented Features and Functions

This document summarizes the current implementation of the Virtual POS system across the frontend, backend, and database layers, including how to run the project locally.

---

## Overview

- Frontend: React 18 (Vite) + TypeScript + Tailwind + Zustand state
- Backend: Node.js (Express) + TypeScript
- Database: SQLite (better-sqlite3)
- Tooling: ESLint/Prettier, Vitest, Playwright, concurrently, cross-env

---

## How to Run

- Start both backend and frontend together from the project root:
  - `npm run dev:all`
  - Frontend served at `http://localhost:5173` (or the next free port)
  - Backend API at `http://localhost:8250`

Common scripts (root `package.json`):
- `dev:server`: starts backend in `server/`
- `dev:client`: starts frontend with `VITE_API_BASE_URL=http://localhost:8250`
- `dev:all`: runs both concurrently
- `type-check`: strict TS type check (frontend)

---

## Backend

Express server (port 8250 by default). Middleware: helmet, cors, compression, morgan, JSON body parser.

### Health
- `GET /health` — Basic heartbeat
- `GET /api/health` — JSON health payload (env, mock DB/printer info)

### Catalog
- Categories
  - `GET /api/categories` — list
  - `POST /api/categories` — create
- Suppliers
  - `GET /api/suppliers?active=true|false` — list with active filter
- Products
  - `GET /api/products` — list all
  - `GET /api/products/search?q=&limit=` — search (name/sku/barcode)
  - `POST /api/products` — create
- Discount Rules
  - `GET /api/discount-rules?active=true|false` — list with active filter

### Sales / Invoices
- `GET /api/invoices` — recent invoices (for reprinting)
- `GET /api/invoices?date=YYYY-MM-DD` — by date

### Returns
- `POST /api/returns` — create return
- `GET /api/returns` — list recent returns

### Shifts
- `GET /api/shifts` — list shifts
- `POST /api/shifts/open` — open shift
- `POST /api/shifts/close` — close shift

### Printing
- `POST /api/print` — accepts payload, returns queued job id

---

## Database

SQLite file under `server/data/pos.db`. Managed via better-sqlite3 with pragmas enabled for WAL, FK, etc.

Tables currently initialized:
- `categories (id, name)`
- `suppliers (id, supplier_name, contact_phone, contact_email, address, tax_id, active, created_at)`
- `products (id, sku, name_en, unit, category_id, price_retail, price_wholesale, price_credit, price_other, barcode, is_active, created_at)`
- `discount_rules (id, name, applies_to, target_id, type, value, priority, active_from, active_to, active)`
- `invoices (id, receipt_no, created_at, grand_total, payment_type, customer_id)`
- `returns (id, receipt_no_return, original_invoice_id, created_at, total_refund, reason, operator_id)`
- `return_items (id, return_id, item_id, qty, refund_amount, restock_flag, reason)`
- `shifts (id, operator_id, opened_at, closed_at, starting_cash, ending_cash)`

---

## Frontend

React 18 + Vite + TypeScript, Tailwind CSS for styling, Zustand for state management, React Router for navigation.

### State & Utilities
- Cart Store
  - Items with line discounts, manual discount, tax, net/gross totals
  - Tiered pricing support (Retail/Wholesale/Credit/Other)
  - Discount engine integration to recompute automatic discounts
- DataService
  - Aligned to backend endpoints for products, categories, suppliers, discount rules, invoices
  - Added Returns (`getReturns`, `createReturn`), Shifts (`getShifts`, `openShift`, `closeShift`), Print (`print`)
- Keyboard shortcuts (navigation, actions)
- i18n files present and structured for future expansion

### Screens/Routes
- Operations
  - Sales: `/`, `/sales`
  - Returns: `/returns`
  - Shifts: `/shifts`, `/shifts/new`, `/shifts/:id`
- Catalog
  - Products: `/products`
  - Pricing: `/pricing`
  - Suppliers: `/suppliers`
  - Customers: `/customers`
  - Discounts: `/discounts`
- Inventory
  - Stocktake: `/stocktake`, `/stocktake/session/:id`
  - GRN List/New/Receive: `/grn`, `/grn/new`, `/grn/:id`
  - Labels: `/labels`
- Reports/Administration
  - Reports: `/reports`
  - Settings: `/settings`
  - Users: `/users`
  - Health Check: `/health`
  - About: `/about`
- Tools & Misc
  - Receipt Test: `/tools/receipt-test`
  - Navigation Test: `/tools/navigation-test`
  - Simple Test: `/tools/simple-test`
  - Search: `/search`
  - NotFound: `/404` (component present)

### Printing
- Print Preview and Reprint modals
- Server print endpoint wired (`/api/print`)

---

## Quality & Testing

- TypeScript strict mode: frontend now passes `npm run type-check`
- Unit tests: Vitest setup; discount engine and hold service tests updated to current types
- E2E scaffolding: Playwright configuration present
- Linting: ESLint + Prettier configured

---

## Deployment Notes

- Backend port: 8250 (configure with `PORT` environment variable if needed)
- Frontend API base: use `VITE_API_BASE_URL` (dev scripts set to `http://localhost:8250`)
- Concurrency: use `npm run dev:all` to run both services simultaneously

---

## Roadmap (Suggested)

- Replace stubbed/missing customer CRUD with real endpoints
- Expand invoice creation to full server-side transaction and printing payload
- Harden returns (validation against invoice lines, stock effects)
- Add authentication & permissions backed by DB
- Add migrations + seed flows for production
## Implemented Features and Functions

This document summarizes the end-to-end work completed to fix UI/UX and functionality issues, unify data across the app, and enable efficient POS operations with barcode scanning and a real backend.

### Scope
- Fix TypeScript/JS runtime issues blocking development and usage
- Bring up both servers (frontend Vite, backend Node/Express with SQLite)
- Replace local in-browser database usage with real backend API across the app
- Implement robust product/search flows and HID barcode scanner behavior
- Improve POS UI/UX (reduce panels, clearer navigation, cart behavior)
- Add and wire discount rules (list, create) to backend
- Harden endpoints and add graceful fallbacks

---

## Backend (Node.js/Express + SQLite)

### Runtime and Health
- Simple, production-like server introduced as `server/simple-server.js` for rapid iteration while the TS backend stabilizes
- Health and root documentation routes
  - `GET /health` – quick health ping
  - `GET /api/` – human-readable index of available endpoints

### Database and Migrations
- Uses `better-sqlite3` against the existing SQLite DB
- Migration compatibility improvements:
  - Customers table updated to include `customer_type` with safe defaults
  - Defensive SQL for schema differences (e.g., `categories.name` vs `categories.name_en`)

### Product & Catalog Endpoints
- `GET /api/products/search?q=milk&limit=10` – fast product search with JOIN to categories; returns POS-ready fields including `price_retail`
- `GET /api/products/:id` – fetch single product
- `GET /api/categories` – column-aware implementation; selects `name_en AS name` when available, otherwise falls back to legacy `name`
- `GET /api/suppliers` – supplier list for UI pickers

### Discount Rules
- `GET /api/discount-rules?active=true|false` – list rules with optional active filter
- `GET /api/discount-rules/:id` – fetch rule by id
- `POST /api/discount-rules` – create a new discount rule
  - Accepts: `name, description, type, value, applies_to, target_id, priority, max_qty_or_weight, active_from, active_to, is_active`
  - Stores timestamps and returns the created rule
  - Validates input and responds with clear error messages

### Customers, Invoices, Returns, Auth, Print
- Read endpoints wired to real tables where available
- Return flows supported: invoice lookup, return processing, and receipt printing endpoints

### Error Handling & CORS
- Centralized error handling with explicit error messages for SQL problems
- CORS enabled for Vite host

---

## Frontend (React + Vite + Tailwind + Zustand)

### Environment
- `VITE_API_BASE_URL` recognized via `src/vite-env.d.ts`
- Utility `src/utils/api.ts` provides `getApiBaseUrl()` with sensible default `http://localhost:8100`

### Data Service Unification
File: `src/services/dataService.ts`
- Removed dependency on the in-browser/local DB; all reads go through the backend API
- Implemented endpoints:
  - Products: search, by barcode, by id
  - Categories/Suppliers: lists for pickers
  - Discount rules: list, get by id
  - Create discount rule: POST to backend (conflict detection deferred to backend to unblock UI)

### POS UI and Layout
- Removed one of the two side panels for a cleaner workspace
- Prominent header navigation; footer shows version/environment
- `src/components/CartSummary.tsx` widened to utilize freed space

### Product vs Sales Search Clarification
- POS product search clearly labeled as “Product Search” (add to cart)
- Returns area labeled and hinted as “Sales Search & Return Lookup”

### HID Barcode Scanner Behavior
Files: `src/utils/scannerBuffer.ts`, `src/components/pos/SearchScan.tsx`
- Global keyboard capture with debounced buffer for keyboard-wedge scanners
- Weighted EAN parsing (fractional quantities supported)
- Auto-add to cart on successful scan; re-scan increments quantity
- Keeps focus in search; plays feedback sound hooks (ready to wire UI sound assets)
- Unit tests added at `src/test/scannerBuffer.test.ts`

### Cart and Pricing
File: `src/store/cartStore.ts`
- `addItem` supports fractional quantities; rounding logic appropriate for weight items
- Totals calculation consistent across manual and automatic discounts
- Planned: table layout for cart with columns: product, qty (3 dp), manual discount, automatic discount, total; row flash and beep on add

### Returns Workflow
Files: `src/components/ReturnFunction.tsx`, `src/components/returns/*`, `src/pages/returns/index.tsx`
- Uses backend base URL for all calls
- Fetches invoice details, return summaries
- PIN verification and submit flows against backend

### Discounts UI
Files: `src/pages/Discounts.tsx`, `src/components/Discounts/DiscountModal.tsx`
- Create Discount Rule wired to backend POST endpoint
- Target selector designed for async search; sorting by typed letters recommended pattern:
  - Search via `dataService.searchProducts(term)`
  - Sort client-side with precedence: startsWith(term) > contains(term), case-insensitive

---

## Key Fixes and Improvements

### Build/Runtime
- Addressed Vite HMR and TS warnings by removing local DB usage and consolidating service methods
- Bypassed initial TS compile issues on backend by using the simple JS server while preserving TS backend for future re-enable

### Data Consistency
- Frontend now reads from the same SQLite-backed API as the admin/management pages
- Resolved “Failed to load products” and product mismatch issues

### Error Resilience
- Null-safe price access to fix `toLocaleString` errors
- Category endpoint dynamically adapts to schema differences
- Clear errors for discount rule creation when inputs are invalid

---

## Configuration & Running

### Backend
- Start: `node server/simple-server.js`
- Default port: `8100`
- Health: `GET http://localhost:8100/health`
- API index: `GET http://localhost:8100/api/`

### Frontend
- Start: `npm run dev`
- Vite chooses an open port; typical: `8103` or `8104`
- Configure API base: `.env` with `VITE_API_BASE_URL=http://localhost:8100`

---

## Known Pending Items (Next Up)
- Flash the newly added cart row and play a beep on successful scan
- Convert cart to table layout: product, qty (3 dp), manual discount, automatic discount, total
- Backend-side discount conflict detection and richer validation
- Target selector: finalize async search + sorting behavior in `DiscountModal`

---

## Reference Files Touched
- Backend: `server/simple-server.js`, `server/database/migrations/005_create_customers_table.sql`
- Frontend services: `src/services/dataService.ts`, `src/utils/api.ts`
- POS/Search/Scanner: `src/components/pos/SearchScan.tsx`, `src/utils/scannerBuffer.ts`, `src/test/scannerBuffer.test.ts`
- Layout/UX: `src/pages/pos/index.tsx`, `src/pages/returns/index.tsx`, `src/components/CartSummary.tsx`
- Returns: `src/components/returns/*`, `src/components/ReturnFunction.tsx`

This document will be kept up to date as the remaining pending items are implemented.

---

## New Additions (Split Payments, Overrides, Pricing, Returns, Cart, Reports)

### Split Payments
- Data model: `invoice_payments` table with `invoice_id`, `method`, `amount`, timestamps
- API: `POST /api/invoices` accepts `payments[]` and validates sum equals grand total; persists rows
- Reports: `GET /api/reports/z?date=YYYY-MM-DD` aggregates totals by method
- UI: Payment modal supports multiple rows (method, amount, reference), live remaining balance
- Printing: Receipt lists each payment method and amount

### Manager Override (PIN + Reason)
- Endpoint: `POST /api/auth/manager-pin` verifies manager/admin PIN (dev fallback 1234)
- Audit: `POST /api/audit`, table `audit_logs` created; logs DISCOUNT_OVERRIDE with cashier_id, manager_id, reason
- UI: `DiscountModal` enforces cap example (10%); exceeding opens `ManagerPinDialog` and logs on approval

### Tiered Pricing by Quantity/Weight
- Data model: `price_tiers` table (`product_id`, `uom`, `min_qty`, `unit_price`)
- Endpoint: `POST /api/pricing/compute` returns `{ unit_price, reason }` using tier rules and customer-type fallbacks
- Frontend: `pricingService.compute()`; cart recomputes unit price on qty change and updates line totals

### Returns via Receipt Barcode
- Lookup: `GET /api/returns/lookup?receipt=...` returns invoice + lines for quick prefill
- Create: `POST /api/returns` creates a negative return invoice linked to original; inserts negative qty lines
- UI: `ReturnLookup` uses lookup endpoint; builds eligible return lines

### POS Scanner Feedback
- Beep played on successful add-to-cart; suggestion row flashes briefly
- Focus remains in search; scanner buffer unchanged

### Cart → Table Layout
- Deterministic columns: Product | Qty (3dp) | Manual Disc | Auto Disc | Line Total
- Debounced qty input with validation; totals recompute smoothly; line discounts editable for Retail tier only

### Discount Rules: Server-side Conflict Validation
- `POST /api/discount-rules` checks overlapping active rules on same scope; returns 409 with `{conflicts, message}`

### Scale UI Stub
- Component: `src/components/pos/ScalePanel.tsx`
- Controls: Tare / Lock / Use Weight; calculates net and rounds to 3dp

### Receipt Lists Payment Methods
- Thermal 80mm adapter renders each payment method line from `paymentsList` or falls back to cash/card/wallet

### Z-Report UI
- Page: `src/pages/reports/ZReport.tsx`; displays totals by payment method and net for selected date

### Tests & Dev UX
- Added `src/test/pricingEngine.test.ts` (stub) and existing scanner buffer tests retained
- Backend startup warns if SQLite file missing; `/health` continues to report status



