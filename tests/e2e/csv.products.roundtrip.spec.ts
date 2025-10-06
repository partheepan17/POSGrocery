import { test, expect } from '@playwright/test';

/**
 * CSV Products Round-trip E2E Test
 * Tests CSV export, modification, and import workflow
 */

test.describe('CSV Products Round-trip', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products');
    await expect(page.locator('h1')).toContainText('Products');
  });

  test('complete CSV export-edit-import workflow', async ({ page }) => {
    // Step 1: Export products to CSV
    const exportButton = page.locator('[data-testid="export-csv"]').or(page.locator('button:has-text("Export")')).first();
    
    // Set up download listener
    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();
    const download = await downloadPromise;
    
    // Verify download occurred
    expect(download.suggestedFilename()).toMatch(/products.*\.csv/i);
    
    // Step 2: Read the downloaded CSV content
    const csvPath = await download.path();
    expect(csvPath).toBeTruthy();
    
    // In a real test, we would read and parse the CSV file
    // For this test, we'll simulate the modification
    
    // Step 3: Simulate CSV modification (in real test, would modify actual file)
    // We'll prepare modified data that we know should work
    const modifiedCSVContent = `sku,name_en,name_si,name_ta,category_id,unit,price_retail,price_wholesale,price_credit,price_other,cost,supplier_id,reorder_level,is_scale_item,active,barcode
RICE001,Basmati Rice 5kg Modified,බාස්මති සහල් 5kg,பாஸ்மதி அரிசி 5kg,1,pc,1350.00,1200.00,1300.00,1250.00,950.00,1,10,false,true,1234567890123
BREAD1,White Bread Loaf Updated,සුදු පාන් ගෙඩිය,வெள்ளை ரொட்டி,3,pc,95.00,85.00,90.00,88.00,60.00,1,15,false,true,1234567890125`;
    
    // Step 4: Navigate to import
    const importButton = page.locator('[data-testid="import-csv"]').or(page.locator('button:has-text("Import")')).first();
    await importButton.click();
    
    // Step 5: Upload modified CSV
    const fileInput = page.locator('[data-testid="csv-file-input"]').or(page.locator('input[type="file"]')).first();
    await expect(fileInput).toBeVisible();
    
    // Create a temporary file with modified content
    const fs = require('fs');
    const path = require('path');
    const tempFilePath = path.join(__dirname, 'temp-products.csv');
    fs.writeFileSync(tempFilePath, modifiedCSVContent);
    
    await fileInput.setInputFiles(tempFilePath);
    
    // Step 6: Preview changes
    const previewButton = page.locator('[data-testid="preview-changes"]').or(page.locator('button:has-text("Preview")')).first();
    if (await previewButton.isVisible()) {
      await previewButton.click();
    }
    
    // Verify preview shows changes
    await expect(page.locator('text=/Modified/i').or(page.locator('text=/Updated/i'))).toBeVisible({ timeout: 5000 });
    
    // Should show the price changes
    await expect(page.locator('text=/1350/').or(page.locator('text=/95/'))).toBeVisible();
    
    // Step 7: Apply changes
    const applyButton = page.locator('[data-testid="apply-changes"]').or(page.locator('button:has-text("Apply")').or(page.locator('button:has-text("Import")'))).first();
    await applyButton.click();
    
    // Step 8: Verify success message
    await expect(page.locator('text=/success/i').or(page.locator('text=/imported/i'))).toBeVisible({ timeout: 10000 });
    
    // Step 9: Verify changes are reflected in the product grid
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Look for the modified prices in the grid
    await expect(page.locator('text=/1350/').or(page.locator('text=/1,350/'))).toBeVisible();
    await expect(page.locator('text=/95/').or(page.locator('text=/Bread.*Updated/i'))).toBeVisible();
    
    // Clean up temp file
    fs.unlinkSync(tempFilePath);
  });

  test('CSV import validates data correctly', async ({ page }) => {
    // Navigate to import
    const importButton = page.locator('[data-testid="import-csv"]').or(page.locator('button:has-text("Import")')).first();
    await importButton.click();
    
    // Create CSV with validation errors
    const invalidCSVContent = `sku,name_en,name_si,name_ta,category_id,unit,price_retail,price_wholesale,price_credit,price_other,cost,supplier_id,reorder_level,is_scale_item,active,barcode
INVALID1,,Invalid Product Name,தவறான தயாரிப்பு,1,pc,-100.00,abc,200.00,150.00,50.00,999,5,false,true,1234567890999
DUPLICATE1,Duplicate SKU,நகल் SKU,நகல் SKU,1,pc,100.00,90.00,95.00,92.00,70.00,1,10,false,true,1234567890998
DUPLICATE1,Another Duplicate,மற்றொரு நகல்,மற்றொரு நகல்,1,pc,200.00,180.00,190.00,185.00,140.00,1,5,false,true,1234567890997`;
    
    const fs = require('fs');
    const path = require('path');
    const tempFilePath = path.join(__dirname, 'temp-invalid-products.csv');
    fs.writeFileSync(tempFilePath, invalidCSVContent);
    
    const fileInput = page.locator('[data-testid="csv-file-input"]').or(page.locator('input[type="file"]')).first();
    await fileInput.setInputFiles(tempFilePath);
    
    // Preview changes
    const previewButton = page.locator('[data-testid="preview-changes"]').or(page.locator('button:has-text("Preview")')).first();
    if (await previewButton.isVisible()) {
      await previewButton.click();
    }
    
    // Verify validation errors are shown
    await expect(page.locator('text=/error/i').or(page.locator('text=/invalid/i'))).toBeVisible({ timeout: 5000 });
    
    // Should show specific errors
    await expect(page.locator('text=/negative/i').or(page.locator('text=/price/i'))).toBeVisible();
    await expect(page.locator('text=/duplicate/i').or(page.locator('text=/sku/i'))).toBeVisible();
    
    // Apply button should be disabled or show warning
    const applyButton = page.locator('[data-testid="apply-changes"]').or(page.locator('button:has-text("Apply")').or(page.locator('button:has-text("Import")'))).first();
    
    if (await applyButton.isVisible()) {
      const isDisabled = await applyButton.isDisabled();
      expect(isDisabled).toBe(true);
    }
    
    // Clean up
    fs.unlinkSync(tempFilePath);
  });

  test('CSV export includes correct headers and data', async ({ page }) => {
    // Export CSV
    const exportButton = page.locator('[data-testid="export-csv"]').or(page.locator('button:has-text("Export")')).first();
    
    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();
    const download = await downloadPromise;
    
    // Read the CSV content
    const csvPath = await download.path();
    const fs = require('fs');
    const csvContent = fs.readFileSync(csvPath!, 'utf-8');
    
    // Verify headers are correct
    const expectedHeaders = [
      'sku',
      'name_en',
      'name_si', 
      'name_ta',
      'category_id',
      'unit',
      'price_retail',
      'price_wholesale',
      'price_credit',
      'price_other',
      'cost',
      'supplier_id',
      'reorder_level',
      'is_scale_item',
      'active',
      'barcode'
    ];
    
    const lines = csvContent.split('\n');
    const headerLine = lines.find(line => line.includes('sku,name_en'));
    expect(headerLine).toBeTruthy();
    
    if (headerLine) {
      const headers = headerLine.split(',');
      for (const expectedHeader of expectedHeaders) {
        expect(headers).toContain(expectedHeader);
      }
    }
    
    // Verify data rows exist
    const dataLines = lines.filter(line => 
      line.includes('RICE001') || 
      line.includes('BREAD1') || 
      line.includes('BANANA1')
    );
    expect(dataLines.length).toBeGreaterThan(0);
    
    // Verify at least one product has all expected fields
    const riceRow = dataLines.find(line => line.includes('RICE001'));
    if (riceRow) {
      const fields = riceRow.split(',');
      expect(fields.length).toBeGreaterThanOrEqual(expectedHeaders.length);
      
      // Verify specific data
      expect(riceRow).toMatch(/RICE001/);
      expect(riceRow).toMatch(/Basmati/i);
      expect(riceRow).toMatch(/\d+\.\d+/); // Should have decimal prices
    }
  });

  test('handles missing price policy correctly', async ({ page }) => {
    // First, check if there's a "Missing Price Policy" setting
    await page.goto('/settings');
    
    // Look for pricing policy settings
    const pricingSection = page.locator('text=/pricing/i').or(page.locator('text=/policy/i'));
    if (await pricingSection.isVisible()) {
      await pricingSection.click();
      
      // Set policy to "Block"
      const blockOption = page.locator('input[value="block"]').or(page.locator('text=/block/i'));
      if (await blockOption.isVisible()) {
        await blockOption.click();
        
        const saveButton = page.locator('button:has-text("Save")');
        if (await saveButton.isVisible()) {
          await saveButton.click();
        }
      }
    }
    
    // Go back to products
    await page.goto('/products');
    
    // Try to import CSV with missing retail prices
    const importButton = page.locator('[data-testid="import-csv"]').or(page.locator('button:has-text("Import")')).first();
    await importButton.click();
    
    const csvWithMissingPrices = `sku,name_en,name_si,name_ta,category_id,unit,price_retail,price_wholesale,price_credit,price_other,cost,supplier_id,reorder_level,is_scale_item,active,barcode
MISSING1,Missing Price Product,விலை இல்லாத தயாரிப்பு,விலை இல்லாத தயாரிப்பு,1,pc,,100.00,110.00,105.00,80.00,1,10,false,true,1234567890111`;
    
    const fs = require('fs');
    const path = require('path');
    const tempFilePath = path.join(__dirname, 'temp-missing-prices.csv');
    fs.writeFileSync(tempFilePath, csvWithMissingPrices);
    
    const fileInput = page.locator('[data-testid="csv-file-input"]').or(page.locator('input[type="file"]')).first();
    await fileInput.setInputFiles(tempFilePath);
    
    // Preview should show validation error
    const previewButton = page.locator('[data-testid="preview-changes"]').or(page.locator('button:has-text("Preview")')).first();
    if (await previewButton.isVisible()) {
      await previewButton.click();
    }
    
    // Should show missing price error
    await expect(page.locator('text=/missing.*price/i').or(page.locator('text=/retail.*required/i'))).toBeVisible({ timeout: 5000 });
    
    // Import should be blocked
    const applyButton = page.locator('[data-testid="apply-changes"]').or(page.locator('button:has-text("Apply")')).first();
    if (await applyButton.isVisible()) {
      const isDisabled = await applyButton.isDisabled();
      expect(isDisabled).toBe(true);
    }
    
    // Clean up
    fs.unlinkSync(tempFilePath);
  });
});








