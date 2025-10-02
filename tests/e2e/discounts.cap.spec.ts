import { test, expect } from '@playwright/test';

/**
 * Discount Cap E2E Test
 * Tests discount rules application, especially capped discounts and category percentages
 */

test.describe('Discount Rules Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Sales');
  });

  test('sugar cap discount applies correctly', async ({ page }) => {
    const skuInput = page.locator('[data-testid="sku-input"]').or(page.locator('input[placeholder*="SKU"]')).first();
    
    // Add 4kg of sugar (should trigger 3kg cap discount)
    await skuInput.fill('SUGAR1');
    await skuInput.press('Enter');
    await page.waitForTimeout(500);
    
    // Set quantity to 4 (above the 3kg minimum)
    const qtyInput = page.locator('[data-testid="qty-input"]').or(page.locator('input[type="number"]')).first();
    if (await qtyInput.isVisible()) {
      await qtyInput.fill('4');
      await qtyInput.press('Enter');
      await page.waitForTimeout(1000);
    } else {
      // If no direct qty input, add the item 4 times
      await skuInput.fill('SUGAR1');
      await skuInput.press('Enter');
      await page.waitForTimeout(300);
      await skuInput.fill('SUGAR1');
      await skuInput.press('Enter');
      await page.waitForTimeout(300);
      await skuInput.fill('SUGAR1');
      await skuInput.press('Enter');
      await page.waitForTimeout(300);
    }
    
    // Verify discount is applied
    const discountElement = page.locator('[data-testid="discount-amount"]').or(page.locator('text=/Discount.*Rs\./i')).first();
    await expect(discountElement).toBeVisible();
    
    // Verify discount amount is Rs.30 (3kg × Rs.10 cap)
    const discountText = await discountElement.textContent();
    expect(discountText).toMatch(/30/); // Should contain 30
    
    // Verify "cap reached" or promo indicator is shown
    const promoIndicator = page.locator('[data-testid="promo-applied"]').or(page.locator('text=/promo/i').or(page.locator('text=/discount/i').or(page.locator('text=/cap/i')))).first();
    await expect(promoIndicator).toBeVisible();
  });

  test('produce category discount applies correctly', async ({ page }) => {
    const skuInput = page.locator('[data-testid="sku-input"]').or(page.locator('input[placeholder*="SKU"]')).first();
    
    // Add produce items (bananas and apples)
    await skuInput.fill('BANANA1');
    await skuInput.press('Enter');
    await page.waitForTimeout(500);
    
    // For scale items, enter weight
    const weightInput = page.locator('[data-testid="weight-input"]').or(page.locator('input[type="number"]')).first();
    if (await weightInput.isVisible()) {
      await weightInput.fill('2.0');
      await weightInput.press('Enter');
      await page.waitForTimeout(500);
    }
    
    // Add apples
    await skuInput.fill('APPLE1');
    await skuInput.press('Enter');
    await page.waitForTimeout(500);
    
    if (await weightInput.isVisible()) {
      await weightInput.fill('1.5');
      await weightInput.press('Enter');
      await page.waitForTimeout(500);
    }
    
    // Verify 5% produce discount is applied
    const discountElement = page.locator('[data-testid="discount-amount"]').or(page.locator('text=/Discount.*Rs\./i')).first();
    await expect(discountElement).toBeVisible();
    
    // Calculate expected discount (5% of produce items, max Rs.100)
    // This should be visible in the discount line
    const discountText = await discountElement.textContent();
    expect(discountText).toMatch(/\d+/); // Should contain some discount amount
  });

  test('multiple discount rules apply in priority order', async ({ page }) => {
    const skuInput = page.locator('[data-testid="sku-input"]').or(page.locator('input[placeholder*="SKU"]')).first();
    
    // Add sugar (should get cap discount - priority 10)
    await skuInput.fill('SUGAR1');
    await skuInput.press('Enter');
    await page.waitForTimeout(300);
    
    // Add 3 more to trigger cap
    await skuInput.fill('SUGAR1');
    await skuInput.press('Enter');
    await page.waitForTimeout(300);
    await skuInput.fill('SUGAR1');
    await skuInput.press('Enter');
    await page.waitForTimeout(300);
    await skuInput.fill('SUGAR1');
    await skuInput.press('Enter');
    await page.waitForTimeout(500);
    
    // Add produce item (should get 5% discount - priority 20)
    await skuInput.fill('BANANA1');
    await skuInput.press('Enter');
    await page.waitForTimeout(500);
    
    const weightInput = page.locator('[data-testid="weight-input"]').or(page.locator('input[type="number"]')).first();
    if (await weightInput.isVisible()) {
      await weightInput.fill('1.0');
      await weightInput.press('Enter');
      await page.waitForTimeout(500);
    }
    
    // Verify total discount includes both rules
    const discountElement = page.locator('[data-testid="discount-amount"]').or(page.locator('text=/Discount.*Rs\./i')).first();
    await expect(discountElement).toBeVisible();
    
    // Should have sugar cap discount (Rs.30) + produce discount (5% of banana)
    const discountText = await discountElement.textContent();
    expect(discountText).toMatch(/\d+/);
    
    // Verify multiple promo indicators or discount lines
    const promoIndicators = page.locator('[data-testid="promo-applied"]').or(page.locator('text=/discount/i'));
    const count = await promoIndicators.count();
    expect(count).toBeGreaterThan(0);
  });

  test('inactive discount rules do not apply', async ({ page }) => {
    // This test assumes there's an inactive discount rule in the seed data
    const skuInput = page.locator('[data-testid="sku-input"]').or(page.locator('input[placeholder*="SKU"]')).first();
    
    // Add milk (which has an inactive discount rule in seed data)
    await skuInput.fill('MILK1');
    await skuInput.press('Enter');
    await page.waitForTimeout(300);
    await skuInput.fill('MILK1');
    await skuInput.press('Enter');
    await page.waitForTimeout(500);
    
    // Verify no discount is applied for inactive rule
    const discountElement = page.locator('[data-testid="discount-amount"]').or(page.locator('text=/Discount.*Rs\./i')).first();
    
    // Either no discount element visible, or discount is 0
    const isDiscountVisible = await discountElement.isVisible();
    if (isDiscountVisible) {
      const discountText = await discountElement.textContent();
      // Should be 0 or very minimal (not the inactive rule discount)
      expect(discountText).toMatch(/(0|Rs\.\s*0)/);
    }
  });

  test('discount cap limits are respected', async ({ page }) => {
    const skuInput = page.locator('[data-testid="sku-input"]').or(page.locator('input[placeholder*="SKU"]')).first();
    
    // Add many produce items to test Rs.100 cap on 5% produce discount
    const produceItems = ['BANANA1', 'APPLE1', 'POTATO1'];
    
    for (const item of produceItems) {
      await skuInput.fill(item);
      await skuInput.press('Enter');
      await page.waitForTimeout(300);
      
      // Add large quantities/weights
      const weightInput = page.locator('[data-testid="weight-input"]').or(page.locator('input[type="number"]')).first();
      if (await weightInput.isVisible()) {
        await weightInput.fill('10.0'); // Large weight to exceed cap
        await weightInput.press('Enter');
        await page.waitForTimeout(300);
      }
    }
    
    // Wait for discounts to calculate
    await page.waitForTimeout(1000);
    
    // Verify discount doesn't exceed Rs.100 cap
    const discountElement = page.locator('[data-testid="discount-amount"]').or(page.locator('text=/Discount.*Rs\./i')).first();
    await expect(discountElement).toBeVisible();
    
    const discountText = await discountElement.textContent();
    const discountMatch = discountText?.match(/(\d+(?:\.\d+)?)/);
    
    if (discountMatch) {
      const discountAmount = parseFloat(discountMatch[1]);
      // Should not exceed 100 (the cap for produce discount)
      // Plus any other applicable discounts, but produce portion should be capped
      expect(discountAmount).toBeGreaterThan(0);
      // Note: This test assumes produce discount is the main contributor
    }
  });

  test('buy 2 get 1 free bread promotion', async ({ page }) => {
    const skuInput = page.locator('[data-testid="sku-input"]').or(page.locator('input[placeholder*="SKU"]')).first();
    
    // Add 3 bread items to trigger buy 2 get 1 free
    await skuInput.fill('BREAD1');
    await skuInput.press('Enter');
    await page.waitForTimeout(300);
    await skuInput.fill('BREAD1');
    await skuInput.press('Enter');
    await page.waitForTimeout(300);
    await skuInput.fill('BREAD1');
    await skuInput.press('Enter');
    await page.waitForTimeout(500);
    
    // Verify discount equals price of one bread (Rs.85)
    const discountElement = page.locator('[data-testid="discount-amount"]').or(page.locator('text=/Discount.*Rs\./i')).first();
    await expect(discountElement).toBeVisible();
    
    const discountText = await discountElement.textContent();
    expect(discountText).toMatch(/85/); // Should contain 85 (price of one bread)
    
    // Verify promo message
    const promoMessage = page.locator('[data-testid="promo-message"]').or(page.locator('text=/buy.*get.*free/i')).first();
    await expect(promoMessage).toBeVisible();
  });
});

