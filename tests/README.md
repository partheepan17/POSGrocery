# Testing Guide - Grocery POS v1

This directory contains comprehensive test suites for the Grocery POS application, including automated tests, manual testing procedures, and QA tools.

## 📁 Directory Structure

```
tests/
├── e2e/                    # End-to-end tests (Playwright)
│   ├── pos.happy.spec.ts   # Core POS workflow tests
│   ├── discounts.cap.spec.ts # Discount rules and caps
│   ├── csv.products.roundtrip.spec.ts # CSV import/export
│   ├── settings.effects.spec.ts # Settings integration
│   └── backups.flow.spec.ts # Backup workflows
├── smoke/                  # Smoke tests (Vitest)
│   └── dataService.smoke.test.ts # Basic CRUD operations
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Install Playwright browsers:**
   ```bash
   npm run e2e:install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   *(Keep this running in a separate terminal)*

### Running Tests

#### Full QA Suite
```bash
# Complete QA workflow: reset data + smoke tests + e2e tests
npm run qa:full
```

#### Individual Test Types

**Smoke Tests (Fast unit/integration tests):**
```bash
npm run qa:smoke
```

**E2E Tests (Browser automation):**
```bash
npm run qa:e2e
```

**E2E Tests with UI (Interactive debugging):**
```bash
npm run qa:ui
```

#### Data Management

**Prepare test data:**
```bash
npm run qa:prep
```

**Reset database with fresh test data:**
```bash
npm run qa:reset
```

**Prepare for manual testing:**
```bash
npm run qa:manual
```

## 🧪 Test Types

### 1. Smoke Tests (`tests/smoke/`)

**Purpose:** Fast, lightweight tests that verify basic functionality without external dependencies.

**Technology:** Vitest

**Coverage:**
- Basic CRUD operations for all entities
- Data validation and constraints
- CSV export data structure validation
- Performance and consistency checks

**Run Time:** ~30 seconds

**Example:**
```bash
npm run qa:smoke
```

### 2. End-to-End Tests (`tests/e2e/`)

**Purpose:** Full browser automation testing critical user workflows.

**Technology:** Playwright (Chromium)

**Coverage:**

#### `pos.happy.spec.ts`
- Complete POS transaction flow
- Item scanning and quantity management
- Price tier switching
- Customer selection and auto-tier switching
- Split payment processing
- Receipt generation and preview
- Keyboard shortcuts

#### `discounts.cap.spec.ts`
- Sugar cap discount (3kg → Rs.10/kg, max Rs.30)
- Produce category discount (5%, max Rs.100)
- Multiple discount rules in priority order
- Inactive rule handling
- Discount cap enforcement
- Buy 2 get 1 free promotions

#### `csv.products.roundtrip.spec.ts`
- CSV export with correct headers
- CSV import with validation
- Data modification and re-import
- Error handling for invalid data
- Missing price policy enforcement

#### `settings.effects.spec.ts`
- Rounding mode changes affect POS/Reports
- Cash drawer settings
- Receipt language switching
- Receipt footer customization
- kg decimals for scale items
- Store info on receipts

#### `backups.flow.spec.ts`
- Provider configuration and testing
- Manual backup creation
- Backup verification
- Restore with manager PIN
- Schedule configuration
- Retention policy management
- Logs export

**Run Time:** ~5-10 minutes

**Example:**
```bash
npm run qa:e2e

# Run specific test file
npx playwright test tests/e2e/pos.happy.spec.ts

# Run with browser UI visible
npm run qa:ui
```

## 📋 Manual Testing

### QA Checklist

Use the comprehensive manual testing checklist:

```bash
# Prepare environment for manual testing
npm run qa:manual

# Then open and follow:
docs/QA_CHECKLIST.md
```

The checklist covers:
- **Sales/POS:** Item scanning, tiers, payments, receipts
- **Products:** CRUD, CSV, validation, pricing policies
- **Pricing:** Bulk operations, rounding, filtering
- **Discounts:** Rules, caps, priorities, CSV operations
- **Suppliers/Customers:** CRUD, integration, CSV operations
- **Inventory:** Receive, adjust, waste, stocktake, low-stock
- **Reports:** KPIs, exports, filtering, accuracy
- **Settings:** Effects across modules, hardware integration
- **Backups:** Full workflow, encryption, restoration
- **Keyboard/Accessibility:** Shortcuts, navigation
- **Performance:** Large datasets, responsiveness

### Bug Reporting

Use the standardized bug report template:

```
docs/BUG_TEMPLATE.md
```

## 🔧 Test Configuration

### Playwright Configuration

**File:** `playwright.config.ts`

**Key Settings:**
- **Base URL:** `http://localhost:8100`
- **Headless:** `true` (set to `false` for debugging)
- **Timeout:** 60 seconds per test
- **Retries:** 2 on CI, 0 locally
- **Screenshots:** On failure only
- **Videos:** Retained on failure

**Browser Support:**
- **Primary:** Chromium (Desktop Chrome)
- **Optional:** Firefox, WebKit (commented out for speed)

### Vitest Configuration

**File:** `vitest.config.ts`

**Key Settings:**
- **Environment:** jsdom
- **Coverage:** V8 provider
- **Globals:** Enabled for test utilities

## 🗂️ Test Data Management

### Seed Data (`scripts/qa.seed.ts`)

