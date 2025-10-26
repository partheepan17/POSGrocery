/**
 * Database Mock Utility
 * Provides comprehensive mock implementations for all database operations
 * Used to fix 35+ failing tests that depend on database operations
 */

import { vi } from 'vitest';
import type { 
  Customer, 
  Product, 
  Sale, 
  // SaleItem, 
  GRN, 
  GRNLine, 
  Supplier, 
  DiscountRule,
  Shift,
  ShiftMovement,
  // ReturnLine,
  LabelItem
} from '@/types';

// Mock data stores
const mockCustomers: Customer[] = [];
const mockProducts: Product[] = [];
const mockSales: Sale[] = [];
const mockSuppliers: Supplier[] = [];
const mockGRNs: GRN[] = [];
const mockShifts: Shift[] = [];
const mockDiscountRules: DiscountRule[] = [];

// ID counters
let customerIdCounter = 1;
let productIdCounter = 1;
let saleIdCounter = 1;
let supplierIdCounter = 1;
let grnIdCounter = 1;
let shiftIdCounter = 1;
// Remove unused counter
// let discountRuleIdCounter = 1;

// Helper function to generate timestamps
const generateTimestamp = () => new Date().toISOString();

// Mock API Response helper
const createMockResponse = <T>(data: T, success = true) => ({
  success,
  data,
  message: success ? 'Success' : 'Error',
  timestamp: generateTimestamp()
});

