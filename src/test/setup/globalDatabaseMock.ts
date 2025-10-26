import { vi } from 'vitest';

// Create a comprehensive mock database that replaces the real DatabaseService
const mockDatabaseService = {
  tables: new Map(),
  
  async initialize() {
    // Mock initialization
  },
  
  async runMigrations() {
    // Mock migrations
  },
  
  async runSeeds() {
    // Mock seeds
  },
  
  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    // Mock query implementation
    const sqlLower = sql.toLowerCase();
    
    if (sqlLower.includes('select * from shifts where id = ?')) {
      const id = params?.[0];
      return [{ id, terminal_name: 'Terminal 1', status: 'OPEN', cashier_id: 1 }] as T[];
    }
    
    if (sqlLower.includes('select * from shifts where terminal_name = ? and status = ?')) {
      const [terminal, status] = params || [];
      if (status === 'OPEN') {
        return [{ id: 1, terminal_name: terminal, status, cashier_id: 1 }] as T[];
      }
      return [] as T[];
    }
    
    if (sqlLower.includes('select * from shifts where status = ?')) {
      const status = params?.[0];
      return [{ id: 1, terminal_name: 'Terminal 1', status, cashier_id: 1 }] as T[];
    }
    
    return [] as T[];
  },
  
  async run(sql: string, _params?: any[]): Promise<{ lastID?: number; changes?: number }> {
    // Mock run implementation
    const sqlLower = sql.toLowerCase();
    
    if (sqlLower.includes('insert into shifts')) {
      return { lastID: 1, changes: 1 };
    }
    
    if (sqlLower.includes('insert into shift_movements')) {
      return { lastID: 1, changes: 1 };
    }
    
    if (sqlLower.includes('update shifts set')) {
      return { lastID: 0, changes: 1 };
    }
    
    return { lastID: 0, changes: 0 };
  },
  
  async get<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  },
  
  async all<T = any>(sql: string, params?: any[]): Promise<T[]> {
    return this.query<T>(sql, params);
  },
  
  async execute(sql: string, _params?: any[]): Promise<any> {
    // Mock execute implementation - this is what the shift service uses
    const sqlLower = sql.toLowerCase();
    
    if (sqlLower.includes('insert into shifts')) {
      return { lastInsertRowid: 1, lastID: 1, changes: 1 };
    }
    
    if (sqlLower.includes('insert into shift_movements')) {
      return { lastInsertRowid: 1, lastID: 1, changes: 1 };
    }
    
    if (sqlLower.includes('update shifts set')) {
      return { lastInsertRowid: 0, changes: 1 };
    }
    
    return { lastInsertRowid: 0, changes: 0 };
  },
  
  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    return await callback();
  },
  
  async close() {
    // Mock close
  },
  
  saveToStorage() {
    // Mock save to storage
  }
};

// Mock the DatabaseService class and singleton instance
vi.mock('@/services/database', () => ({
  database: mockDatabaseService,
  db: mockDatabaseService,
  DatabaseService: vi.fn().mockImplementation(() => mockDatabaseService)
}));

// Mock relative imports
vi.mock('../services/database', () => ({
  database: mockDatabaseService,
  db: mockDatabaseService,
  DatabaseService: vi.fn().mockImplementation(() => mockDatabaseService)
}));

// Mock same-directory imports
vi.mock('./database', () => ({
  database: mockDatabaseService,
  db: mockDatabaseService,
  DatabaseService: vi.fn().mockImplementation(() => mockDatabaseService)
}));

export { mockDatabaseService };




