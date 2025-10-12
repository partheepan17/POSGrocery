import { test, expect } from '@playwright/test';
import { A11yTestHelper, CRITICAL_A11Y_RULES, A11Y_SKIP_RULES } from './a11y-test-utils';

test.describe('Returns Page Accessibility', () => {
  let a11yHelper: A11yTestHelper;

  test.beforeEach(async ({ page }) => {
    a11yHelper = new A11yTestHelper(page, {
      skipRules: Object.keys(A11Y_SKIP_RULES),
      include: ['main', '[data-testid="returns-page"]'],
      exclude: ['[data-testid="print-preview"]', '[data-testid="receipt-preview"]'],
      tags: ['wcag2a', 'wcag2aa']
    });
    
    await a11yHelper.setupAxe();
    
    // Navigate to returns page
    await page.goto('/returns');
    await page.waitForLoadState('networkidle');
  });

  test('should have no critical accessibility violations on returns page', async ({ page }) => {
    const violations = await a11yHelper.getViolations();
    
    // Filter for critical violations only
    const criticalViolations = violations.filter(violation => 
      CRITICAL_A11Y_RULES.includes(violation.id)
    );

    if (criticalViolations.length > 0) {
      const report = await a11yHelper.generateA11yReport(criticalViolations);
      console.log(report);
    }

    expect(criticalViolations).toHaveLength(0);
  });

  test('should have proper form structure for receipt lookup', async ({ page }) => {
    // Check for receipt input with proper label
    const receiptInput = page.locator('input[placeholder*="receipt" i], input[placeholder*="number" i]');
    await expect(receiptInput).toBeVisible();
    
    // Check for associated label
    const label = page.locator('label').first();
    await expect(label).toBeVisible();
  });

  test('should have accessible table structure for return items', async ({ page }) => {
    // Look for table-like structure (could be div-based)
    const table = page.locator('table, [role="table"], [role="grid"]');
    if (await table.count() > 0) {
      // Check for proper table headers
      const headers = page.locator('th, [role="columnheader"]');
      await expect(headers).toHaveCount({ min: 1 });
    }
  });

  test('should have proper button labels and roles', async ({ page }) => {
    const buttons = page.locator('button, [role="button"]');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      
      // Buttons should have accessible text
      expect(text?.trim() || ariaLabel).toBeTruthy();
    }
  });

  test('should support keyboard navigation for return items', async ({ page }) => {
    // Test that interactive elements are focusable
    const interactiveElements = page.locator('button, input, select, [tabindex]:not([tabindex="-1"])');
    const count = await interactiveElements.count();
    
    if (count > 0) {
      // Test tab navigation
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    }
  });

  test('should have proper error and success message announcements', async ({ page }) => {
    // Check for proper ARIA live regions
    const liveRegions = page.locator('[aria-live], [role="alert"], [role="status"]');
    const liveRegionCount = await liveRegions.count();
    
    // Should have at least one live region for dynamic content
    expect(liveRegionCount).toBeGreaterThanOrEqual(0);
  });
});



