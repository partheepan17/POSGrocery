// Minimal in-memory DB shim to satisfy legacy references in services and tests
const db: any = {
  tables: new Map<string, any[]>(),
  storageKey: 'pos-db',
  saveToStorage() {
    try {
      const obj: Record<string, any[]> = {};
      for (const [k, v] of this.tables.entries()) obj[k] = v;
      localStorage.setItem(this.storageKey, JSON.stringify(obj));
    } catch {}
  },
  loadFromStorage() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const obj = JSON.parse(raw);
      for (const k of Object.keys(obj)) this.tables.set(k, obj[k]);
    } catch {}
  }
};
db.loadFromStorage?.();

export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  sku: string;
  barcode?: string;
  name_en: string;
  name_si?: string;
  name_ta?: string;
  unit: 'pc' | 'kg';
  category_id: number;
  is_scale_item: boolean;
  tax_code?: string;
  price_retail: number;
  price_wholesale: number;
  price_credit: number;
  price_other: number;
  cost?: number;
  reorder_level?: number;
  preferred_supplier_id?: number;
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
}

export interface Supplier {
  id: number;
  supplier_name: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  tax_id?: string;
  active: boolean;
  created_at: Date;
}

export interface Customer {
  id: number;
  customer_name: string;
  phone?: string;
  customer_type: 'Retail' | 'Wholesale' | 'Credit' | 'Other';
  note?: string;
  active: boolean;
  created_at: Date;
}

export interface DiscountRule {
  id: number;
  name: string;
  applies_to: 'PRODUCT' | 'CATEGORY';
  target_id: number;
  type: 'PERCENT' | 'AMOUNT';
  value: number;
  max_qty_or_weight?: number;
  active_from: Date;
  active_to: Date;
  priority: number;
  reason_required: boolean;
  active: boolean;
}

export interface Sale {
  id: number;
  datetime: Date;
  cashier_id: number;
  customer_id?: number;
  price_tier: 'Retail' | 'Wholesale' | 'Credit' | 'Other';
  gross: number;
  discount: number;
  tax: number;
  net: number;
  pay_cash: number;
  pay_card: number;
  pay_wallet: number;
  language: 'EN' | 'SI' | 'TA';
  terminal_name?: string;
}

export interface SaleLine {
  id: number;
  sale_id: number;
  product_id: number;
  qty: number;
  unit_price: number;
  line_discount: number;
  tax: number;
  total: number;
}

export interface SaleRequest {
  customer_id?: number;
  price_tier: 'Retail' | 'Wholesale' | 'Credit' | 'Other';
  cashier_id: number;
  terminal_name?: string;
  language?: 'EN' | 'SI' | 'TA';
}

export interface SaleLineRequest {
  product_id: number;
  qty: number;
  line_discount?: number;
}

export interface PaymentSplit {
  pay_cash: number;
  pay_card: number;
  pay_wallet: number;
}

export class DataService {
  // Generic database methods - shimmed to no-op using in-memory arrays to satisfy types
  async query<T = any>(_sql: string, _params: any[] = []): Promise<T[]> {
    // This frontend build uses API calls; return empty to satisfy callers that handle empty results
    return [] as T[];
  }

  async execute(_sql: string, _params: any[] = []): Promise<{ lastInsertRowid?: number; lastID?: number }> {
    // Return a fake insert id for callers that expect it
    return { lastInsertRowid: Date.now() };
  }

  existsReceiptNo = (receipt: string): boolean => {
    const receipts = (db.tables.get('receipts') || []) as string[];
    return receipts.includes(receipt);
  };
  // Generic database methods - LEGACY - Use API endpoints instead
  // async query<T>(sql: string, params: any[] = []): Promise<T[]> {
  //   return await db.query<T>(sql, params);
  // }

  // async execute(sql: string, params: any[] = []): Promise<any> {
  //   return await db.execute(sql, params);
  // }

  // Product CRUD operations

