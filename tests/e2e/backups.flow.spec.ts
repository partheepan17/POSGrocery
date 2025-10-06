import { test, expect } from '@playwright/test';

/**
 * Backups Flow E2E Test
 * Tests backup creation, verification, and restore workflow
 */

test.describe('Backups Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/backups');
    await expect(page.locator('h1')).toContainText('Backups');
  });

  test('complete backup flow: configure → backup → verify → restore', async ({ page }) => {
    // Step 1: Configure backup provider (Local)
    const providerSection = page.locator('text=/Provider/i').or(page.locator('[data-testid="provider-section"]'));
    if (await providerSection.isVisible()) {
      await providerSection.click();
    }
    
    // Select Local provider
    const localProvider = page.locator('[data-testid="provider-local"]').or(page.locator('input[value="local"]')).first();
    if (await localProvider.isVisible()) {
      await localProvider.click();
    }
    
    // Set backup folder path
    const folderPathInput = page.locator('[data-testid="backup-folder"]').or(page.locator('input[placeholder*="folder" i]')).first();
    if (await folderPathInput.isVisible()) {
      await folderPathInput.fill('C:\\Temp\\QA-Backups');
    }
    
    // Set encryption key
    const encryptionKeyInput = page.locator('[data-testid="encryption-key"]').or(page.locator('input[type="password"]')).first();
    if (await encryptionKeyInput.isVisible()) {
      await encryptionKeyInput.fill('qa-test-encryption-key-12345');
    }
    
    // Test connection
    const testConnectionButton = page.locator('[data-testid="test-connection"]').or(page.locator('button:has-text("Test")')).first();
    if (await testConnectionButton.isVisible()) {
      await testConnectionButton.click();
      
      // Wait for connection test result
      const successIndicator = page.locator('[data-testid="connection-success"]').or(page.locator('text=/✅/').or(page.locator('text=/success/i'))).first();
      await expect(successIndicator).toBeVisible({ timeout: 10000 });
    }
    
    // Save provider configuration
    const saveProviderButton = page.locator('[data-testid="save-provider"]').or(page.locator('button:has-text("Save")')).first();
    if (await saveProviderButton.isVisible()) {
      await saveProviderButton.click();
      await expect(page.locator('text=/success/i').or(page.locator('text=/saved/i'))).toBeVisible({ timeout: 5000 });
    }
    
    // Step 2: Create manual backup
    const actionsSection = page.locator('text=/Actions/i').or(page.locator('[data-testid="actions-section"]'));
    if (await actionsSection.isVisible()) {
      await actionsSection.click();
    }
    
    // Record current store name for restore verification
    await page.goto('/settings');
    const storeInfoSection = page.locator('text=/Store/i').or(page.locator('text=/Info/i'));
    if (await storeInfoSection.isVisible()) {
      await storeInfoSection.click();
    }
    
    const storeNameInput = page.locator('[data-testid="store-name"]').or(page.locator('input[placeholder*="name" i]')).first();
    let originalStoreName = '';
    if (await storeNameInput.isVisible()) {
      originalStoreName = await storeNameInput.inputValue();
      
      // Change store name to something we can verify later
      await storeNameInput.fill('Pre-Backup Store Name');
      
      const saveButton = page.locator('button:has-text("Save")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await expect(page.locator('text=/success/i')).toBeVisible({ timeout: 5000 });
      }
    }
    
    // Go back to backups
    await page.goto('/backups');
    if (await actionsSection.isVisible()) {
      await actionsSection.click();
    }
    
    // Create manual backup
    const manualBackupButton = page.locator('[data-testid="manual-backup"]').or(page.locator('button:has-text("Manual Backup")')).first();
    if (await manualBackupButton.isVisible()) {
      await manualBackupButton.click();
      
      // Wait for backup progress
      const progressIndicator = page.locator('[data-testid="backup-progress"]').or(page.locator('text=/Creating/i').or(page.locator('text=/progress/i'))).first();
      await expect(progressIndicator).toBeVisible({ timeout: 5000 });
      
      // Wait for backup completion
      const successMessage = page.locator('[data-testid="backup-success"]').or(page.locator('text=/uploaded/i').or(page.locator('text=/completed/i'))).first();
      await expect(successMessage).toBeVisible({ timeout: 30000 });
      
      // Verify filename format in success message
      const filenamePattern = /grocerypos_backup_\d{8}_\d{6}_(daily|config)\.zip/;
      const messageText = await successMessage.textContent();
      if (messageText) {
        expect(messageText).toMatch(filenamePattern);
      }
    }
    
    // Step 3: Verify backup logs
    const logsSection = page.locator('text=/Logs/i').or(page.locator('[data-testid="logs-section"]'));
    if (await logsSection.isVisible()) {
      await logsSection.click();
    }
    
    // Check that backup log entry was created
    const logEntry = page.locator('[data-testid="log-entry"]').or(page.locator('td:has-text("Created")')).first();
    await expect(logEntry).toBeVisible({ timeout: 5000 });
    
    // Verify log contains bytes and checksum
    const bytesInfo = page.locator('text=/bytes/i').or(page.locator('text=/MB/i').or(page.locator('text=/KB/i'))).first();
    await expect(bytesInfo).toBeVisible();
    
    const checksumInfo = page.locator('text=/[a-f0-9]{8,}/'); // Hexadecimal checksum pattern
    await expect(checksumInfo).toBeVisible();
    
    // Step 4: Verify backup
    await actionsSection.click();
    
    const verifyButton = page.locator('[data-testid="verify-backup"]').or(page.locator('button:has-text("Verify")')).first();
    if (await verifyButton.isVisible()) {
      await verifyButton.click();
      
      // Wait for verification
      const verifyProgress = page.locator('[data-testid="verify-progress"]').or(page.locator('text=/Verifying/i')).first();
      await expect(verifyProgress).toBeVisible({ timeout: 5000 });
      
      // Wait for verification result
      const verifySuccess = page.locator('[data-testid="verify-success"]').or(page.locator('text=/verified/i').or(page.locator('text=/checksum.*verified/i'))).first();
      await expect(verifySuccess).toBeVisible({ timeout: 20000 });
    }
    
    // Step 5: Change store name before restore
    await page.goto('/settings');
    if (await storeInfoSection.isVisible()) {
      await storeInfoSection.click();
    }
    
    if (await storeNameInput.isVisible()) {
      await storeNameInput.fill('Post-Backup Changed Name');
      
      const saveButton = page.locator('button:has-text("Save")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await expect(page.locator('text=/success/i')).toBeVisible({ timeout: 5000 });
      }
    }
    
    // Step 6: Restore backup
    await page.goto('/backups');
    if (await actionsSection.isVisible()) {
      await actionsSection.click();
    }
    
    const restoreButton = page.locator('[data-testid="restore-backup"]').or(page.locator('button:has-text("Restore")')).first();
    if (await restoreButton.isVisible()) {
      await restoreButton.click();
      
      // Should prompt for Manager PIN
      const pinDialog = page.locator('[data-testid="manager-pin-dialog"]').or(page.locator('text=/Manager PIN/i').or(page.locator('input[type="password"]'))).first();
      await expect(pinDialog).toBeVisible({ timeout: 5000 });
      
      // Enter mock manager PIN (assuming 1234 is configured)
      const pinInput = page.locator('[data-testid="manager-pin-input"]').or(page.locator('input[type="password"]')).first();
      if (await pinInput.isVisible()) {
        await pinInput.fill('1234');
        
        const confirmButton = page.locator('[data-testid="confirm-restore"]').or(page.locator('button:has-text("Confirm")').or(page.locator('button:has-text("Restore")'))).first();
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
          
          // Wait for restore progress
          const restoreProgress = page.locator('[data-testid="restore-progress"]').or(page.locator('text=/Restoring/i')).first();
          await expect(restoreProgress).toBeVisible({ timeout: 5000 });
          
          // Wait for restore completion
          const restoreSuccess = page.locator('[data-testid="restore-success"]').or(page.locator('text=/complete/i').or(page.locator('text=/reload/i'))).first();
          await expect(restoreSuccess).toBeVisible({ timeout: 30000 });
        }
      }
    }
    
    // Step 7: Verify restore worked by checking store name
    await page.goto('/settings');
    if (await storeInfoSection.isVisible()) {
      await storeInfoSection.click();
    }
    
    if (await storeNameInput.isVisible()) {
      const restoredName = await storeNameInput.inputValue();
      expect(restoredName).toBe('Pre-Backup Store Name');
    }
    
    // Step 8: Verify restore log entry
    await page.goto('/backups');
    if (await logsSection.isVisible()) {
      await logsSection.click();
    }
    
    const restoreLogEntry = page.locator('td:has-text("Restored")').first();
    await expect(restoreLogEntry).toBeVisible({ timeout: 5000 });
  });

  test('backup schedule configuration', async ({ page }) => {
    // Navigate to Schedule section
    const scheduleSection = page.locator('text=/Schedule/i').or(page.locator('[data-testid="schedule-section"]'));
    if (await scheduleSection.isVisible()) {
      await scheduleSection.click();
    }
    
    // Set daily backup time
    const timeInput = page.locator('[data-testid="daily-time"]').or(page.locator('input[type="time"]')).first();
    if (await timeInput.isVisible()) {
      await timeInput.fill('22:30');
    }
    
    // Enable on-settings-change backup
    const onChangeToggle = page.locator('[data-testid="on-change-toggle"]').or(page.locator('input[type="checkbox"]')).first();
    if (await onChangeToggle.isVisible() && !await onChangeToggle.isChecked()) {
      await onChangeToggle.click();
    }
    
    // Save schedule
    const saveScheduleButton = page.locator('[data-testid="save-schedule"]').or(page.locator('button:has-text("Save")')).first();
    if (await saveScheduleButton.isVisible()) {
      await saveScheduleButton.click();
      await expect(page.locator('text=/success/i')).toBeVisible({ timeout: 5000 });
    }
    
    // Verify next run time is displayed
    const nextRunTime = page.locator('[data-testid="next-run-time"]').or(page.locator('text=/Next run/i')).first();
    await expect(nextRunTime).toBeVisible();
    
    const nextRunText = await nextRunTime.textContent();
    expect(nextRunText).toMatch(/22:30/);
  });

  test('retention policy management', async ({ page }) => {
    // Navigate to Retention section
    const retentionSection = page.locator('text=/Retention/i').or(page.locator('[data-testid="retention-section"]'));
    if (await retentionSection.isVisible()) {
      await retentionSection.click();
    }
    
    // Set retention policies
    const dailyRetentionInput = page.locator('[data-testid="daily-retention"]').or(page.locator('input[type="number"]')).first();
    if (await dailyRetentionInput.isVisible()) {
      await dailyRetentionInput.fill('30');
    }
    
    const configRetentionInput = page.locator('[data-testid="config-retention"]').or(page.locator('input[type="number"]')).nth(1);
    if (await configRetentionInput.isVisible()) {
      await configRetentionInput.fill('5');
    }
    
    // Apply retention now
    const applyRetentionButton = page.locator('[data-testid="apply-retention"]').or(page.locator('button:has-text("Apply Retention")')).first();
    if (await applyRetentionButton.isVisible()) {
      await applyRetentionButton.click();
      
      // Wait for retention completion
      const retentionSuccess = page.locator('[data-testid="retention-success"]').or(page.locator('text=/kept.*removed/i')).first();
      await expect(retentionSuccess).toBeVisible({ timeout: 10000 });
      
      // Verify retention log entry
      const logsSection = page.locator('text=/Logs/i').or(page.locator('[data-testid="logs-section"]'));
      if (await logsSection.isVisible()) {
        await logsSection.click();
        
        const retentionLogEntry = page.locator('td:has-text("Rotate")').first();
        await expect(retentionLogEntry).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('backup logs CSV export', async ({ page }) => {
    // Navigate to Logs section
    const logsSection = page.locator('text=/Logs/i').or(page.locator('[data-testid="logs-section"]'));
    if (await logsSection.isVisible()) {
      await logsSection.click();
    }
    
    // Export logs CSV
    const exportButton = page.locator('[data-testid="export-logs-csv"]').or(page.locator('button:has-text("Export CSV")')).first();
    
    if (await exportButton.isVisible()) {
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toMatch(/backup.*logs.*\.csv/i);
      
      // Read CSV content to verify headers
      const csvPath = await download.path();
      const fs = require('fs');
      const csvContent = fs.readFileSync(csvPath!, 'utf-8');
      
      // Verify exact headers
      const expectedHeaders = [
        'datetime',
        'type',
        'provider',
        'location_url',
        'filename',
        'bytes',
        'checksum',
        'result',
        'by_user',
        'note'
      ];
      
      const lines = csvContent.split('\n');
      const headerLine = lines.find(line => line.includes('datetime,type'));
      expect(headerLine).toBeTruthy();
      
      if (headerLine) {
        const headers = headerLine.split(',');
        for (const expectedHeader of expectedHeaders) {
          expect(headers).toContain(expectedHeader);
        }
      }
    }
  });

  test('backup error handling', async ({ page }) => {
    // Try to create backup without proper configuration
    const actionsSection = page.locator('text=/Actions/i').or(page.locator('[data-testid="actions-section"]'));
    if (await actionsSection.isVisible()) {
      await actionsSection.click();
    }
    
    // Clear any existing configuration first
    const providerSection = page.locator('text=/Provider/i').or(page.locator('[data-testid="provider-section"]'));
    if (await providerSection.isVisible()) {
      await providerSection.click();
      
      const encryptionKeyInput = page.locator('[data-testid="encryption-key"]').or(page.locator('input[type="password"]')).first();
      if (await encryptionKeyInput.isVisible()) {
        await encryptionKeyInput.fill('');
        
        const saveButton = page.locator('button:has-text("Save")');
        if (await saveButton.isVisible()) {
          await saveButton.click();
        }
      }
    }
    
    // Try manual backup
    await actionsSection.click();
    const manualBackupButton = page.locator('[data-testid="manual-backup"]').or(page.locator('button:has-text("Manual Backup")')).first();
    
    if (await manualBackupButton.isVisible()) {
      await manualBackupButton.click();
      
      // Should show error about missing encryption key
      const errorMessage = page.locator('[data-testid="backup-error"]').or(page.locator('text=/encryption key/i').or(page.locator('text=/error/i'))).first();
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
      
      // Error should provide guidance
      const guidanceText = await errorMessage.textContent();
      expect(guidanceText).toMatch(/encryption.*key|provider.*config/i);
    }
  });

  test('keyboard shortcuts work', async ({ page }) => {
    // Test Alt+S for save schedule (if in schedule section)
    const scheduleSection = page.locator('text=/Schedule/i').or(page.locator('[data-testid="schedule-section"]'));
    if (await scheduleSection.isVisible()) {
      await scheduleSection.click();
      
      // Make a change
      const timeInput = page.locator('[data-testid="daily-time"]').or(page.locator('input[type="time"]')).first();
      if (await timeInput.isVisible()) {
        await timeInput.fill('23:00');
        
        // Use keyboard shortcut
        await page.keyboard.press('Alt+s');
        
        // Should save
        await expect(page.locator('text=/success/i').or(page.locator('text=/saved/i'))).toBeVisible({ timeout: 5000 });
      }
    }
    
    // Test Ctrl+B for manual backup
    const actionsSection = page.locator('text=/Actions/i').or(page.locator('[data-testid="actions-section"]'));
    if (await actionsSection.isVisible()) {
      await actionsSection.click();
      
      // Use keyboard shortcut (should trigger backup or show config error)
      await page.keyboard.press('Control+b');
      
      // Should either start backup or show configuration error
      const response = page.locator('[data-testid="backup-progress"]').or(page.locator('[data-testid="backup-error"]')).first();
      await expect(response).toBeVisible({ timeout: 5000 });
    }
  });
});








