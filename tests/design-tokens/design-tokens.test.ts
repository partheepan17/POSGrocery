import { test, expect } from '@playwright/test';

test.describe('Design Tokens Enforcement', () => {
  test('should flag raw color values in code', async ({ page }) => {
    // This test would be run by ESLint, not Playwright
    // But we can test that our components use design tokens correctly
    
    await page.goto('/sales');
    await page.waitForLoadState('networkidle');
    
    // Check that components are using Tailwind classes (which use design tokens)
    const elements = await page.locator('[class*="bg-"], [class*="text-"], [class*="border-"]').all();
    
    // All elements should have Tailwind classes, not inline styles
    for (const element of elements) {
      const className = await element.getAttribute('class');
      const style = await element.getAttribute('style');
      
      // Should have Tailwind classes
      expect(className).toBeTruthy();
      
      // Should not have inline color styles
      if (style) {
        expect(style).not.toMatch(/#[A-Fa-f0-9]{6}|#[A-Fa-f0-9]{3}/);
        expect(style).not.toMatch(/rgb\(/);
        expect(style).not.toMatch(/rgba\(/);
        expect(style).not.toMatch(/hsl\(/);
        expect(style).not.toMatch(/hsla\(/);
      }
    }
  });

  test('should use consistent spacing tokens', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForLoadState('networkidle');
    
    // Check that spacing classes follow the 8px grid system
    const elements = await page.locator('[class*="p-"], [class*="m-"], [class*="gap-"]').all();
    
    for (const element of elements) {
      const className = await element.getAttribute('class');
      
      if (className) {
        // Extract spacing values from classes
        const spacingMatches = className.match(/(?:p|m|gap)-(\d+(?:\.\d+)?)/g);
        
        if (spacingMatches) {
          spacingMatches.forEach(match => {
            const value = match.split('-')[1];
            const numValue = parseFloat(value);
            
            // Should be a valid spacing token (0.5, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 56, 64, 72, 80, 96)
            const validSpacing = [0.5, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 56, 64, 72, 80, 96, 18, 88, 128];
            expect(validSpacing).toContain(numValue);
          });
        }
      }
    }
  });

  test('should use consistent font size tokens', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForLoadState('networkidle');
    
    // Check that font size classes use design tokens
    const elements = await page.locator('[class*="text-pos-"]').all();
    
    for (const element of elements) {
      const className = await element.getAttribute('class');
      
      if (className) {
        // Should use pos- prefixed font sizes
        const fontSizeMatch = className.match(/text-pos-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)/);
        expect(fontSizeMatch).toBeTruthy();
      }
    }
  });

  test('should use consistent border radius tokens', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForLoadState('networkidle');
    
    // Check that border radius classes use design tokens
    const elements = await page.locator('[class*="rounded"]').all();
    
    for (const element of elements) {
      const className = await element.getAttribute('class');
      
      if (className) {
        // Should use valid border radius tokens
        const borderRadiusMatch = className.match(/rounded-(none|sm|DEFAULT|md|lg|xl|2xl|3xl|full)/);
        expect(borderRadiusMatch).toBeTruthy();
      }
    }
  });
});



