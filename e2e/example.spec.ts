import { test, expect } from '@playwright/test'

test.describe('Grocery POS Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should load the application', async ({ page }) => {
    await expect(page).toHaveTitle(/Grocery POS/)
    
    // Check if main navigation is visible
    await expect(page.locator('text=Sales')).toBeVisible()
    await expect(page.locator('text=Products')).toBeVisible()
    await expect(page.locator('text=Settings')).toBeVisible()
  })

  test('should navigate between pages', async ({ page }) => {
    // Test navigation to Products page
    await page.click('text=Products')
    await expect(page).toHaveURL(/.*products/)
    await expect(page.locator('h1')).toContainText('Products')

    // Test navigation to Settings page
    await page.click('text=Settings')
    await expect(page).toHaveURL(/.*settings/)
    await expect(page.locator('h1')).toContainText('Settings')

    // Test navigation back to Sales
    await page.click('text=Sales')
    await expect(page).toHaveURL(/.*\/$/)
    await expect(page.locator('h1')).toContainText('Sales')
  })

  test('should toggle theme', async ({ page }) => {
    // Click theme toggle button
    await page.click('button[title*="theme"]')
    
    // Check if dark mode is applied
    await expect(page.locator('html')).toHaveClass(/dark/)
    
    // Toggle again to light mode
    await page.click('button[title*="theme"]')
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })

  test('should toggle sidebar', async ({ page }) => {
    // On mobile/tablet, sidebar should be toggleable
    await page.setViewportSize({ width: 768, height: 1024 })
    
    // Sidebar should be hidden initially on mobile
    await expect(page.locator('[data-testid="sidebar"]')).not.toBeVisible()
    
    // Click menu button to open sidebar
    await page.click('button[aria-label*="menu"]')
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
    
    // Click outside to close sidebar
    await page.click('main')
    await expect(page.locator('[data-testid="sidebar"]')).not.toBeVisible()
  })

  test('should handle keyboard shortcuts', async ({ page }) => {
    // Test Ctrl+1 shortcut (Sales)
    await page.keyboard.press('Control+1')
    await expect(page).toHaveURL(/.*\/$/)
    
    // Test Ctrl+2 shortcut (Products)
    await page.keyboard.press('Control+2')
    await expect(page).toHaveURL(/.*products/)
    
    // Test Ctrl+9 shortcut (Settings)
    await page.keyboard.press('Control+9')
    await expect(page).toHaveURL(/.*settings/)
  })

  test('should show keyboard shortcuts overlay', async ({ page }) => {
    // Press F12 to open keyboard shortcuts
    await page.keyboard.press('F12')
    
    // Check if overlay is visible
    await expect(page.locator('text=Keyboard Shortcuts')).toBeVisible()
    await expect(page.locator('text=Navigation')).toBeVisible()
    
    // Close overlay with Escape
    await page.keyboard.press('Escape')
    await expect(page.locator('text=Keyboard Shortcuts')).not.toBeVisible()
  })

  test('should handle search functionality', async ({ page }) => {
    // Navigate to Products page
    await page.click('text=Products')
    
    // Find search input and type
    const searchInput = page.locator('input[placeholder*="Search"]')
    await searchInput.fill('Rice')
    
    // Check if results are filtered (this would depend on implementation)
    await expect(searchInput).toHaveValue('Rice')
  })

  test('should show error boundary', async ({ page }) => {
    // Navigate to a non-existent route
    await page.goto('/non-existent-route')
    
    // Check if 404 page is shown
    await expect(page.locator('text=404')).toBeVisible()
    await expect(page.locator('text=Page Not Found')).toBeVisible()
    
    // Test go back functionality
    await page.click('text=Go to Dashboard')
    await expect(page).toHaveURL(/.*\/$/)
  })

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('main')).toBeVisible()
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.locator('main')).toBeVisible()
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page.locator('main')).toBeVisible()
  })

  test('should handle CSV import/export', async ({ page }) => {
    // Navigate to Products page
    await page.click('text=Products')
    
    // Test export button
    await page.click('text=Export')
    // Note: File download testing requires additional setup
    
    // Test import button
    await page.click('text=Import')
    // Note: File upload testing requires additional setup
  })

  test('should show health status', async ({ page }) => {
    // Navigate to health page (if accessible)
    await page.goto('/health')
    
    // Check if health page loads
    await expect(page.locator('text=System Health')).toBeVisible()
    await expect(page.locator('text=Overall System Status')).toBeVisible()
  })
})









