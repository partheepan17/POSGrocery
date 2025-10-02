import { test, expect } from '@playwright/test';

/**
 * Settings Effects E2E Test
 * Tests that settings changes take effect immediately across the application
 */

test.describe('Settings Effects', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('h1')).toContainText('Settings');
  });

  test('rounding mode changes affect POS and Reports immediately', async ({ page }) => {
    // Step 1: Change rounding mode in settings
    const languageSection = page.locator('text=/Language/i').or(page.locator('text=/Formatting/i'));
    if (await languageSection.isVisible()) {
      await languageSection.click();
    }
    
    // Find rounding mode setting
    const roundingSelect = page.locator('[data-testid="rounding-mode"]').or(page.locator('select:has(option:text-matches("round", "i"))')).first();
    if (await roundingSelect.isVisible()) {
      // Change to 0.50 rounding
      await roundingSelect.selectOption('0.50');
      
      // Save settings
      const saveButton = page.locator('button:has-text("Save")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        
        // Wait for save confirmation
        await expect(page.locator('text=/success/i').or(page.locator('text=/saved/i'))).toBeVisible({ timeout: 5000 });
      }
    }
    
    // Step 2: Go to POS and verify rounding is applied
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Sales');
    
    const skuInput = page.locator('[data-testid="sku-input"]').or(page.locator('input[placeholder*="SKU"]')).first();
    
    // Add an item that would have non-round pricing
    await skuInput.fill('RICE001');
    await skuInput.press('Enter');
    await page.waitForTimeout(1000);
    
    // Check if prices are rounded to nearest 0.50
    const priceElements = page.locator('text=/Rs\./');
    const priceCount = await priceElements.count();
    
    if (priceCount > 0) {
      for (let i = 0; i < priceCount; i++) {
        const priceText = await priceElements.nth(i).textContent();
        if (priceText) {
          const priceMatch = priceText.match(/Rs\.\s*(\d+(?:\.\d+)?)/);
          if (priceMatch) {
            const price = parseFloat(priceMatch[1]);
            const decimal = price % 1;
            // Should be rounded to 0.00 or 0.50
            expect(decimal === 0 || Math.abs(decimal - 0.5) < 0.01).toBe(true);
          }
        }
      }
    }
    
    // Step 3: Go to Reports and verify rounding is applied there too
    await page.goto('/reports');
    await expect(page.locator('h1')).toContainText('Reports');
    
    // Wait for reports to load
    await page.waitForTimeout(2000);
    
    // Check if report totals are rounded
    const reportPrices = page.locator('text=/Rs\./');
    const reportPriceCount = await reportPrices.count();
    
    if (reportPriceCount > 0) {
      const firstPrice = await reportPrices.first().textContent();
      if (firstPrice) {
        const priceMatch = firstPrice.match(/Rs\.\s*(\d+(?:\.\d+)?)/);
        if (priceMatch) {
          const price = parseFloat(priceMatch[1]);
          const decimal = price % 1;
          // Should be rounded to 0.00 or 0.50
          expect(decimal === 0 || Math.abs(decimal - 0.5) < 0.01).toBe(true);
        }
      }
    }
  });

  test('cash drawer setting affects POS behavior', async ({ page }) => {
    // Step 1: Enable cash drawer in settings
    const devicesSection = page.locator('text=/Devices/i').or(page.locator('text=/Hardware/i'));
    if (await devicesSection.isVisible()) {
      await devicesSection.click();
    }
    
    const drawerToggle = page.locator('[data-testid="cash-drawer-toggle"]').or(page.locator('input[type="checkbox"]')).first();
    if (await drawerToggle.isVisible()) {
      // Enable drawer
      if (!await drawerToggle.isChecked()) {
        await drawerToggle.click();
      }
      
      // Save settings
      const saveButton = page.locator('button:has-text("Save")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await expect(page.locator('text=/success/i')).toBeVisible({ timeout: 5000 });
      }
    }
    
    // Step 2: Go to POS and make a cash sale
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Sales');
    
    const skuInput = page.locator('[data-testid="sku-input"]').or(page.locator('input[placeholder*="SKU"]')).first();
    await skuInput.fill('BREAD1');
    await skuInput.press('Enter');
    await page.waitForTimeout(1000);
    
    // Process cash payment
    const cashInput = page.locator('[data-testid="cash-amount"]').or(page.locator('input[placeholder*="cash" i]')).first();
    if (await cashInput.isVisible()) {
      await cashInput.fill('100');
    }
    
    // Finalize sale
    const finalizeButton = page.locator('[data-testid="finalize-sale"]').or(page.locator('button:has-text("Finalize")').or(page.locator('button:has-text("Complete")'))).first();
    await finalizeButton.click();
    
    // Step 3: Verify drawer pulse indicator or message
    const drawerIndicator = page.locator('[data-testid="drawer-pulse"]').or(page.locator('text=/drawer/i').or(page.locator('text=/cash.*open/i'))).first();
    await expect(drawerIndicator).toBeVisible({ timeout: 5000 });
  });

  test('default receipt language affects receipt preview', async ({ page }) => {
    // Step 1: Change default receipt language to Sinhala
    const languageSection = page.locator('text=/Language/i').or(page.locator('text=/Formatting/i'));
    if (await languageSection.isVisible()) {
      await languageSection.click();
    }
    
    const receiptLangSelect = page.locator('[data-testid="receipt-language"]').or(page.locator('select:has(option:text-matches("sinhala", "i"))')).first();
    if (await receiptLangSelect.isVisible()) {
      await receiptLangSelect.selectOption('si');
      
      // Save settings
      const saveButton = page.locator('button:has-text("Save")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await expect(page.locator('text=/success/i')).toBeVisible({ timeout: 5000 });
      }
    }
    
    // Step 2: Go to POS and make a sale
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Sales');
    
    const skuInput = page.locator('[data-testid="sku-input"]').or(page.locator('input[placeholder*="SKU"]')).first();
    await skuInput.fill('RICE001');
    await skuInput.press('Enter');
    await page.waitForTimeout(1000);
    
    // Finalize sale
    const finalizeButton = page.locator('[data-testid="finalize-sale"]').or(page.locator('button:has-text("Finalize")').or(page.locator('button:has-text("Complete")'))).first();
    await finalizeButton.click();
    
    // Step 3: Verify receipt preview shows Sinhala text
    const receiptPreview = page.locator('[data-testid="receipt-preview"]').or(page.locator('text=/Receipt/i')).first();
    await expect(receiptPreview).toBeVisible({ timeout: 10000 });
    
    // Look for Sinhala characters in the receipt
    const sinhalaText = page.locator('text=/[අ-ෆ]/').first(); // Sinhala Unicode range
    await expect(sinhalaText).toBeVisible({ timeout: 5000 });
    
    // Step 4: Change back to English and verify
    await page.goto('/settings');
    if (await languageSection.isVisible()) {
      await languageSection.click();
    }
    
    if (await receiptLangSelect.isVisible()) {
      await receiptLangSelect.selectOption('en');
      
      const saveButton = page.locator('button:has-text("Save")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await expect(page.locator('text=/success/i')).toBeVisible({ timeout: 5000 });
      }
    }
    
    // Make another sale and verify English receipt
    await page.goto('/');
    await skuInput.fill('RICE001');
    await skuInput.press('Enter');
    await page.waitForTimeout(1000);
    
    await finalizeButton.click();
    await expect(receiptPreview).toBeVisible({ timeout: 10000 });
    
    // Should show English text
    await expect(page.locator('text=/Basmati Rice/i')).toBeVisible();
  });

  test('receipt footer settings appear in receipt preview', async ({ page }) => {
    // Step 1: Set custom receipt footer
    const receiptSection = page.locator('text=/Receipt/i').or(page.locator('text=/Options/i'));
    if (await receiptSection.isVisible()) {
      await receiptSection.click();
    }
    
    const footerInput = page.locator('[data-testid="receipt-footer"]').or(page.locator('textarea')).first();
    if (await footerInput.isVisible()) {
      const customFooter = 'Thank you for shopping with us!\nVisit us again soon!';
      await footerInput.fill(customFooter);
      
      // Save settings
      const saveButton = page.locator('button:has-text("Save")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await expect(page.locator('text=/success/i')).toBeVisible({ timeout: 5000 });
      }
    }
    
    // Step 2: Go to POS and make a sale
    await page.goto('/');
    const skuInput = page.locator('[data-testid="sku-input"]').or(page.locator('input[placeholder*="SKU"]')).first();
    await skuInput.fill('BREAD1');
    await skuInput.press('Enter');
    await page.waitForTimeout(1000);
    
    // Finalize sale
    const finalizeButton = page.locator('[data-testid="finalize-sale"]').or(page.locator('button:has-text("Finalize")').or(page.locator('button:has-text("Complete")'))).first();
    await finalizeButton.click();
    
    // Step 3: Verify custom footer appears in receipt
    const receiptPreview = page.locator('[data-testid="receipt-preview"]').or(page.locator('text=/Receipt/i')).first();
    await expect(receiptPreview).toBeVisible({ timeout: 10000 });
    
    await expect(page.locator('text=/Thank you for shopping with us/i')).toBeVisible();
    await expect(page.locator('text=/Visit us again soon/i')).toBeVisible();
  });

  test('kg decimals setting affects scale item display', async ({ page }) => {
    // Step 1: Change kg decimals setting
    const languageSection = page.locator('text=/Language/i').or(page.locator('text=/Formatting/i'));
    if (await languageSection.isVisible()) {
      await languageSection.click();
    }
    
    const kgDecimalsInput = page.locator('[data-testid="kg-decimals"]').or(page.locator('input[type="number"]')).first();
    if (await kgDecimalsInput.isVisible()) {
      await kgDecimalsInput.fill('2'); // Change to 2 decimal places
      
      // Save settings
      const saveButton = page.locator('button:has-text("Save")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await expect(page.locator('text=/success/i')).toBeVisible({ timeout: 5000 });
      }
    }
    
    // Step 2: Go to POS and add scale item
    await page.goto('/');
    const skuInput = page.locator('[data-testid="sku-input"]').or(page.locator('input[placeholder*="SKU"]')).first();
    await skuInput.fill('BANANA1');
    await skuInput.press('Enter');
    await page.waitForTimeout(500);
    
    // Enter weight
    const weightInput = page.locator('[data-testid="weight-input"]').or(page.locator('input[type="number"]')).first();
    if (await weightInput.isVisible()) {
      await weightInput.fill('1.567'); // More than 2 decimals
      await weightInput.press('Enter');
      await page.waitForTimeout(500);
    }
    
    // Step 3: Verify weight is displayed with 2 decimal places
    const weightDisplay = page.locator('text=/1\.57/').or(page.locator('text=/kg/'));
    await expect(weightDisplay).toBeVisible();
    
    // Should not show 3 decimal places
    const threeDecimalDisplay = page.locator('text=/1\.567/');
    await expect(threeDecimalDisplay).not.toBeVisible();
  });

  test('store info appears on receipts', async ({ page }) => {
    // Step 1: Update store information
    const storeSection = page.locator('text=/Store/i').or(page.locator('text=/Info/i'));
    if (await storeSection.isVisible()) {
      await storeSection.click();
    }
    
    const storeNameInput = page.locator('[data-testid="store-name"]').or(page.locator('input[placeholder*="name" i]')).first();
    if (await storeNameInput.isVisible()) {
      await storeNameInput.fill('QA Test Store');
      
      const addressInput = page.locator('[data-testid="store-address"]').or(page.locator('textarea')).first();
      if (await addressInput.isVisible()) {
        await addressInput.fill('123 Test Street\nTest City, Test Province');
      }
      
      // Save settings
      const saveButton = page.locator('button:has-text("Save")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await expect(page.locator('text=/success/i')).toBeVisible({ timeout: 5000 });
      }
    }
    
    // Step 2: Go to POS and make a sale
    await page.goto('/');
    const skuInput = page.locator('[data-testid="sku-input"]').or(page.locator('input[placeholder*="SKU"]')).first();
    await skuInput.fill('MILK1');
    await skuInput.press('Enter');
    await page.waitForTimeout(1000);
    
    // Finalize sale
    const finalizeButton = page.locator('[data-testid="finalize-sale"]').or(page.locator('button:has-text("Finalize")').or(page.locator('button:has-text("Complete")'))).first();
    await finalizeButton.click();
    
    // Step 3: Verify store info appears in receipt
    const receiptPreview = page.locator('[data-testid="receipt-preview"]').or(page.locator('text=/Receipt/i')).first();
    await expect(receiptPreview).toBeVisible({ timeout: 10000 });
    
    await expect(page.locator('text=/QA Test Store/i')).toBeVisible();
    await expect(page.locator('text=/123 Test Street/i')).toBeVisible();
    await expect(page.locator('text=/Test City/i')).toBeVisible();
  });

  test('terminal name appears on receipts', async ({ page }) => {
    // Step 1: Set terminal name
    const devicesSection = page.locator('text=/Devices/i').or(page.locator('text=/Terminal/i'));
    if (await devicesSection.isVisible()) {
      await devicesSection.click();
    }
    
    const terminalNameInput = page.locator('[data-testid="terminal-name"]').or(page.locator('input[placeholder*="terminal" i]')).first();
    if (await terminalNameInput.isVisible()) {
      await terminalNameInput.fill('QA-Terminal-01');
      
      // Save settings
      const saveButton = page.locator('button:has-text("Save")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await expect(page.locator('text=/success/i')).toBeVisible({ timeout: 5000 });
      }
    }
    
    // Step 2: Make a sale and check receipt
    await page.goto('/');
    const skuInput = page.locator('[data-testid="sku-input"]').or(page.locator('input[placeholder*="SKU"]')).first();
    await skuInput.fill('CHEESE1');
    await skuInput.press('Enter');
    await page.waitForTimeout(1000);
    
    const finalizeButton = page.locator('[data-testid="finalize-sale"]').or(page.locator('button:has-text("Finalize")')).first();
    await finalizeButton.click();
    
    // Step 3: Verify terminal name on receipt
    const receiptPreview = page.locator('[data-testid="receipt-preview"]').or(page.locator('text=/Receipt/i')).first();
    await expect(receiptPreview).toBeVisible({ timeout: 10000 });
    
    await expect(page.locator('text=/QA-Terminal-01/i')).toBeVisible();
  });
});



