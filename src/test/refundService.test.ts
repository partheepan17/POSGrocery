import { describe, it, expect, beforeEach, vi } from 'vitest';
import { refundService } from '../services/refundService';
import { SaleWithLines, ReturnLine, ReturnReason } from '../types';

// Mock the database
vi.mock('../services/database', () => ({
  database: {
    get: vi.fn(),
    all: vi.fn(),
    run: vi.fn(),
  }
}));

describe('RefundService', () => {
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
    lines: [
      {
        id: 1,
        product_id: 1,
        qty: 2,
        unit_price: 50.00,
        line_discount: 0,
        tax: 15.00,
        total: 115.00,
        product_name: 'Test Product',
        product_name_si: 'පරීක්ෂණ නිෂ්පාදනය',
        product_name_ta: 'சோதனை தயாரிப்பு'
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
      const { database } = await import('../services/database');
      
      // Mock return ledger - no previous returns
      vi.mocked(database.all).mockResolvedValueOnce([]);

      const items = [{ sale_line_id: 1, qty: 1 }];
      const result = await refundService.validateReturn({ sale: mockSale, items });

      expect(result.ok).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject return with excessive quantities', async () => {
      const { database } = await import('../services/database');
      
      // Mock return ledger - no previous returns
      vi.mocked(database.all).mockResolvedValueOnce([]);

      const items = [{ sale_line_id: 1, qty: 5 }]; // More than sold (2)
      const result = await refundService.validateReturn({ sale: mockSale, items });

      expect(result.ok).toBe(false);
      expect(result.errors).toContain('Cannot return 5 of Test Product. Only 2 available (sold: 2, already returned: 0)');
    });

    it('should reject return with negative quantities', async () => {
      const { database } = await import('../services/database');
      
      // Mock return ledger - no previous returns
      vi.mocked(database.all).mockResolvedValueOnce([]);

      const items = [{ sale_line_id: 1, qty: -1 }];
      const result = await refundService.validateReturn({ sale: mockSale, items });

      expect(result.ok).toBe(false);
      expect(result.errors).toContain('Return quantity must be positive for Test Product');
    });

    it('should reject return with zero total quantity', async () => {
      const { database } = await import('../services/database');
      
      // Mock return ledger - no previous returns
      vi.mocked(database.all).mockResolvedValueOnce([]);

      const items = [{ sale_line_id: 1, qty: 0 }];
      const result = await refundService.validateReturn({ sale: mockSale, items });

      expect(result.ok).toBe(false);
      expect(result.errors).toContain('Total return quantity must be greater than zero');
    });

    it('should reject return with no items', async () => {
      const { database } = await import('../services/database');
      
      // Mock return ledger - no previous returns
      vi.mocked(database.all).mockResolvedValueOnce([]);

      const items: Array<{ sale_line_id: number; qty: number }> = [];
      const result = await refundService.validateReturn({ sale: mockSale, items });

      expect(result.ok).toBe(false);
      expect(result.errors).toContain('No items selected for return');
    });

    it('should handle partial returns correctly', async () => {
      const { database } = await import('../services/database');
      
      // Mock return ledger - 1 already returned
      vi.mocked(database.all).mockResolvedValueOnce([
        { sale_line_id: 1, returned_qty: 1 }
      ]);

      const items = [{ sale_line_id: 1, qty: 1 }]; // Should be valid (2 sold - 1 returned = 1 available)
      const result = await refundService.validateReturn({ sale: mockSale, items });

      expect(result.ok).toBe(true);
    });

    it('should reject return exceeding available after partial returns', async () => {
      const { database } = await import('../services/database');
      
      // Mock return ledger - 1 already returned
      vi.mocked(database.all).mockResolvedValueOnce([
        { sale_line_id: 1, returned_qty: 1 }
      ]);

      const items = [{ sale_line_id: 1, qty: 2 }]; // Should be invalid (2 sold - 1 returned = 1 available, but trying to return 2)
      const result = await refundService.validateReturn({ sale: mockSale, items });

      expect(result.ok).toBe(false);
      expect(result.errors).toContain('Cannot return 2 of Test Product. Only 1 available (sold: 2, already returned: 1)');
    });
  });

  describe('getSaleReturnLedger', () => {
    it('should return empty ledger for sale with no returns', async () => {
      const { database } = await import('../services/database');
      
      vi.mocked(database.all).mockResolvedValueOnce([]);

      const result = await refundService.getSaleReturnLedger(1);

      expect(result).toEqual([]);
    });

    it('should return ledger with returned quantities', async () => {
      const { database } = await import('../services/database');
      
      vi.mocked(database.all).mockResolvedValueOnce([
        { sale_line_id: 1, returned_qty: 1.5 },
        { sale_line_id: 2, returned_qty: 0.5 }
      ]);

      const result = await refundService.getSaleReturnLedger(1);

      expect(result).toEqual([
        { sale_line_id: 1, returned_qty: 1.5 },
        { sale_line_id: 2, returned_qty: 0.5 }
      ]);
    });
  });

  describe('createReturn', () => {
    it('should create return transaction successfully', async () => {
      const { database } = await import('../services/database');
      
      // Mock database operations
      vi.mocked(database.run).mockResolvedValueOnce({ lastID: 1 }); // Return insert
      vi.mocked(database.run).mockResolvedValueOnce({}); // Return line insert
      vi.mocked(database.run).mockResolvedValueOnce({}); // Inventory movement insert
      vi.mocked(database.run).mockResolvedValueOnce({}); // Stock update
      vi.mocked(database.run).mockResolvedValueOnce({}); // Commit

      const returnLines: ReturnLine[] = [
        {
          sale_line_id: 1,
          product_id: 1,
          qty: 1,
          unit_price: 50.00,
          line_refund: 50.00,
          reason_code: 'DAMAGED'
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
      expect(database.run).toHaveBeenCalledTimes(5); // 4 inserts + 1 commit
    });

    it('should handle database errors and rollback', async () => {
      const { database } = await import('../services/database');
      
      // Mock database operations with error
      vi.mocked(database.run).mockResolvedValueOnce({ lastID: 1 }); // Return insert
      vi.mocked(database.run).mockRejectedValueOnce(new Error('Database error')); // Return line insert fails
      vi.mocked(database.run).mockResolvedValueOnce({}); // Rollback

      const returnLines: ReturnLine[] = [
        {
          sale_line_id: 1,
          product_id: 1,
          qty: 1,
          unit_price: 50.00,
          line_refund: 50.00,
          reason_code: 'DAMAGED'
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

      expect(database.run).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('formatReturnReceipt', () => {
    it('should format return receipt data correctly', async () => {
      const { database } = await import('../services/database');
      
      // Mock return data
      const returnData = {
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
        cashier_name: 'Test Cashier',
        manager_name: null
      };

      const returnLines = [
        {
          id: 1,
          product_id: 1,
          qty: 1,
          unit_price: 50.00,
          line_refund: 50.00,
          reason_code: 'DAMAGED',
          product_name: 'Test Product',
          product_name_si: 'පරීක්ෂණ නිෂ්පාදනය',
          product_name_ta: 'சோதனை தயாரிப்பு'
        }
      ];

      vi.mocked(database.get).mockResolvedValueOnce(returnData);
      vi.mocked(database.all).mockResolvedValueOnce(returnLines);

      const result = await refundService.formatReturnReceipt(1);

      expect(result.type).toBe('return');
      expect(result.invoice.id).toBe('RET-000001');
      expect(result.invoice.items).toHaveLength(1);
      expect(result.invoice.items[0].name_en).toBe('Test Product');
      expect(result.invoice.totals.net).toBe(50.00);
      expect(result.invoice.payments.cash).toBe(50.00);
    });

    it('should handle missing return data', async () => {
      const { database } = await import('../services/database');
      
      vi.mocked(database.get).mockResolvedValueOnce(null);

      await expect(refundService.formatReturnReceipt(999)).rejects.toThrow('Return not found');
    });
  });
});


