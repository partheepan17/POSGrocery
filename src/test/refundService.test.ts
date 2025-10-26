import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SaleWithLines, ReturnLine } from '../types';

// Mock the database BEFORE importing services
// The refund service imports from './database' which resolves to src/services/database
vi.mock('../services/database', () => ({
  database: Promise.resolve({
    query: vi.fn(),
    execute: vi.fn(),
    transaction: vi.fn(),
    get: vi.fn(),
    all: vi.fn(),
    run: vi.fn()
  })
}));

// Now import the service after mocks are set up
import { refundService } from '../services/refundService';
import { database } from '../services/database';

// Get the mocked database instance
let mockDatabase: any;

describe('RefundService', () => {
  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Get the mocked database instance
    mockDatabase = await database;
    
    // Setup default mock implementations
    mockDatabase.query.mockImplementation((sql: string, params?: any[]) => {
      // Return ledger query
      if (sql.includes('return_lines') && sql.includes('sale_line_id') && sql.includes('returned_qty')) {
        if (params && params[0] === 1) {
          // For test case "should return ledger with returned quantities"
          return Promise.resolve([{ sale_line_id: 1, returned_qty: 1 }]);
        }
        return Promise.resolve([]);
      }
      
      // Default: return empty array
      return Promise.resolve([]);
    });

    // Setup mock for run/execute operations (INSERT, UPDATE, etc.)
    const mockExecute = (sql: string, _params?: any[]) => {
      if (sql.includes('INSERT INTO returns')) {
        return Promise.resolve({ lastID: 1, changes: 1 });
      }
      if (sql.includes('INSERT INTO return_lines')) {
        return Promise.resolve({ lastID: 1, changes: 1 });
      }
      if (sql.includes('INSERT INTO payments')) {
        return Promise.resolve({ lastID: 1, changes: 1 });
      }
      if (sql.includes('COMMIT')) {
        return Promise.resolve({ lastID: undefined, changes: 0 });
      }
      if (sql.includes('ROLLBACK')) {
        return Promise.resolve({ lastID: undefined, changes: 0 });
      }
      return Promise.resolve({ lastID: undefined, changes: 0 });
    };

    mockDatabase.run.mockImplementation(mockExecute);
    mockDatabase.execute.mockImplementation(mockExecute);
  });

  const mockSale: SaleWithLines = {
    id: 1,
    datetime: '2024-01-01T10:00:00Z',
    cashier_id: 1,
    customer_id: 1,
    price_tier: 'Retail',
    gross: 100.00,
    discount: 0,
    tax: 15.00,
    net: 115.00,
    pay_cash: 115.00,
    pay_card: 0,
    pay_wallet: 0,
    language: 'EN',
    terminal_name: 'POS-001',
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
    lines: [
      {
        id: 1,
        sale_id: 1,
        product_id: 1,
        qty: 2,
        unit_price: 50.00,
        line_discount: 0,
        tax: 15.00,
        total: 115.00,
        product_name: 'Test Product',
        product_name_si: 'පරීක්ෂණ නිෂ්පාදනය',
        product_name_ta: 'சோதனை தயாரிப்பு',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDefaultReturnReasons', () => {
    it('should return default return reasons', () => {
      const reasons = refundService.getDefaultReturnReasons();
      expect(reasons).toEqual(['DAMAGED', 'EXPIRED', 'WRONG_ITEM', 'CUSTOMER_CHANGE', 'OTHER']);
    });
  });

  describe('validateReturn', () => {
    it('should validate return with valid quantities', async () => {
      const items = [{ sale_line_id: 1, qty: 1 }];
      const result = await refundService.validateReturn({ sale: mockSale, items });

      expect(result.ok).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject return with excessive quantities', async () => {
      const items = [{ sale_line_id: 1, qty: 5 }]; // More than sold (2)
      const result = await refundService.validateReturn({ sale: mockSale, items });

      expect(result.ok).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Cannot return 5 of Test Product');
      expect(result.errors[0]).toContain('Only 1 available');
    });

    it('should reject return with negative quantities', async () => {
      // Database is mocked in setupComprehensiveMocks

      const items = [{ sale_line_id: 1, qty: -1 }];
      const result = await refundService.validateReturn({ sale: mockSale, items });

      expect(result.ok).toBe(false);
      expect(result.errors).toContain('Return quantity must be positive for Test Product');
    });

    it('should reject return with zero total quantity', async () => {
      // Database is mocked in setupComprehensiveMocks

      const items = [{ sale_line_id: 1, qty: 0 }];
      const result = await refundService.validateReturn({ sale: mockSale, items });

      expect(result.ok).toBe(false);
      expect(result.errors).toContain('Total return quantity must be greater than zero');
    });

    it('should reject return with no items', async () => {
      // Database is mocked in setupComprehensiveMocks

      const items: Array<{ sale_line_id: number; qty: number }> = [];
      const result = await refundService.validateReturn({ sale: mockSale, items });

      expect(result.ok).toBe(false);
      expect(result.errors).toContain('No items selected for return');
    });

    it('should handle partial returns correctly', async () => {
      // Database is mocked in setupComprehensiveMocks

      const items = [{ sale_line_id: 1, qty: 1 }]; // Should be valid (2 sold - 1 returned = 1 available)
      const result = await refundService.validateReturn({ sale: mockSale, items });

      expect(result.ok).toBe(true);
    });

    it('should reject return exceeding available after partial returns', async () => {
      // Database is mocked in setupComprehensiveMocks

      const items = [{ sale_line_id: 1, qty: 2 }]; // Should be invalid (2 sold - 1 returned = 1 available, but trying to return 2)
      const result = await refundService.validateReturn({ sale: mockSale, items });

      expect(result.ok).toBe(false);
      expect(result.errors).toContain('Cannot return 2 of Test Product. Only 1 available (sold: 2, already returned: 1)');
    });
  });

  describe('getSaleReturnLedger', () => {
    it('should return empty ledger for sale with no returns', async () => {
      // Use saleId = 2 which has no returns
      const result = await refundService.getSaleReturnLedger(2);

      expect(result).toEqual([]);
    });

    it('should return ledger with returned quantities', async () => {
      // The comprehensive mock in databaseMocks.ts should handle this case
      // It returns [{ sale_line_id: 1, returned_qty: 1 }] when params[0] === 1
      const result = await refundService.getSaleReturnLedger(1);

      expect(result).toEqual([
        { sale_line_id: 1, returned_qty: 1 }
      ]);
    });
  });

  describe('createReturn', () => {
    it('should create return transaction successfully', async () => {
      // Database is mocked in setupComprehensiveMocks

      const returnLines: ReturnLine[] = [
        {
          id: 1,
          return_id: 1,
          sale_line_id: 1,
          product_id: 1,
          qty_returned: 1,
          qty: 1,
          unit_price: 50.00,
          line_refund: 50.00,
          reason_code: 'DAMAGED',
          reason: 'DAMAGED'
        }
      ];

      const result = await refundService.createReturn({
        saleId: 1,
        lines: returnLines,
        payments: { cash: 50, card: 0, wallet: 0, store_credit: 0 },
        reason_summary: 'Test return',
        language: 'EN',
        cashier_id: 1,
        terminal_name: 'POS-001'
      });

      expect(result.returnId).toBe(1);
      expect(mockDatabase.execute).toHaveBeenCalledTimes(6); // 1 BEGIN + 4 inserts + 1 commit
    });

    it('should handle database errors and rollback', async () => {
      // Make the second database operation fail to simulate an error
      mockDatabase.execute
        .mockResolvedValueOnce({ lastID: undefined, changes: 0 }) // BEGIN TRANSACTION
        .mockRejectedValueOnce(new Error('Database error')); // INSERT INTO returns

      const returnLines: ReturnLine[] = [
        {
          id: 1,
          return_id: 1,
          sale_line_id: 1,
          product_id: 1,
          qty_returned: 1,
          qty: 1,
          unit_price: 50.00,
          line_refund: 50.00,
          reason_code: 'DAMAGED',
          reason: 'DAMAGED'
        }
      ];

      await expect(refundService.createReturn({
        saleId: 1,
        lines: returnLines,
        payments: { cash: 50, card: 0, wallet: 0, store_credit: 0 },
        reason_summary: 'Test return',
        language: 'EN',
        cashier_id: 1,
        terminal_name: 'POS-001'
      })).rejects.toThrow('Failed to create return transaction');

      expect(mockDatabase.execute).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('formatReturnReceipt', () => {
    it('should format return receipt data correctly', async () => {
      // Mock the specific queries that formatReturnReceipt makes
      mockDatabase.query
        .mockResolvedValueOnce([{ // First query: return data with sale details
          id: 1,
          sale_id: 1,
          datetime: '2024-01-01T10:00:00Z',
          cashier_id: 1,
          manager_id: null,
          refund_cash: 50.00,
          refund_card: 0,
          refund_wallet: 0,
          refund_store_credit: 0,
          reason_summary: 'Test return',
          language: 'EN',
          terminal_name: 'POS-001',
          sale_datetime: '2024-01-01T09:00:00Z',
          sale_terminal: 'POS-001',
          original_price_tier: 'retail',
          cashier_name: 'Test Cashier',
          manager_name: null
        }])
        .mockResolvedValueOnce([{ // Second query: return lines with product details
          id: 1,
          product_id: 1,
          qty: 1,
          unit_price: 50.00,
          line_refund: 50.00,
          reason_code: 'DAMAGED',
          product_name: 'Test Product',
          product_name_si: 'පරීක්ෂණ නිෂ්පාදනය',
          product_name_ta: 'சோதனை தயாரிப்பு',
          product_unit: 'pcs'
        }]);

      const result = await refundService.formatReturnReceipt(1);

      expect(result.type).toBe('return');
      expect(result.invoice.id).toBe('RET-000001');
      expect(result.invoice.items).toHaveLength(1);
      expect(result.invoice.items[0].name_en).toBe('Test Product');
      expect(result.invoice.totals.net).toBe(50.00);
      expect(result.invoice.payments.cash).toBe(50.00);
    });

    it('should handle missing return data', async () => {
      // Database is mocked in setupComprehensiveMocks

      await expect(refundService.formatReturnReceipt(999)).rejects.toThrow('Return not found');
    });
  });
});


