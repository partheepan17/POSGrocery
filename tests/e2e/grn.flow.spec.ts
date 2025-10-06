import { test, expect } from '@playwright/test';

test.describe('GRN Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the GRN page
    await page.goto('/grn');
  });

  test('should create and post a GRN with items', async ({ page }) => {
    // Click New GRN button
    await page.click('button:has-text("New GRN")');
    
    // Wait for GRN form to load
    await expect(page.locator('h1:has-text("New GRN")')).toBeVisible();
    
    // Select supplier (assuming there's at least one supplier)
    await page.click('[data-testid="supplier-select"]');
    await page.click('[data-testid="supplier-option"]:first-child');
    
    // Add a note
    await page.fill('textarea[placeholder*="Optional notes"]', 'Test GRN for e2e testing');
    
    // Search for a product
    await page.fill('input[placeholder*="Search by SKU"]', 'TEST');
    
    // Wait for search results and select first product
    await page.waitForSelector('[data-testid="product-search-result"]');
    await page.click('[data-testid="product-search-result"]:first-child');
    
    // Click add product button
    await page.click('button:has-text("Add")');
    
    // Verify product was added to lines
    await expect(page.locator('[data-testid="grn-line"]')).toHaveCount(1);
    
    // Update quantity
    await page.fill('[data-testid="qty-input"]', '5');
    
    // Update unit cost
    await page.fill('[data-testid="unit-cost-input"]', '25.50');
    
    // Add MRP
    await page.fill('[data-testid="mrp-input"]', '50.00');
    
    // Add batch number
    await page.fill('[data-testid="batch-input"]', 'BATCH-E2E-001');
    
    // Add expiry date
    await page.fill('[data-testid="expiry-input"]', '2025-12-31');
    
    // Verify totals are calculated
    await expect(page.locator('[data-testid="subtotal"]')).toContainText('127.50');
    await expect(page.locator('[data-testid="total"]')).toContainText('127.50');
    
    // Save draft
    await page.click('button:has-text("Save Draft")');
    
    // Verify success message
    await expect(page.locator('text=GRN saved successfully')).toBeVisible();
    
    // Post the GRN
    await page.click('button:has-text("Post GRN")');
    
    // Verify confirmation dialog
    await expect(page.locator('text=Are you sure you want to post this GRN?')).toBeVisible();
    await page.click('button:has-text("Confirm")');
    
    // Verify GRN was posted
    await expect(page.locator('text=GRN posted successfully')).toBeVisible();
    await expect(page.locator('[data-testid="status-badge"]')).toContainText('Posted');
    
    // Verify that edit fields are disabled
    await expect(page.locator('[data-testid="qty-input"]')).toBeDisabled();
    await expect(page.locator('[data-testid="unit-cost-input"]')).toBeDisabled();
  });

  test('should validate required fields', async ({ page }) => {
    // Click New GRN button
    await page.click('button:has-text("New GRN")');
    
    // Try to save without selecting supplier
    await page.click('button:has-text("Save Draft")');
    
    // Verify validation error
    await expect(page.locator('text=Please select a supplier')).toBeVisible();
    
    // Select supplier
    await page.click('[data-testid="supplier-select"]');
    await page.click('[data-testid="supplier-option"]:first-child');
    
    // Try to post without items
    await page.click('button:has-text("Post GRN")');
    
    // Verify validation error
    await expect(page.locator('text=Please add at least one item')).toBeVisible();
  });

  test('should handle product search and selection', async ({ page }) => {
    // Click New GRN button
    await page.click('button:has-text("New GRN")');
    
    // Select supplier
    await page.click('[data-testid="supplier-select"]');
    await page.click('[data-testid="supplier-option"]:first-child');
    
    // Search for non-existent product
    await page.fill('input[placeholder*="Search by SKU"]', 'NONEXISTENT');
    
    // Verify no results message
    await expect(page.locator('text=No products found')).toBeVisible();
    
    // Search for existing product
    await page.fill('input[placeholder*="Search by SKU"]', 'TEST');
    
    // Wait for search results
    await page.waitForSelector('[data-testid="product-search-result"]');
    
    // Verify search results are displayed
    await expect(page.locator('[data-testid="product-search-result"]')).toHaveCount.greaterThan(0);
    
    // Select first product
    await page.click('[data-testid="product-search-result"]:first-child');
    
    // Verify product is selected
    await expect(page.locator('[data-testid="selected-product"]')).toContainText('TEST');
  });

  test('should calculate totals correctly', async ({ page }) => {
    // Click New GRN button
    await page.click('button:has-text("New GRN")');
    
    // Select supplier
    await page.click('[data-testid="supplier-select"]');
    await page.click('[data-testid="supplier-option"]:first-child');
    
    // Add first product
    await page.fill('input[placeholder*="Search by SKU"]', 'TEST1');
    await page.waitForSelector('[data-testid="product-search-result"]');
    await page.click('[data-testid="product-search-result"]:first-child');
    await page.click('button:has-text("Add")');
    
    // Set quantity and cost for first product
    await page.fill('[data-testid="qty-input"]:first-of-type', '2');
    await page.fill('[data-testid="unit-cost-input"]:first-of-type', '10.00');
    
    // Add second product
    await page.fill('input[placeholder*="Search by SKU"]', 'TEST2');
    await page.waitForSelector('[data-testid="product-search-result"]');
    await page.click('[data-testid="product-search-result"]:first-child');
    await page.click('button:has-text("Add")');
    
    // Set quantity and cost for second product
    await page.fill('[data-testid="qty-input"]:last-of-type', '3');
    await page.fill('[data-testid="unit-cost-input"]:last-of-type', '15.00');
    
    // Add tax
    await page.fill('[data-testid="tax-input"]', '5.00');
    
    // Add other charges
    await page.fill('[data-testid="other-input"]', '2.50');
    
    // Verify totals calculation
    // Subtotal: (2 * 10) + (3 * 15) = 20 + 45 = 65
    // Tax: 5.00
    // Other: 2.50
    // Total: 65 + 5 + 2.5 = 72.50
    await expect(page.locator('[data-testid="subtotal"]')).toContainText('65.00');
    await expect(page.locator('[data-testid="tax"]')).toContainText('5.00');
    await expect(page.locator('[data-testid="other"]')).toContainText('2.50');
    await expect(page.locator('[data-testid="total"]')).toContainText('72.50');
  });

  test('should handle expiry date validation', async ({ page }) => {
    // Click New GRN button
    await page.click('button:has-text("New GRN")');
    
    // Select supplier
    await page.click('[data-testid="supplier-select"]');
    await page.click('[data-testid="supplier-option"]:first-child');
    
    // Add product
    await page.fill('input[placeholder*="Search by SKU"]', 'TEST');
    await page.waitForSelector('[data-testid="product-search-result"]');
    await page.click('[data-testid="product-search-result"]:first-child');
    await page.click('button:has-text("Add")');
    
    // Set past expiry date
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 30);
    const pastDateString = pastDate.toISOString().split('T')[0];
    
    await page.fill('[data-testid="expiry-input"]', pastDateString);
    
    // Verify expiry warning
    await expect(page.locator('text=Expired')).toBeVisible();
    await expect(page.locator('[data-testid="expiry-input"]')).toHaveClass(/border-red-500/);
    
    // Set future expiry date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const futureDateString = futureDate.toISOString().split('T')[0];
    
    await page.fill('[data-testid="expiry-input"]', futureDateString);
    
    // Verify no warning
    await expect(page.locator('text=Expired')).not.toBeVisible();
    await expect(page.locator('[data-testid="expiry-input"]')).not.toHaveClass(/border-red-500/);
  });
});


