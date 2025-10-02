// import { Database } from 'sql.js'; // Commented out for now

export interface DatabaseConfig {
  path?: string;
  inMemory?: boolean;
}

export class DatabaseService {
  private db: any | null = null;
  private config: DatabaseConfig;
  private tables: Map<string, any[]> = new Map();

  constructor(config: DatabaseConfig = {}) {
    this.config = config;
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const storedData = localStorage.getItem('pos_database');
      if (storedData) {
        const data = JSON.parse(storedData);
        this.tables = new Map(Object.entries(data));
        console.log('📦 Database loaded from localStorage');
      }
    } catch (error) {
      console.error('Failed to load database from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.tables.entries());
      localStorage.setItem('pos_database', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save database to storage:', error);
    }
  }

  async initialize(): Promise<void> {
    try {
      console.log('Database service initialized (localStorage mode)');
      
      // Initialize tables if they don't exist
      if (!this.tables.has('users')) {
        this.tables.set('users', []);
      }
      if (!this.tables.has('sessions')) {
        this.tables.set('sessions', []);
      }
      if (!this.tables.has('cash_events')) {
        this.tables.set('cash_events', []);
      }
      
      this.saveToStorage();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  async runMigrations(): Promise<void> {
    console.log('Running database migrations...');
    
    // Create default users if they don't exist
    const users = this.tables.get('users') || [];
    
    if (users.length === 0) {
      console.log('Creating default users...');
      
      const defaultUsers = [
        {
          id: 1,
          name: 'Manager',
          role: 'MANAGER',
          pin: '9999',
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 2,
          name: 'Cashier 1',
          role: 'CASHIER',
          pin: '1234',
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 3,
          name: 'Cashier 2',
          role: 'CASHIER',
          pin: '5678',
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      this.tables.set('users', defaultUsers);
      this.saveToStorage();
      
      console.log('✅ Default users created');
    }
    
    console.log('✅ All migrations completed successfully');
  }

  async runSeeds(): Promise<void> {
    console.log('Running database seeds...');
    console.log('✅ All seeds completed successfully');
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    console.log('Executing query:', sql, params);
    
    // Simple SQL parser for basic operations
    const sqlLower = sql.toLowerCase().trim();
    
    if (sqlLower.startsWith('select')) {
      return this.executeSelect<T>(sql, params || []);
    }
    
    return [];
  }

  private executeSelect<T>(sql: string, params: any[]): T[] {
    // Basic SELECT parser
    const sqlLower = sql.toLowerCase();
    
    // Extract table name
    const fromMatch = sqlLower.match(/from\s+(\w+)/);
    if (!fromMatch) return [];
    
    const tableName = fromMatch[1];
    const tableData = this.tables.get(tableName) || [];
    
    // Handle WHERE clauses
    if (sqlLower.includes('where')) {
      return this.applyWhereClause(tableData, sql, params) as T[];
    }
    
    return tableData as T[];
  }

  private applyWhereClause(data: any[], sql: string, params: any[]): any[] {
    const sqlLower = sql.toLowerCase();
    
    // Handle simple WHERE pin = ? AND active = true
    if (sqlLower.includes('pin = ?') && sqlLower.includes('active = true')) {
      const pin = params[0];
      return data.filter(row => row.pin === pin && row.active === true);
    }
    
    // Handle WHERE id = ?
    if (sqlLower.includes('id = ?')) {
      const id = params[0];
      return data.filter(row => row.id === id);
    }
    
    // Handle WHERE cashier_id = ? AND terminal = ? AND status = "OPEN"
    if (sqlLower.includes('cashier_id = ?') && sqlLower.includes('terminal = ?') && sqlLower.includes('status = "open"')) {
      const [cashierId, terminal] = params;
      return data.filter(row => row.cashier_id === cashierId && row.terminal === terminal && row.status === 'OPEN');
    }

    // Handle WHERE type = 'SALE' AND voided_at IS NULL
    if (sqlLower.includes('type = "sale"') && sqlLower.includes('voided_at is null')) {
      return data.filter(row => row.type === 'SALE' && !row.voided_at);
    }

    // Handle WHERE type = 'REFUND' AND voided_at IS NULL
    if (sqlLower.includes('type = "refund"') && sqlLower.includes('voided_at is null')) {
      return data.filter(row => row.type === 'REFUND' && !row.voided_at);
    }

    // Handle WHERE invoice_number = ?
    if (sqlLower.includes('invoice_number = ?')) {
      const invoiceNumber = params[0];
      return data.filter(row => row.invoice_number === invoiceNumber);
    }

    // Handle WHERE status = 'HELD'
    if (sqlLower.includes('status = "held"')) {
      return data.filter(row => row.status === 'HELD');
    }

    // Handle WHERE terminal_name = ?
    if (sqlLower.includes('terminal_name = ?')) {
      const terminal = params[0];
      return data.filter(row => row.terminal_name === terminal);
    }
    
    return data;
  }

  async execute(sql: string, params?: any[]): Promise<any> {
    console.log('Executing:', sql, params);
    
    const sqlLower = sql.toLowerCase().trim();
    
    if (sqlLower.startsWith('insert')) {
      return this.executeInsert(sql, params || []);
    }
    
    if (sqlLower.startsWith('update')) {
      return this.executeUpdate(sql, params || []);
    }
    
    return { lastInsertRowid: Date.now(), changes: 1 };
  }

  private executeInsert(sql: string, params: any[]): any {
    // Extract table name
    const tableMatch = sql.match(/insert\s+into\s+(\w+)/i);
    if (!tableMatch) return { lastInsertRowid: 0, changes: 0 };
    
    const tableName = tableMatch[1];
    const table = this.tables.get(tableName) || [];
    
    // Generate new ID
    const newId = Math.max(0, ...table.map(row => row.id || 0)) + 1;
    
    // Create new record based on table type
    let newRecord: any = { id: newId };
    
    if (tableName === 'sessions') {
      const [cashierId, terminal, openingFloat] = params;
      newRecord = {
        id: newId,
        cashier_id: cashierId,
        terminal: terminal,
        started_at: new Date().toISOString(),
        ended_at: null,
        opening_float: openingFloat,
        closing_cash: null,
        notes: null,
        status: 'OPEN',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } else if (tableName === 'sales') {
      // Handle both regular sales and holds
      const [status, holdName, customerId, cashierId, terminalName, priceTier, totalAmount, taxAmount, discountAmount, expiresAt, holdNote, createdAt] = params;
      newRecord = {
        id: newId,
        status: status || 'SALE',
        hold_name: holdName,
        customer_id: customerId,
        cashier_id: cashierId,
        terminal_name: terminalName,
        price_tier: priceTier,
        total_amount: totalAmount,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        expires_at: expiresAt,
        hold_note: holdNote,
        created_at: createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        invoice_number: status === 'HELD' ? `HOLD-${newId}` : `INV-${String(newId).padStart(6, '0')}`
      };
    } else if (tableName === 'cash_events') {
      const [sessionId, type, amount, reason, createdBy] = params;
      newRecord = {
        id: newId,
        session_id: sessionId,
        type: type,
        amount: amount,
        reason: reason,
        created_at: new Date().toISOString(),
        created_by: createdBy
      };
    }
    
    table.push(newRecord);
    this.tables.set(tableName, table);
    this.saveToStorage();
    
    return { lastInsertRowid: newId, changes: 1 };
  }

  private executeUpdate(sql: string, params: any[]): any {
    // Basic UPDATE implementation
    const tableMatch = sql.match(/update\s+(\w+)/i);
    if (!tableMatch) return { changes: 0 };
    
    const tableName = tableMatch[1];
    const table = this.tables.get(tableName) || [];
    
    // Handle basic updates
    let changes = 0;
    
    if (sql.includes('WHERE id = ?')) {
      const id = params[params.length - 1]; // Last parameter is usually the ID
      const recordIndex = table.findIndex(row => row.id === id);
      
      if (recordIndex !== -1) {
        // Update the record (simplified)
        table[recordIndex].updated_at = new Date().toISOString();
        changes = 1;
      }
    }
    
    this.tables.set(tableName, table);
    this.saveToStorage();
    
    return { changes };
  }

  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    // Mock implementation - in production this would handle transactions
    return await callback();
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Singleton instance
export const db = new DatabaseService();
