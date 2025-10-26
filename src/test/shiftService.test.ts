import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import shift service specific mocks
import { setupShiftServiceMocks, resetShiftServiceMocks, mockShiftDatabase } from './setup/shiftServiceMocks';

// Setup shift service mocks BEFORE importing the service
setupShiftServiceMocks();

import { shiftService } from '../services/shiftService';

describe('ShiftService', () => {
  beforeEach(() => {
    resetShiftServiceMocks();
  });

  describe('openShift', () => {
    it('should open a new shift successfully', async () => {
      const mockDb = vi.mocked(mockShiftDatabase);
      
      // Mock getActiveShift to return null (no existing shift)
      mockDb.query.mockResolvedValueOnce([]);
      
      // Mock execute for shift creation
      mockDb.execute.mockResolvedValueOnce({ lastID: 1 });
      
      const result = await shiftService.openShift({
        terminal_name: 'Terminal 1',
        cashier_id: 1,
        opening_cash: 1000,
        note: 'Test shift'
      });
      
      expect(result).toBe(1);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO shifts'),
        ['Terminal 1', 1, 1000, 'Test shift']
      );
    });

    it('should throw error if shift already exists for terminal', async () => {
      const mockDb = vi.mocked(mockShiftDatabase);
      
      // Mock getActiveShift to return existing shift
      mockDb.query.mockResolvedValueOnce([{ id: 1, terminal_name: 'Terminal 1' }]);
      
      await expect(shiftService.openShift({
        terminal_name: 'Terminal 1',
        cashier_id: 1,
        opening_cash: 1000
      })).rejects.toThrow('There is already an open shift for this terminal');
    });
  });

  describe('addMovement', () => {
    it('should add a movement successfully', async () => {
      const mockDb = vi.mocked(mockShiftDatabase);
      mockDb.execute.mockResolvedValueOnce({ lastID: 1 });
      
      const result = await shiftService.addMovement({
        shift_id: 1,
        type: 'CASH_IN',
        amount: 500,
        reason: 'Test cash in',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z'
      });
      
      expect(result).toBe(1);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO shift_movements'),
        [1, 'CASH_IN', 500, 'Test cash in']
      );
    });
  });

  describe('closeShift', () => {
    it('should close a shift successfully', async () => {
      const mockDb = vi.mocked(mockShiftDatabase);
      
      // Mock getShift to return open shift
      mockDb.query
        .mockResolvedValueOnce([{ id: 1, status: 'OPEN', opening_cash: 1000 }]) // shift query
        .mockResolvedValueOnce([]); // movements query
      
      // Mock getShiftSummary queries (called by expectedCashForShift)
      mockDb.query
        .mockResolvedValueOnce([{ id: 1, status: 'OPEN', opening_cash: 1000 }]) // getShift call
        .mockResolvedValueOnce([]) // movements query
        .mockResolvedValueOnce([{ invoices: 0, gross: 0, discount: 0, tax: 0, net: 0 }]) // sales query
        .mockResolvedValueOnce([{ cash: 0, card: 0, wallet: 0, other: 0 }]); // payments query
      
      // Mock close shift update
      mockDb.execute.mockResolvedValueOnce({});
      
      await shiftService.closeShift(1, 1500, 'Closing note');
      
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE shifts'),
        [1500, 500, 'Closing note', 1] // declared_cash, variance (1500-1000), note, id
      );
    });

    it('should throw error if shift is not found', async () => {
      const mockDb = vi.mocked(mockShiftDatabase);
      mockDb.query.mockResolvedValueOnce([]); // No shift found (first query in getShift)
      mockDb.query.mockResolvedValueOnce([]); // No movements (second query in getShift)
      
      await expect(shiftService.closeShift(999, 1000)).rejects.toThrow('Shift not found');
    });

    it('should throw error if shift is not open', async () => {
      const mockDb = vi.mocked(mockShiftDatabase);
      
      // Clear any existing mocks
      mockDb.query.mockClear();
      mockDb.query.mockReset();
      
      // Mock the getShift queries - first query returns shift, second returns movements
      mockDb.query.mockImplementation((sql: string, _params: any[] = []) => {
        if (sql.includes('SELECT * FROM shifts WHERE id = ?')) {
          return Promise.resolve([{ 
            id: 1, 
            shift_number: 'SHIFT-001',
            cashier_id: 1,
            terminal_id: 'TERM-001',
            start_time: '2024-01-01T10:00:00Z',
            status: 'CLOSED',
            opening_cash: 1000,
            created_at: '2024-01-01T10:00:00Z',
            updated_at: '2024-01-01T10:00:00Z'
          }]);
        }
        if (sql.includes('SELECT * FROM shift_movements')) {
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      });
      
      await expect(shiftService.closeShift(1, 1000)).rejects.toThrow('Shift is not open');
    });
  });

  describe('getShiftSummary', () => {
    it('should calculate shift summary correctly', async () => {
      const mockDb = vi.mocked(mockShiftDatabase);
      
      // Clear any existing mocks
      mockDb.query.mockClear();
      mockDb.query.mockReset();
      
      // Mock shift data
      const shiftData = {
        header: {
          id: 1,
          shift_number: 'SHIFT-001',
          terminal_id: 'TERM-001',
          cashier_id: 1,
          opening_cash: 1000,
          status: 'OPEN',
          start_time: '2024-01-01T10:00:00Z',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z'
        },
        movements: [
          { type: 'CASH_IN', amount: 200 },
          { type: 'CASH_OUT', amount: 50 },
          { type: 'DROP', amount: 100 }
        ]
      };
      
      // Mock sales data
      const salesData = [{
        invoices: 5,
        gross: 1000,
        discount: 50,
        tax: 150,
        net: 1100
      }];
      
      // Mock payments data
      const paymentsData = [{
        cash: 600,
        card: 400,
        wallet: 100,
        other: 0
      }];
      
    mockDb.query.mockImplementation((sql: string, _params: any[] = []) => {
      if (sql.includes('SELECT * FROM shifts WHERE id = ?')) {
        return [shiftData.header];
      }
      if (sql.includes('SELECT * FROM shift_movements')) {
        return shiftData.movements;
      }
      if (sql.includes('COUNT(*) as invoices')) {
        return salesData;
      }
      if (sql.includes('COALESCE(SUM(CASE WHEN payment_method = \'cash\'')) {
        return paymentsData;
      }
      return [];
    });
      
      const summary = await shiftService.getShiftSummary(1);
      
      expect(summary.shift).toEqual(shiftData.header);
      expect(summary.sales).toEqual(salesData[0]);
      expect(summary.payments).toEqual(paymentsData[0]);
      expect(summary.cashDrawer?.opening).toBe(1000);
      expect(summary.cashDrawer?.cashIn).toBe(200);
      expect(summary.cashDrawer?.cashOut).toBe(50);
      expect(summary.cashDrawer?.drops).toBe(100);
      expect(summary.cashDrawer?.expectedCash).toBe(1000 + 600 + 200 - 50 - 100 - 0); // 1650
    });
  });

  describe('listShifts', () => {
    it('should list shifts with filters', async () => {
      const mockDb = vi.mocked(mockShiftDatabase);
      const expectedShifts = [
        { id: 1, terminal_name: 'Terminal 1', status: 'OPEN' },
        { id: 2, terminal_name: 'Terminal 2', status: 'CLOSED' }
      ];
      
      // Reset the mock completely and set up fresh implementation
      mockDb.query.mockReset();
      mockDb.query.mockImplementation((sql: string, _params: any[] = []) => {
        console.log('Mock query called with:', sql, _params);
        if (sql.includes('SELECT * FROM shifts WHERE 1=1')) {
          return expectedShifts;
        }
        return [];
      });
      
      const result = await shiftService.listShifts({
        status: 'OPEN',
        terminal: 'Terminal 1',
        limit: 10
      });
      
      expect(result).toEqual(expectedShifts);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM shifts WHERE 1=1'),
        expect.arrayContaining(['OPEN', 'Terminal 1', 10])
      );
    });
  });

  describe('voidShift', () => {
    it('should void an open shift successfully', async () => {
      const mockDb = vi.mocked(mockShiftDatabase);
      
      // Mock getShift to return open shift
      mockDb.query
        .mockResolvedValueOnce([{ 
          id: 1, 
          shift_number: 'SHIFT-001',
          terminal_id: 'TERM-001',
          cashier_id: 1,
          opening_cash: 1000,
          status: 'OPEN',
          start_time: '2024-01-01T10:00:00Z',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z'
        }]) // shift query
        .mockResolvedValueOnce([]); // movements query
      
      // Mock void shift update
      mockDb.execute.mockResolvedValueOnce({});
      
      await shiftService.voidShift(1, 'Void reason');
      
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE shifts'),
        ['Void reason', 1]
      );
    });

    it('should throw error if shift is not open', async () => {
      const mockDb = vi.mocked(mockShiftDatabase);
      
      // Mock getShift to return a closed shift
      mockDb.query.mockImplementation((sql: string, _params: any[] = []) => {
        if (sql.includes('SELECT * FROM shifts WHERE id = ?')) {
          return [{
            id: 1,
            shift_number: 'SHIFT-001',
            terminal_id: 'TERM-001',
            cashier_id: 1,
            opening_cash: 1000,
            status: 'CLOSED',
            start_time: '2024-01-01T10:00:00Z',
            created_at: '2024-01-01T10:00:00Z',
            updated_at: '2024-01-01T10:00:00Z'
          }];
        }
        if (sql.includes('SELECT * FROM shift_movements WHERE shift_id = ?')) {
          return [];
        }
        return [];
      });
      
      await expect(shiftService.voidShift(1, 'Void reason')).rejects.toThrow('Only open shifts can be voided');
    });
  });
});


