import { test, expect } from '@playwright/test';

/**
 * POS Happy Path E2E Test
 * Tests the core POS workflow: scan items, apply tiers, select customers, process payments
 */

test.describe('POS Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to POS page
    await page.goto('/');
    
    // Wait for the page to load
    await expect(page.locator('h1')).toContainText('Sales');
  });

  test('complete POS transaction flow', async ({ page }) => {
    // Step 1: Scan/Add item multiple times
    const skuInput = page.locator('[data-testid="sku-input"]').or(page.locator('input[placeholder*="SKU"]')).first();
    
    // Add RICE001 three times
    await skuInput.fill('RICE001');
    await skuInput.press('Enter');
    await page.waitForTimeout(500);
    
    await skuInput.fill('RICE001');
    await skuInput.press('Enter');
    await page.waitForTimeout(500);
    
    await skuInput.fill('RICE001');
    await skuInput.press('Enter');
    await page.waitForTimeout(500);

    // Verify quantity increments to 3
    const qtyCell = page.locator('[data-testid="sale-line-qty"]').or(page.locator('td:has-text("3")')).first();
    await expect(qtyCell).toBeVisible();
    
    // Step 2: Switch price tier to Wholesale
    const tierSelect = page.locator('[data-testid="price-tier-select"]').or(page.locator('select')).first();
    await tierSelect.selectOption('Wholesale');
    
    // Verify tier changed
    await expect(tierSelect).toHaveValue('Wholesale');
    
    // Step 3: Add scale item (banana)
    await skuInput.fill('BANANA1');
    await skuInput.press('Enter');
    await page.waitForTimeout(500);
    
    // For scale items, we might need to enter weight
    const weightInput = page.locator('[data-testid="weight-input"]').or(page.locator('input[type="number"]')).first();
    if (await weightInput.isVisible()) {
      await weightInput.fill('2.5');
      await weightInput.press('Enter');
    }
    
    // Step 4: Select wholesale customer (should auto-switch tier)
    const customerSelect = page.locator('[data-testid="customer-select"]').or(page.locator('select:has(option:text-matches("Customer", "i"))')).first();
    if (await customerSelect.isVisible()) {
      await customerSelect.selectOption({ label: /ABC Restaurant/i });
      
      // Verify tier auto-switched back to Wholesale
      await expect(tierSelect).toHaveValue('Wholesale');
    }
    
    // Step 5: Verify totals are calculated
    const subtotalElement = page.locator('[data-testid="subtotal"]').or(page.locator('text=/Subtotal.*Rs\./i')).first();
    await expect(subtotalElement).toBeVisible();
    
    const totalElement = page.locator('[data-testid="total"]').or(page.locator('text=/Total.*Rs\./i')).first();
    await expect(totalElement).toBeVisible();
    
    // Step 6: Process split payment (cash + card)
    const cashInput = page.locator('[data-testid="cash-amount"]').or(page.locator('input[placeholder*="cash" i]')).first();
    if (await cashInput.isVisible()) {
      await cashInput.fill('2000');
    }
    
    const cardInput = page.locator('[data-testid="card-amount"]').or(page.locator('input[placeholder*="card" i]')).first();
    if (await cardInput.isVisible()) {
      await cardInput.fill('1000');
    }
    
    // Step 7: Finalize sale
    const finalizeButton = page.locator('[data-testid="finalize-sale"]').or(page.locator('button:has-text("Finalize")').or(page.locator('button:has-text("Complete")'))).first();
    await finalizeButton.click();
    
    // Step 8: Verify receipt preview opens
    const receiptPreview = page.locator('[data-testid="receipt-preview"]').or(page.locator('text=/Receipt/i')).first();
    await expect(receiptPreview).toBeVisible({ timeout: 10000 });
    
    // Verify receipt contains expected items
    await expect(page.locator('text=/RICE001/i')).toBeVisible();
    await expect(page.locator('text=/BANANA1/i')).toBeVisible();
    
    // Verify payment split is shown
    await expect(page.locator('text=/Cash.*Rs\./i')).toBeVisible();
    await expect(page.locator('text=/Card.*Rs\./i')).toBeVisible();
    
    // Step 9: Close receipt and verify new sale started
    const closeButton = page.locator('[data-testid="close-receipt"]').or(page.locator('button:has-text("Close")').or(page.locator('button:has-text("OK")'))).first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
    
    // Verify we're back to empty sale
    const saleLines = page.locator('[data-testid="sale-lines"]').or(page.locator('tbody tr')).count();
    await expect(saleLines).toBe(0);
  });

  test('keyboard shortcuts work correctly', async ({ page }) => {
    // Test search focus shortcut
    await page.keyboard.press('/');
    const skuInput = page.locator('[data-testid="sku-input"]').or(page.locator('input[placeholder*="SKU"]')).first();
    await expect(skuInput).toBeFocused();
    
    // Add an item first
    await skuInput.fill('BREAD1');
    await skuInput.press('Enter');
    await page.waitForTimeout(1000);
    
    // Test reprint shortcut (Ctrl+P)
    await page.keyboard.press('Control+p');
    
    // Should open print preview or show reprint dialog
    const printDialog = page.locator('[data-testid="print-dialog"]').or(page.locator('text=/Print/i').or(page.locator('text=/Receipt/i'))).first();
    await expect(printDialog).toBeVisible({ timeout: 5000 });
  });

  test('price tier switching affects pricing', async ({ page }) => {
    const skuInput = page.locator('[data-testid="sku-input"]').or(page.locator('input[placeholder*="SKU"]')).first();
    const tierSelect = page.locator('[data-testid="price-tier-select"]').or(page.locator('select')).first();
    
    // Add item at retail price
    await tierSelect.selectOption('Retail');
    await skuInput.fill('RICE001');
    await skuInput.press('Enter');
    await page.waitForTimeout(500);
    
    // Get retail price
    const retailPriceElement = page.locator('[data-testid="line-total"]').or(page.locator('td:text-matches("Rs\\.")')).first();
    const retailPriceText = await retailPriceElement.textContent();
    
    // Clear sale
    const clearButton = page.locator('[data-testid="clear-sale"]').or(page.locator('button:has-text("Clear")').or(page.locator('button:has-text("New")'))).first();
    if (await clearButton.isVisible()) {
      await clearButton.click();
    }
    
    // Add same item at wholesale price
    await tierSelect.selectOption('Wholesale');
    await skuInput.fill('RICE001');
    await skuInput.press('Enter');
    await page.waitForTimeout(500);
    
    // Get wholesale price
    const wholesalePriceElement = page.locator('[data-testid="line-total"]').or(page.locator('td:text-matches("Rs\\.")')).first();
    const wholesalePriceText = await wholesalePriceElement.textContent();
    
    // Verify prices are different
    expect(retailPriceText).not.toBe(wholesalePriceText);
  });

  test('scale items handle weight correctly', async ({ page }) => {
    const skuInput = page.locator('[data-testid="sku-input"]').or(page.locator('input[placeholder*="SKU"]')).first();
    
    // Add scale item
    await skuInput.fill('BANANA1');
    await skuInput.press('Enter');
    await page.waitForTimeout(500);
    
    // Check if weight input appears for scale items
    const weightInput = page.locator('[data-testid="weight-input"]').or(page.locator('input[type="number"]')).first();
    if (await weightInput.isVisible()) {
      await weightInput.fill('1.750');
      await weightInput.press('Enter');
      
      // Verify weight is displayed with proper decimals (should show as 1.750 kg)
      await expect(page.locator('text=/1\.75/i')).toBeVisible();
    }
    
    // Verify unit is 'kg' for scale items
    await expect(page.locator('text=/kg/i')).toBeVisible();
  });

  test('customer selection auto-switches price tier', async ({ page }) => {
    const customerSelect = page.locator('[data-testid="customer-select"]').or(page.locator('select:has(option:text-matches("Customer", "i"))')).first();
    const tierSelect = page.locator('[data-testid="price-tier-select"]').or(page.locator('select')).first();
    
    // Start with retail tier
    await tierSelect.selectOption('Retail');
    await expect(tierSelect).toHaveValue('Retail');
    
    // Select wholesale customer
    if (await customerSelect.isVisible()) {
      await customerSelect.selectOption({ label: /ABC Restaurant/i });
      
      // Verify tier auto-switched to wholesale
      await expect(tierSelect).toHaveValue('Wholesale');
    }
    
    // Select retail customer
    if (await customerSelect.isVisible()) {
      await customerSelect.selectOption({ label: /Walk-in Customer/i });
      
      // Tier should switch to retail or stay as manually set
      // This depends on implementation - customer type should influence default tier
    }
  });
});

