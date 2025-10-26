/**
 * E2E tests for feature toggle functionality
 * Tests real-time updates and role-based access control
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_TENANT = 'test-tenant-e2e';

interface TestUser {
  username: string;
  password: string;
  role: string;
}

const testUsers: Record<string, TestUser> = {
  admin: {
    username: 'admin',
    password: 'admin123',
    role: 'admin'
  },
  cashier: {
    username: 'cashier',
    password: 'cashier123',
    role: 'cashier'
  }
};

// Helper functions
async function login(page: Page, user: TestUser): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('[data-testid="username-input"]', user.username);
  await page.fill('[data-testid="password-input"]', user.password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('**/dashboard');
}

async function navigateToFeaturesPage(page: Page): Promise<void> {
  await page.click('[data-testid="admin-menu"]');
  await page.click('[data-testid="features-access-menu"]');
  await page.waitForURL('**/admin/features');
}

async function navigateToReturnsPage(page: Page): Promise<void> {
  await page.click('[data-testid="sales-menu"]');
  await page.click('[data-testid="returns-menu"]');
}

async function toggleFeature(page: Page, featureCode: string, enabled: boolean): Promise<void> {
  const toggleSelector = `[data-testid="feature-toggle-${featureCode}"]`;
  const toggle = page.locator(toggleSelector);
  
  const isChecked = await toggle.isChecked();
  if (isChecked !== enabled) {
    await toggle.click();
    
    // Handle impact preview modal if it appears
    const impactModal = page.locator('[data-testid="impact-preview-modal"]');
    if (await impactModal.isVisible()) {
      if (enabled) {
        // For enabling, just confirm
        await page.click('[data-testid="confirm-toggle"]');
      } else {
        // For disabling, might need to confirm cascade
        const cascadeCheckbox = page.locator('[data-testid="cascade-confirm"]');
        if (await cascadeCheckbox.isVisible()) {
          await cascadeCheckbox.check();
        }
        await page.click('[data-testid="confirm-toggle"]');
      }
    }
    
    // Wait for toggle to complete
    await page.waitForTimeout(1000);
  }
}

async function waitForRealtimeUpdate(page: Page, featureCode: string, expectedState: boolean): Promise<void> {
  const toggleSelector = `[data-testid="feature-toggle-${featureCode}"]`;
  const toggle = page.locator(toggleSelector);
  
  // Wait for the toggle to reach the expected state
  await expect(toggle).toBeChecked({ checked: expectedState });
}

