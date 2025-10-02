import { db } from './database';

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
  // Generic database methods
  async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    return await db.query<T>(sql, params);
  }

  async execute(sql: string, params: any[] = []): Promise<any> {
    return await db.execute(sql, params);
  }

  // Product CRUD operations
  async getProducts(filters?: {
    search?: string;
    category_id?: string;
    scale_items_only?: boolean;
    active_filter?: 'all' | 'active' | 'inactive';
  }): Promise<Product[]> {
    let query = 'SELECT * FROM products WHERE 1=1';
    const params: any[] = [];

    if (filters?.search) {
      query += ' AND (name_en LIKE ? OR name_si LIKE ? OR name_ta LIKE ? OR sku LIKE ? OR barcode LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (filters?.category_id) {
      query += ' AND category_id = ?';
      params.push(filters.category_id);
    }

    if (filters?.scale_items_only) {
      query += ' AND is_scale_item = 1';
    }

    if (filters?.active_filter) {
      switch (filters.active_filter) {
        case 'active':
          query += ' AND is_active = 1';
          break;
        case 'inactive':
          query += ' AND is_active = 0';
          break;
        // 'all' doesn't add any filter
      }
    } else {
      // Default to active only if no filter specified
      query += ' AND is_active = 1';
    }

    query += ' ORDER BY name_en';
    
    return await db.query<Product>(query, params);
  }

  async getProductById(id: number): Promise<Product | null> {
    const products = await db.query<Product>('SELECT * FROM products WHERE id = ?', [id]);
    return products[0] || null;
  }

  async getProductBySku(sku: string): Promise<Product | null> {
    const products = await db.query<Product>('SELECT * FROM products WHERE sku = ? AND is_active = true', [sku]);
    return products[0] || null;
  }

  async getProductByBarcode(barcode: string): Promise<Product | null> {
    const products = await db.query<Product>('SELECT * FROM products WHERE barcode = ? AND is_active = true', [barcode]);
    return products[0] || null;
  }

  async createProduct(product: Omit<Product, 'id' | 'created_at'>): Promise<Product> {
    const id = Date.now(); // Mock ID generation
    const newProduct: Product = {
      ...product,
      id,
      created_at: new Date()
    };
    // In production, this would insert into the database
    return newProduct;
  }

  async updateProduct(id: number, updates: Partial<Product>): Promise<Product | null> {
    // In production, this would update the database
    const product = await this.getProductById(id);
    if (!product) return null;
    
    return { ...product, ...updates };
  }

  async deleteProduct(id: number): Promise<boolean> {
    // In production, this would soft delete in the database
    return true;
  }

  // Supplier CRUD operations
  async getSuppliers(activeOnly: boolean = true): Promise<Supplier[]> {
    const query = activeOnly 
      ? 'SELECT * FROM suppliers WHERE active = true ORDER BY supplier_name'
      : 'SELECT * FROM suppliers ORDER BY supplier_name';
    return await db.query<Supplier>(query);
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
    const id = Date.now();
    const newSupplier: Supplier = {
      ...supplier,
      id,
      created_at: new Date()
    };
    // In production, this would insert into the database
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
    const id = Date.now();
    const newCustomer: Customer = {
      ...customer,
      id,
      created_at: new Date()
    };
    // In production, this would insert into the database
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
    const query = activeOnly 
      ? 'SELECT * FROM discount_rules WHERE active = true ORDER BY priority'
      : 'SELECT * FROM discount_rules ORDER BY priority, id';
    return await db.query<DiscountRule>(query);
  }

  async getDiscountRuleById(id: number): Promise<DiscountRule | null> {
    const rules = await db.query<DiscountRule>('SELECT * FROM discount_rules WHERE id = ?', [id]);
    return rules[0] || null;
  }

  async createDiscountRule(rule: Omit<DiscountRule, 'id'>): Promise<DiscountRule> {
    const id = Date.now();
    const newRule: DiscountRule = { ...rule, id };
    // In production, this would insert into the database
    return newRule;
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

  async checkDiscountRuleConflicts(rule: Partial<DiscountRule>): Promise<DiscountRule[]> {
    if (!rule.applies_to || !rule.target_id || !rule.active_from || !rule.active_to) {
      return [];
    }

    const query = `
      SELECT * FROM discount_rules 
      WHERE applies_to = ? 
        AND target_id = ? 
        AND active = true
        AND id != ?
        AND (
          (active_from <= ? AND active_to >= ?) OR
          (active_from <= ? AND active_to >= ?) OR
          (active_from >= ? AND active_to <= ?)
        )
      ORDER BY priority
    `;

    const params = [
      rule.applies_to,
      rule.target_id,
      rule.id || 0,
      rule.active_from, rule.active_from,
      rule.active_to, rule.active_to,
      rule.active_from, rule.active_to
    ];

    return await db.query<DiscountRule>(query, params);
  }

  // POS Integration Methods
  async getEffectiveDiscountRules(productIds: number[], categoryIds: number[], now: Date = new Date()): Promise<DiscountRule[]> {
    const rules = await this.getDiscountRules(true); // Get only active rules
    
    return rules.filter(rule => {
      // Check date range
      const fromDate = new Date(rule.active_from);
      const toDate = new Date(rule.active_to);
      if (now < fromDate || now > toDate) return false;
      
      // Check if rule applies to any of the products/categories
      if (rule.applies_to === 'PRODUCT') {
        return productIds.includes(rule.target_id);
      } else {
        return categoryIds.includes(rule.target_id);
      }
    }).sort((a, b) => a.priority - b.priority);
  }

  async getDiscountRulesForProduct(productId: number): Promise<DiscountRule[]> {
    const product = await this.getProductById(productId);
    if (!product) return [];
    
    const categoryIds = [product.category_id];
    return this.getEffectiveDiscountRules([productId], categoryIds);
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

    const productIds = products.map(p => p.id);
    const categoryIds = [...new Set(products.map(p => p.category_id))];

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
    return await db.query<Product>(
      'SELECT * FROM products WHERE (name_en LIKE ? OR name_si LIKE ? OR name_ta LIKE ? OR sku LIKE ? OR barcode LIKE ?) AND is_active = true ORDER BY name_en',
      [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]
    );
  }

  // Category CRUD operations
  async getCategories(): Promise<Category[]> {
    return await db.query<Category>('SELECT * FROM categories ORDER BY name');
  }

  async createCategory(category: Omit<Category, 'id'>): Promise<Category> {
    const id = Date.now(); // Mock ID generation
    const newCategory: Category = {
      ...category,
      id
    };
    // In production, this would insert into the database
    return newCategory;
  }

}

// Singleton instance
export const dataService = new DataService();
