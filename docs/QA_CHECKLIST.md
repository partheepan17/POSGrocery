# QA Checklist - Grocery POS v1

## Test Environment Setup
- **Scope:** Grocery/FMCG Point of Sale System v1
- **Environment:** http://localhost:8100 (Chrome latest recommended)
- **Test Data:** Seeded using `npm run qa:prep`
- **Reset Command:** `npm run qa:reset` (clears all data and reseeds)

## Pre-Test Setup
- [ ] Run `npm run qa:reset` to ensure clean test environment
- [ ] Verify application loads without console errors
- [ ] Confirm test data is properly seeded (check counts in console output)

## Sign-off Table
| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| QA Lead | | | |
| Developer | | | |

---

## A. Sales (POS) Module

### A1. Basic Item Scanning
- [ ] **Scan same item 3 times**
  - Expected: Quantity increments to 3, price multiplied correctly
  - Actual: _______________

- [ ] **Scale item entry**
  - Action: Enter sticker barcode for scale item (e.g., BANANA1)
  - Expected: Quantity/weight parsed into kg with proper decimal places (kgDecimals setting)
  - Actual: _______________

### A2. Price Tier Management
- [ ] **Manual tier switch**
  - Action: Select "Wholesale" from price tier dropdown
  - Expected: Next scanned items use wholesale pricing
  - Actual: _______________

- [ ] **Customer-based tier auto-switch**
  - Action: Select a Wholesale customer from dropdown
  - Expected: Price tier automatically switches to Wholesale
  - Actual: _______________

### A3. Discount Application
- [ ] **Discount cap testing**
  - Action: Add SUGAR1 4.0kg with rule "3kg → Rs.10/kg"
  - Expected: Total discount Rs.30 and "cap reached" indicator shown
  - Actual: _______________

### A4. Payment Processing
- [ ] **Split payment (Cash + Card)**
  - Action: Process payment using both cash and card
  - Expected: Payment totals correct, receipt shows split amounts
  - Actual: _______________

### A5. Receipt Generation
- [ ] **Receipt language switching**
  - Action: Set receipt language to Sinhala, finalize sale
  - Expected: Receipt preview shows Sinhala item names
  - Actual: _______________

- [ ] **Reprint functionality**
  - Action: Press Ctrl+P after sale completion
  - Expected: Receipt shows "REPRINT" watermark
  - Actual: _______________

---

## B. Products Module

### B1. Product Creation
- [ ] **Add Product modal validation**
  - Action: Try to save product with missing required fields
  - Expected: Validation errors shown, save blocked
  - Actual: _______________

- [ ] **Scale item constraints**
  - Action: Set is_scale_item=true on new product
  - Expected: Unit automatically locks to 'kg'
  - Actual: _______________

### B2. Product Editing
- [ ] **Inline edit persistence**
  - Action: Edit product price inline, save
  - Expected: Changes persist after page refresh
  - Actual: _______________

- [ ] **Negative price validation**
  - Action: Try to enter negative price
  - Expected: Validation error, save blocked
  - Actual: _______________

### B3. CSV Operations
- [ ] **CSV round-trip**
  - Action: Export products → edit two prices → import
  - Expected: Grid reflects price changes accurately
  - Actual: _______________

### B4. Price Policy Enforcement
- [ ] **Missing Price Policy=Block**
  - Action: Try to save/import product with missing retail price
  - Expected: Operation blocked with clear error message
  - Actual: _______________

---

## C. Pricing (Price Management) Module

### C1. Filtering
- [ ] **Filter by Missing Wholesale**
  - Action: Apply "Missing Wholesale" filter
  - Expected: List updates quickly showing only products without wholesale prices
  - Actual: _______________

### C2. Bulk Operations
- [ ] **Bulk price adjustment**
  - Action: Set Wholesale = Retail - 5% (preview → apply)
  - Expected: Preview shows calculations, apply updates all selected items
  - Actual: _______________

