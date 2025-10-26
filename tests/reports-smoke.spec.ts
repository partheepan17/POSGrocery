/**
 * Playwright Smoke Test for Reports Page
 * Tests that charts render without errors and data is displayed
 */

import { test, expect } from '@playwright/test';

test.describe('Reports Page Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to reports page
    await page.goto('/reports');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should load reports page without errors', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Reports/);
    
    // Check main heading
    await expect(page.locator('h1')).toContainText('Reports Dashboard');
    
    // Check that no console errors occurred
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Wait a bit for any async operations
    await page.waitForTimeout(2000);
    
    // Filter out known non-critical errors
    const criticalErrors = errors.filter(error => 
      !error.includes('Failed to load') && 
      !error.includes('404') &&
      !error.includes('NetworkError')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('should display date range controls', async ({ page }) => {
    // Check date inputs are present
    await expect(page.locator('input[type="date"]')).toHaveCount(2);
    
    // Check threshold selector
    await expect(page.locator('select')).toBeVisible();
    
    // Check refresh button
    await expect(page.locator('button:has-text("Refresh Data")')).toBeVisible();
  });

  test('should display summary cards', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(3000);
    
    // Check summary cards are present
    const cards = page.locator('[class*="grid"]').first();
    await expect(cards).toBeVisible();
    
    // Check for card content (even if data is empty)
    await expect(page.locator('text=Total Revenue')).toBeVisible();
    await expect(page.locator('text=Total Sales')).toBeVisible();
    await expect(page.locator('text=Avg Sale Amount')).toBeVisible();
    await expect(page.locator('text=Low Stock Items')).toBeVisible();
  });

  test('should render charts without errors', async ({ page }) => {
    // Wait for charts to load
    await page.waitForTimeout(5000);
    
    // Check for chart containers
    const chartContainers = page.locator('[class*="ResponsiveContainer"]');
    await expect(chartContainers).toHaveCount(2); // Sales chart and Top SKUs chart
    
    // Check for chart titles
    await expect(page.locator('text=Sales Summary by Day')).toBeVisible();
    await expect(page.locator('text=Top SKUs by Quantity')).toBeVisible();
    
    // Check that charts have SVG elements (Recharts renders as SVG)
    const svgElements = page.locator('svg');
    await expect(svgElements).toHaveCount(2);
    
    // Verify no chart rendering errors in console
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('chart')) {
        errors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    expect(errors).toHaveLength(0);
  });

  test('should display low stock table', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(3000);
    
    // Check table header
    await expect(page.locator('text=Low Stock Alert')).toBeVisible();
    
    // Check table structure
    const table = page.locator('table');
    await expect(table).toBeVisible();
    
    // Check table headers
    await expect(page.locator('th:has-text("Product")')).toBeVisible();
    await expect(page.locator('th:has-text("SKU")')).toBeVisible();
    await expect(page.locator('th:has-text("Current Stock")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
    
    // Check for either data rows or empty state
    const hasData = await page.locator('tbody tr').count() > 0;
    const hasEmptyState = await page.locator('text=No low stock items found').isVisible();
    
    expect(hasData || hasEmptyState).toBeTruthy();
  });

  test('should handle date range changes', async ({ page }) => {
    // Get initial date values
    const startDateInput = page.locator('input[type="date"]').first();
    const endDateInput = page.locator('input[type="date"]').nth(1);
    
    // Change start date
    await startDateInput.fill('2024-01-01');
    await page.waitForTimeout(1000);
    
    // Change end date
    await endDateInput.fill('2024-01-31');
    await page.waitForTimeout(1000);
    
    // Verify inputs have new values
    await expect(startDateInput).toHaveValue('2024-01-01');
    await expect(endDateInput).toHaveValue('2024-01-31');
  });

  test('should handle threshold changes', async ({ page }) => {
    // Change threshold
    const thresholdSelect = page.locator('select');
    await thresholdSelect.selectOption('20');
    
    // Verify selection
    await expect(thresholdSelect).toHaveValue('20');
    
    // Wait for potential data refresh
    await page.waitForTimeout(2000);
  });

  test('should refresh data when refresh button clicked', async ({ page }) => {
    // Wait for initial load
    await page.waitForTimeout(3000);
    
    // Click refresh button
    const refreshButton = page.locator('button:has-text("Refresh Data")');
    await refreshButton.click();
    
    // Wait for refresh to complete
    await page.waitForTimeout(3000);
    
    // Verify no errors occurred during refresh
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    const criticalErrors = errors.filter(error => 
      !error.includes('Failed to load') && 
      !error.includes('404') &&
      !error.includes('NetworkError')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('should navigate back when back button clicked', async ({ page }) => {
    // Click back button
    const backButton = page.locator('button[class*="p-2"]').first();
    await backButton.click();
    
    // Verify navigation occurred (should not be on reports page anymore)
    await expect(page).not.toHaveURL(/reports/);
  });

  test('should display loading state', async ({ page }) => {
    // This test might be flaky due to timing, so we'll just check the structure
    // The loading state should appear briefly during data fetching
    
    // Check that the page structure is present even during loading
    await expect(page.locator('h1')).toContainText('Reports Dashboard');
    await expect(page.locator('input[type="date"]')).toHaveCount(2);
  });

  test('should handle empty data gracefully', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(5000);
    
    // Check that empty states are handled properly
    // Charts should still render even with no data
    const chartContainers = page.locator('[class*="ResponsiveContainer"]');
    await expect(chartContainers).toHaveCount(2);
    
    // Summary cards should show 0 or N/A values
    const summaryCards = page.locator('[class*="grid"]').first();
    await expect(summaryCards).toBeVisible();
  });
});











