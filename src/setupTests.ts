/**
 * Test setup file for Vitest
 * This file is run before each test file
 */

import '@testing-library/jest-dom';
import { expect, afterEach, vi, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_API_BASE_URL: 'http://localhost:3002',
    VITE_PRINT_SERVER_URL: 'ws://localhost:8251/ws/print',
    DEV: true,
    PROD: false,
  },
  writable: true,
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock IntersectionObserver
(globalThis as any).IntersectionObserver = class IntersectionObserver {
  root: Element | null = null;
  rootMargin: string = '0px';
  thresholds: ReadonlyArray<number> = [0];
  
  constructor(
    public callback: (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void,
    options?: { root?: Element | null; rootMargin?: string; threshold?: number | number[] }
  ) {
    if (options) {
      this.root = (options.root instanceof Element) ? options.root : null;
      this.rootMargin = options.rootMargin || '0px';
      this.thresholds = Array.isArray(options.threshold) ? options.threshold : [options.threshold || 0];
    }
  }
  
  observe() {}
  disconnect() {}
  unobserve() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
};

// Mock ResizeObserver
(globalThis as any).ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {}
  disconnect() {}
  unobserve() {}
};

// Mock WebSocket
(globalThis as any).WebSocket = class WebSocket {
  constructor() {}
  close() {}
  send() {}
  addEventListener() {}
  removeEventListener() {}
} as any;

// Mock data store for state persistence
const mockDataStore = {
  products: new Map(),
  customers: new Map(),
  suppliers: new Map(),
  categories: new Map(),
  discountRules: new Map(),
  nextId: 1
};

