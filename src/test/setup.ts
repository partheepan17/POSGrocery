/**
 * Test Setup Configuration
 * Configures mocks and test utilities for all test files
 */

import { beforeAll, beforeEach } from 'vitest';
import { setupDatabaseMocks, resetMockData } from './utils/databaseMock';

// Setup database mocks before all tests
beforeAll(() => {
  setupDatabaseMocks();
});

// Reset mock data before each test
beforeEach(() => {
  resetMockData();
});

// Global test configuration
export const testConfig = {
  timeout: 10000, // 10 second timeout for tests
  retry: 2, // Retry failed tests twice
};