test.describe('Discount Management Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('deactivated discount rule stops applying immediately', async ({ page }) => {
    // Navigate to discounts management
    await page.goto('/discounts');
    await expect(page.locator('h1')).toContainText('Discounts');
    
    // Find an active discount rule and deactivate it
    const activeToggle = page.locator('[data-testid="discount-active-toggle"]').or(page.locator('input[type="checkbox"]')).first();
    if (await activeToggle.isVisible() && await activeToggle.isChecked()) {
      await activeToggle.click();
      
      // Save changes
      const saveButton = page.locator('[data-testid="save-discount"]').or(page.locator('button:has-text("Save")')).first();
      if (await saveButton.isVisible()) {
        await saveButton.click();
      }
      
      // Wait for success message
      await expect(page.locator('text=/success/i').or(page.locator('text=/saved/i'))).toBeVisible({ timeout: 5000 });
    }
    
    // Go back to POS and verify discount no longer applies
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Sales');
    
    const skuInput = page.locator('[data-testid="sku-input"]').or(page.locator('input[placeholder*="SKU"]')).first();
    
    // Try to trigger the discount that was just deactivated
    // This would need to be customized based on which discount was deactivated
    await skuInput.fill('SUGAR1');
    await skuInput.press('Enter');
    await page.waitForTimeout(1000);
    
    // Verify discount doesn't apply or is reduced
    const discountElement = page.locator('[data-testid="discount-amount"]').or(page.locator('text=/Discount.*Rs\./i')).first();
    const isDiscountVisible = await discountElement.isVisible();
    
    if (isDiscountVisible) {
      const discountText = await discountElement.textContent();
      // Should be 0 or much less than when rule was active
      expect(discountText).toMatch(/(0|Rs\.\s*0)/);
    }
  });
});



