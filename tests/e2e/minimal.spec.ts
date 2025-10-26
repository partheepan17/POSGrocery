import { test, expect } from '@playwright/test';

test.describe('Minimal E2E Tests', () => {
  test('should load a basic HTML page', async ({ page }) => {
    // Create a simple HTML page for testing
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
        </head>
        <body>
          <h1>Hello World</h1>
          <button id="test-button">Click Me</button>
          <div id="result" style="display: none;">Button Clicked!</div>
        </body>
        <script>
          document.getElementById('test-button').addEventListener('click', function() {
            document.getElementById('result').style.display = 'block';
          });
        </script>
      </html>
    `);

    // Test basic page functionality
    await expect(page.locator('h1')).toHaveText('Hello World');
    await expect(page.locator('#test-button')).toBeVisible();
    
    // Test button click
    await page.click('#test-button');
    await expect(page.locator('#result')).toBeVisible();
    await expect(page.locator('#result')).toHaveText('Button Clicked!');
  });

  test('should handle form interactions', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Form Test</title>
        </head>
        <body>
          <form id="test-form">
            <input type="text" id="name" placeholder="Enter your name" required>
            <input type="email" id="email" placeholder="Enter your email" required>
            <button type="submit">Submit</button>
          </form>
          <div id="form-result"></div>
        </body>
        <script>
          document.getElementById('test-form').addEventListener('submit', function(e) {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            document.getElementById('form-result').textContent = \`Hello \${name}, your email is \${email}\`;
          });
        </script>
      </html>
    `);

    // Fill form
    await page.fill('#name', 'John Doe');
    await page.fill('#email', 'john@example.com');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Check result
    await expect(page.locator('#form-result')).toHaveText('Hello John Doe, your email is john@example.com');
  });

  test('should handle async operations', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Async Test</title>
        </head>
        <body>
          <button id="load-data">Load Data</button>
          <div id="loading" style="display: none;">Loading...</div>
          <div id="data"></div>
        </body>
        <script>
          document.getElementById('load-data').addEventListener('click', async function() {
            document.getElementById('loading').style.display = 'block';
            
            // Simulate async operation
            await new Promise(resolve => setTimeout(resolve, 100));
            
            document.getElementById('loading').style.display = 'none';
            document.getElementById('data').textContent = 'Data loaded successfully!';
          });
        </script>
      </html>
    `);

    // Click load button
    await page.click('#load-data');
    
    // Check loading state
    await expect(page.locator('#loading')).toBeVisible();
    
    // Wait for data to load
    await expect(page.locator('#data')).toHaveText('Data loaded successfully!', { timeout: 5000 });
    await expect(page.locator('#loading')).toBeHidden();
  });
});











