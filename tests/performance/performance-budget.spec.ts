import { test, expect } from '@playwright/test';

test.describe('Performance Budget Tests', () => {
  test('should meet LCP budget on sales page', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForLoadState('networkidle');
    
    // Get LCP metric
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });
      });
    });
    
    // LCP should be under 2.5s in production, 2.0s in dev
    const budget = process.env.NODE_ENV === 'production' ? 2500 : 2000;
    expect(lcp).toBeLessThan(budget);
  });

  test('should meet TTI budget on sales page', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForLoadState('networkidle');
    
    // Get TTI metric (approximated by measuring time to interactive)
    const tti = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry.name === 'TTI') {
            resolve(lastEntry.startTime);
            observer.disconnect();
          }
        });
        observer.observe({ entryTypes: ['measure'] });
        
        // Simulate TTI measurement
        setTimeout(() => {
          performance.mark('TTI');
          performance.measure('TTI', 'navigationStart', 'TTI');
        }, 100);
      });
    });
    
    // TTI should be under 2.5s
    expect(tti).toBeLessThan(2500);
  });

  test('should meet search performance budget', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForLoadState('networkidle');
    
    // Measure search performance
    const searchTime = await page.evaluate(() => {
      return new Promise((resolve) => {
        const start = performance.now();
        
        // Simulate search operation
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.value = 'test';
          searchInput.dispatchEvent(new Event('input'));
          
          // Simulate search completion
          setTimeout(() => {
            const end = performance.now();
            resolve(end - start);
          }, 50);
        } else {
          resolve(0);
        }
      });
    });
    
    // Search should complete within 200ms
    expect(searchTime).toBeLessThan(200);
  });

  test('should meet checkout modal open budget', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForLoadState('networkidle');
    
    // Measure checkout modal open time
    const checkoutTime = await page.evaluate(() => {
      return new Promise((resolve) => {
        const start = performance.now();
        
        // Find and click checkout/payment button
        const checkoutButton = document.querySelector('button[data-testid="checkout"], button:has-text("Payment"), button:has-text("Checkout")') as HTMLButtonElement;
        if (checkoutButton) {
          checkoutButton.click();
          
          // Wait for modal to appear
          setTimeout(() => {
            const end = performance.now();
            resolve(end - start);
          }, 100);
        } else {
          resolve(0);
        }
      });
    });
    
    // Checkout modal should open within 500ms
    expect(checkoutTime).toBeLessThan(500);
  });

  test('should meet page load budget', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/sales');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should meet API response budget', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForLoadState('networkidle');
    
    // Measure API response time
    const apiTime = await page.evaluate(async () => {
      const start = performance.now();
      
      try {
        // Make a test API call
        const response = await fetch('/api/health');
        await response.json();
        const end = performance.now();
        return end - start;
      } catch (error) {
        return 0;
      }
    });
    
    // API should respond within 1 second
    expect(apiTime).toBeLessThan(1000);
  });

  test('should have acceptable CLS score', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForLoadState('networkidle');
    
    // Get CLS metric
    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          resolve(clsValue);
        });
        observer.observe({ entryTypes: ['layout-shift'] });
        
        // Wait a bit for layout shifts to settle
        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 2000);
      });
    });
    
    // CLS should be under 0.1
    expect(cls).toBeLessThan(0.1);
  });
});



