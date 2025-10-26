import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    include: [
      'src/**/*.{test,spec}.{js,ts,tsx}',
      'tests/**/*.{test,spec}.{js,ts,tsx}'
    ],
    exclude: [
      'node_modules',
      'dist',
      'build',
      'tests/e2e/**/*',
      'tests/api/contracts.test.ts' // Exclude API contract tests from global setup
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'src/**/*.{js,ts}',
        'server/**/*.{js,ts}'
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{js,ts}',
        'src/**/*.spec.{js,ts}',
        'server/**/*.test.{js,ts}',
        'server/**/*.spec.{js,ts}',
        'tests/**/*',
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@': resolve((globalThis as { process?: { cwd?: () => string } }).process?.cwd?.() || process.cwd(), './src'),
      '@/components': resolve((globalThis as { process?: { cwd?: () => string } }).process?.cwd?.() || process.cwd(), './src/components'),
      '@/lib': resolve((globalThis as { process?: { cwd?: () => string } }).process?.cwd?.() || process.cwd(), './src/lib'),
      '@/pages': resolve((globalThis as { process?: { cwd?: () => string } }).process?.cwd?.() || process.cwd(), './src/pages'),
      '@/state': resolve((globalThis as { process?: { cwd?: () => string } }).process?.cwd?.() || process.cwd(), './src/state'),
      '@/hooks': resolve((globalThis as { process?: { cwd?: () => string } }).process?.cwd?.() || process.cwd(), './src/hooks'),
      '@/utils': resolve((globalThis as { process?: { cwd?: () => string } }).process?.cwd?.() || process.cwd(), './src/utils')
    }
  }
});