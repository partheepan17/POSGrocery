import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: [], // Don't load setupTests.ts
    environment: 'node',
  },
});