test.describe('POS Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Sales');
  });

  test('handles invalid SKU gracefully', async ({ page }) => {
    const skuInput = page.locator('[data-testid="sku-input"]').or(page.locator('input[placeholder*="SKU"]')).first();
    
    // Try to add non-existent SKU
    await skuInput.fill('INVALID123');
    await skuInput.press('Enter');
    
    // Should show error message
    const errorMessage = page.locator('[data-testid="error-message"]').or(page.locator('text=/not found/i').or(page.locator('text=/invalid/i'))).first();
    await expect(errorMessage).toBeVisible({ timeout: 3000 });
  });

  test('prevents negative quantities', async ({ page }) => {
    const skuInput = page.locator('[data-testid="sku-input"]').or(page.locator('input[placeholder*="SKU"]')).first();
    
    // Add item first
    await skuInput.fill('BREAD1');
    await skuInput.press('Enter');
    await page.waitForTimeout(500);
    
    // Try to set negative quantity
    const qtyInput = page.locator('[data-testid="qty-input"]').or(page.locator('input[type="number"]')).first();
    if (await qtyInput.isVisible()) {
      await qtyInput.fill('-5');
      await qtyInput.press('Enter');
      
      // Should either reject the input or show error
      const errorMessage = page.locator('[data-testid="error-message"]').or(page.locator('text=/invalid/i')).first();
      const isErrorVisible = await errorMessage.isVisible();
      
      if (!isErrorVisible) {
        // If no error shown, quantity should not be negative
        const qtyValue = await qtyInput.inputValue();
        expect(parseFloat(qtyValue)).toBeGreaterThan(0);
      }
    }
  });
});








