// import { Database } from 'sql.js'; // Commented out for now

export interface DatabaseConfig {
  path?: string;
  inMemory?: boolean;
}

export class DatabaseService {
  private db: any | null = null;
  private config: DatabaseConfig;
  public tables: Map<string, any[]> = new Map();

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

  public saveToStorage(): void {
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
      if (!this.tables.has('customers')) {
        this.tables.set('customers', []);
      }
      if (!this.tables.has('suppliers')) {
        this.tables.set('suppliers', []);
      }
      if (!this.tables.has('products')) {
        this.tables.set('products', []);
      }
      if (!this.tables.has('categories')) {
        this.tables.set('categories', []);
      }
      if (!this.tables.has('discounts')) {
        this.tables.set('discounts', []);
      }
      if (!this.tables.has('grn')) {
        this.tables.set('grn', []);
      }
      if (!this.tables.has('grn_lines')) {
        this.tables.set('grn_lines', []);
      }
      if (!this.tables.has('inventory_movements')) {
        this.tables.set('inventory_movements', []);
      }
      if (!this.tables.has('sales')) {
        this.tables.set('sales', []);
      }
      if (!this.tables.has('sale_items')) {
        this.tables.set('sale_items', []);
      }
      if (!this.tables.has('returns')) {
        this.tables.set('returns', []);
      }
      if (!this.tables.has('return_lines')) {
        this.tables.set('return_lines', []);
      }
      if (!this.tables.has('shifts')) {
        this.tables.set('shifts', []);
      }
      if (!this.tables.has('shift_movements')) {
        this.tables.set('shift_movements', []);
      }
      if (!this.tables.has('company_profile')) {
        this.tables.set('company_profile', []);
      }
      if (!this.tables.has('license_info')) {
        this.tables.set('license_info', []);
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
        },
        {
          id: 4,
          name: 'License Admin',
          role: 'LICENSE_ADMIN',
          pin: '0000',
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      this.tables.set('users', defaultUsers);
      this.saveToStorage();
      
      console.log('✅ Default users created');
    }

    // Create sample suppliers if they don't exist
    const suppliers = this.tables.get('suppliers') || [];
    if (suppliers.length === 0) {
      console.log('Creating sample suppliers...');
      
      const sampleSuppliers = [
        {
          id: 1,
          supplier_name: 'ABC Food Supplies',
          contact_phone: '011-2345678',
          contact_email: 'orders@abcfoods.com',
          address: '123 Main Street, Colombo 01',
          tax_id: 'TAX001',
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 2,
          supplier_name: 'XYZ Beverages Ltd',
          contact_phone: '011-8765432',
          contact_email: 'sales@xyzbeverages.com',
          address: '456 Galle Road, Colombo 03',
          tax_id: 'TAX002',
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      this.tables.set('suppliers', sampleSuppliers);
      this.saveToStorage();
      
      console.log('✅ Sample suppliers created');
    }

    // Create sample products if they don't exist
    const products = this.tables.get('products') || [];
    if (products.length === 0) {
      console.log('Creating sample products...');
      
      const sampleProducts = [
        {
          id: 1,
          sku: 'RICE-001',
          name_en: 'Basmati Rice 1kg',
          name_si: 'බාස්මති බත් 1kg',
          name_ta: 'பாஸ்மதி அரிசி 1kg',
          barcode: '1234567890123',
          category_id: 1,
          price_retail: 250.00,
          price_wholesale: 200.00,
          price_credit: 220.00,
          price_other: 240.00,
          cost: 180.00,
          stock: 50,
          min_stock: 10,
          max_stock: 100,
          unit: 'kg',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
        },
        {
          id: 2,
          sku: 'MILK-001',
          name_en: 'Fresh Milk 1L',
          name_si: 'නව ගව කිරි 1L',
          name_ta: 'புதிய பால் 1L',
          barcode: '1234567890124',
          category_id: 2,
          price_retail: 120.00,
          price_wholesale: 100.00,
          price_credit: 110.00,
          price_other: 115.00,
          cost: 80.00,
          stock: 30,
          min_stock: 5,
          max_stock: 50,
          unit: 'L',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date(Date.now() - 172800000).toISOString() // 2 days ago
        },
        {
          id: 3,
          sku: 'BREAD-001',
          name_en: 'White Bread Loaf',
          name_si: 'සුදු පාන් බෝල්ල',
          name_ta: 'வெள்ளை ரொட்டி',
          barcode: '1234567890125',
          category_id: 3,
          price_retail: 80.00,
          price_wholesale: 65.00,
          price_credit: 70.00,
          price_other: 75.00,
          cost: 50.00,
          stock: 20,
          min_stock: 5,
          max_stock: 40,
          unit: 'pc',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date(Date.now() - 259200000).toISOString() // 3 days ago
        }
      ];
      
      this.tables.set('products', sampleProducts);
      this.saveToStorage();
      
      console.log('✅ Sample products created');
    }

    // Create default license info if it doesn't exist
    const licenseInfo = this.tables.get('license_info') || [];
    if (licenseInfo.length === 0) {
      console.log('Creating default license info...');
      
      const defaultLicense = {
        id: 1,
        productName: 'viRtual POS',
        licensee: 'Virtual Software Pvt Ltd',
        fullName: 'Visual Interface Resource Technology Unified Analytics Labs',
        locked: true,
        issuedAt: new Date().toISOString()
      };
      
      this.tables.set('license_info', [defaultLicense]);
      this.saveToStorage();
      
      console.log('✅ Default license info created');
    }

    // Create default company profile if it doesn't exist
    const companyProfile = this.tables.get('company_profile') || [];
    if (companyProfile.length === 0) {
      console.log('Creating default company profile...');
      
      const defaultCompany = {
        id: 1,
        name: 'Your Company Name',
        address: 'Your Company Address',
        taxId: '',
        contactEmail: '',
        contactPhone: '',
        logoUrl: '',
        updatedAt: new Date().toISOString()
      };
      
      this.tables.set('company_profile', [defaultCompany]);
      this.saveToStorage();
      
      console.log('✅ Default company profile created');
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

  async run(sql: string, params?: any[]): Promise<{ lastID?: number; changes?: number }> {
    console.log('Executing run:', sql, params);
    
    const sqlLower = sql.toLowerCase().trim();
    
    if (sqlLower.startsWith('insert')) {
      return this.executeInsert(sql, params || []);
    } else if (sqlLower.startsWith('update')) {
      return this.executeUpdate(sql, params || []);
    } else if (sqlLower.startsWith('delete')) {
      return this.executeDelete(sql, params || []);
    }
    
    return { lastID: undefined, changes: 0 };
  }

  async get<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  async all<T = any>(sql: string, params?: any[]): Promise<T[]> {
    return this.query<T>(sql, params);
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

    // Handle WHERE status = ? AND status = ?
    if (sqlLower.includes('status = ?') && sqlLower.includes('and status = ?')) {
      const [status1, status2] = params;
      return data.filter(row => row.status === status1 && row.status === status2);
    }

    // Handle WHERE status = ?
    if (sqlLower.includes('status = ?')) {
      const status = params[0];
      return data.filter(row => row.status === status);
    }

    // Handle WHERE terminal_name = ?
    if (sqlLower.includes('terminal_name = ?')) {
      const terminal = params[0];
      return data.filter(row => row.terminal_name === terminal);
    }

    // Handle WHERE barcode = ? AND is_active = true
    if (sqlLower.includes('barcode = ?') && sqlLower.includes('is_active = true')) {
      const barcode = params[0];
      return data.filter(row => row.barcode === barcode && row.is_active === true);
    }

    // Handle WHERE sale_id = ?
    if (sqlLower.includes('sale_id = ?')) {
      const saleId = params[0];
      return data.filter(row => row.sale_id === saleId);
    }

    // Handle WHERE product_id = ?
    if (sqlLower.includes('product_id = ?')) {
      const productId = params[0];
      return data.filter(row => row.product_id === productId);
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
    
    if (sqlLower.startsWith('delete')) {
      return this.executeDelete(sql, params || []);
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
    } else if (tableName === 'products') {
      const [sku, barcode, name_en, name_si, name_ta, unit, category_id, 
             is_scale_item, tax_code, price_retail, price_wholesale, 
             price_credit, price_other, cost, reorder_level, 
             preferred_supplier_id, is_active, created_at] = params;
      newRecord = {
        id: newId,
        sku,
        barcode,
        name_en,
        name_si,
        name_ta,
        unit,
        category_id,
        is_scale_item: is_scale_item === 1,
        tax_code,
        price_retail,
        price_wholesale,
        price_credit,
        price_other,
        cost,
        reorder_level,
        preferred_supplier_id,
        is_active: is_active === 1,
        created_at,
        updated_at: created_at
      };
    } else if (tableName === 'customers') {
      const [customer_name, phone, customer_type, note, active, created_at] = params;
      newRecord = {
        id: newId,
        customer_name,
        phone,
        customer_type,
        note,
        active: active === 1,
        created_at
      };
    } else if (tableName === 'suppliers') {
      const [supplier_name, contact_phone, contact_email, address, tax_id, active, created_at] = params;
      newRecord = {
        id: newId,
        supplier_name,
        contact_phone,
        contact_email,
        address,
        tax_id,
        active: active === 1,
        created_at
      };
    } else if (tableName === 'categories') {
      const [name] = params;
      newRecord = {
        id: newId,
        name
      };
    } else if (tableName === 'sale_items') {
      const [saleId, productId, quantity, unitPrice, discountAmount, taxAmount, totalAmount] = params;
      newRecord = {
        id: newId,
        sale_id: saleId,
        product_id: productId,
        quantity: quantity,
        unit_price: unitPrice,
        discount_amount: discountAmount || 0,
        tax_amount: taxAmount || 0,
        total_amount: totalAmount,
        created_at: new Date().toISOString()
      };
    } else if (tableName === 'discount_rules') {
      const [name, applies_to, target_id, type, value, max_qty_or_weight, 
             active_from, active_to, priority, reason_required, active] = params;
      newRecord = {
        id: newId,
        name,
        applies_to,
        target_id,
        type,
        value,
        max_qty_or_weight,
        active_from,
        active_to,
        priority,
        reason_required: reason_required === 1,
        active: active === 1
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

  private executeDelete(sql: string, params: any[]): any {
    // Basic DELETE implementation
    const tableMatch = sql.match(/delete\s+from\s+(\w+)/i);
    if (!tableMatch) return { changes: 0 };
    
    const tableName = tableMatch[1];
    const table = this.tables.get(tableName) || [];
    
    let changes = 0;
    
    if (sql.includes('WHERE id = ?')) {
      const id = params[params.length - 1]; // Last parameter is usually the ID
      const recordIndex = table.findIndex(row => row.id === id);
      
      if (recordIndex !== -1) {
        table.splice(recordIndex, 1);
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
const database = new DatabaseService();
export { database };
export const db = database;
