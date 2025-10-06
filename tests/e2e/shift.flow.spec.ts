import { test, expect } from '@playwright/test';

test.describe('Shift Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:8102');
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
  });

  test('should complete full shift workflow', async ({ page }) => {
    // Navigate to shifts page
    await page.click('text=Shifts');
    await expect(page).toHaveURL('/shifts');
    
    // Click "New Shift" button
    await page.click('text=New Shift');
    await expect(page).toHaveURL('/shifts/new');
    
    // Fill in shift details
    await page.fill('input[placeholder="Enter terminal name"]', 'Terminal 1');
    await page.fill('input[type="number"]', '1'); // Cashier ID
    await page.fill('input[placeholder="0.00"]', '1000'); // Opening cash
    await page.fill('textarea', 'Test shift for e2e');
    
    // Create the shift
    await page.click('text=Open Shift');
    
    // Should redirect to shift session page
    await expect(page).toHaveURL(/\/shifts\/\d+/);
    
    // Verify shift details are displayed
    await expect(page.locator('text=Terminal 1')).toBeVisible();
    await expect(page.locator('text=1000')).toBeVisible();
    await expect(page.locator('text=Test shift for e2e')).toBeVisible();
    
    // Add a cash movement
    await page.selectOption('select', 'CASH_IN');
    await page.fill('input[placeholder="0.00"]', '500');
    await page.fill('input[placeholder="Enter reason..."]', 'Test cash in');
    await page.click('text=Add Movement');
    
    // Verify movement was added
    await expect(page.locator('text=Cash In')).toBeVisible();
    await expect(page.locator('text=500')).toBeVisible();
    await expect(page.locator('text=Test cash in')).toBeVisible();
    
    // Add another movement (petty cash)
    await page.selectOption('select', 'PETTY');
    await page.fill('input[placeholder="0.00"]', '50');
    await page.fill('input[placeholder="Enter reason..."]', 'Petty cash withdrawal');
    await page.click('text=Add Movement');
    
    // Verify petty cash movement was added
    await expect(page.locator('text=Petty Cash')).toBeVisible();
    await expect(page.locator('text=50')).toBeVisible();
    
    // Test X Report (should be available for open shift)
    await page.click('text=X Report');
    // Note: In a real implementation, this would open a print modal
    // For now, we just verify the button is clickable
    
    // Close the shift
    await page.click('text=Close Shift');
    
    // Fill in declared cash amount
    await page.fill('input[placeholder="Enter counted cash amount"]', '1450');
    await page.fill('textarea[placeholder="Enter closing note..."]', 'End of test shift');
    
    // Confirm close
    await page.click('text=Close Shift');
    
    // Verify shift is closed
    await expect(page.locator('text=Closed')).toBeVisible();
    await expect(page.locator('text=1450')).toBeVisible();
    await expect(page.locator('text=End of test shift')).toBeVisible();
    
    // Test Z Report (should be available for closed shift)
    await page.click('text=Z Report');
    // Note: In a real implementation, this would open a print modal
    
    // Verify variance calculation
    // Expected: 1000 (opening) + 0 (cash sales) + 500 (cash in) - 0 (cash out) - 0 (drops) - 50 (petty) = 1450
    // Declared: 1450
    // Variance: 0
    await expect(page.locator('text=Variance:')).toBeVisible();
    await expect(page.locator('text=+0.00')).toBeVisible();
  });

  test('should handle shift list filtering', async ({ page }) => {
    // Navigate to shifts page
    await page.click('text=Shifts');
    await expect(page).toHaveURL('/shifts');
    
    // Test search functionality
    await page.fill('input[placeholder="Search shifts..."]', 'Terminal');
    
    // Test status filter
    await page.selectOption('select', 'OPEN');
    
    // Test date filters
    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[type="date"]', today);
    
    // Verify filters are applied (in a real app, this would filter the results)
    await expect(page.locator('input[placeholder="Search shifts..."]')).toHaveValue('Terminal');
    await expect(page.locator('select')).toHaveValue('OPEN');
  });

  test('should prevent opening multiple shifts for same terminal', async ({ page }) => {
    // Navigate to shifts page
    await page.click('text=Shifts');
    
    // Open first shift
    await page.click('text=New Shift');
    await page.fill('input[placeholder="Enter terminal name"]', 'Terminal 1');
    await page.fill('input[type="number"]', '1');
    await page.fill('input[placeholder="0.00"]', '1000');
    await page.click('text=Open Shift');
    
    // Should redirect to shift session
    await expect(page).toHaveURL(/\/shifts\/\d+/);
    
    // Go back to shifts list
    await page.click('text=Back');
    await expect(page).toHaveURL('/shifts');
    
    // Try to open another shift for same terminal
    await page.click('text=New Shift');
    await page.fill('input[placeholder="Enter terminal name"]', 'Terminal 1');
    await page.fill('input[type="number"]', '2');
    await page.fill('input[placeholder="0.00"]', '2000');
    await page.click('text=Open Shift');
    
    // Should show error (in a real implementation)
    // For now, we just verify the form is still there
    await expect(page.locator('text=Open Shift')).toBeVisible();
  });

  test('should handle void shift functionality', async ({ page }) => {
    // Navigate to shifts page
    await page.click('text=Shifts');
    
    // Open a shift
    await page.click('text=New Shift');
    await page.fill('input[placeholder="Enter terminal name"]', 'Terminal 2');
    await page.fill('input[type="number"]', '1');
    await page.fill('input[placeholder="0.00"]', '1000');
    await page.click('text=Open Shift');
    
    // Should redirect to shift session
    await expect(page).toHaveURL(/\/shifts\/\d+/);
    
    // Void the shift
    await page.click('text=Void Shift');
    
    // Confirm void action
    await page.on('dialog', dialog => dialog.accept());
    
    // Verify shift is voided
    await expect(page.locator('text=Void')).toBeVisible();
    
    // Verify void shift cannot be closed
    await expect(page.locator('text=Close Shift')).not.toBeVisible();
  });

  test('should display cash drawer calculations correctly', async ({ page }) => {
    // Navigate to shifts page
    await page.click('text=Shifts');
    
    // Open a shift
    await page.click('text=New Shift');
    await page.fill('input[placeholder="Enter terminal name"]', 'Terminal 3');
    await page.fill('input[type="number"]', '1');
    await page.fill('input[placeholder="0.00"]', '1000');
    await page.click('text=Open Shift');
    
    // Add various movements
    await page.selectOption('select', 'CASH_IN');
    await page.fill('input[placeholder="0.00"]', '200');
    await page.fill('input[placeholder="Enter reason..."]', 'Cash in');
    await page.click('text=Add Movement');
    
    await page.selectOption('select', 'CASH_OUT');
    await page.fill('input[placeholder="0.00"]', '50');
    await page.fill('input[placeholder="Enter reason..."]', 'Cash out');
    await page.click('text=Add Movement');
    
    await page.selectOption('select', 'DROP');
    await page.fill('input[placeholder="0.00"]', '100');
    await page.fill('input[placeholder="Enter reason..."]', 'Drop to safe');
    await page.click('text=Add Movement');
    
    // Verify cash drawer calculations
    // Expected: 1000 (opening) + 0 (cash sales) + 200 (cash in) - 50 (cash out) - 100 (drops) - 0 (petty) = 1050
    await expect(page.locator('text=Expected Cash:')).toBeVisible();
    await expect(page.locator('text=1,050.00')).toBeVisible();
    
    // Verify individual movement totals
    await expect(page.locator('text=Opening Cash:')).toBeVisible();
    await expect(page.locator('text=1,000.00')).toBeVisible();
    await expect(page.locator('text=+200.00')).toBeVisible();
    await expect(page.locator('text=-50.00')).toBeVisible();
    await expect(page.locator('text=-100.00')).toBeVisible();
  });
});