// Mock DataService implementation
export const mockDataService = {
  // Customer operations
  async createCustomer(customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> {
    const customer: Customer = {
      id: customerIdCounter++,
      created_at: generateTimestamp(),
      updated_at: generateTimestamp(),
      ...customerData
    };
    mockCustomers.push(customer);
    return customer;
  },

  async getCustomers(filters: any = {}): Promise<{ customers: Customer[]; total: number }> {
    let filteredCustomers = [...mockCustomers];
    
    if (filters.search) {
      filteredCustomers = filteredCustomers.filter(c => 
        c.customer_name?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }
    
    if (filters.customer_type) {
      filteredCustomers = filteredCustomers.filter(c => c.customer_type === filters.customer_type);
    }
    
    if (filters.active !== undefined) {
      filteredCustomers = filteredCustomers.filter(c => c.active === filters.active);
    }

    return {
      customers: filteredCustomers,
      total: filteredCustomers.length
    };
  },

  async updateCustomer(id: number, updates: Partial<Customer>): Promise<Customer | null> {
    const index = mockCustomers.findIndex(c => c.id === id);
    if (index === -1) return null;
    
    mockCustomers[index] = {
      ...mockCustomers[index],
      ...updates,
      updated_at: generateTimestamp()
    };
    
    return mockCustomers[index];
  },

  async getCustomerStats(): Promise<{ total: number; active: number }> {
    const total = mockCustomers.length;
    const active = mockCustomers.filter(c => c.active).length;
    return { total, active };
  },

  async getSalesCountByCustomer(customerId: number): Promise<number> {
    return mockSales.filter(s => s.customer_id === customerId).length;
  },

  // Product operations
  async createProduct(productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const product: Product = {
      id: productIdCounter++,
      created_at: generateTimestamp(),
      updated_at: generateTimestamp(),
      ...productData
    };
    mockProducts.push(product);
    return product;
  },

  async getProducts(filters: any = {}): Promise<Product[]> {
    let filteredProducts = [...mockProducts];
    
    if (filters.search) {
      filteredProducts = filteredProducts.filter(p => 
        p.name_en?.toLowerCase().includes(filters.search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }
    
    if (filters.category_id) {
      filteredProducts = filteredProducts.filter(p => p.category_id === filters.category_id);
    }

    return filteredProducts;
  },

  async updateProduct(id: number, updates: Partial<Product>): Promise<Product | null> {
    const index = mockProducts.findIndex(p => p.id === id);
    if (index === -1) return null;
    
    mockProducts[index] = {
      ...mockProducts[index],
      ...updates,
      updated_at: generateTimestamp()
    };
    
    return mockProducts[index];
  },

  // Supplier operations
  async createSupplier(supplierData: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>): Promise<Supplier> {
    const supplier: Supplier = {
      id: supplierIdCounter++,
      created_at: generateTimestamp(),
      updated_at: generateTimestamp(),
      ...supplierData
    };
    mockSuppliers.push(supplier);
    return supplier;
  },

  async getSuppliers(): Promise<Supplier[]> {
    return [...mockSuppliers];
  },

  async updateSupplier(id: number, updates: Partial<Supplier>): Promise<Supplier | null> {
    const index = mockSuppliers.findIndex(s => s.id === id);
    if (index === -1) return null;
    
    mockSuppliers[index] = {
      ...mockSuppliers[index],
      ...updates,
      updated_at: generateTimestamp()
    };
    
    return mockSuppliers[index];
  },

  async getProductCountBySupplier(supplierId: number): Promise<number> {
    return mockProducts.filter(p => p.supplier_id === supplierId).length;
  },

  // Sale operations
  async createSale(saleData: any): Promise<Sale> {
    const sale: Sale = {
      id: saleIdCounter++,
      created_at: generateTimestamp(),
      updated_at: generateTimestamp(),
      ...saleData
    };
    mockSales.push(sale);
    return sale;
  },

  async getSales(filters: any = {}): Promise<{ sales: Sale[]; total: number }> {
    let filteredSales = [...mockSales];
    
    if (filters.customer_id) {
      filteredSales = filteredSales.filter(s => s.customer_id === filters.customer_id);
    }

    return {
      sales: filteredSales,
      total: filteredSales.length
    };
  },

  // GRN operations
  async createGRN(grnData: any): Promise<GRN> {
    const grn: GRN = {
      id: grnIdCounter++,
      created_at: generateTimestamp(),
      updated_at: generateTimestamp(),
      status: 'PENDING',
      ...grnData
    };
    mockGRNs.push(grn);
    return grn;
  },

  async getGRNs(_filters: any = {}): Promise<GRN[]> {
    return [...mockGRNs];
  },

  // Discount operations
  async getEffectiveDiscountRules(_skuOrFilters: string | any): Promise<DiscountRule[]> {
    return [...mockDiscountRules];
  },

  // Shift operations
  async createShift(shiftData: any): Promise<Shift> {
    const shift: Shift = {
      id: shiftIdCounter++,
      created_at: generateTimestamp(),
      updated_at: generateTimestamp(),
      status: 'OPEN',
      ...shiftData
    };
    mockShifts.push(shift);
    return shift;
  },

  async getShifts(_filters: any = {}): Promise<Shift[]> {
    return [...mockShifts];
  },

  // Database query method for compatibility
  async query<T = any>(sql: string, _params: any[] = []): Promise<T[]> {
    // Simple mock implementation based on SQL patterns
    if (sql.includes('SELECT * FROM sales WHERE status = ?')) {
      return mockSales.filter(s => s.status === _params[0]) as T[];
    }
    if (sql.includes('SELECT * FROM customers')) {
      return mockCustomers as T[];
    }
    if (sql.includes('SELECT * FROM users')) {
      return [{
        id: 1,
        username: 'testuser',
        role: 'cashier',
        terminal_id: 1
      }] as T[];
    }
    if (sql.includes('SELECT * FROM sale_items')) {
      return [] as T[];
    }
    if (sql.includes('SELECT * FROM sales WHERE id = ?')) {
      return mockSales.filter(s => s.id === _params[0]) as T[];
    }
    if (sql.includes('SELECT * FROM customers WHERE id = ?')) {
      return mockCustomers.filter(c => c.id === _params[0]) as T[];
    }
    if (sql.includes('SELECT * FROM users WHERE id = ?')) {
      return [{
        id: _params[0],
        username: 'testuser',
        role: 'cashier',
        terminal_id: 1
      }] as T[];
    }
    if (sql.includes('SELECT * FROM sale_items WHERE sale_id = ?')) {
      return [] as T[];
    }
    if (sql.includes('SELECT * FROM products WHERE id = ?')) {
      return mockProducts.filter(p => p.id === _params[0]) as T[];
    }
    if (sql.includes('SELECT * FROM sales WHERE status = ? AND created_at < ?')) {
      return [] as T[];
    }
    
    return [] as T[];
  },

  // Database execute method for compatibility
  async execute(sql: string, params: any[] = []): Promise<{ lastInsertRowid: number; changes: number }> {
    // Mock implementation for INSERT/UPDATE/DELETE operations
    if (sql.includes('INSERT INTO sales')) {
      const saleId = Math.floor(Math.random() * 1000);
      const sale: Sale = {
        id: saleId,
        created_at: generateTimestamp(),
        updated_at: generateTimestamp(),
        status: 'HELD',
        // hold_name: params[1], // Not part of Sale interface
        customer_id: params[2],
        cashier_id: params[3],
        terminal_name: params[4],
        price_tier: params[5],
        subtotal: params[6],
        total: params[7],
        note: params[8]
      };
      mockSales.push(sale);
      return { lastInsertRowid: saleId, changes: 1 };
    }
    if (sql.includes('INSERT INTO sale_items')) {
      return { lastInsertRowid: Math.floor(Math.random() * 1000), changes: 1 };
    }
    if (sql.includes('UPDATE sales')) {
      return { lastInsertRowid: 0, changes: 1 };
    }
    if (sql.includes('DELETE FROM sales')) {
      return { lastInsertRowid: 0, changes: 1 };
    }
    
    return { lastInsertRowid: 0, changes: 0 };
  }
};

// Mock GRN Service
export const mockGRNService = {
  async createGRN(grnData: any): Promise<{ success: boolean; data: GRN }> {
    const grn = await mockDataService.createGRN(grnData);
    return createMockResponse(grn);
  },

  async upsertGRNLine(lineData: any): Promise<{ success: boolean; data: GRNLine }> {
    const line: GRNLine = {
      id: Math.floor(Math.random() * 1000),
      created_at: generateTimestamp(),
      updated_at: generateTimestamp(),
      ...lineData
    };
    return createMockResponse(line);
  },

  async getGRNWithLines(grnId: number): Promise<{ success: boolean; data: GRN }> {
    const grn = mockGRNs.find(g => g.id === grnId);
    if (!grn) {
      return createMockResponse(null as any, false);
    }
    return createMockResponse(grn);
  }
};

// Mock Shift Service
export const mockShiftService = {
  async createShift(shiftData: any): Promise<{ success: boolean; data: Shift }> {
    const shift = await mockDataService.createShift(shiftData);
    return createMockResponse(shift);
  },

  async addMovement(movementData: any): Promise<{ success: boolean; data: ShiftMovement }> {
    const movement: ShiftMovement = {
      id: Math.floor(Math.random() * 1000),
      created_at: generateTimestamp(),
      updated_at: generateTimestamp(),
      datetime: generateTimestamp(),
      ...movementData
    };
    return createMockResponse(movement);
  },

  async getShiftSummary(shiftId: number): Promise<{ success: boolean; data: any }> {
    const shift = mockShifts.find(s => s.id === shiftId);
    if (!shift) {
      return createMockResponse(null, false);
    }

    const summary = {
      shift,
      sales: { total: 1000, count: 5 },
      payments: { cash: 800, card: 200 },
      cashDrawer: {
        opening: 1000,
        cashIn: 200,
        cashOut: 50,
        drops: 100,
        pickups: 0,
        petty: 0,
        expectedCash: 1050,
        declaredCash: 1050,
        variance: 0
      },
      movements: [],
      cashier_name: 'Test Cashier',
      terminal_name: 'Terminal 1'
    };

    return createMockResponse(summary);
  }
};

// Mock CSV Service
export const mockCSVService = {
  async parseCSV(csvContent: string): Promise<any[]> {
    // Simple CSV parser for testing
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header.trim()] = values[index]?.trim();
      });
      return obj;
    });
  },

  async validateCSVData(_data: any[], _schema: any): Promise<{ valid: boolean; errors: string[] }> {
    return { valid: true, errors: [] };
  }
};

