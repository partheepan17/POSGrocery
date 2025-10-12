import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 8103,
    host: true,
    hmr: {
      overlay: false, // Disable error overlay to prevent the error you're seeing
      port: 24678, // Use a different port for HMR
    },
    watch: {
      usePolling: false, // Disable polling for better performance
      interval: 1000, // Check for changes every 1 second
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8250',
        changeOrigin: true,
        secure: false,
        timeout: 30000, // Increase timeout
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React libraries
          if (id.includes('react') && !id.includes('react-router')) {
            return 'react-vendor';
          }
          // Routing
          if (id.includes('react-router')) {
            return 'router';
          }
          // UI Icons
          if (id.includes('lucide-react')) {
            return 'ui-icons';
          }
          // State Management
          if (id.includes('zustand')) {
            return 'state';
          }
          // Internationalization
          if (id.includes('i18next') || id.includes('react-i18next')) {
            return 'i18n';
          }
          // Utilities
          if (id.includes('clsx') || id.includes('tailwind-merge')) {
            return 'utils';
          }
          // Notifications
          if (id.includes('react-hot-toast')) {
            return 'notifications';
          }
          // Large libraries
          if (id.includes('react-window')) {
            return 'large-libs';
          }
          // Services (split by domain)
          if (id.includes('/services/')) {
            if (id.includes('dataService')) return 'services-core';
            if (id.includes('csvService')) return 'services-csv';
            if (id.includes('authService')) return 'services-auth';
            if (id.includes('inventoryService')) return 'services-inventory';
            if (id.includes('grnService')) return 'services-grn';
            if (id.includes('refundService')) return 'services-refund';
            return 'services-other';
          }
          // Pages (split by feature)
          if (id.includes('/pages/')) {
            if (id.includes('pos/') || id.includes('POS')) return 'pages-pos';
            if (id.includes('inventory/') || id.includes('Inventory')) return 'pages-inventory';
            if (id.includes('purchasing/') || id.includes('Purchasing')) return 'pages-purchasing';
            if (id.includes('customers/') || id.includes('Customers')) return 'pages-customers';
            if (id.includes('products/') || id.includes('Products')) return 'pages-products';
            if (id.includes('suppliers/') || id.includes('Suppliers')) return 'pages-suppliers';
            return 'pages-other';
          }
          // Components (split by feature)
          if (id.includes('/components/')) {
            if (id.includes('pos/') || id.includes('POS')) return 'components-pos';
            if (id.includes('inventory/') || id.includes('Inventory')) return 'components-inventory';
            if (id.includes('customers/') || id.includes('Customers')) return 'components-customers';
            if (id.includes('products/') || id.includes('Products')) return 'components-products';
            if (id.includes('suppliers/') || id.includes('Suppliers')) return 'components-suppliers';
            if (id.includes('discounts/') || id.includes('Discounts')) return 'components-discounts';
            if (id.includes('pricing/') || id.includes('Pricing')) return 'components-pricing';
            return 'components-other';
          }
          // Store
          if (id.includes('/store/')) {
            return 'store';
          }
          // Utils
          if (id.includes('/utils/')) {
            return 'utils-app';
          }
          // Default chunk for everything else
          return 'vendor';
        }
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable minification (using esbuild which is faster and built-in)
    minify: 'esbuild',
    esbuild: {
      drop: ['console', 'debugger']
    }
  }
})
