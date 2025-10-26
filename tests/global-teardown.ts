/**
 * Global teardown for Playwright E2E tests
 * Cleans up test environment
 */

import { FullConfig } from '@playwright/test';
import { existsSync, unlinkSync } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

async function globalTeardown(_config: FullConfig) {
  console.log('🧹 Cleaning up E2E test environment...');

  try {
    // Stop any running processes
    try {
      execSync('pkill -f "npm run dev"', { stdio: 'pipe' });
    } catch (error) {
      // Process might not be running, ignore error
    }

    // Clean up test database
    const testDbPath = path.join((globalThis as any).__dirname, '../test.db');
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
      console.log('🗑️ Test database cleaned up');
    }

    // Clean up any other test artifacts
    const testArtifacts = [
      path.join((globalThis as any).__dirname, '../test-results'),
      path.join((globalThis as any).__dirname, '../coverage'),
      path.join((globalThis as any).__dirname, '../.nyc_output')
    ];

    testArtifacts.forEach(artifact => {
      if (existsSync(artifact)) {
        execSync(`rm -rf "${artifact}"`, { stdio: 'pipe' });
        console.log(`🗑️ Cleaned up ${artifact}`);
      }
    });

    console.log('✅ E2E test environment cleanup complete!');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    // Don't throw error to avoid masking test failures
  }
}

export default globalTeardown;










