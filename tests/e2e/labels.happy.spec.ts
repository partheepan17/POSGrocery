import { test, expect } from '@playwright/test';

test.describe('Labels Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the labels page
    await page.goto('/labels');
    
    // Wait for the page to load
    await expect(page.locator('h1')).toContainText('Labels');
  });

  test('should import CSV with new fields and show preview', async ({ page }) => {
    // Click on CSV tab
    await page.click('text=CSV');
    
    // Click import button
    await page.click('text=Import Labels from CSV');
    
    // Wait for modal to open
    await expect(page.locator('.modal')).toBeVisible();
    
    // Create test CSV content with new fields
    const csvContent = `barcode,sku,qty,language,packed_date,expiry_date,mrp,batch_no
123456789012,ITEM001,2,EN,2024-03-15,2024-09-15,150.00,B001
123456789013,ITEM002,1,SI,2024-03-15,2024-12-31,75.50,LOT123
123456789014,ITEM003,5,TA,2024-03-15,,299.99,BATCH456`;
    
    // Upload CSV content (simulate file upload)
    await page.setInputFiles('input[type="file"]', {
      name: 'test-labels.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });
    
    // Wait for preview to show
    await expect(page.locator('text=Preview')).toBeVisible();
    
    // Verify preview table shows new columns
    await expect(page.locator('th:has-text("Language")')).toBeVisible();
    await expect(page.locator('th:has-text("Packed")')).toBeVisible();
    await expect(page.locator('th:has-text("Expiry")')).toBeVisible();
    await expect(page.locator('th:has-text("MRP")')).toBeVisible();
    await expect(page.locator('th:has-text("Batch")')).toBeVisible();
    
    // Verify data in preview
    await expect(page.locator('td:has-text("EN")')).toBeVisible();
    await expect(page.locator('td:has-text("2024-03-15")')).toBeVisible();
    await expect(page.locator('td:has-text("150")')).toBeVisible();
    await expect(page.locator('td:has-text("B001")')).toBeVisible();
    
    // Import the data
    await page.click('text=Import');
    
    // Verify success message
    await expect(page.locator('text=Added 3 items from CSV')).toBeVisible();
    
    // Close modal
    await page.click('text=Close');
    
    // Verify items appear in batch
    await expect(page.locator('text=ITEM001')).toBeVisible();
    await expect(page.locator('text=ITEM002')).toBeVisible();
    await expect(page.locator('text=ITEM003')).toBeVisible();
  });

  test('should configure template to show MRP/Batch/Dates and verify preview', async ({ page }) => {
    // First, add some test items to the batch (assuming products exist)
    await page.click('text=Products');
    
    // Select a preset first
    await page.click('[data-testid="preset-selector"]');
    await page.click('text=Product Label 50x30mm');
    
    // Select some products (assuming they exist)
    await page.check('input[type="checkbox"]', { force: true });
    await page.click('text=Add to Batch');
    
    // Open template editor
    await page.click('[data-testid="edit-template"]');
    
    // Wait for template editor modal
    await expect(page.locator('text=Template Editor')).toBeVisible();
    
    // Enable MRP field
    await page.check('input[type="checkbox"]:near(:text("Show MRP"))');
    
    // Enable Batch field
    await page.check('input[type="checkbox"]:near(:text("Show Batch"))');
    
    // Enable date fields
    await page.check('input[type="checkbox"]:near(:text("Show Packed Date"))');
    await page.check('input[type="checkbox"]:near(:text("Show Expiry Date"))');
    
    // Set date format
    await page.selectOption('select:near(:text("Date Format"))', 'YYYY-MM-DD');
    
    // Set custom labels
    await page.fill('input:near(:text("MRP Label"))', 'MRP');
    await page.fill('input:near(:text("Batch Label"))', 'Batch');
    
    // Save template
    await page.click('text=Save Template');
    
    // Verify template saved
    await expect(page.locator('text=Template saved successfully')).toBeVisible();
    
    // Check if preview updates (assuming items have the new fields)
    await expect(page.locator('.preview-container')).toBeVisible();
  });

  test('should switch language per-row and confirm name switches', async ({ page }) => {
    // Add items to batch first (via CSV or products)
    await page.click('text=CSV');
    await page.click('text=Import Labels from CSV');
    
    const csvContent = `barcode,sku,qty,language
123456789012,ITEM001,1,EN
123456789013,ITEM002,1,SI`;
    
    await page.setInputFiles('input[type="file"]', {
      name: 'test-multilang.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });
    
    await page.click('text=Import');
    await page.click('text=Close');
    
    // Edit first item to change language
    await page.click('[data-testid="edit-item-0"]');
    
    // Change language to SI
    await page.selectOption('select:near(:text("Language"))', 'SI');
    
    // Save changes
    await page.click('text=Save');
    
    // Verify language change reflected in UI
    await expect(page.locator('text=SI')).toBeVisible();
    
    // Use quick action to set all to TA
    await page.click('text=TA', { force: true }); // Quick action button
    
    // Verify success message
    await expect(page.locator('text=Set language to TA for all items')).toBeVisible();
  });

  test('should use quick actions for dates', async ({ page }) => {
    // Add items to batch first
    await page.click('text=CSV');
    await page.click('text=Import Labels from CSV');
    
    const csvContent = `barcode,sku,qty
123456789012,ITEM001,1
123456789013,ITEM002,1`;
    
    await page.setInputFiles('input[type="file"]', {
      name: 'test-dates.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });
    
    await page.click('text=Import');
    await page.click('text=Close');
    
    // Use "Set Packed = Today" quick action
    await page.click('text=Today');
    
    // Verify success message
    await expect(page.locator('text=Set packed date to today for all items')).toBeVisible();
    
    // Verify date legend appears
    await expect(page.locator('text=Dates in YYYY-MM-DD format')).toBeVisible();
    
    // Use "Clear Dates" quick action
    await page.click('text=Clear Dates');
    
    // Verify success message
    await expect(page.locator('text=Cleared dates for all items')).toBeVisible();
  });

  test('should show validation warnings in preview', async ({ page }) => {
    // Configure template to show MRP
    await page.click('[data-testid="preset-selector"]');
    await page.click('text=Product Label 50x30mm');
    
    await page.click('[data-testid="edit-template"]');
    await page.check('input[type="checkbox"]:near(:text("Show MRP"))');
    await page.click('text=Save Template');
    
    // Add items without MRP
    await page.click('text=CSV');
    await page.click('text=Import Labels from CSV');
    
    const csvContent = `barcode,sku,qty,packed_date,expiry_date
123456789012,ITEM001,1,2024-09-15,2024-03-15`;
    
    await page.setInputFiles('input[type="file"]', {
      name: 'test-invalid.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });
    
    await page.click('text=Import');
    await page.click('text=Close');
    
    // Check for validation warnings in preview
    await expect(page.locator('text=Validation Warnings')).toBeVisible();
    await expect(page.locator('text=invalid date relationships')).toBeVisible();
    await expect(page.locator('text=missing MRP')).toBeVisible();
  });

  test('should handle thermal and A4 rendering with new fields', async ({ page }) => {
    // Select thermal preset
    await page.click('[data-testid="preset-selector"]');
    await page.click('text=Thermal 50x30mm');
    
    // Add items with all new fields
    await page.click('text=CSV');
    await page.click('text=Import Labels from CSV');
    
    const csvContent = `barcode,sku,qty,language,packed_date,expiry_date,mrp,batch_no
123456789012,ITEM001,1,EN,2024-03-15,2024-09-15,150.00,B001`;
    
    await page.setInputFiles('input[type="file"]', {
      name: 'test-full.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });
    
    await page.click('text=Import');
    await page.click('text=Close');
    
    // Enable all fields in template
    await page.click('[data-testid="edit-template"]');
    await page.check('input[type="checkbox"]:near(:text("Show MRP"))');
    await page.check('input[type="checkbox"]:near(:text("Show Batch"))');
    await page.check('input[type="checkbox"]:near(:text("Show Packed Date"))');
    await page.check('input[type="checkbox"]:near(:text("Show Expiry Date"))');
    await page.click('text=Save Template');
    
    // Verify thermal preview renders without overflow
    await expect(page.locator('.preview-container')).toBeVisible();
    
    // Switch to A4 preset
    await page.click('[data-testid="preset-selector"]');
    await page.click('text=A4 Grid');
    
    // Verify A4 preview renders correctly
    await expect(page.locator('.preview-container')).toBeVisible();
  });

  test('should export CSV with new fields', async ({ page }) => {
    // Add items with new fields
    await page.click('text=CSV');
    await page.click('text=Import Labels from CSV');
    
    const csvContent = `barcode,sku,qty,language,packed_date,expiry_date,mrp,batch_no
123456789012,ITEM001,1,EN,2024-03-15,2024-09-15,150.00,B001`;
    
    await page.setInputFiles('input[type="file"]', {
      name: 'test-export.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });
    
    await page.click('text=Import');
    await page.click('text=Close');
    
    // Start download
    const downloadPromise = page.waitForEvent('download');
    await page.click('text=Export CSV');
    const download = await downloadPromise;
    
    // Verify download occurred
    expect(download.suggestedFilename()).toContain('.csv');
  });
});



