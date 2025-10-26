import { test, expect } from '@playwright/test';

test.describe('POS Grocery System - Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the backend API responses
    await page.route('**/api/products**', async route => {
      const mockProducts = [
        {
          id: 1,
          sku: 'TEST001',
          name_en: 'Test Product 1',
          name_si: 'පරීක්ෂණ නිෂ්පාදන 1',
          price_retail: 100.00,
          cost: 80.00,
          stock_qty: 50,
          unit: 'pc',
          is_active: true,
          category_id: 1,
          barcode: '1234567890123'
        },
        {
          id: 2,
          sku: 'TEST002',
          name_en: 'Test Product 2 (Weight)',
          name_si: 'පරීක්ෂණ නිෂ්පාදන 2 (බර)',
          price_retail: 200.00,
          cost: 150.00,
          stock_qty: 25,
          unit: 'kg',
          is_active: true,
          category_id: 1,
          barcode: '1234567890124',
          is_scale_item: true
        }
      ];
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: mockProducts
          },
          meta: {
            page: 1,
            pageSize: 20,
            total: 2,
            pages: 1
          }
        })
      });
    });

    await page.route('**/api/health**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          ts: new Date().toISOString()
        })
      });
    });

    await page.route('**/api/sales**', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 1,
              receipt_number: 'RCP-001',
              total_amount: 100.00,
              created_at: new Date().toISOString()
            }
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              items: []
            },
            meta: {
              page: 1,
              pageSize: 20,
              total: 0,
              pages: 0
            }
          })
        });
      }
    });

    await page.route('**/api/reports/sales-summary**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            daily: [
              { sale_date: '2024-01-01', total_revenue: 1000, total_sales: 10 },
              { sale_date: '2024-01-02', total_revenue: 1500, total_sales: 15 }
            ],
            by_cashier: [
              { cashier_name: 'John Doe', total_revenue: 1200, total_sales: 12 }
            ],
            by_payment_method: [
              { payment_method: 'cash', total_revenue: 800, total_sales: 8 },
              { payment_method: 'card', total_revenue: 1700, total_sales: 17 }
            ]
          }
        })
      });
    });

    await page.route('**/api/reports/top-skus**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            by_quantity: [
              { product_name: 'Test Product 1', total_quantity_sold: 50, total_revenue: 5000 },
              { product_name: 'Test Product 2', total_quantity_sold: 25, total_revenue: 5000 }
            ],
            by_revenue: [
              { product_name: 'Test Product 1', total_quantity_sold: 50, total_revenue: 5000 },
              { product_name: 'Test Product 2', total_quantity_sold: 25, total_revenue: 5000 }
            ]
          }
        })
      });
    });

    await page.route('**/api/reports/low-stock**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                product_id: 1,
                product_name: 'Test Product 1',
                current_stock: 5,
                threshold: 10,
                status: 'low'
              }
            ]
          }
        })
      });
    });
  });

  test('should load products list', async ({ page }) => {
    await page.goto('/products');
    
    // Wait for products to load
    await expect(page.locator('[data-testid="products-table"]')).toBeVisible();
    
    // Check if products are displayed
    await expect(page.locator('text=Test Product 1')).toBeVisible();
    await expect(page.locator('text=Test Product 2 (Weight)')).toBeVisible();
    
    // Check if SKUs are displayed
    await expect(page.locator('text=TEST001')).toBeVisible();
    await expect(page.locator('text=TEST002')).toBeVisible();
  });

  test('should add items to cart', async ({ page }) => {
    await page.goto('/sales');
    
    // Wait for the sales page to load
    await expect(page.locator('[data-testid="sales-page"]')).toBeVisible();
    
    // Search for a product
    await page.fill('[data-testid="product-search"]', 'TEST001');
    await page.press('[data-testid="product-search"]', 'Enter');
    
    // Wait for search results
    await expect(page.locator('text=Test Product 1')).toBeVisible();
    
    // Click on the product to add to cart
    await page.click('[data-testid="product-item-TEST001"]');
    
    // Check if item was added to cart
    await expect(page.locator('[data-testid="cart-item-TEST001"]')).toBeVisible();
    await expect(page.locator('text=Test Product 1')).toBeVisible();
    await expect(page.locator('text=රු 100.00')).toBeVisible();
  });

  test('should create a sale (mock backend)', async ({ page }) => {
    await page.goto('/sales');
    
    // Add items to cart
    await page.fill('[data-testid="product-search"]', 'TEST001');
    await page.press('[data-testid="product-search"]', 'Enter');
    await page.click('[data-testid="product-item-TEST001"]');
    
    // Add another item
    await page.fill('[data-testid="product-search"]', 'TEST002');
    await page.press('[data-testid="product-search"]', 'Enter');
    await page.click('[data-testid="product-item-TEST002"]');
    
    // Check cart total
    await expect(page.locator('[data-testid="cart-total"]')).toContainText('රු 300.00');
    
    // Proceed to payment
    await page.click('[data-testid="proceed-to-payment"]');
    
    // Fill payment details
    await page.fill('[data-testid="cash-amount"]', '300');
    await page.click('[data-testid="payment-method-cash"]');
    
    // Complete the sale
    await page.click('[data-testid="complete-sale"]');
    
    // Check for success message
    await expect(page.locator('[data-testid="sale-success"]')).toBeVisible();
    await expect(page.locator('text=Sale completed successfully')).toBeVisible();
  });

  test('should load reports page', async ({ page }) => {
    await page.goto('/reports');
    
    // Wait for reports page to load
    await expect(page.locator('[data-testid="reports-page"]')).toBeVisible();
    
    // Check if all three widgets are present
    await expect(page.locator('[data-testid="sales-summary-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="top-skus-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="low-stock-table"]')).toBeVisible();
    
    // Check if charts are rendered
    await expect(page.locator('text=Sales Summary')).toBeVisible();
    await expect(page.locator('text=Top SKUs')).toBeVisible();
    await expect(page.locator('text=Low Stock')).toBeVisible();
    
    // Check if data is displayed
    await expect(page.locator('text=Test Product 1')).toBeVisible();
  });

  test('should handle weighted items', async ({ page }) => {
    await page.goto('/sales');
    
    // Search for weighted product
    await page.fill('[data-testid="product-search"]', 'TEST002');
    await page.press('[data-testid="product-search"]', 'Enter');
    
    // Click on weighted product
    await page.click('[data-testid="product-item-TEST002"]');
    
    // Check if weight input modal appears
    await expect(page.locator('[data-testid="weight-input-modal"]')).toBeVisible();
    
    // Enter weight
    await page.fill('[data-testid="weight-input"]', '2.5');
    await page.click('[data-testid="confirm-weight"]');
    
    // Check if weighted item is in cart
    await expect(page.locator('[data-testid="cart-item-TEST002"]')).toBeVisible();
    await expect(page.locator('text=Weight: 2.500 kg')).toBeVisible();
    await expect(page.locator('text=රු 500.00')).toBeVisible(); // 2.5 * 200
  });

  test('should navigate between pages', async ({ page }) => {
    // Test navigation to different pages
    await page.goto('/');
    
    // Navigate to products
    await page.click('[data-testid="nav-products"]');
    await expect(page).toHaveURL('/products');
    
    // Navigate to sales
    await page.click('[data-testid="nav-sales"]');
    await expect(page).toHaveURL('/sales');
    
    // Navigate to reports
    await page.click('[data-testid="nav-reports"]');
    await expect(page).toHaveURL('/reports');
  });
});











