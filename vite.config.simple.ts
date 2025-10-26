import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve((globalThis as { process?: { cwd?: () => string } }).process?.cwd?.() || process.cwd(), './src'),
    },
  },
  server: {
    port: 8104,
    host: true,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})










