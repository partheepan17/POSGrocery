import { test, expect } from '@playwright/test';

test.describe('Returns Page Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/returns');
    await page.waitForLoadState('networkidle');
  });

  test('should match visual snapshot in light theme', async ({ page }) => {
    // Set light theme
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    });
    
    await page.waitForTimeout(500);
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('returns-light-theme.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match visual snapshot in dark theme', async ({ page }) => {
    // Set dark theme
    await page.evaluate(() => {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    });
    
    await page.waitForTimeout(500);
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('returns-dark-theme.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match visual snapshot with compact density', async ({ page }) => {
    // Set compact density
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-density', 'compact');
    });
    
    await page.waitForTimeout(500);
    
    // Take screenshot of main content area
    const mainContent = page.locator('main, [role="main"]');
    await expect(mainContent).toHaveScreenshot('returns-compact-density.png', {
      animations: 'disabled',
    });
  });

  test('should match visual snapshot with comfortable density', async ({ page }) => {
    // Set comfortable density
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-density', 'comfortable');
    });
    
    await page.waitForTimeout(500);
    
    // Take screenshot of main content area
    const mainContent = page.locator('main, [role="main"]');
    await expect(mainContent).toHaveScreenshot('returns-comfortable-density.png', {
      animations: 'disabled',
    });
  });

  test('should match visual snapshot with return items', async ({ page }) => {
    // Simulate looking up a sale
    await page.fill('input[placeholder*="receipt" i]', 'TEST-001');
    await page.press('input[placeholder*="receipt" i]', 'Enter');
    
    // Wait for sale lookup
    await page.waitForTimeout(1000);
    
    // Take screenshot with return items
    await expect(page).toHaveScreenshot('returns-with-items.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match visual snapshot of manager PIN dialog', async ({ page }) => {
    // Simulate high-value return requiring manager PIN
    await page.fill('input[placeholder*="receipt" i]', 'TEST-001');
    await page.press('input[placeholder*="receipt" i]', 'Enter');
    await page.waitForTimeout(1000);
    
    // Simulate high-value return
    await page.evaluate(() => {
      // This would trigger the manager PIN dialog
      const event = new CustomEvent('highValueReturn', { detail: { amount: 10000 } });
      window.dispatchEvent(event);
    });
    
    await page.waitForTimeout(500);
    
    // Take screenshot of manager PIN dialog
    const dialog = page.locator('[role="dialog"]:has-text("Manager PIN"), .modal:has-text("Manager PIN")');
    await expect(dialog).toHaveScreenshot('returns-manager-pin-dialog.png', {
      animations: 'disabled',
    });
  });

  test('should match visual snapshot of mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.waitForTimeout(500);
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('returns-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match visual snapshot of tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.waitForTimeout(500);
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('returns-tablet.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});