// Mock Label Service
export const mockLabelService = {
  async createLabelItem(itemData: any): Promise<LabelItem> {
    const item: LabelItem = {
      id: Math.floor(Math.random() * 1000),
      created_at: generateTimestamp(),
      updated_at: generateTimestamp(),
      ...itemData
    };
    return item;
  },

  async getLabelItems(_filters: any = {}): Promise<LabelItem[]> {
    return [];
  }
};

// Mock Refund Service
export const mockRefundService = {
  async validateReturn(saleId: number, returnLines: any[]): Promise<{ success: boolean; data: any }> {
    return createMockResponse({
      ok: true,
      validLines: returnLines,
      invalidLines: []
    });
  },

  async processReturn(returnData: any): Promise<{ success: boolean; data: any }> {
    return createMockResponse({
      id: Math.floor(Math.random() * 1000),
      ...returnData
    });
  }
};

// Mock Discount Engine
export const mockDiscountEngine = {
  async applyRulesToCart(cartData: any): Promise<{ success: boolean; data: any }> {
    return createMockResponse({
      lines: cartData.lines,
      totalDiscount: 0,
      finalTotal: cartData.lines.reduce((sum: number, line: any) => sum + (line.total || 0), 0)
    });
  }
};

// Mock Authentication Service
export const mockAuthService = {
  getCurrentUser: vi.fn().mockReturnValue({
    id: 1,
    username: 'testuser',
    role: 'cashier',
    terminal_id: 1,
    permissions: ['sales', 'returns', 'hold']
  }),
  
  isAuthenticated: vi.fn().mockReturnValue(true),
  
  login: vi.fn().mockResolvedValue({
    success: true,
    user: {
      id: 1,
      username: 'testuser',
      role: 'cashier',
      terminal_id: 1
    }
  }),
  
  logout: vi.fn().mockResolvedValue({ success: true }),
  
  hasPermission: vi.fn().mockReturnValue(true),
  
  hasRole: vi.fn().mockReturnValue(true)
};

