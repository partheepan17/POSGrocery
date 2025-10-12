import { test, expect } from '@playwright/test';
import { A11yTestHelper, CRITICAL_A11Y_RULES, A11Y_SKIP_RULES } from './a11y-test-utils';

test.describe('Drawer Operations Accessibility', () => {
  let a11yHelper: A11yTestHelper;

  test.beforeEach(async ({ page }) => {
    a11yHelper = new A11yTestHelper(page, {
      skipRules: Object.keys(A11Y_SKIP_RULES),
      include: ['main', '[data-testid="drawer-ops"]'],
      exclude: ['[data-testid="print-preview"]', '[data-testid="receipt-preview"]'],
      tags: ['wcag2a', 'wcag2aa']
    });
    
    await a11yHelper.setupAxe();
    
    // Navigate to drawer operations page
    await page.goto('/cash/drawer');
    await page.waitForLoadState('networkidle');
  });

  test('should have no critical accessibility violations on drawer ops page', async ({ page }) => {
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

  test('should have proper form structure for cash operations', async ({ page }) => {
    // Check for amount input fields
    const amountInputs = page.locator('input[type="number"], input[inputmode="numeric"]');
    const inputCount = await amountInputs.count();
    
    if (inputCount > 0) {
      // Check for proper labels
      const labels = page.locator('label');
      await expect(labels).toHaveCount({ min: 1 });
    }
  });

  test('should have accessible action buttons', async ({ page }) => {
    const actionButtons = page.locator('button, [role="button"]');
    const buttonCount = await actionButtons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = actionButtons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      
      // Action buttons should have clear labels
      expect(text?.trim() || ariaLabel).toBeTruthy();
    }
  });

  test('should support keyboard shortcuts for cash operations', async ({ page }) => {
    // Test that important actions are keyboard accessible
    const importantButtons = page.locator('button[data-shortcut], button[title*="F"]');
    const count = await importantButtons.count();
    
    if (count > 0) {
      // Test that buttons are focusable
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    }
  });

  test('should have proper confirmation dialogs', async ({ page }) => {
    // Look for modal or dialog elements
    const modals = page.locator('[role="dialog"], [aria-modal="true"]');
    const modalCount = await modals.count();
    
    if (modalCount > 0) {
      // Check for proper modal structure
      const modal = modals.first();
      const title = modal.locator('[role="heading"], h1, h2, h3, h4, h5, h6');
      await expect(title).toHaveCount({ min: 1 });
    }
  });

  test('should have proper status indicators', async ({ page }) => {
    // Check for status indicators with proper ARIA attributes
    const statusElements = page.locator('[role="status"], [aria-live], .status, .indicator');
    const statusCount = await statusElements.count();
    
    if (statusCount > 0) {
      // Status elements should be properly labeled
      for (let i = 0; i < statusCount; i++) {
        const element = statusElements.nth(i);
        const text = await element.textContent();
        const ariaLabel = await element.getAttribute('aria-label');
        
        expect(text?.trim() || ariaLabel).toBeTruthy();
      }
    }
  });
});



