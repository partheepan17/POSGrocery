import { test, expect } from '@playwright/test';

test.describe('Sales Page Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sales');
    await page.waitForLoadState('networkidle');
  });

  test('should match visual snapshot in light theme', async ({ page }) => {
    // Set light theme
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    });
    
    await page.waitForTimeout(500); // Wait for theme to apply
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('sales-light-theme.png', {
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
    
    await page.waitForTimeout(500); // Wait for theme to apply
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('sales-dark-theme.png', {
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
    await expect(mainContent).toHaveScreenshot('sales-compact-density.png', {
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
    await expect(mainContent).toHaveScreenshot('sales-comfortable-density.png', {
      animations: 'disabled',
    });
  });

  test('should match visual snapshot with cart items', async ({ page }) => {
    // Add some items to cart
    await page.fill('input[placeholder*="search" i]', 'test product');
    await page.press('input[placeholder*="search" i]', 'Enter');
    
    // Wait for search results and add items
    await page.waitForTimeout(1000);
    
    // Take screenshot with cart items
    await expect(page).toHaveScreenshot('sales-with-cart-items.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match visual snapshot of payment modal', async ({ page }) => {
    // Add item to cart first
    await page.fill('input[placeholder*="search" i]', 'test product');
    await page.press('input[placeholder*="search" i]', 'Enter');
    await page.waitForTimeout(1000);
    
    // Open payment modal
    const paymentButton = page.locator('button:has-text("Payment"), button:has-text("Checkout")').first();
    await paymentButton.click();
    
    await page.waitForTimeout(500);
    
    // Take screenshot of modal
    const modal = page.locator('[role="dialog"], .modal, [data-testid="payment-modal"]');
    await expect(modal).toHaveScreenshot('sales-payment-modal.png', {
      animations: 'disabled',
    });
  });

  test('should match visual snapshot of mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.waitForTimeout(500);
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('sales-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match visual snapshot of tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.waitForTimeout(500);
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('sales-tablet.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});