// Initialize with default data
const defaultProduct = {
  id: 1,
  sku: 'TEST001',
  name_en: 'Test Product',
  name_si: 'පරීක්ෂණ නිෂ්පාදනය',
  name_ta: 'சோதனை தயாரிப்பு',
  category_id: 1,
  unit: 'pc',
  price_retail: 100.00,
  price_wholesale: 90.00,
  price_credit: 95.00,
  price_other: 92.00,
  cost: 70.00,
  supplier_id: 1,
  reorder_level: 10,
  is_scale_item: false,
  is_active: true,
  active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const defaultCustomer = {
  id: 1,
  customer_name: 'Test Customer Ltd',
  customer_type: 'Wholesale',
  customer_email: 'test@customer.com',
  customer_phone: '+94123456789',
  address: '123 Test Street',
  city: 'Colombo',
  credit_limit: 10000.00,
  active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const defaultSupplier = {
  id: 1,
  supplier_name: 'Test Supplier Co',
  contact_person: 'John Doe',
  email: 'test@supplier.com',
  phone: '+94123456789',
  address: '456 Supplier Ave',
  city: 'Colombo',
  active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const defaultCategory = {
  id: 1,
  name: 'Test Category',
  description: 'Test category description',
  active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const defaultDiscountRule = {
  id: 1,
  rule_name: 'Test Discount Rule',
  rule_type: 'percentage',
  discount_value: 10.0,
  min_quantity: 1,
  max_quantity: null,
  start_date: new Date().toISOString(),
  end_date: null,
  active: true,
  target_sku: 'TEST001',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

mockDataStore.products.set(1, defaultProduct);
mockDataStore.customers.set(1, defaultCustomer);
mockDataStore.suppliers.set(1, defaultSupplier);
mockDataStore.categories.set(1, defaultCategory);
mockDataStore.discountRules.set(1, defaultDiscountRule);

// Mock fetch
(globalThis as any).fetch = vi.fn().mockImplementation((url: string, options?: any) => {
  // Mock API responses for tests
  if (url.includes('/api/products')) {
          // Handle POST requests (create operations)
          if (options?.method === 'POST') {
            const newId = mockDataStore.nextId++;
            const requestBody = JSON.parse(options.body || '{}');
            const newProduct = {
              ...defaultProduct,
              id: newId,
              sku: requestBody.sku || `TEST${newId.toString().padStart(3, '0')}`,
              name_en: requestBody.name_en || 'Test Product',
              barcode: requestBody.barcode || null,
              name_si: requestBody.name_si || defaultProduct.name_si,
              name_ta: requestBody.name_ta || defaultProduct.name_ta,
              price_retail: requestBody.price_retail || defaultProduct.price_retail,
              price_wholesale: requestBody.price_wholesale || defaultProduct.price_wholesale,
              price_credit: requestBody.price_credit || defaultProduct.price_credit,
              price_other: requestBody.price_other || defaultProduct.price_other,
              cost: requestBody.cost || defaultProduct.cost,
              is_scale_item: requestBody.is_scale_item || defaultProduct.is_scale_item,
              active: requestBody.active !== undefined ? requestBody.active : defaultProduct.active
            };
            mockDataStore.products.set(newId, newProduct);
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: newProduct
        }),
        headers: new Map([['content-type', 'application/json']])
      });
    }
    
    // Handle PUT requests (update operations)
    if (options?.method === 'PUT') {
      const id = parseInt(url.split('/').pop() || '1');
      const existingProduct = mockDataStore.products.get(id);
      if (existingProduct) {
        const updatedProduct = {
          ...existingProduct,
          name_en: 'Updated Test Product',
          price_retail: 120.00,
          active: false,
          updated_at: new Date().toISOString()
        };
        mockDataStore.products.set(id, updatedProduct);
        
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: updatedProduct
          }),
          headers: new Map([['content-type', 'application/json']])
        });
      }
    }
    
    // Handle DELETE requests (delete operations)
    if (options?.method === 'DELETE') {
      const id = parseInt(url.split('/').pop() || '1');
      mockDataStore.products.delete(id);
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: null
        }),
        headers: new Map([['content-type', 'application/json']])
      });
    }
    
    // Handle GET requests for specific product by ID
    if (url.match(/\/api\/products\/\d+$/)) {
      const id = parseInt(url.split('/').pop() || '1');
      const product = mockDataStore.products.get(id);
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: product !== undefined,
          data: product || null
        }),
        headers: new Map([['content-type', 'application/json']])
      });
    }
    
    // Handle GET by SKU (search endpoint)
    if (url.includes('/api/products/search')) {
      const urlObj = new URL(url, 'http://localhost');
      const query = urlObj.searchParams.get('q');
      const limit = parseInt(urlObj.searchParams.get('limit') || '10');
      
      if (query) {
        // Find products that match the query (by SKU or name)
        const matchingProducts = Array.from(mockDataStore.products.values())
          .filter(p => 
            p.sku.toLowerCase().includes(query.toLowerCase()) || 
            p.name_en.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, limit);
        
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              products: matchingProducts
            }
          }),
          headers: new Map([['content-type', 'application/json']])
        });
      }
    }
    
    // Handle GET by ID
    if (url.includes('/api/products/') && !url.includes('/search') && !url.includes('sku=')) {
      const id = parseInt(url.split('/').pop() || '1');
      const product = mockDataStore.products.get(id);
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: product || null
        }),
        headers: new Map([['content-type', 'application/json']])
      });
    }
    
    // Handle GET requests for product by SKU
    if (url.includes('sku=')) {
      const sku = url.split('sku=')[1];
      const product = Array.from(mockDataStore.products.values()).find(p => p.sku === sku);
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: product || null
        }),
        headers: new Map([['content-type', 'application/json']])
      });
    }
    
    // Handle GET requests (list operations)
    const products = Array.from(mockDataStore.products.values());
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          items: products,
          total: products.length,
          page: 1,
          pageSize: 10,
          pages: Math.ceil(products.length / 10)
        }
      }),
      headers: new Map([['content-type', 'application/json']])
    });
  }
  
  if (url.includes('/api/customers')) {
    const defaultCustomer = {
      id: 1,
      customer_name: 'Test Customer Ltd',
      phone: '+94111234567',
      customer_type: 'Wholesale',
      note: 'Test customer for smoke tests',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
        // Handle POST requests (create operations)
        if (options?.method === 'POST') {
          const newId = mockDataStore.nextId++;
          const requestBody = JSON.parse(options.body || '{}');
          const newCustomer = {
            ...defaultCustomer,
            id: newId,
            customer_name: requestBody.customer_name || 'Test Customer Ltd'
          };
          mockDataStore.customers.set(newId, newCustomer);
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: newCustomer
        }),
        headers: new Map([['content-type', 'application/json']])
      });
    }
    
    // Handle PUT requests (update operations)
    if (options?.method === 'PUT') {
      const id = parseInt(url.split('/').pop() || '1');
      const existingCustomer = mockDataStore.customers.get(id);
      if (existingCustomer) {
        const updatedCustomer = {
          ...existingCustomer,
          customer_name: 'Updated Test Customer Ltd',
          customer_type: 'Credit',
          note: 'Updated note for testing',
          updated_at: new Date().toISOString()
        };
        mockDataStore.customers.set(id, updatedCustomer);
        
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: updatedCustomer
          }),
          headers: new Map([['content-type', 'application/json']])
        });
      }
    }
    
    const customers = Array.from(mockDataStore.customers.values());
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: customers
      }),
      headers: new Map([['content-type', 'application/json']])
    });
  }
  
  if (url.includes('/api/suppliers')) {
    const defaultSupplier = {
      id: 1,
      supplier_name: 'Test Supplier Co',
      phone: '+94117654321',
      email: 'test@supplier.com',
      address: '123 Test Street, Test City',
      tax_id: 'TS123456789',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
        // Handle POST requests (create operations)
        if (options?.method === 'POST') {
          const newId = mockDataStore.nextId++;
          const requestBody = JSON.parse(options.body || '{}');
          const newSupplier = {
            ...defaultSupplier,
            id: newId,
            supplier_name: requestBody.supplier_name || 'Test Supplier Co'
          };
          mockDataStore.suppliers.set(newId, newSupplier);
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: newSupplier
        }),
        headers: new Map([['content-type', 'application/json']])
      });
    }
    
    const suppliers = Array.from(mockDataStore.suppliers.values());
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: suppliers
      }),
      headers: new Map([['content-type', 'application/json']])
    });
  }
  
  if (url.includes('/api/categories')) {
    const defaultCategory = {
      id: 1,
      name: 'Test Category',
      description: 'Category for smoke testing',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
        // Handle POST requests (create operations)
        if (options?.method === 'POST') {
          const newId = mockDataStore.nextId++;
          const requestBody = JSON.parse(options.body || '{}');
          const newCategory = {
            ...defaultCategory,
            id: newId,
            name: requestBody.name || 'Test Category'
          };
          mockDataStore.categories.set(newId, newCategory);
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: newCategory
        }),
        headers: new Map([['content-type', 'application/json']])
      });
    }
    
    const categories = Array.from(mockDataStore.categories.values());
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: categories
      }),
      headers: new Map([['content-type', 'application/json']])
    });
  }
  
  if (url.includes('/api/discount-rules')) {
    const defaultRule = {
      id: 1,
      rule_name: 'Test Discount Rule',
      rule_type: 'PRODUCT_QTY_CAP',
      target_sku: 'TEST001',
      target_category: null,
      min_qty: 2.0,
      discount_type: 'PERCENTAGE',
      discount_value: 10.0,
      max_discount: 50.0,
      priority: 100,
      active: true,
      description: 'Test discount rule for smoke tests',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Handle POST requests (create operations)
    if (options?.method === 'POST') {
      const newId = mockDataStore.nextId++;
      const requestBody = JSON.parse(options.body || '{}');
      const newRule = {
        ...defaultRule,
        id: newId,
        rule_name: requestBody.rule_name || 'Test Discount Rule'
      };
      mockDataStore.discountRules.set(newId, newRule);
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: newRule
        }),
        headers: new Map([['content-type', 'application/json']])
      });
    }
    
    const rules = Array.from(mockDataStore.discountRules.values());
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: rules
      }),
      headers: new Map([['content-type', 'application/json']])
    });
  }
  
  // Default response
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      success: true,
      data: {}
    }),
    headers: new Map([['content-type', 'application/json']])
  });
});

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  console.error = vi.fn();
  console.warn = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