// Mock Database instance with proper execute method
export const mockDatabase = {
  execute: vi.fn().mockImplementation((sql: string, params: any[] = []) => {
    // Mock implementation for different SQL operations
    if (sql.includes('INSERT INTO')) {
      return { lastInsertRowid: Math.floor(Math.random() * 1000), changes: 1 };
    }
    if (sql.includes('UPDATE')) {
      return { lastInsertRowid: 0, changes: 1 };
    }
    if (sql.includes('DELETE FROM')) {
      return { lastInsertRowid: 0, changes: 1 };
    }
    if (sql.includes('BEGIN TRANSACTION') || sql.includes('COMMIT') || sql.includes('ROLLBACK')) {
      return { lastInsertRowid: 0, changes: 0 };
    }
    return { lastInsertRowid: 0, changes: 0 };
  }),
  
  query: vi.fn().mockImplementation((sql: string, params: any[] = []) => {
    // Mock query results based on SQL patterns
    if (sql.includes('SELECT * FROM sales WHERE status = ?')) {
      return mockSales.filter(s => s.status === params[0]);
    }
    if (sql.includes('SELECT * FROM customers')) {
      return mockCustomers;
    }
    if (sql.includes('SELECT * FROM users')) {
      return [{
        id: 1,
        username: 'testuser',
        role: 'cashier',
        terminal_id: 1
      }];
    }
    if (sql.includes('SELECT * FROM sale_items')) {
      return [];
    }
    if (sql.includes('SELECT * FROM sales WHERE id = ?')) {
      return mockSales.filter(s => s.id === params[0]);
    }
    if (sql.includes('SELECT * FROM customers WHERE id = ?')) {
      return mockCustomers.filter(c => c.id === params[0]);
    }
    if (sql.includes('SELECT * FROM users WHERE id = ?')) {
      return [{
        id: params[0],
        username: 'testuser',
        role: 'cashier',
        terminal_id: 1
      }];
    }
    if (sql.includes('SELECT * FROM sale_items WHERE sale_id = ?')) {
      return [];
    }
    if (sql.includes('SELECT * FROM products WHERE id = ?')) {
      return mockProducts.filter(p => p.id === params[0]);
    }
    if (sql.includes('SELECT * FROM sales WHERE status = ? AND created_at < ?')) {
      return [];
    }
    if (sql.includes('SELECT * FROM shifts WHERE terminal_name = ? AND status = ?')) {
      return [];
    }
    if (sql.includes('SELECT * FROM grn WHERE id = ?')) {
      return mockGRNs.filter(g => g.id === params[0]);
    }
    if (sql.includes('SELECT * FROM grn_lines WHERE grn_id = ?')) {
      return [];
    }
    if (sql.includes('SELECT * FROM returns WHERE sale_id = ?')) {
      return [];
    }
    if (sql.includes('SELECT * FROM return_lines WHERE return_id = ?')) {
      return [];
    }
    return [];
  }),
  
  transaction: vi.fn().mockImplementation((callback) => {
    return callback({
      execute: mockDatabase.execute,
      query: mockDatabase.query
    });
  }),
  
  prepare: vi.fn().mockReturnValue({
    run: vi.fn().mockReturnValue({ lastInsertRowid: Math.floor(Math.random() * 1000), changes: 1 }),
    get: vi.fn().mockReturnValue(null),
    all: vi.fn().mockReturnValue([])
  })
};