describe('Feature Toggle E2E Tests', () => {
  let adminContext: BrowserContext;
  let cashierContext: BrowserContext;
  let adminPage: Page;
  let cashierPage: Page;

  test.beforeAll(async ({ browser }) => {
    // Create separate contexts for admin and cashier
    adminContext = await browser.newContext();
    cashierContext = await browser.newContext();
    
    adminPage = await adminContext.newPage();
    cashierPage = await cashierContext.newPage();
  });

  test.afterAll(async () => {
    await adminContext.close();
    await cashierContext.close();
  });

  test.describe('Role-based Access Control', () => {
    test('cashier should not see returns page when feature is disabled', async () => {
      // Login as cashier
      await login(cashierPage, testUsers.cashier);
      
      // Try to navigate to returns page
      await navigateToReturnsPage(cashierPage);
      
      // Should be redirected or see access denied
      await expect(cashierPage).toHaveURL(/.*(dashboard|access-denied|not-found).*/);
      
      // Or if the menu item exists, it should be disabled
      const returnsMenuItem = cashierPage.locator('[data-testid="returns-menu"]');
      if (await returnsMenuItem.isVisible()) {
        await expect(returnsMenuItem).toBeDisabled();
      }
    });

    test('admin should be able to access features management', async () => {
      // Login as admin
      await login(adminPage, testUsers.admin);
      
      // Navigate to features page
      await navigateToFeaturesPage(adminPage);
      
      // Should see features management interface
      await expect(adminPage.locator('[data-testid="features-management"]')).toBeVisible();
      await expect(adminPage.locator('[data-testid="feature-list"]')).toBeVisible();
    });

    test('cashier should not be able to access features management', async () => {
      // Login as cashier
      await login(cashierPage, testUsers.cashier);
      
      // Try to navigate to features page
      await adminPage.goto(`${BASE_URL}/admin/features`);
      
      // Should be redirected or see access denied
      await expect(cashierPage).toHaveURL(/.*(dashboard|access-denied|not-found).*/);
    });
  });

  test.describe('Feature Toggle Functionality', () => {
    test.beforeEach(async () => {
      // Ensure we're logged in as admin for feature management
      await login(adminPage, testUsers.admin);
      await navigateToFeaturesPage(adminPage);
    });

    test('admin should be able to toggle features', async () => {
      // Toggle a feature on
      await toggleFeature(adminPage, 'inventory.view', true);
      
      // Verify the toggle is on
      await expect(adminPage.locator('[data-testid="feature-toggle-inventory.view"]')).toBeChecked();
      
      // Toggle it off
      await toggleFeature(adminPage, 'inventory.view', false);
      
      // Verify the toggle is off
      await expect(adminPage.locator('[data-testid="feature-toggle-inventory.view"]')).toBeChecked({ checked: false });
    });

    test('should show impact preview when disabling features with dependents', async () => {
      // First enable a feature with dependents
      await toggleFeature(adminPage, 'sales.view', true);
      await toggleFeature(adminPage, 'sales.create', true);
      
      // Try to disable the parent feature
      await toggleFeature(adminPage, 'sales.view', false);
      
      // Should show impact preview modal
      await expect(adminPage.locator('[data-testid="impact-preview-modal"]')).toBeVisible();
      await expect(adminPage.locator('[data-testid="blocking-dependents"]')).toBeVisible();
      
      // Cancel the operation
      await adminPage.click('[data-testid="cancel-toggle"]');
      
      // Feature should still be enabled
      await expect(adminPage.locator('[data-testid="feature-toggle-sales.view"]')).toBeChecked();
    });

    test('should allow cascade disable with confirmation', async () => {
      // Enable features with dependencies
      await toggleFeature(adminPage, 'sales.view', true);
      await toggleFeature(adminPage, 'sales.create', true);
      
      // Try to disable with cascade
      await toggleFeature(adminPage, 'sales.view', false);
      
      // Should show impact preview modal
      await expect(adminPage.locator('[data-testid="impact-preview-modal"]')).toBeVisible();
      
      // Confirm cascade disable
      await adminPage.check('[data-testid="cascade-confirm"]');
      await adminPage.click('[data-testid="confirm-toggle"]');
      
      // Both features should be disabled
      await expect(adminPage.locator('[data-testid="feature-toggle-sales.view"]')).toBeChecked({ checked: false });
      await expect(adminPage.locator('[data-testid="feature-toggle-sales.create"]')).toBeChecked({ checked: false });
    });
  });

  test.describe('Real-time Updates', () => {
    test('cashier should see returns page appear when admin enables feature', async () => {
      // Start with cashier logged in
      await login(cashierPage, testUsers.cashier);
      
      // Verify returns page is not accessible
      await navigateToReturnsPage(cashierPage);
      await expect(cashierPage).toHaveURL(/.*(dashboard|access-denied).*/);
      
      // Admin enables the returns feature
      await login(adminPage, testUsers.admin);
      await navigateToFeaturesPage(adminPage);
      await toggleFeature(adminPage, 'sales.return', true);
      
      // Wait for real-time update to propagate
      await page.waitForTimeout(2000);
      
      // Switch back to cashier page
      await cashierPage.bringToFront();
      
      // Refresh the page to see the new feature
      await cashierPage.reload();
      
      // Now cashier should be able to access returns page
      await navigateToReturnsPage(cashierPage);
      await expect(cashierPage).toHaveURL(/.*returns.*/);
      await expect(cashierPage.locator('[data-testid="returns-page"]')).toBeVisible();
    });

    test('cashier should lose access when admin disables feature', async () => {
      // First enable the feature
      await login(adminPage, testUsers.admin);
      await navigateToFeaturesPage(adminPage);
      await toggleFeature(adminPage, 'sales.return', true);
      
      // Cashier accesses the feature
      await login(cashierPage, testUsers.cashier);
      await navigateToReturnsPage(cashierPage);
      await expect(cashierPage.locator('[data-testid="returns-page"]')).toBeVisible();
      
      // Admin disables the feature
      await adminPage.bringToFront();
      await toggleFeature(adminPage, 'sales.return', false);
      
      // Wait for real-time update
      await page.waitForTimeout(2000);
      
      // Switch back to cashier
      await cashierPage.bringToFront();
      
      // Cashier should lose access (page should redirect or show access denied)
      await cashierPage.reload();
      await navigateToReturnsPage(cashierPage);
      await expect(cashierPage).toHaveURL(/.*(dashboard|access-denied).*/);
    });

    test('should update feature list in real-time', async () => {
      // Admin is on features page
      await login(adminPage, testUsers.admin);
      await navigateToFeaturesPage(adminPage);
      
      // Toggle a feature
      const initialState = await adminPage.locator('[data-testid="feature-toggle-inventory.view"]').isChecked();
      await toggleFeature(adminPage, 'inventory.view', !initialState);
      
      // Verify the change is reflected immediately
      await expect(adminPage.locator('[data-testid="feature-toggle-inventory.view"]')).toBeChecked({ checked: !initialState });
      
      // Verify the change persists after page reload
      await adminPage.reload();
      await expect(adminPage.locator('[data-testid="feature-toggle-inventory.view"]')).toBeChecked({ checked: !initialState });
    });
  });

  test.describe('Access Matrix', () => {
    test.beforeEach(async () => {
      await login(adminPage, testUsers.admin);
      await navigateToFeaturesPage(adminPage);
    });

    test('should show access matrix for selected feature', async () => {
      // Select a feature
      await adminPage.click('[data-testid="feature-card-sales.view"]');
      
      // Switch to access matrix tab
      await adminPage.click('[data-testid="access-matrix-tab"]');
      
      // Should see access matrix
      await expect(adminPage.locator('[data-testid="access-matrix"]')).toBeVisible();
      await expect(adminPage.locator('[data-testid="role-permissions-table"]')).toBeVisible();
      await expect(adminPage.locator('[data-testid="feature-overrides"]')).toBeVisible();
    });

    test('should allow toggling role permissions', async () => {
      // Select a feature and go to access matrix
      await adminPage.click('[data-testid="feature-card-sales.view"]');
      await adminPage.click('[data-testid="access-matrix-tab"]');
      
      // Toggle a permission for a role
      const permissionCheckbox = adminPage.locator('[data-testid="permission-checkbox-cashier-sales.view"]');
      const initialState = await permissionCheckbox.isChecked();
      
      await permissionCheckbox.click();
      
      // Verify the change
      await expect(permissionCheckbox).toBeChecked({ checked: !initialState });
    });

    test('should allow toggling role feature overrides', async () => {
      // Select a feature and go to access matrix
      await adminPage.click('[data-testid="feature-card-sales.view"]');
      await adminPage.click('[data-testid="access-matrix-tab"]');
      
      // Toggle feature override for a role
      const overrideSwitch = adminPage.locator('[data-testid="feature-override-cashier-sales.view"]');
      const initialState = await overrideSwitch.isChecked();
      
      await overrideSwitch.click();
      
      // Verify the change
      await expect(overrideSwitch).toBeChecked({ checked: !initialState });
    });
  });

  test.describe('Audit Trail', () => {
    test.beforeEach(async () => {
      await login(adminPage, testUsers.admin);
    });

    test('should show audit trail for feature changes', async () => {
      // Navigate to audit trail
      await adminPage.click('[data-testid="admin-menu"]');
      await adminPage.click('[data-testid="audit-trail-menu"]');
      
      // Should see audit trail page
      await expect(adminPage.locator('[data-testid="audit-trail-page"]')).toBeVisible();
      
      // Toggle a feature to generate audit log
      await adminPage.click('[data-testid="features-access-menu"]');
      await toggleFeature(adminPage, 'inventory.view', true);
      
      // Go back to audit trail
      await adminPage.click('[data-testid="audit-trail-menu"]');
      
      // Should see the new audit log
      await expect(adminPage.locator('[data-testid="audit-log-row"]').first()).toBeVisible();
      await expect(adminPage.locator('[data-testid="audit-log-action"]').first()).toContainText('FEATURE_TOGGLE');
    });

    test('should filter audit logs by action', async () => {
      // Navigate to audit trail
      await adminPage.click('[data-testid="admin-menu"]');
      await adminPage.click('[data-testid="audit-trail-menu"]');
      
      // Filter by action
      await adminPage.selectOption('[data-testid="action-filter"]', 'FEATURE_TOGGLE');
      await adminPage.click('[data-testid="apply-filters"]');
      
      // Should only show feature toggle logs
      const auditLogs = adminPage.locator('[data-testid="audit-log-row"]');
      const count = await auditLogs.count();
      
      for (let i = 0; i < count; i++) {
        await expect(auditLogs.nth(i).locator('[data-testid="audit-log-action"]')).toContainText('FEATURE_TOGGLE');
      }
    });

    test('should export audit logs as CSV', async () => {
      // Navigate to audit trail
      await adminPage.click('[data-testid="admin-menu"]');
      await adminPage.click('[data-testid="audit-trail-menu"]');
      
      // Export as CSV
      const downloadPromise = adminPage.waitForEvent('download');
      await adminPage.click('[data-testid="export-csv-button"]');
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toMatch(/audit-trail.*\.csv/);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // Simulate network failure
      await adminPage.route('**/api/admin/features/toggle', route => route.abort());
      
      await login(adminPage, testUsers.admin);
      await navigateToFeaturesPage(adminPage);
      
      // Try to toggle a feature
      await toggleFeature(adminPage, 'inventory.view', true);
      
      // Should show error message
      await expect(adminPage.locator('[data-testid="error-toast"]')).toBeVisible();
    });

    test('should handle permission errors', async () => {
      // Try to access admin features as cashier
      await login(cashierPage, testUsers.cashier);
      await cashierPage.goto(`${BASE_URL}/admin/features`);
      
      // Should see access denied
      await expect(cashierPage.locator('[data-testid="access-denied"]')).toBeVisible();
    });
  });
});










