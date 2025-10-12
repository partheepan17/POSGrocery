import { test, expect } from '@playwright/test';

test.describe('Drawer Operations Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cash/drawer');
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
    await expect(page).toHaveScreenshot('drawer-ops-light-theme.png', {
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
    await expect(page).toHaveScreenshot('drawer-ops-dark-theme.png', {
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
    await expect(mainContent).toHaveScreenshot('drawer-ops-compact-density.png', {
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
    await expect(mainContent).toHaveScreenshot('drawer-ops-comfortable-density.png', {
      animations: 'disabled',
    });
  });

  test('should match visual snapshot of cash count dialog', async ({ page }) => {
    // Open cash count dialog
    const cashCountButton = page.locator('button:has-text("Cash Count"), button:has-text("Count Cash")').first();
    await cashCountButton.click();
    
    await page.waitForTimeout(500);
    
    // Take screenshot of cash count dialog
    const dialog = page.locator('[role="dialog"], .modal');
    await expect(dialog).toHaveScreenshot('drawer-ops-cash-count-dialog.png', {
      animations: 'disabled',
    });
  });

  test('should match visual snapshot of cash drop dialog', async ({ page }) => {
    // Open cash drop dialog
    const cashDropButton = page.locator('button:has-text("Cash Drop"), button:has-text("Drop Cash")').first();
    await cashDropButton.click();
    
    await page.waitForTimeout(500);
    
    // Take screenshot of cash drop dialog
    const dialog = page.locator('[role="dialog"], .modal');
    await expect(dialog).toHaveScreenshot('drawer-ops-cash-drop-dialog.png', {
      animations: 'disabled',
    });
  });

  test('should match visual snapshot of mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.waitForTimeout(500);
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('drawer-ops-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match visual snapshot of tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.waitForTimeout(500);
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('drawer-ops-tablet.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});



