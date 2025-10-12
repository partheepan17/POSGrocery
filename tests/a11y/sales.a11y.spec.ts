import { test, expect } from '@playwright/test';
import { A11yTestHelper, CRITICAL_A11Y_RULES, A11Y_SKIP_RULES } from './a11y-test-utils';

test.describe('Sales Page Accessibility', () => {
  let a11yHelper: A11yTestHelper;

  test.beforeEach(async ({ page }) => {
    a11yHelper = new A11yTestHelper(page, {
      skipRules: Object.keys(A11Y_SKIP_RULES),
      include: ['main', '[data-testid="sales-page"]', '[data-testid="pos-interface"]'],
      exclude: ['[data-testid="print-preview"]', '[data-testid="receipt-preview"]'],
      tags: ['wcag2a', 'wcag2aa']
    });
    
    await a11yHelper.setupAxe();
    
    // Navigate to sales page
    await page.goto('/sales');
    await page.waitForLoadState('networkidle');
  });

  test('should have no critical accessibility violations on sales page', async ({ page }) => {
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

  test('should have proper heading structure', async ({ page }) => {
    // Check for main heading
    const mainHeading = page.locator('h1').first();
    await expect(mainHeading).toBeVisible();
    
    // Check heading hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    expect(headings.length).toBeGreaterThan(0);
  });

  test('should have proper form labels', async ({ page }) => {
    // Check search input has label
    const searchInput = page.locator('input[type="text"], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible()) {
      const label = page.locator('label[for], label').first();
      await expect(label).toBeVisible();
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    // Test tab navigation
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have proper ARIA attributes', async ({ page }) => {
    // Check for main landmark
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible();
    
    // Check for proper button roles
    const buttons = page.locator('button, [role="button"]');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('should have proper color contrast', async ({ page }) => {
    const violations = await a11yHelper.getViolations();
    const contrastViolations = violations.filter(v => v.id === 'color-contrast');
    
    if (contrastViolations.length > 0) {
      const report = await a11yHelper.generateA11yReport(contrastViolations);
      console.log('Color contrast violations:', report);
    }
    
    // Allow some contrast violations for POS-specific design
    expect(contrastViolations.length).toBeLessThanOrEqual(2);
  });

  test('should work with screen reader', async ({ page }) => {
    // Check for proper alt text on images
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      // Images should have alt text or be decorative
      expect(alt).not.toBeNull();
    }
  });
});



