import { vi } from 'vitest';

// Mock data for shift service tests
export const mockShifts = [
  {
    id: 1,
    terminal_name: 'Terminal 1',
    cashier_id: 1,
    opening_cash: 1000,
    note: 'Test shift',
    status: 'OPEN',
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
    declared_cash: undefined,
    closed_at: undefined
  },
  {
    id: 2,
    terminal_name: 'Terminal 2',
    cashier_id: 2,
    opening_cash: 1500,
    note: 'Test shift 2',
    status: 'CLOSED',
    created_at: '2024-01-01T11:00:00Z',
    updated_at: '2024-01-01T12:00:00Z',
    declared_cash: 1500,
    closed_at: '2024-01-01T12:00:00Z'
  }
];

export const mockShiftMovements = [
  {
    id: 1,
    shift_id: 1,
    movement_type: 'SALE',
    amount: 100.00,
    created_at: '2024-01-01T10:30:00Z'
  }
];

// Counter for generating new IDs
let shiftIdCounter = 3;
let movementIdCounter = 2;

// Helper function to generate timestamps
const generateTimestamp = () => new Date().toISOString();

// Clean database mock specifically for shift service
export const mockShiftDatabase = {
  execute: vi.fn().mockImplementation((sql: string, params: any[] = []) => {
    console.log('Shift DB Execute:', sql, params);
    
    if (sql.includes('INSERT INTO shifts')) {
      const shiftId = shiftIdCounter++;
      const shift = {
        id: shiftId,
        terminal_name: params[0],
        cashier_id: params[1],
        opening_cash: params[2],
        note: params[3] || null,
        status: 'OPEN',
        created_at: generateTimestamp(),
        updated_at: generateTimestamp(),
        declared_cash: undefined,
        closed_at: undefined
      };
      mockShifts.push(shift);
      return { lastInsertRowid: shiftId, lastID: shiftId, changes: 1 };
    }

    if (sql.includes('INSERT INTO shift_movements')) {
      const movementId = movementIdCounter++;
      const movement = {
        id: movementId,
        shift_id: params[0],
        movement_type: params[1],
        amount: params[2],
        note: params[3] || null,
        created_at: generateTimestamp()
      };
      mockShiftMovements.push(movement);
      return { lastInsertRowid: movementId, lastID: movementId, changes: 1 };
    }

    if (sql.includes('UPDATE shifts SET status = \'CLOSED\'')) {
      const shiftId = params[0];
      const shift = mockShifts.find(s => s.id === shiftId);
      if (shift) {
        shift.status = 'CLOSED';
        shift.declared_cash = params[1];
        shift.note = params[2];
        shift.closed_at = generateTimestamp();
        return { lastInsertRowid: shiftId, lastID: shiftId, changes: 1 };
      }
      return { lastInsertRowid: 0, lastID: 0, changes: 0 };
    }

    if (sql.includes('UPDATE shifts SET status = \'VOIDED\'')) {
      const shiftId = params[0];
      const shift = mockShifts.find(s => s.id === shiftId);
      if (shift) {
        shift.status = 'VOIDED';
        shift.note = params[1];
        shift.closed_at = generateTimestamp();
        return { lastInsertRowid: shiftId, lastID: shiftId, changes: 1 };
      }
      return { lastInsertRowid: 0, lastID: 0, changes: 0 };
    }

    // Default return for other execute operations
    return { lastInsertRowid: 0, changes: 0 };
  }),

  query: vi.fn().mockImplementation((sql: string, params: any[] = []) => {
    if (sql.includes('SELECT * FROM shifts') && sql.includes('WHERE terminal_name = ? AND status = \'OPEN\'')) {
      const terminal = params[0];
      const cashierId = params[1];
      return mockShifts.filter(s => s.terminal_name === terminal && s.status === 'OPEN' && (!cashierId || s.cashier_id === cashierId));
    }

    if (sql.includes('SELECT * FROM shifts WHERE 1=1')) {
      let shifts = [...mockShifts];
      
      // Apply filters based on params
      if (params.includes('OPEN')) {
        shifts = shifts.filter(s => s.status === 'OPEN');
      }
      if (params.includes('CLOSED')) {
        shifts = shifts.filter(s => s.status === 'CLOSED');
      }
      if (params.includes('Terminal 1')) {
        shifts = shifts.filter(s => s.terminal_name === 'Terminal 1');
      }
      
      return shifts;
    }

    if (sql.includes('SELECT * FROM shifts WHERE id = ?')) {
      const shiftId = params[0];
      const shift = mockShifts.find(s => s.id === shiftId);
      return shift ? [shift] : [];
    }

    if (sql.includes('SELECT * FROM shift_movements WHERE shift_id = ?')) {
      const shiftId = params[0];
      return mockShiftMovements.filter(m => m.shift_id === shiftId);
    }

    if (sql.includes('COUNT(*) as invoices') && sql.includes('COALESCE(SUM(subtotal)')) {
      return [{ invoices: 5, gross: 1000, discount: 50, tax: 150, net: 1100 }];
    }

    if (sql.includes('COALESCE(SUM(CASE WHEN payment_method = \'cash\'')) {
      return [{ cash: 600, card: 300, wallet: 100, other: 100 }];
    }

    // Default return for other queries
    return [];
  }),

  run: vi.fn().mockImplementation((sql: string, params: any[] = []) => {
    return mockShiftDatabase.execute(sql, params);
  }),

  get: vi.fn().mockImplementation((sql: string, params: any[] = []) => {
    const results = mockShiftDatabase.query(sql, params);
    return results.length > 0 ? results[0] : undefined;
  }),

  all: vi.fn().mockImplementation((sql: string, params: any[] = []) => {
    return mockShiftDatabase.query(sql, params);
  }),

  prepare: vi.fn().mockReturnValue({
    run: vi.fn().mockReturnValue({ lastInsertRowid: Math.floor(Math.random() * 1000), changes: 1 }),
    get: vi.fn().mockReturnValue(null),
    all: vi.fn().mockReturnValue([])
  })
};

// Setup function for shift service mocks
export const setupShiftServiceMocks = () => {
  // Mock the database service
  vi.mock('@/services/database', () => ({
    database: mockShiftDatabase
  }));

  // Mock the database service for relative imports
  vi.mock('../services/database', () => ({
    database: mockShiftDatabase
  }));

  // Mock the database service for same-directory imports
  vi.mock('./database', () => ({
    database: mockShiftDatabase
  }));
};

// Reset function for shift service mocks
export const resetShiftServiceMocks = () => {
  // Reset mock data
  mockShifts.length = 2; // Keep the initial test data
  mockShiftMovements.length = 1; // Keep the initial test data
  
  // Reset counters
  shiftIdCounter = 3;
  movementIdCounter = 2;
  
  // Clear all mocks
  vi.clearAllMocks();
};