### C3. Rounding Rules
- [ ] **Rounding to 0.50**
  - Action: Apply 0.50 rounding to edited prices
  - Expected: All prices rounded correctly (e.g., 12.25 → 12.50)
  - Actual: _______________

---

## D. Discounts Module

### D1. Rule Creation
- [ ] **Multiple discount rules**
  - Action: Create Sugar cap rule (priority 10) and Produce 5% (priority 20)
  - Expected: POS applies both rules in priority order
  - Actual: _______________

### D2. Rule Management
- [ ] **Deactivate rule**
  - Action: Deactivate a discount rule
  - Expected: POS stops applying rule immediately
  - Actual: _______________

### D3. CSV Operations
- [ ] **CSV import/export**
  - Action: Export discounts → edit → import
  - Expected: Headers match exactly, bad rows show clear error reasons
  - Actual: _______________

---

## E. Suppliers Module

### E1. Supplier Integration
- [ ] **Supplier dropdown in Products**
  - Action: Create new supplier, check Product modal
  - Expected: New supplier appears in dropdown
  - Actual: _______________

- [ ] **Inactive supplier handling**
  - Action: Deactivate supplier, check Product modal
  - Expected: Still selectable but labeled "(inactive)"
  - Actual: _______________

### E2. CSV Operations
- [ ] **CSV import/export**
  - Action: Export suppliers → edit → import with invalid email
  - Expected: Invalid emails rejected with clear error message
  - Actual: _______________

---

## F. Customers Module

### F1. Customer Integration
- [ ] **Customer tier auto-selection**
  - Action: Create Wholesale customer, select in POS
  - Expected: POS automatically switches to Wholesale tier
  - Actual: _______________

- [ ] **Inactive customer handling**
  - Action: Deactivate customer, check POS dropdown
  - Expected: Still selectable but labeled "(inactive)"
  - Actual: _______________

### F2. CSV Operations
- [ ] **CSV validation**
  - Action: Import customers with invalid customer type
  - Expected: Type enum validated, errors shown clearly
  - Actual: _______________

---

## G. Inventory (Lite) Module

### G1. Receive Operations
- [ ] **Multi-line receive**
  - Action: Receive 3 lines (2 pc items, 1 kg item)
  - Expected: Stock increases accordingly, logs show RECEIVE entries
  - Actual: _______________

### G2. Adjust Operations
- [ ] **Stock adjustment**
  - Action: Adjust -2 pc, reason=Damage
  - Expected: Stock decreases, log entry shows ADJUST with reason
  - Actual: _______________

### G3. Waste Operations
- [ ] **Waste tracking**
  - Action: Waste kg item, reason=Expired
  - Expected: Stock decreases by entered amount, reason logged
  - Actual: _______________

### G4. Stocktake Process
- [ ] **Stocktake CSV workflow**
  - Action: Export template → set counted_qty → import → preview → apply
  - Expected: Preview shows deltas, apply creates ADJUST movements
  - Actual: _______________

### G5. Low Stock Alerts
- [ ] **Low-stock filtering**
  - Action: Toggle low-stock filter, export CSV
  - Expected: Shows only items at/below reorder level, export honors filter
  - Actual: _______________

---

## H. Reports Module

### H1. Sales Summary
- [ ] **KPI accuracy**
  - Action: Compare Sales Summary KPIs with actual invoice count for Today
  - Expected: Numbers match exactly
  - Actual: _______________

### H2. Price Tier Analysis
- [ ] **Tier reconciliation**
  - Action: Compare "By Tier" totals with Sales Summary (tier=All)
  - Expected: Totals reconcile perfectly
  - Actual: _______________

### H3. Product Reports
- [ ] **Top Products/Categories**
  - Action: Check Top Products and Categories for current date range
  - Expected: Data reflects selected range, CSV headers correct
  - Actual: _______________

### H4. Discount Audit
- [ ] **Discount usage tracking**
  - Action: Review Discount Audit report
  - Expected: Lists rules with usage stats, drill-down shows recent invoices
  - Actual: _______________

