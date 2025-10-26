/**
 * Mock database implementation for frontend
 */

export interface Database {
  query: (sql: string, params?: any[]) => Promise<any[]>;
  run: (sql: string, params?: any[]) => Promise<{ lastInsertRowid: number; changes: number }>;
  transaction: (callback: (db: Database) => Promise<void>) => Promise<void>;
  prepare: (sql: string) => {
    all: (...params: any[]) => any[];
    get: (...params: any[]) => any;
    run: (...params: any[]) => { lastInsertRowid: number; changes: number };
  };
}

class MockDatabase implements Database {
  async query(sql: string, params?: any[]): Promise<any[]> {
    console.log('Mock DB Query:', sql, params);
    return [];
  }

  async run(sql: string, params?: any[]): Promise<{ lastInsertRowid: number; changes: number }> {
    console.log('Mock DB Run:', sql, params);
    return { lastInsertRowid: 1, changes: 1 };
  }

  async transaction(callback: (db: Database) => Promise<void>): Promise<void> {
    console.log('Mock DB Transaction started');
    await callback(this);
    console.log('Mock DB Transaction committed');
  }

  prepare(sql: string) {
    console.log('Mock DB Prepare:', sql);
    return {
      all: (...params: any[]) => {
        console.log('Mock DB Prepared All:', sql, params);
        return [];
      },
      get: (...params: any[]) => {
        console.log('Mock DB Prepared Get:', sql, params);
        return null;
      },
      run: (...params: any[]) => {
        console.log('Mock DB Prepared Run:', sql, params);
        return { lastInsertRowid: 1, changes: 1 };
      }
    };
  }
}

export const db = new MockDatabase();

// Export getDatabase function for compatibility
export const getDatabase = () => db;

export default db;

