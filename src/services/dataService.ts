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

// Import offline queue for robust offline handling
import { enqueue, flush, setupOnlineFlush } from '@/core/offline/queue';

// Helper to make API calls with offline queuing
async function apiCall(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
  const url = `${apiBaseUrl}${endpoint}`;
  
  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    // If offline, queue the request
    if (!navigator.onLine) {
      const mutationId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await enqueue({
        id: mutationId,
        endpoint,
        method: options.method || 'GET',
        body: options.body ? JSON.parse(options.body as string) : undefined
      });
      
      // Return a mock response to prevent UI errors
      return new Response(JSON.stringify({ queued: true, id: mutationId }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    throw error;
  }
}

// Setup automatic replay on reconnect
if (typeof window !== 'undefined') {
  setupOnlineFlush(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250');
}

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
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
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
            updated_at: new Date()
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
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
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
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
      
      // Normalize payload before sending
      const toNum = (v: any, d = 0) => (v === null || v === undefined || v === '') ? d : Number(v);
      const normalizedProduct = {
        ...product,
        price_retail: toNum(product.price_retail, 0),
        price_wholesale: toNum(product.price_wholesale, 0),
        price_credit: toNum(product.price_credit, 0),
        price_other: toNum(product.price_other, 0),
        cost: toNum(product.cost, 0),
        reorder_level: Number.isFinite(Number(product.reorder_level)) ? Number(product.reorder_level) : null,
      };
      
      const res = await fetch(`${apiBaseUrl}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedProduct)
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Failed to create product: ${res.statusText}`);
      }
      
      return data.product as Product;
    } catch (e) {
      console.error('Failed to create product:', e);
      throw e;
    }
  }

  async updateProduct(id: number, updates: Partial<Product>): Promise<Product | null> {
    try {
      // Import coercion helper dynamically to avoid circular imports
      const { coerceProductUpdateData } = await import('@/utils/coercion');
      const coercedUpdates = coerceProductUpdateData(updates);
      
      const response = await apiCall(`/api/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(coercedUpdates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update product');
      }

      const result = await response.json();
      return result.product;
    } catch (error) {
      console.error('Failed to update product:', error);
      throw error;
    }
  }

  async deleteProduct(id: number): Promise<{ ok: boolean; message: string; softDelete: boolean; references?: string[] }> {
    try {
      const response = await apiCall(`/api/products/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete product');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to delete product:', error);
      throw error;
    }
  }

  // Supplier CRUD operations
  async getSuppliers(activeOnly: boolean = true): Promise<Supplier[]> {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
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
    // Use backend API instead of local db in FE
    const all = await this.getSuppliers(filters.active);
    const search = (filters.search || '').toLowerCase();
    return all.filter((s: Supplier) =>
      !search || s.supplier_name.toLowerCase().includes(search)
    );
  }

  async getSupplierById(id: number): Promise<Supplier | null> {
    const all = await this.getSuppliers(false);
    return all.find(s => s.id === id) || null;
  }

  async getSupplierByName(name: string): Promise<Supplier | null> {
    const all = await this.getSuppliers(false);
    return all.find(s => s.supplier_name.toLowerCase() === name.toLowerCase()) || null;
  }

  async createSupplier(supplier: Omit<Supplier, 'id' | 'created_at'>): Promise<Supplier> {
    try {
      const response = await apiCall('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplier)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Enhanced error handling with specific error types
        if (response.status === 400) {
          throw new Error(`Validation Error: ${errorData.message || 'Invalid supplier data'}`);
        } else if (response.status === 409) {
          throw new Error(`Conflict: ${errorData.message || 'Supplier already exists'}`);
        } else if (response.status === 500) {
          throw new Error(`Server Error: ${errorData.message || 'Failed to create supplier'}`);
        } else {
          throw new Error(errorData.message || 'Failed to create supplier');
        }
      }
      
      const data = await response.json();
      return data.supplier;
    } catch (error) {
      // Re-throw with enhanced context
      if (error instanceof Error) {
        throw new Error(`Supplier creation failed: ${error.message}`);
      }
      throw new Error('An unexpected error occurred while creating the supplier');
    }
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

  async getProductCountBySupplier(_supplierId: number): Promise<number> {
    // Not needed on FE; return 0 to avoid type errors
    return 0;
  }

  // Customer CRUD operations
  async getCustomers(activeOnly: boolean = true): Promise<Customer[]> {
    // No backend customers yet; return empty list
    return [];
  }

  async getCustomersWithFilters(filters: {
    search?: string;
    customer_type?: 'Retail' | 'Wholesale' | 'Credit' | 'Other';
    active?: boolean;
  }): Promise<Customer[]> {
    // No backend customers yet; filter empty list
    return [];
  }

  async getCustomerById(_id: number): Promise<Customer | null> {
    return null;
  }

  async getCustomerByName(_name: string): Promise<Customer | null> {
    return null;
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

  async getSalesCountByCustomer(_customerId: number): Promise<number> {
    return 0;
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
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
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
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
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
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
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
    const all = await this.getDiscountRules(filters.active ?? false);
    const search = (filters.search || '').toLowerCase();
    return all
      .filter(r => !filters.applies_to || r.applies_to === filters.applies_to)
      .filter(r => !filters.type || r.type === filters.type)
      .filter(r => !search || r.name.toLowerCase().includes(search))
      .sort((a, b) => a.priority - b.priority);
  }

  async getDiscountRulesByTarget(applies_to: 'PRODUCT' | 'CATEGORY', target_id: number): Promise<DiscountRule[]> {
    const all = await this.getDiscountRules(true);
    return all.filter(r => r.applies_to === applies_to && Number(r.target_id) === Number(target_id));
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

  // Create invoice with split payments; also triggers print on the server
  async createInvoice(payload: {
    customerId?: number;
    items: Array<{ 
      productId: number; 
      quantity: number; 
      unitPrice?: number; 
      lineDiscount?: number; 
      unit?: string; 
      nameEn?: string 
    }>;
    payments: Array<{ 
      method: string; 
      amount: number; 
      reference?: string;
    }>;
    cashierId?: number;
    shiftId?: number;
  }): Promise<{ id: number; receipt_no: string; invoice: any }> {
    // Use offline-capable API call
    const response = await apiCall('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (response.status === 202) {
      // Request was queued offline
      const data = await response.json();
      return { 
        id: Date.now(), 
        receipt_no: `QUEUED-${data.id}`,
        invoice: { id: Date.now(), status: 'queued' }
      };
    }
    
    const data = await response.json();
    if (!response.ok) {
      // Enhanced error handling for specific error types
      if (response.status === 409 && data.errorCode === 'INSUFFICIENT_STOCK') {
        throw new Error(`Insufficient stock: ${data.message}`);
      } else if (response.status === 404 && data.errorCode === 'PRODUCT_NOT_FOUND') {
        throw new Error(`Product not found: ${data.message}`);
      } else if (response.status === 400 && data.errorCode === 'PAYMENT_MISMATCH') {
        throw new Error(`Payment mismatch: ${data.message}`);
      } else {
        throw new Error(data.message || 'Failed to create invoice');
      }
    }
    
    return {
      id: data.invoice.id,
      receipt_no: data.invoice.receiptNo,
      invoice: data.invoice
    };
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

  async getSaleById(_id: number): Promise<Sale | null> {
    return null;
  }

  async getSaleLines(_saleId: number): Promise<SaleLine[]> {
    return [];
  }

  // Helper methods
  async getProductsByCategory(_categoryId: number): Promise<Product[]> {
    return [];
  }

  async searchProducts(query: string): Promise<Product[]> {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
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
      const trimmedBarcode = barcode.trim();
      
      // Client-side validation
      if (trimmedBarcode.length < 3 || trimmedBarcode.length > 50) {
        throw new Error('Barcode must be between 3 and 50 characters long');
      }

      if (!/^[a-zA-Z0-9\-_\.]+$/.test(trimmedBarcode)) {
        throw new Error('Barcode contains invalid characters');
      }

      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
      const response = await fetch(`${apiBaseUrl}/api/products/barcode/${encodeURIComponent(trimmedBarcode)}`);
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
          is_scale_item: p.is_scale_item || false,
          price_retail: p.price_retail,
          price_wholesale: p.price_wholesale,
          price_credit: p.price_credit,
          price_other: p.price_other,
          cost: p.cost,
          reorder_level: p.reorder_level,
          preferred_supplier_id: p.preferred_supplier_id,
          is_active: p.is_active,
          created_at: new Date(),
          updated_at: new Date()
        };
      }
      
      // Enhanced error handling
      if (response.status === 400) {
        throw new Error(data.message || 'Invalid barcode format');
      } else if (response.status === 404) {
        return null; // Product not found
      } else {
        throw new Error(data.message || 'Failed to lookup product');
      }
    } catch (error) {
      console.error('Error getting product by barcode:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while looking up the product');
    }
  }

  async getProducts(filters?: {
    search?: string;
    category_id?: string;
    scale_items_only?: boolean;
    active_filter?: 'all' | 'active' | 'inactive';
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ products: Product[]; pagination?: any; total?: number }> {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
      
      // Build query parameters
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.category_id) params.append('category_id', filters.category_id);
      if (filters?.scale_items_only) params.append('scale_items_only', 'true');
      if (filters?.active_filter && filters.active_filter !== 'all') {
        params.append('status', filters.active_filter);
      }
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.pageSize) params.append('pageSize', filters.pageSize.toString());
      if (filters?.sortBy) params.append('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
      
      const response = await fetch(`${apiBaseUrl}/api/products?${params.toString()}`);
      const data = await response.json();
      
      if (response.ok && data.ok && data.products) {
        const products = data.products.map((p: any) => ({
          id: p.id,
          sku: p.sku,
          barcode: p.barcode,
          name_en: p.name_en,
          name_si: p.name_si,
          name_ta: p.name_ta,
          unit: p.unit,
          category_id: p.category_id,
          is_scale_item: p.is_scale_item || false,
          tax_code: p.tax_code,
          price_retail: p.price_retail,
          price_wholesale: p.price_wholesale,
          price_credit: p.price_credit,
          price_other: p.price_other,
          cost: p.cost,
          reorder_level: p.reorder_level,
          preferred_supplier_id: p.preferred_supplier_id,
          is_active: p.is_active,
          created_at: new Date(p.created_at),
          updated_at: p.updated_at ? new Date(p.updated_at) : undefined,
          category_name: p.category_name,
          supplier_name: p.supplier_name
        }));
        
        return {
          products,
          pagination: data.pagination,
          total: data.pagination?.total || products.length
        };
      }
      return { products: [], total: 0 };
    } catch (error) {
      console.error('Error getting products:', error);
      return { products: [], total: 0 };
    }
  }

  // Category CRUD operations
  async getCategories(): Promise<Category[]> {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
      const response = await fetch(`${apiBaseUrl}/api/categories`);
      const data = await response.json();
      return (data.categories || []).map((c: any) => ({ id: c.id, name: c.name }));
    } catch (error) {
      console.error('Failed to load categories:', error);
      return [{ id: 1, name: 'General' }];
    }
  }

  async createCategory(category: Omit<Category, 'id'>): Promise<Category> {
    try {
      const response = await apiCall('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Enhanced error handling with specific error types
        if (response.status === 400) {
          throw new Error(`Validation Error: ${errorData.message || 'Invalid category data'}`);
        } else if (response.status === 409) {
          throw new Error(`Conflict: ${errorData.message || 'Category already exists'}`);
        } else if (response.status === 500) {
          throw new Error(`Server Error: ${errorData.message || 'Failed to create category'}`);
        } else {
          throw new Error(errorData.message || 'Failed to create category');
        }
      }
      
      const data = await response.json();
      return data.category;
    } catch (error) {
      // Re-throw with enhanced context
      if (error instanceof Error) {
        throw new Error(`Category creation failed: ${error.message}`);
      }
      throw new Error('An unexpected error occurred while creating the category');
    }
  }

  // Returns & Refunds methods
  async getReturns(): Promise<any[]> {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
    const res = await fetch(`${apiBaseUrl}/api/returns`);
    const data = await res.json();
    return data.returns || [];
  }

  async createReturn(payload: {
    original_invoice_id: number;
    items: { item_id: number; qty: number; refund_amount?: number; restock_flag?: boolean; reason?: string }[];
    total_refund: number;
    reason?: string;
    operator_id?: number;
  }): Promise<{ id: number; receipt_no_return: string }>
  {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
    const res = await fetch(`${apiBaseUrl}/api/returns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create return');
    return res.json();
  }

  // Refunds: default to original methods with proportional splits
  async createRefund(payload: {
    original_invoice_id: number;
    lines: { item_id: number; refund_amount: number }[];
    reason?: string;
    operator_id?: number;
    override_methods?: { method: string; amount: number }[];
    manager_pin?: string;
  }): Promise<{ refund_invoice_id: number; refund_total: number }> {
    const response = await apiCall('/api/refunds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (response.status === 202) {
      // Request was queued offline
      const data = await response.json();
      return { refund_invoice_id: Date.now(), refund_total: 0 };
    }
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Refund failed');
    return data;
  }

  async addCashMovement(payload: { shift_id: number; type: string; amount: number; note?: string }): Promise<{ id: number }>{
    const response = await apiCall('/api/cash-movements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (response.status === 202) {
      // Request was queued offline
      const data = await response.json();
      return { id: Date.now() };
    }
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to add cash movement');
    return data;
  }

  async getXZReport(date: string, type: 'X'|'Z' = 'X') : Promise<{ type: string; date: string; payments: any[]; cash: any[] }>{
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
    const url = new URL(`${apiBaseUrl}/api/reports/xz`);
    url.searchParams.set('date', date);
    url.searchParams.set('type', type);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Failed to load X/Z report');
    return res.json();
  }

  // Shifts
  async getShifts(): Promise<any[]> {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
    const res = await fetch(`${apiBaseUrl}/api/shifts`);
    const data = await res.json();
    return data.shifts || [];
  }

  async openShift(operator_id: number, starting_cash: number): Promise<any> {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
    const res = await fetch(`${apiBaseUrl}/api/shifts/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operator_id, starting_cash })
    });
    if (!res.ok) throw new Error('Failed to open shift');
    return res.json();
  }

  async closeShift(id: number, ending_cash: number): Promise<any> {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
    const res = await fetch(`${apiBaseUrl}/api/shifts/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ending_cash })
    });
    if (!res.ok) throw new Error('Failed to close shift');
    return res.json();
  }

  // Printing
  async print(payload: any): Promise<{ status: string; jobId: string }> {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
    const res = await fetch(`${apiBaseUrl}/api/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Print failed');
    return res.json();
  }

  // Purchasing
  async createPO(payload: { supplier_id: number; lines: { product_id: number; uom?: string; qty: number; unit_cost: number }[] }): Promise<{ id: number }>{
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
    const res = await fetch(`${apiBaseUrl}/api/purchasing/pos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create PO');
    return res.json();
  }

  async createGRN(payload: { 
    po_id?: number; 
    supplier_id: number;
    lines: { 
      product_id: number; 
      quantity_received: number; 
      unit_cost: number; 
      batch_number?: string;
      expiry_date?: string;
      notes?: string;
    }[];
    freight_cost?: number;
    duty_cost?: number;
    misc_cost?: number;
    notes?: string;
    idempotency_key?: string;
  }): Promise<{ id: number; grn_number: string; status: string; total_quantity: number; total_value: number; duplicate?: boolean }>{
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
      const res = await fetch(`${apiBaseUrl}/api/purchasing/grn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create GRN');
      }
      
      const data = await res.json();
      return data.grn;
    } catch (error) {
      console.error('Error creating GRN:', error);
      throw error;
    }
  }

  async createSupplierReturn(payload: { supplier_id: number; lines: { product_id: number; uom?: string; qty: number; unit_cost: number; reason?: string }[] }): Promise<{ id: number }>{
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
    const res = await fetch(`${apiBaseUrl}/api/purchasing/supplier-returns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create supplier return');
    return res.json();
  }

  async finalizeGRN(id: number, payload: { 
    extra_costs: { freight?: number; duty?: number; misc?: number }; 
    mode: 'qty'|'value' 
  }): Promise<{ ok: boolean; message: string; grnId: number; mode: string; totalExtra: number; processedLines: number }>{
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
      const res = await fetch(`${apiBaseUrl}/api/purchasing/grn/${id}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to finalize GRN');
      }
      
      return await res.json();
    } catch (error) {
      console.error('Error finalizing GRN:', error);
      throw error;
    }
  }

  // Get GRN details
  async getGRN(id: number): Promise<any> {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
      const res = await fetch(`${apiBaseUrl}/api/purchasing/grn/${id}`);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to get GRN');
      }
      
      const data = await res.json();
      return data.grn;
    } catch (error) {
      console.error('Error getting GRN:', error);
      throw error;
    }
  }

  // List GRNs
  async getGRNs(params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    supplier_id?: number;
  }): Promise<{ grns: any[]; pagination: any }> {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
      const searchParams = new URLSearchParams();
      
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());
      if (params?.status) searchParams.append('status', params.status);
      if (params?.supplier_id) searchParams.append('supplier_id', params.supplier_id.toString());
      
      const res = await fetch(`${apiBaseUrl}/api/purchasing/grn?${searchParams.toString()}`);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to get GRNs');
      }
      
      return await res.json();
    } catch (error) {
      console.error('Error getting GRNs:', error);
      throw error;
    }
  }

  // Get product stock
  async getProductStock(productId: number): Promise<any> {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
      const res = await fetch(`${apiBaseUrl}/api/purchasing/stock/${productId}`);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to get product stock');
      }
      
      const data = await res.json();
      return data.stock;
    } catch (error) {
      console.error('Error getting product stock:', error);
      throw error;
    }
  }

  // Reports: Profit & Margin
  async getProfitReport(params: { from: string; to: string; groupBy: 'day'|'product'|'category' }): Promise<Array<{ key: string; sales: number; cost: number; profit: number; margin: number }>> {
    const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8250';
    const url = new URL(`${apiBaseUrl}/api/reports/profit`);
    url.searchParams.set('from', params.from);
    url.searchParams.set('to', params.to);
    url.searchParams.set('groupBy', params.groupBy);
    const res = await fetch(url.toString());
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load profit report');
    return (data.items || []).map((r: any) => ({
      key: String(r.key ?? r.date ?? r.product ?? r.category ?? ''),
      sales: Number(r.sales || 0),
      cost: Number(r.cost || 0),
      profit: Number(r.profit || (Number(r.sales||0) - Number(r.cost||0))),
      margin: Number(r.margin || ((Number(r.sales||0) - Number(r.cost||0)) / Math.max(1, Number(r.sales||0)) * 100))
    }));
  }

  // Reports: Movers
  async getMovers(params: { window: 30|60|90; type: 'Top'|'Slow' }): Promise<Array<{ product: string; qty: number; sales: number; avg_price: number }>> {
    const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8250';
    const url = new URL(`${apiBaseUrl}/api/reports/movers`);
    url.searchParams.set('days', String(params.window));
    const res = await fetch(url.toString());
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load movers');
    const rows: Array<{ product: string; qty: number; sales: number; avg_price: number }> = (data.items || []).map((it: any) => ({
      product: it.name_en || `#${it.product_id}`,
      qty: Number(it.qty || 0),
      sales: Number(it.revenue || 0),
      avg_price: Number(it.qty ? (Number(it.revenue||0)/Number(it.qty||1)) : 0)
    }));
    rows.sort((a, b) => params.type === 'Top' ? (b.qty - a.qty) : (a.qty - b.qty));
    return rows;
  }
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
        lines: lines.map((line: any) => ({
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

  // Invoice listing
  async listInvoices(params: { 
    dateRange?: { from: string; to: string }; 
    limit?: number; 
    cursor?: number 
  }): Promise<any[]> {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
    const url = new URL(`${apiBaseUrl}/api/invoices`);
    
    if (params.dateRange) {
      url.searchParams.set('from', params.dateRange.from);
      url.searchParams.set('to', params.dateRange.to);
    }
    if (params.limit) {
      url.searchParams.set('limit', params.limit.toString());
    }
    if (params.cursor) {
      url.searchParams.set('cursor', params.cursor.toString());
    }

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Failed to fetch invoices');
    const data = await res.json();
    return data.invoices || [];
  }

  // Quick Sales methods
  async ensureQuickOpen(): Promise<any> {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
    const res = await fetch(`${apiBaseUrl}/api/quick-sales/ensure-open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to ensure quick sales session');
    return res.json();
  }

  async listQuickLines(cursor?: number, limit: number = 50): Promise<any[]> {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
    const url = new URL(`${apiBaseUrl}/api/quick-sales/lines`);
    if (cursor) url.searchParams.set('cursor', cursor.toString());
    url.searchParams.set('limit', limit.toString());

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Failed to fetch quick sales lines');
    const data = await res.json();
    return data.lines || [];
  }

  async addQuickLine(payload: { 
    product_id: number; 
    qty: number; 
    uom?: string; 
    unit_price?: number 
  }): Promise<any> {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
    const res = await fetch(`${apiBaseUrl}/api/quick-sales/add-line`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to add quick sales line');
    return res.json();
  }

  async deleteQuickLine(id: number): Promise<any> {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
    const res = await fetch(`${apiBaseUrl}/api/quick-sales/delete-line/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete quick sales line');
    return res.json();
  }

  async closeQuickSales(payload: { 
    notes?: string; 
    manager_pin?: string 
  }): Promise<any> {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
    const res = await fetch(`${apiBaseUrl}/api/quick-sales/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to close quick sales session');
    return res.json();
  }

  // Admin methods
  async purgeDemoData(): Promise<any> {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
    const res = await fetch(`${apiBaseUrl}/api/admin/purge-demo-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to purge demo data');
    return res.json();
  }

  // Helper methods for CSV import modals
  async getCustomerByPhone(phone: string): Promise<Customer | null> {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
    const res = await fetch(`${apiBaseUrl}/api/customers/search?phone=${encodeURIComponent(phone)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.customer || null;
  }

  async getUserByUsername(username: string): Promise<any | null> {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
    const res = await fetch(`${apiBaseUrl}/api/users/search?username=${encodeURIComponent(username)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  }

  async createUser(userData: {
    username: string;
    full_name: string;
    email: string;
    role: string;
    pin: string;
    active: boolean;
  }): Promise<any> {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
    const res = await fetch(`${apiBaseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Failed to create user');
    }
    const data = await res.json();
    return data.user;
  }

  async updateUser(userId: number, userData: {
    username: string;
    full_name: string;
    email: string;
    role: string;
    pin: string;
    active: boolean;
  }): Promise<any> {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
    const res = await fetch(`${apiBaseUrl}/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Failed to update user');
    }
    const data = await res.json();
    return data.user;
  }

  // Enhanced Sales Methods with Idempotency and Error Handling
  async createSaleWithIdempotency(payload: {
    customerId?: number;
    items: Array<{ 
      productId: number; 
      quantity: number; 
      unitPrice?: number; 
      lineDiscount?: number; 
      unit?: string; 
      nameEn?: string 
    }>;
    payments: Array<{ 
      method: string; 
      amount: number; 
      reference?: string;
    }>;
    cashierId?: number;
    shiftId?: number;
    idempotencyKey?: string;
  }): Promise<{ id: number; receipt_no: string; invoice: any; idempotency_key: string }> {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
    
    // Generate idempotency key if not provided
    const idempotencyKey = payload.idempotencyKey || this.generateIdempotencyKey();
    
    const response = await fetch(`${apiBaseUrl}/api/sales`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({
        ...payload,
        idempotency_key: idempotencyKey
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // Enhanced error handling for specific error types
      if (response.status === 409 && data.errorCode === 'INSUFFICIENT_STOCK') {
        throw new Error(`Insufficient stock: ${data.message}`);
      } else if (response.status === 404 && data.errorCode === 'PRODUCT_NOT_FOUND') {
        throw new Error(`Product not found: ${data.message}`);
      } else if (response.status === 400 && data.errorCode === 'PAYMENT_MISMATCH') {
        throw new Error(`Payment mismatch: ${data.message}`);
      } else if (response.status === 409 && data.errorCode === 'DUPLICATE_IDEMPOTENCY') {
        // Return the original sale data for duplicate idempotency
        return {
          id: data.original_sale.id,
          receipt_no: data.original_sale.receipt_no,
          invoice: data.original_sale,
          idempotency_key: idempotencyKey
        };
      } else {
        throw new Error(data.message || 'Failed to create sale');
      }
    }
    
    return {
      id: data.sale.id,
      receipt_no: data.sale.receipt_no,
      invoice: data.sale,
      idempotency_key: idempotencyKey
    };
  }

  // Print receipt
  async printReceipt(saleId: number, printerConfig?: any): Promise<{ success: boolean; message: string; receipt_data: any }> {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
    const response = await fetch(`${apiBaseUrl}/api/sales/${saleId}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ printer_config: printerConfig })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to print receipt');
    }
    
    return data;
  }

  // Reprint receipt
  async reprintReceipt(saleId: number, printerConfig?: any): Promise<{ success: boolean; message: string; receipt_data: any }> {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
    const params = new URLSearchParams();
    if (printerConfig) {
      params.append('printer_config', JSON.stringify(printerConfig));
    }
    
    const response = await fetch(`${apiBaseUrl}/api/sales/${saleId}/reprint?${params.toString()}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to reprint receipt');
    }
    
    return data;
  }


  // Helper method to generate idempotency key
  private generateIdempotencyKey(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

}

// Singleton instance
export const dataService = new DataService();
