/**
 * Global setup for Playwright E2E tests
 * Sets up test database and users
 */

import { chromium, FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import { existsSync, unlinkSync } from 'fs';
import path from 'path';

async function globalSetup(_config: FullConfig) {
  console.log('🚀 Setting up E2E test environment...');

  // Clean up any existing test database
  const testDbPath = path.join((globalThis as any).__dirname, '../test.db');
  if (existsSync(testDbPath)) {
    unlinkSync(testDbPath);
  }

  // Set test environment variables
  (globalThis as any).process.env.NODE_ENV = 'test';
  (globalThis as any).process.env.DATABASE_URL = 'file:test.db';
  (globalThis as any).process.env.JWT_SECRET = 'test-secret-key';
  (globalThis as any).process.env.DEFAULT_TENANT_ID = 'test-tenant-e2e';

  try {
    // Run database migrations
    console.log('📊 Running database migrations...');
    execSync('npm run db:migrate', { stdio: 'inherit' });

    // Seed test data
    console.log('🌱 Seeding test data...');
    execSync('npm run db:seed', { stdio: 'inherit' });

    // Start the application server
    console.log('🖥️ Starting application server...');
    const _serverProcess = execSync('npm run dev', { 
      stdio: 'pipe',
      detached: true 
    });

    // Wait for server to be ready
    console.log('⏳ Waiting for server to be ready...');
    await waitForServer('http://localhost:3000', 30000);

    // Create test users
    console.log('👥 Creating test users...');
    await createTestUsers();

    console.log('✅ E2E test environment setup complete!');
  } catch (error) {
    console.error('❌ Failed to setup E2E test environment:', error);
    throw error;
  }
}

async function waitForServer(url: string, timeout: number): Promise<void> {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch (error) {
      // Server not ready yet, continue waiting
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error(`Server did not start within ${timeout}ms`);
}

async function createTestUsers(): Promise<void> {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to registration page
    await page.goto('http://localhost:3000/register');

    // Create admin user
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.fill('[data-testid="confirm-password-input"]', 'admin123');
    await page.selectOption('[data-testid="role-select"]', 'admin');
    await page.click('[data-testid="register-button"]');

    // Wait for registration to complete
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Create cashier user
    await page.goto('http://localhost:3000/register');
    await page.fill('[data-testid="username-input"]', 'cashier');
    await page.fill('[data-testid="email-input"]', 'cashier@test.com');
    await page.fill('[data-testid="password-input"]', 'cashier123');
    await page.fill('[data-testid="confirm-password-input"]', 'cashier123');
    await page.selectOption('[data-testid="role-select"]', 'cashier');
    await page.click('[data-testid="register-button"]');

    // Wait for registration to complete
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    console.log('✅ Test users created successfully');
  } catch (error) {
    console.error('❌ Failed to create test users:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;