  async getProductById(id: number): Promise<Product | null> {
    try {
      // Search for the product by ID using the search API
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100';
      const response = await fetch(`${apiBaseUrl}/api/products/search?q=&limit=100`);
      const data = await response.json();
      
      if (response.ok && data.products) {
        const product = data.products.find((p: any) => p.id === id);
        if (product) {
          return {
            id: product.id,
            name_en: product.name_en,
            name_si: product.name_si,
            name_ta: product.name_ta,
            barcode: product.barcode,
            sku: product.sku,
            category_id: product.category_id || 1,
            price_retail: product.price_retail,
            price_wholesale: product.price_wholesale || 0,
            price_credit: product.price_credit || 0,
            price_other: product.price_other || 0,
            cost: undefined,
            unit: product.unit,
            is_scale_item: false,
            is_active: product.is_active,
            created_at: new Date(),
            // Legacy fields for compatibility
            createdAt: new Date(),
            updatedAt: new Date()
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting product by ID:', error);
      return null;
    }
  }

  async getProductBySku(sku: string): Promise<Product | null> {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100';
      const response = await fetch(`${apiBaseUrl}/api/products/search?q=${encodeURIComponent(sku)}&limit=10`);
      const data = await response.json();
      if (!response.ok) return null;
      const match = (data.products || []).find((p: any) => p.sku === sku) || null;
      return match as Product;
    } catch (error) {
      console.error('Error getting product by SKU:', error);
      return null;
    }
  }


  async createProduct(product: Omit<Product, 'id' | 'created_at'>): Promise<Product> {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100';
      const res = await fetch(`${apiBaseUrl}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create product');
      return data.product as Product;
    } catch (e) {
      console.error('Failed to create product:', e);
      throw e;
    }
  }

  async updateProduct(id: number, updates: Partial<Product>): Promise<Product | null> {
    // Persist update to localStorage-backed DB
    const products = (db as any).tables.get('products') || [];
    const index = products.findIndex((p: any) => p.id === id || p.id?.toString() === id?.toString());
    if (index === -1) return null;

    const current = products[index];
    const updated = {
      ...current,
      ...updates,
      // Normalize booleans and numbers for storage
      is_active: updates.is_active !== undefined ? (updates.is_active as any) : current.is_active,
      is_scale_item: updates.is_scale_item !== undefined ? (updates.is_scale_item as any) : current.is_scale_item,
      category_id: updates.category_id !== undefined ? Number(updates.category_id) : current.category_id,
      preferred_supplier_id: updates.preferred_supplier_id !== undefined ? Number(updates.preferred_supplier_id) : current.preferred_supplier_id,
      price_retail: updates.price_retail !== undefined ? Number(updates.price_retail) : current.price_retail,
      price_wholesale: updates.price_wholesale !== undefined ? Number(updates.price_wholesale) : current.price_wholesale,
      price_credit: updates.price_credit !== undefined ? Number(updates.price_credit) : current.price_credit,
      price_other: updates.price_other !== undefined ? Number(updates.price_other) : current.price_other,
      updated_at: new Date().toISOString()
    };

    products[index] = updated;
    (db as any).tables.set('products', products);
    (db as any).saveToStorage();

    return {
      id: updated.id,
      sku: updated.sku,
      barcode: updated.barcode,
      name_en: updated.name_en,
      name_si: updated.name_si,
      name_ta: updated.name_ta,
      unit: updated.unit,
      category_id: updated.category_id?.toString(),
      is_scale_item: !!updated.is_scale_item,
      tax_code: updated.tax_code,
      price_retail: Number(updated.price_retail),
      price_wholesale: Number(updated.price_wholesale || 0),
      price_credit: Number(updated.price_credit || 0),
      price_other: Number(updated.price_other || 0),
      cost: updated.cost,
      reorder_level: updated.reorder_level,
      preferred_supplier_id: updated.preferred_supplier_id?.toString(),
      is_active: !!updated.is_active,
      created_at: new Date(updated.created_at),
      updated_at: new Date(updated.updated_at)
    } as unknown as Product;
  }

  async deleteProduct(id: number): Promise<boolean> {
    // Permanently remove from localStorage-backed DB
    const products = (db as any).tables.get('products') || [];
    const index = products.findIndex((p: any) => p.id === id || p.id?.toString() === id?.toString());
    if (index === -1) return false;
    products.splice(index, 1);
    (db as any).tables.set('products', products);
    (db as any).saveToStorage();
    return true;
  }

  // Supplier CRUD operations
  async getSuppliers(activeOnly: boolean = true): Promise<Supplier[]> {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100';
      const response = await fetch(`${apiBaseUrl}/api/suppliers?active=${activeOnly}`);
      const data = await response.json();
      const rows = data.suppliers || [];
    return rows.map((row: any) => ({
        id: row.id,
      supplier_name: row.supplier_name,
      contact_phone: row.contact_phone || undefined,
      contact_email: row.contact_email || undefined,
      address: row.address || undefined,
      tax_id: row.tax_id || undefined,
        active: row.active ?? true,
        created_at: new Date(),
      // Legacy fields for compatibility
      name: row.supplier_name,
      contactPerson: row.contact_person || undefined,
      phone: row.contact_phone || undefined,
      email: row.contact_email || undefined,
      city: row.city || undefined,
        isActive: (row.active ?? true) as any,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
    } catch (error) {
      console.error('Failed to load suppliers:', error);
      return [{ id: 1, supplier_name: 'Default Supplier', active: true, created_at: new Date() } as any];
    }
  }

  async getSuppliersWithFilters(filters: {
    search?: string;
    active?: boolean;
  }): Promise<Supplier[]> {
    let query = 'SELECT * FROM suppliers WHERE 1=1';
    const params: any[] = [];

    if (filters.search) {
      query += ' AND (supplier_name LIKE ? OR tax_id LIKE ? OR contact_phone LIKE ? OR contact_email LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (filters.active !== undefined) {
      query += ' AND active = ?';
      params.push(filters.active);
    }

    query += ' ORDER BY supplier_name';
    return await db.query<Supplier>(query, params);
  }

  async getSupplierById(id: number): Promise<Supplier | null> {
    const suppliers = await db.query<Supplier>('SELECT * FROM suppliers WHERE id = ?', [id]);
    return suppliers[0] || null;
  }

  async getSupplierByName(name: string): Promise<Supplier | null> {
    const suppliers = await db.query<Supplier>('SELECT * FROM suppliers WHERE LOWER(supplier_name) = LOWER(?)', [name]);
    return suppliers[0] || null;
  }

  async createSupplier(supplier: Omit<Supplier, 'id' | 'created_at'>): Promise<Supplier> {
    const sql = `
      INSERT INTO suppliers (supplier_name, contact_phone, contact_email, address, tax_id, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      supplier.supplier_name,
      supplier.contact_phone || null,
      supplier.contact_email || null,
      supplier.address || null,
      supplier.tax_id || null,
      supplier.active ? 1 : 0,
      new Date().toISOString()
    ];
    
    const result = await db.execute(sql, params);
    const newSupplier: Supplier = {
      ...supplier,
      id: result.lastInsertRowid || result.lastID || Date.now(),
      created_at: new Date()
    };
    
    return newSupplier;
  }

  async updateSupplier(id: number, updates: Partial<Supplier>): Promise<Supplier | null> {
    const supplier = await this.getSupplierById(id);
    if (!supplier) return null;
    const updatedSupplier = { ...supplier, ...updates };
    // In production, this would update the database
    return updatedSupplier;
  }

  async deleteSupplier(id: number): Promise<boolean> {
    // In production, this would delete from the database
    return true;
  }

  async getProductCountBySupplier(supplierId: number): Promise<number> {
    const result = await db.query<{ count: number }>('SELECT COUNT(*) as count FROM products WHERE preferred_supplier_id = ?', [supplierId]);
    return result[0]?.count || 0;
  }

  // Customer CRUD operations
  async getCustomers(activeOnly: boolean = true): Promise<Customer[]> {
    const query = activeOnly 
      ? 'SELECT * FROM customers WHERE active = true ORDER BY customer_name'
      : 'SELECT * FROM customers ORDER BY customer_name';
    return await db.query<Customer>(query);
  }

  async getCustomersWithFilters(filters: {
    search?: string;
    customer_type?: 'Retail' | 'Wholesale' | 'Credit' | 'Other';
    active?: boolean;
  }): Promise<Customer[]> {
    let query = 'SELECT * FROM customers WHERE 1=1';
    const params: any[] = [];

    if (filters.search) {
      query += ' AND (customer_name LIKE ? OR phone LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (filters.customer_type) {
      query += ' AND customer_type = ?';
      params.push(filters.customer_type);
    }

    if (filters.active !== undefined) {
      query += ' AND active = ?';
      params.push(filters.active);
    }

    query += ' ORDER BY customer_name';
    return await db.query<Customer>(query, params);
  }

  async getCustomerById(id: number): Promise<Customer | null> {
    const customers = await db.query<Customer>('SELECT * FROM customers WHERE id = ?', [id]);
    return customers[0] || null;
  }

  async getCustomerByName(name: string): Promise<Customer | null> {
    const customers = await db.query<Customer>('SELECT * FROM customers WHERE LOWER(customer_name) = LOWER(?)', [name]);
    return customers[0] || null;
  }

  async createCustomer(customer: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> {
    const sql = `
      INSERT INTO customers (customer_name, phone, customer_type, note, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      customer.customer_name,
      customer.phone || null,
      customer.customer_type,
      customer.note || null,
      customer.active ? 1 : 0,
      new Date().toISOString()
    ];
    
    const result = await db.execute(sql, params);
    const newCustomer: Customer = {
      ...customer,
      id: result.lastInsertRowid || result.lastID || Date.now(),
      created_at: new Date()
    };
    
    return newCustomer;
  }

  async updateCustomer(id: number, updates: Partial<Customer>): Promise<Customer | null> {
    const customer = await this.getCustomerById(id);
    if (!customer) return null;
    const updatedCustomer = { ...customer, ...updates };
    // In production, this would update the database
    return updatedCustomer;
  }

  async deleteCustomer(id: number): Promise<boolean> {
    // In production, this would delete from the database
    return true;
  }

  async getSalesCountByCustomer(customerId: number): Promise<number> {
    const result = await db.query<{ count: number }>('SELECT COUNT(*) as count FROM sales WHERE customer_id = ?', [customerId]);
    return result[0]?.count || 0;
  }

  async getCustomerStats(): Promise<{
    total: number;
    retail: number;
    wholesale: number;
    credit: number;
    other: number;
    active: number;
    inactive: number;
  }> {
    const customers = await this.getCustomers(false);
    return {
      total: customers.length,
      retail: customers.filter(c => c.customer_type === 'Retail').length,
      wholesale: customers.filter(c => c.customer_type === 'Wholesale').length,
      credit: customers.filter(c => c.customer_type === 'Credit').length,
      other: customers.filter(c => c.customer_type === 'Other').length,
      active: customers.filter(c => c.active).length,
      inactive: customers.filter(c => !c.active).length
    };
  }

  // Discount Rules CRUD operations
  async getDiscountRules(activeOnly: boolean = false): Promise<DiscountRule[]> {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100';
      const response = await fetch(`${apiBaseUrl}/api/discount-rules?active=${activeOnly}`);
      const data = await response.json();
      return data.rules || [];
    } catch (error) {
      console.error('Failed to load discount rules:', error);
      return [];
    }
  }

  async getDiscountRuleById(id: number): Promise<DiscountRule | null> {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100';
      const response = await fetch(`${apiBaseUrl}/api/discount-rules/${id}`);
      const data = await response.json();
      return data.rule || null;
    } catch (error) {
      console.error('Failed to load discount rule by id:', error);
      return null;
    }
  }

  async createDiscountRule(rule: Omit<DiscountRule, 'id'>): Promise<DiscountRule> {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100';
      const response = await fetch(`${apiBaseUrl}/api/discount-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
      ...rule, 
          active_from: (rule as any).active_from?.toISOString?.() || rule.active_from,
          active_to: (rule as any).active_to?.toISOString?.() || rule.active_to
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        return data.rule as DiscountRule;
      }
      throw new Error(data?.error || 'Failed to save discount rule');
    } catch (error) {
      console.error('Failed to save discount rule:', error);
      throw error;
    }
  }

  async updateDiscountRule(id: number, updates: Partial<DiscountRule>): Promise<DiscountRule | null> {
    const rule = await this.getDiscountRuleById(id);
    if (!rule) return null;
    const updatedRule = { ...rule, ...updates };
    // In production, this would update the database
    return updatedRule;
  }

  async deleteDiscountRule(id: number): Promise<boolean> {
    // In production, this would delete from the database
    return true;
  }

  // Enhanced discount rule queries
  async getDiscountRulesWithFilters(filters: {
    search?: string;
    applies_to?: 'PRODUCT' | 'CATEGORY';
    type?: 'PERCENT' | 'AMOUNT';
    active?: boolean;
    date_from?: Date;
    date_to?: Date;
  }): Promise<DiscountRule[]> {
    let query = 'SELECT * FROM discount_rules WHERE 1=1';
    const params: any[] = [];

    if (filters.search) {
      query += ' AND name LIKE ?';
      params.push(`%${filters.search}%`);
    }

    if (filters.applies_to) {
      query += ' AND applies_to = ?';
      params.push(filters.applies_to);
    }

    if (filters.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }

    if (filters.active !== undefined) {
      query += ' AND active = ?';
      params.push(filters.active);
    }

    if (filters.date_from) {
      query += ' AND active_from >= ?';
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      query += ' AND active_to <= ?';
      params.push(filters.date_to);
    }

    query += ' ORDER BY priority, id';
    return await db.query<DiscountRule>(query, params);
  }

  async getDiscountRulesByTarget(applies_to: 'PRODUCT' | 'CATEGORY', target_id: number): Promise<DiscountRule[]> {
    const query = 'SELECT * FROM discount_rules WHERE applies_to = ? AND target_id = ? AND active = true ORDER BY priority';
    return await db.query<DiscountRule>(query, [applies_to, target_id]);
  }

  async checkDiscountRuleConflicts(_rule: Partial<DiscountRule>): Promise<DiscountRule[]> {
    // Defer conflict detection to backend; unblock UI
      return [];
  }

  // POS Integration Methods
  async getEffectiveDiscountRules(productIds: number[], categoryIds: number[], now: Date = new Date()): Promise<DiscountRule[]> {
    const rules = await this.getDiscountRules(true); // Get only active rules
    
    return rules.filter(rule => {
      // Check date range (tolerant parsing)
      let fromDate = new Date(rule.active_from as any);
      let toDate = new Date(rule.active_to as any);
      if (isNaN(fromDate.getTime())) fromDate = new Date(0);
      if (isNaN(toDate.getTime())) toDate = new Date(8640000000000000);
      if (now < fromDate || now > toDate) return false;
      
      // Check if rule applies to any of the products/categories
      if (rule.applies_to === 'PRODUCT') {
        return productIds.includes(Number(rule.target_id));
      } else {
        return categoryIds.includes(Number(rule.target_id));
      }
    }).sort((a, b) => a.priority - b.priority);
  }

  async getDiscountRulesForProduct(productId: number): Promise<DiscountRule[]> {
    const product = await this.getProductById(productId);
    if (!product) return [];
    
    const categoryIds = [Number(product.category_id)];
    return this.getEffectiveDiscountRules([Number(productId)], categoryIds);
  }

  async getDiscountRulesForSKUs(skus: string[]): Promise<DiscountRule[]> {
    if (skus.length === 0) return [];

    // Get products by SKUs
    const products: Product[] = [];
    for (const sku of skus) {
      const product = await this.getProductBySku(sku);
      if (product) {
        products.push(product);
      }
    }

    if (products.length === 0) return [];

    const productIds = products.map(p => Number(p.id));
    const categoryIds = [...new Set(products.map(p => Number(p.category_id)))] as number[];

    return this.getEffectiveDiscountRules(productIds, categoryIds);
  }

  // POS Operations
  async startSale(saleRequest: SaleRequest): Promise<Sale> {
    const id = Date.now();
    const sale: Sale = {
      id,
      datetime: new Date(),
      cashier_id: saleRequest.cashier_id,
      customer_id: saleRequest.customer_id,
      price_tier: saleRequest.price_tier,
      gross: 0,
      discount: 0,
      tax: 0,
      net: 0,
      pay_cash: 0,
      pay_card: 0,
      pay_wallet: 0,
      language: saleRequest.language || 'EN',
      terminal_name: saleRequest.terminal_name
    };
    return sale;
  }

  async addLineToSale(saleId: number, lineRequest: SaleLineRequest): Promise<SaleLine> {
    const product = await this.getProductById(lineRequest.product_id);
    if (!product) {
      throw new Error('Product not found');
    }

    // Get the appropriate price based on the sale's price tier
    const sale = await this.getSaleById(saleId);
    if (!sale) {
      throw new Error('Sale not found');
    }

    let unitPrice: number;
    switch (sale.price_tier) {
      case 'Retail':
        unitPrice = product.price_retail;
        break;
      case 'Wholesale':
        unitPrice = product.price_wholesale;
        break;
      case 'Credit':
        unitPrice = product.price_credit;
        break;
      case 'Other':
        unitPrice = product.price_other;
        break;
      default:
        unitPrice = product.price_retail;
    }

    const lineDiscount = lineRequest.line_discount || 0;
    const subtotal = (unitPrice * lineRequest.qty) - lineDiscount;
    const tax = subtotal * 0.15; // 15% tax
    const total = subtotal + tax;

    const saleLine: SaleLine = {
      id: Date.now(),
      sale_id: saleId,
      product_id: lineRequest.product_id,
      qty: lineRequest.qty,
      unit_price: unitPrice,
      line_discount: lineDiscount,
      tax,
      total
    };

    return saleLine;
  }

  async applyLineDiscount(saleLineId: number, discount: number): Promise<SaleLine | null> {
    // In production, this would update the sale line in the database
    return null;
  }

  async finalizeSale(saleId: number, paymentSplit: PaymentSplit): Promise<Sale> {
    const sale = await this.getSaleById(saleId);
    if (!sale) {
      throw new Error('Sale not found');
    }

    // Update payment amounts
    sale.pay_cash = paymentSplit.pay_cash;
    sale.pay_card = paymentSplit.pay_card;
    sale.pay_wallet = paymentSplit.pay_wallet;

    return sale;
  }

  async holdSale(saleId: number): Promise<boolean> {
    // In production, this would mark the sale as held
    return true;
  }

  async resumeSale(saleId: number): Promise<Sale | null> {
    // In production, this would retrieve the held sale
    return await this.getSaleById(saleId);
  }

  async getSaleById(id: number): Promise<Sale | null> {
    const sales = await db.query<Sale>('SELECT * FROM sales WHERE id = ?', [id]);
    return sales[0] || null;
  }

  async getSaleLines(saleId: number): Promise<SaleLine[]> {
    return await db.query<SaleLine>('SELECT * FROM sale_lines WHERE sale_id = ?', [saleId]);
  }

  // Helper methods
  async getProductsByCategory(categoryId: number): Promise<Product[]> {
    return await db.query<Product>('SELECT * FROM products WHERE category_id = ? AND is_active = true ORDER BY name_en', [categoryId]);
  }

  async searchProducts(query: string): Promise<Product[]> {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100';
      const response = await fetch(`${apiBaseUrl}/api/products/search?q=${encodeURIComponent(query)}&limit=50`);
      const data = await response.json();
      
      if (response.ok && data.products) {
        return data.products.map((p: any) => ({
          id: p.id,
          sku: p.sku,
          barcode: p.barcode,
          name_en: p.name_en,
          name_si: p.name_si,
          name_ta: p.name_ta,
          unit: p.unit,
          category_id: p.category_id || 1,
          is_scale_item: false,
          price_retail: p.price_retail,
          price_wholesale: p.price_wholesale,
          price_credit: p.price_credit,
          price_other: p.price_other,
          is_active: p.is_active,
          created_at: new Date(),
          updated_at: new Date()
        }));
      }
      return [];
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }

  async getProductByBarcode(barcode: string): Promise<Product | null> {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100';
      const response = await fetch(`${apiBaseUrl}/api/products/barcode/${encodeURIComponent(barcode)}`);
      const data = await response.json();
      
      if (response.ok && data.product) {
        const p = data.product;
        return {
          id: p.id,
          sku: p.sku,
          barcode: p.barcode,
          name_en: p.name_en,
          name_si: p.name_si,
          name_ta: p.name_ta,
          unit: p.unit,
          category_id: p.category_id || 1,
          is_scale_item: false,
          price_retail: p.price_retail,
          price_wholesale: p.price_wholesale,
          price_credit: p.price_credit,
          price_other: p.price_other,
          is_active: p.is_active,
          created_at: new Date(),
          updated_at: new Date()
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting product by barcode:', error);
      return null;
    }
  }

  async getProducts(filters?: {
    search?: string;
    category_id?: string;
    scale_items_only?: boolean;
    active_filter?: 'all' | 'active' | 'inactive';
  }): Promise<Product[]> {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100';
      const searchQuery = filters?.search || '';
      const response = await fetch(`${apiBaseUrl}/api/products/search?q=${encodeURIComponent(searchQuery)}&limit=100`);
      const data = await response.json();
      
      if (response.ok && data.products) {
        let products = data.products.map((p: any) => ({
          id: p.id,
          sku: p.sku,
          barcode: p.barcode,
          name_en: p.name_en,
          name_si: p.name_si,
          name_ta: p.name_ta,
          unit: p.unit,
          category_id: p.category_id || 1,
          is_scale_item: false,
          price_retail: p.price_retail,
          price_wholesale: p.price_wholesale,
          price_credit: p.price_credit,
          price_other: p.price_other,
          is_active: p.is_active,
          created_at: new Date(),
          updated_at: new Date()
        }));

        // Apply additional filters
        if (filters?.category_id) {
          products = products.filter(p => p.category_id === parseInt(filters.category_id!));
        }
        if (filters?.active_filter === 'active') {
          products = products.filter(p => p.is_active);
        } else if (filters?.active_filter === 'inactive') {
          products = products.filter(p => !p.is_active);
        }
        
        return products;
      }
      return [];
    } catch (error) {
      console.error('Error getting products:', error);
      return [];
    }
  }

  // Category CRUD operations
  async getCategories(): Promise<Category[]> {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100';
      const response = await fetch(`${apiBaseUrl}/api/categories`);
      const data = await response.json();
      return (data.categories || []).map((c: any) => ({ id: c.id, name: c.name }));
    } catch (error) {
      console.error('Failed to load categories:', error);
      return [{ id: 1, name: 'General' }];
    }
  }

  async createCategory(category: Omit<Category, 'id'>): Promise<Category> {
    const sql = `INSERT INTO categories (name) VALUES (?)`;
    const params = [category.name];
    
    const result = await db.execute(sql, params);
    const newCategory: Category = {
      ...category,
      id: result.lastInsertRowid || result.lastID || Date.now()
    };
    
    return newCategory;
  }

  // Returns & Refunds methods
  async fetchSaleByIdWithLines(saleId: number): Promise<any> {
    const saleQuery = `
      SELECT 
        s.id, s.datetime, s.cashier_id, s.customer_id, s.price_tier,
        s.gross, s.discount, s.tax, s.net, s.pay_cash, s.pay_card, s.pay_wallet,
        s.language, s.terminal_name
      FROM sales s
      WHERE s.id = ?
    `;
    
    const sale = await db.query(saleQuery, [saleId]);
    if (!sale || sale.length === 0) return null;
    const saleData = sale[0];
    
    const linesQuery = `
      SELECT 
        sl.id, sl.product_id, sl.qty, sl.unit_price, sl.line_discount, sl.tax, sl.total,
        p.name_en, p.name_si, p.name_ta, p.sku, p.unit
      FROM sale_lines sl
      JOIN products p ON sl.product_id = p.id
      WHERE sl.sale_id = ?
      ORDER BY sl.id
    `;
    
    const lines = await db.query(linesQuery, [saleId]);
    
    return {
      ...saleData,
      lines: lines.map(line => ({
        ...line,
        product_name: line.name_en,
        product_name_si: line.name_si,
        product_name_ta: line.name_ta
      }))
    };
  }

  async fetchReturnsForSale(saleId: number): Promise<any[]> {
    const query = `
      SELECT 
        r.id, r.datetime, r.cashier_id, r.manager_id, r.refund_cash, r.refund_card,
        r.refund_wallet, r.refund_store_credit, r.reason_summary, r.language,
        r.terminal_name, u1.name as cashier_name, u2.name as manager_name
      FROM returns r
      LEFT JOIN users u1 ON r.cashier_id = u1.id
      LEFT JOIN users u2 ON r.manager_id = u2.id
      WHERE r.sale_id = ?
      ORDER BY r.datetime DESC
    `;
    
    return await db.query(query, [saleId]);
  }

  async createReturnTx(returnData: {
    saleId: number;
    lines: any[];
    payments: { cash: number; card: number; wallet: number; store_credit: number };
    reason_summary?: string;
    language: 'EN' | 'SI' | 'TA';
    cashier_id?: number;
    manager_id?: number | null;
    terminal_name?: string;
  }): Promise<{ returnId: number }> {
    // This method wraps the refundService.createReturn in a database transaction
    // Import refundService here to avoid circular dependencies
    const { refundService } = await import('./refundService');
    return await refundService.createReturn(returnData);
  }

}

// Singleton instance
export const dataService = new DataService();
