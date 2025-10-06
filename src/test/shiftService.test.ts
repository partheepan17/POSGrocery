import { describe, it, expect, beforeEach, vi } from 'vitest';
import { shiftService } from '../services/shiftService';
import { database } from '../services/database';

// Mock the database
vi.mock('../services/database', () => ({
  database: {
    query: vi.fn(),
    execute: vi.fn(),
  }
}));

describe('ShiftService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('openShift', () => {
    it('should open a new shift successfully', async () => {
      const mockDb = vi.mocked(database);
      
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
      const mockDb = vi.mocked(database);
      
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
      const mockDb = vi.mocked(database);
      mockDb.execute.mockResolvedValueOnce({ lastID: 1 });
      
      const result = await shiftService.addMovement({
        shift_id: 1,
        type: 'CASH_IN',
        amount: 500,
        reason: 'Test cash in'
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
      const mockDb = vi.mocked(database);
      
      // Mock getShift to return open shift
      mockDb.query
        .mockResolvedValueOnce([{ id: 1, status: 'OPEN' }]) // shift query
        .mockResolvedValueOnce([]); // movements query
      
      // Mock expectedCashForShift
      mockDb.query.mockResolvedValueOnce([{ expectedCash: 1500 }]);
      
      // Mock close shift update
      mockDb.execute.mockResolvedValueOnce({});
      
      await shiftService.closeShift(1, 1500, 'Closing note');
      
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE shifts'),
        [1500, 0, 'Closing note', 1] // declared_cash, variance, note, id
      );
    });

    it('should throw error if shift is not found', async () => {
      const mockDb = vi.mocked(database);
      mockDb.query.mockResolvedValueOnce([]); // No shift found
      
      await expect(shiftService.closeShift(999, 1000)).rejects.toThrow('Shift not found');
    });

    it('should throw error if shift is not open', async () => {
      const mockDb = vi.mocked(database);
      mockDb.query
        .mockResolvedValueOnce([{ id: 1, status: 'CLOSED' }]) // shift query
        .mockResolvedValueOnce([]); // movements query
      
      await expect(shiftService.closeShift(1, 1000)).rejects.toThrow('Shift is not open');
    });
  });

  describe('getShiftSummary', () => {
    it('should calculate shift summary correctly', async () => {
      const mockDb = vi.mocked(database);
      
      // Mock shift data
      const shiftData = {
        header: {
          id: 1,
          terminal_name: 'Terminal 1',
          cashier_id: 1,
          opening_cash: 1000,
          status: 'OPEN'
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
      
      mockDb.query
        .mockResolvedValueOnce([shiftData.header]) // shift query
        .mockResolvedValueOnce(shiftData.movements) // movements query
        .mockResolvedValueOnce(salesData) // sales query
        .mockResolvedValueOnce(paymentsData); // payments query
      
      const summary = await shiftService.getShiftSummary(1);
      
      expect(summary.shift).toEqual(shiftData.header);
      expect(summary.sales).toEqual(salesData[0]);
      expect(summary.payments).toEqual(paymentsData[0]);
      expect(summary.cashDrawer.opening).toBe(1000);
      expect(summary.cashDrawer.cashIn).toBe(200);
      expect(summary.cashDrawer.cashOut).toBe(50);
      expect(summary.cashDrawer.drops).toBe(100);
      expect(summary.cashDrawer.expectedCash).toBe(1000 + 600 + 200 - 50 - 100 - 0); // 1650
    });
  });

  describe('listShifts', () => {
    it('should list shifts with filters', async () => {
      const mockDb = vi.mocked(database);
      const mockShifts = [
        { id: 1, terminal_name: 'Terminal 1', status: 'OPEN' },
        { id: 2, terminal_name: 'Terminal 2', status: 'CLOSED' }
      ];
      
      mockDb.query.mockResolvedValueOnce(mockShifts);
      
      const result = await shiftService.listShifts({
        status: 'OPEN',
        terminal: 'Terminal 1',
        limit: 10
      });
      
      expect(result).toEqual(mockShifts);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM shifts WHERE 1=1'),
        expect.arrayContaining(['OPEN', 'Terminal 1', 10])
      );
    });
  });

  describe('voidShift', () => {
    it('should void an open shift successfully', async () => {
      const mockDb = vi.mocked(database);
      
      // Mock getShift to return open shift
      mockDb.query
        .mockResolvedValueOnce([{ id: 1, status: 'OPEN' }]) // shift query
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
      const mockDb = vi.mocked(database);
      mockDb.query
        .mockResolvedValueOnce([{ id: 1, status: 'CLOSED' }]) // shift query
        .mockResolvedValueOnce([]); // movements query
      
      await expect(shiftService.voidShift(1, 'Void reason')).rejects.toThrow('Only open shifts can be voided');
    });
  });
});