// Setup function to initialize mocks
export const setupDatabaseMocks = () => {
  // Mock the dataService
  vi.mock('@/services/dataService', () => ({
    dataService: mockDataService
  }));

  // Mock the GRN service
  vi.mock('@/services/grnService', () => ({
    grnService: mockGRNService
  }));

  // Mock the shift service
  vi.mock('@/services/shiftService', () => ({
    shiftService: mockShiftService
  }));

  // Mock the CSV service
  vi.mock('@/services/csvService', () => ({
    csvService: mockCSVService
  }));

  // Mock the label service
  vi.mock('@/services/labelService', () => ({
    labelService: mockLabelService
  }));

  // Mock the refund service
  vi.mock('@/services/refundService', () => ({
    refundService: mockRefundService
  }));

  // Mock the discount engine
  vi.mock('@/services/discountEngine', () => ({
    discountEngine: mockDiscountEngine
  }));

  // Mock the database getter function
  vi.mock('@/server/db/database', () => ({
    getDatabase: vi.fn().mockReturnValue(mockDatabase),
    closeDatabase: vi.fn()
  }));

  // Mock the database service
  vi.mock('@/services/database', () => ({
    database: mockDatabase
  }));

  // Mock the authentication service
  vi.mock('@/services/authService', () => ({
    authService: mockAuthService
  }));
};

// Cleanup function to reset mock data
export const resetMockData = () => {
  mockCustomers.length = 0;
  mockProducts.length = 0;
  mockSales.length = 0;
  mockSuppliers.length = 0;
  mockGRNs.length = 0;
  mockShifts.length = 0;
  mockDiscountRules.length = 0;
  
  customerIdCounter = 1;
  productIdCounter = 1;
  saleIdCounter = 1;
  supplierIdCounter = 1;
  grnIdCounter = 1;
  shiftIdCounter = 1;
  // discountRuleIdCounter = 1;
};

// Helper function to create test data
export const createTestData = {
  customer: (overrides: Partial<Customer> = {}): Omit<Customer, 'id' | 'created_at' | 'updated_at'> => ({
    customer_name: 'Test Customer',
    phone: '+94 77 123 4567',
    customer_type: 'Retail',
    active: true,
    ...overrides
  }),

  product: (overrides: Partial<Product> = {}): Omit<Product, 'id' | 'created_at' | 'updated_at'> => ({
    sku: 'TEST-001',
    name_en: 'Test Product',
    barcode: '1234567890123',
    category_id: 1,
    price_retail: 100,
    price_wholesale: 90,
    price_credit: 95,
    price_other: 100,
    cost: 50,
    is_active: true,
    ...overrides
  }),

  supplier: (overrides: Partial<Supplier> = {}): Omit<Supplier, 'id' | 'created_at' | 'updated_at'> => ({
    supplier_name: 'Test Supplier',
    contact_phone: '1234567890',
    contact_email: 'test@supplier.com',
    address: 'Test Address',
    is_active: true,
    ...overrides
  }),

  grn: (overrides: Partial<GRN> = {}): Omit<GRN, 'id' | 'created_at' | 'updated_at'> => ({
    grn_number: 'GRN-001',
    grn_no: 'GRN-001',
    supplier_id: 1,
    received_date: new Date().toISOString(),
    total_amount: 1000,
    total: 1000,
    status: 'PENDING',
    ...overrides
  }),

  sale: (overrides: Partial<Sale> = {}): Omit<Sale, 'id' | 'created_at' | 'updated_at'> => ({
    customer_id: 1,
    subtotal: 100,
    total: 100,
    paymentMethod: 'cash',
    status: 'completed',
    ...overrides
  })
};