---

## I. Settings Module

### I1. Display Settings
- [ ] **Rounding mode changes**
  - Action: Change rounding mode in Settings
  - Expected: POS and Reports update display instantly
  - Actual: _______________

### I2. Hardware Settings
- [ ] **Cash drawer toggle**
  - Action: Enable drawer on cash payment
  - Expected: Next cash sale triggers drawer pulse
  - Actual: _______________

### I3. Receipt Settings
- [ ] **Multi-language receipt footer**
  - Action: Set receipt footer per language
  - Expected: Receipt preview updates accordingly
  - Actual: _______________

---

## J. Backups Module

### J1. Provider Configuration
- [ ] **Provider setup and testing**
  - Action: Configure backup provider and encryption key
  - Expected: Test connection shows ✅ success
  - Actual: _______________

### J2. Manual Backup
- [ ] **Backup creation**
  - Action: Create manual backup
  - Expected: Backup created successfully, log shows bytes and checksum
  - Actual: _______________

### J3. Backup Verification
- [ ] **Integrity check**
  - Action: Run "Verify Last" operation
  - Expected: Checksum verification passes
  - Actual: _______________

### J4. Restore Process
- [ ] **Restore with PIN**
  - Action: Restore Last (enter manager PIN)
  - Expected: Requires PIN, reverts visible setting after restore
  - Actual: _______________

### J5. Retention Management
- [ ] **Retention policy**
  - Action: Apply retention policy
  - Expected: Keeps 30 daily & 5 config backups, logs deletions
  - Actual: _______________

### J6. Logs Export
- [ ] **Backup logs CSV**
  - Action: Export backup logs to CSV
  - Expected: CSV has exact required headers
  - Actual: _______________

---

## K. Keyboard & Accessibility

### K1. Keyboard Navigation
- [ ] **Search focus shortcut**
  - Action: Press '/' on major pages
  - Expected: Search field receives focus
  - Actual: _______________

### K2. Sales Shortcuts
- [ ] **Function keys and shortcuts**
  - Action: Test F-keys and Ctrl+P in Sales
  - Expected: All shortcuts work as documented
  - Actual: _______________

### K3. Accessibility
- [ ] **Keyboard-only navigation**
  - Action: Navigate forms using only keyboard
  - Expected: All forms usable, focus states visible
  - Actual: _______________

---

## L. Multi-terminal (Lite)

### L1. Terminal Identification
- [ ] **Terminal name on receipts**
  - Action: Check receipt after sale
  - Expected: Terminal name appears on receipt
  - Actual: _______________

### L2. Offline Handling
- [ ] **Offline mode simulation**
  - Action: Toggle offline mode (if implemented)
  - Expected: Queue indicator shows, clears on reconnect
  - Actual: _______________

---

## M. Non-functional Requirements

### M1. Performance
- [ ] **Large dataset handling**
  - Action: Test with 500+ products
  - Expected: Interface remains smooth, virtualization works
  - Actual: _______________

### M2. Error Handling
- [ ] **Console errors**
  - Action: Check browser console during testing
  - Expected: No console errors or TypeScript/lint errors
  - Actual: _______________

### M3. Production Build
- [ ] **Build verification**
  - Action: Run production build and start
  - Expected: Application starts cleanly without errors
  - Actual: _______________

---

## Test Completion Summary

### Critical Issues Found
| Issue | Module | Severity | Status |
|-------|--------|----------|--------|
| | | | |

### Test Results
- **Total Test Cases:** _____ 
- **Passed:** _____
- **Failed:** _____
- **Blocked:** _____

### Final Sign-off
- [ ] All critical and high-severity issues resolved
- [ ] Performance requirements met
- [ ] Accessibility requirements met
- [ ] Documentation updated

**QA Recommendation:** ☐ PASS ☐ CONDITIONAL PASS ☐ FAIL

**Comments:**
_________________________________
_________________________________
_________________________________

**Date:** _______________
**QA Lead Signature:** _______________