**Provides:**
- **7 Categories:** Grocery, Produce, Bakery, Dairy, Beverages, Snacks, Frozen
- **5 Suppliers:** Including one inactive for testing
- **6 Customers:** Mixed types (Retail/Wholesale/Credit/Other) with one inactive
- **10 Products:** Mix of pc/kg items, including low-stock and inactive items
- **5 Discount Rules:** Sugar cap, Produce 5%, Bulk grocery, Bread BOGO, one inactive
- **Inventory Movements:** Initial stock, adjustments, waste records
- **7 Days of Sales:** Various tiers, customers, payment methods

**Scale Items for Testing:**
- `BANANA1` - Bananas (kg)
- `APPLE1` - Red Apples (kg)  
- `POTATO1` - Potatoes (kg)

**Special Test Items:**
- `LOWSTOCK1` - Below reorder level
- `SUGAR1` - Triggers cap discount at 3kg+
- `BREAD1` - Buy 2 get 1 free promotion

### Reset Functionality (`scripts/qa.reset.ts`)

**Features:**
- Complete database cleanup
- Auto-increment counter reset
- Fresh seed data application
- Verification of reset state
- Backup creation (optional)

**Usage:**
```bash
# Basic reset
npm run qa:reset

# With backup and verification
tsx scripts/qa.reset.ts --backup --verify

# Reset specific tables only
tsx scripts/qa.reset.ts --tables products,categories
```

## 🚨 Troubleshooting

### Common Issues

#### Tests Failing Due to Data State
```bash
# Reset to clean state
npm run qa:reset
```

#### Playwright Browser Issues
```bash
# Reinstall browsers
npx playwright install
```

#### Port Conflicts
```bash
# Check if dev server is running on port 8100
lsof -i :8100

# Start dev server if not running
npm run dev
```

#### Timeout Issues
- Increase timeout in `playwright.config.ts`
- Check if application is responsive
- Verify test selectors are correct

#### Test Data Dependencies
- Some e2e tests depend on specific seed data
- Always run `npm run qa:prep` before manual testing
- Use `npm run qa:reset` for clean automated test runs

### Debugging E2E Tests

#### Run with UI for Visual Debugging
```bash
npm run qa:ui
```

#### Run Specific Test
```bash
npx playwright test tests/e2e/pos.happy.spec.ts --debug
```

#### Generate Test Code
```bash
npx playwright codegen http://localhost:8100
```

#### View Test Reports
```bash
npx playwright show-report
```

### Performance Optimization

#### Skip Cross-Browser Testing
- Only Chromium is enabled by default
- Uncomment other browsers in `playwright.config.ts` if needed

#### Parallel Execution
- Tests run in parallel by default
- Use `--workers=1` for sequential execution if needed

#### Test Isolation
- Each test starts with fresh page context
- Database state may persist between tests
- Use `npm run qa:reset` for complete isolation

## 📊 Test Coverage

### Automated Test Coverage

**Smoke Tests:**
- ✅ Core CRUD operations
- ✅ Data validation
- ✅ Basic performance checks
- ✅ CSV data structure validation

**E2E Tests:**
- ✅ Complete POS workflows
- ✅ Discount rule application
- ✅ CSV round-trip operations
- ✅ Settings effects across modules
- ✅ Backup/restore workflows

### Manual Test Coverage

**Comprehensive QA Checklist covers:**
- ✅ All user-facing functionality
- ✅ Edge cases and error handling
- ✅ Cross-module integration
- ✅ Performance with large datasets
- ✅ Keyboard accessibility
- ✅ Multi-terminal scenarios

## 🎯 Best Practices

### Writing Tests

1. **Use data-testid attributes** for reliable selectors
2. **Start with broad selectors** and narrow down as needed
3. **Wait for elements** instead of using fixed timeouts
4. **Clean up test data** when possible
5. **Make tests independent** of execution order

### Test Maintenance

1. **Update selectors** when UI changes
2. **Maintain test data consistency** with application changes
3. **Review and update timeouts** as application performance changes
4. **Keep test documentation current**

### CI/CD Integration

**Recommended Pipeline:**
```yaml
1. Install dependencies
2. Run linting and type checking
3. Start application server
4. Run smoke tests
5. Run e2e tests
6. Generate test reports
7. Clean up test data
```

## 📈 Metrics and Reporting

### Test Execution Metrics

**Smoke Tests:** ~30 seconds
**E2E Tests:** ~5-10 minutes
**Manual QA Checklist:** ~2-4 hours (comprehensive)

### Coverage Reports

**Automated Coverage:**
- Smoke tests: Core business logic
- E2E tests: Critical user paths
- Combined: ~80% of user-facing functionality

**Manual Coverage:**
- Edge cases and error scenarios
- Integration between modules  
- Performance and accessibility
- Real-world usage patterns

## 🔄 Continuous Improvement

### Regular Maintenance Tasks

1. **Weekly:** Review and update test data
2. **Monthly:** Audit test coverage and add missing scenarios
3. **Per Release:** Update QA checklist with new features
4. **As Needed:** Optimize test performance and reliability

### Feedback Integration

- **Bug Reports:** Use standardized template in `docs/BUG_TEMPLATE.md`
- **Test Failures:** Investigate and improve test reliability
- **Performance Issues:** Add monitoring and alerting
- **User Feedback:** Incorporate into test scenarios

---

## 📞 Support

For questions about testing:

1. **Check this README** for common solutions
2. **Review test code** for implementation examples
3. **Use QA checklist** for manual testing guidance
4. **Follow bug template** for consistent reporting

**Happy Testing! 🎉**








