import { getDatabase } from '../db';
import { createRequestLogger } from './logger';

// LRU Cache for hot lookups (barcode → product)
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;
  private ttl: number;
  private timestamps = new Map<K, number>();

  constructor(maxSize: number = 1000, ttl: number = 60000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: K): V | undefined {
    const timestamp = this.timestamps.get(key);
    if (timestamp && Date.now() - timestamp > this.ttl) {
      this.delete(key);
      return undefined;
    }
    
    const value = this.cache.get(key);
    if (value) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
      this.timestamps.set(key, Date.now());
    }
    return value;
  }

  set(key: K, value: V): void {
      if (this.cache.size >= this.maxSize) {
        // Remove least recently used
        const firstKey = this.cache.keys().next().value;
        if (firstKey !== undefined) {
          this.delete(firstKey);
        }
      }
    
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now());
  }

  delete(key: K): boolean {
    this.timestamps.delete(key);
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.timestamps.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global caches
const barcodeCache = new LRUCache<string, any>(1000, 60000); // 1min TTL
const productCache = new LRUCache<number, any>(500, 30000); // 30s TTL

// Performance monitoring
interface PerformanceMetric {
  operation: string;
  duration: number;
  success: boolean;
  requestId?: string;
  metadata?: any;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 10000;

  record(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getP95(operation: string): number {
    const operationMetrics = this.metrics
      .filter(m => m.operation === operation && m.success)
      .map(m => m.duration)
      .sort((a, b) => a - b);
    
    if (operationMetrics.length === 0) return 0;
    
    const index = Math.ceil(operationMetrics.length * 0.95) - 1;
    return operationMetrics[index];
  }

  getStats(operation: string): { p50: number; p95: number; p99: number; count: number } {
    const operationMetrics = this.metrics
      .filter(m => m.operation === operation && m.success)
      .map(m => m.duration)
      .sort((a, b) => a - b);
    
    if (operationMetrics.length === 0) {
      return { p50: 0, p95: 0, p99: 0, count: 0 };
    }
    
    const p50Index = Math.ceil(operationMetrics.length * 0.5) - 1;
    const p95Index = Math.ceil(operationMetrics.length * 0.95) - 1;
    const p99Index = Math.ceil(operationMetrics.length * 0.99) - 1;
    
    return {
      p50: operationMetrics[p50Index],
      p95: operationMetrics[p95Index],
      p99: operationMetrics[p99Index],
      count: operationMetrics.length
    };
  }

  clear(): void {
    this.metrics = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Prepared statements for hot paths
let preparedStatements: Record<string, any> = {};

export function initializePreparedStatements(): void {
  const db = getDatabase();
  
  preparedStatements = {
    // Barcode lookup (P95 ≤ 50ms target)
    barcodeLookup: db.prepare(`
      SELECT id, sku, barcode, name_en, name_si, name_ta, unit, 
             price_retail, price_wholesale, price_credit, price_other,
             is_scale_item, is_active
      FROM products 
      WHERE barcode = ? AND is_active = 1
    `),
    
    // Product by ID
    productById: db.prepare(`
      SELECT id, sku, barcode, name_en, name_si, name_ta, unit,
             price_retail, price_wholesale, price_credit, price_other,
             is_scale_item, is_active, category_id
      FROM products 
      WHERE id = ?
    `),
    
    // Product search (P95 ≤ 200ms target)
    productSearch: db.prepare(`
      SELECT id, sku, barcode, name_en, name_si, name_ta, unit,
             price_retail, price_wholesale, price_credit, price_other,
             is_scale_item, is_active
      FROM products 
      WHERE (name_en LIKE ? OR name_si LIKE ? OR name_ta LIKE ? OR sku LIKE ?)
        AND is_active = 1
      ORDER BY name_en
      LIMIT ?
    `),
    
    // Invoice creation (P95 ≤ 100ms target) - using existing schema
    createInvoice: db.prepare(`
      INSERT INTO invoices (receipt_no, customer_id, gross, discount, tax, net, cashier_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `),
    
    createInvoiceLine: db.prepare(`
      INSERT INTO invoice_lines (invoice_id, product_id, qty, unit_price, total)
      VALUES (?, ?, ?, ?, ?)
    `),
    
    // Note: invoice_payments table doesn't exist in current schema
    // createInvoicePayment: db.prepare(`
    //   INSERT INTO invoice_payments (invoice_id, payment_method, amount, request_id)
    //   VALUES (?, ?, ?, ?)
    // `),
    
    // Z Report queries (P95 ≤ 500ms target)
    zReportDaily: db.prepare(`
      SELECT 
        COUNT(*) as invoice_count,
        COALESCE(SUM(net), 0) as total_sales,
        COALESCE(SUM(tax), 0) as total_tax,
        COALESCE(SUM(net), 0) as cash_sales,
        0 as card_sales
      FROM invoices 
      WHERE DATE(created_at) = ?
    `)
  };
}

export function getPreparedStatement(name: string): any {
  if (!preparedStatements[name]) {
    const db = getDatabase();
    switch (name) {
      case 'barcodeLookup':
        preparedStatements[name] = db.prepare(`
          SELECT 
            p.id, p.sku, p.barcode, p.name_en, p.name_si, p.name_ta,
            p.unit, p.category_id, p.is_scale_item, p.tax_code,
            p.price_retail, p.price_wholesale, p.price_credit, p.price_other,
            p.cost, p.reorder_level, p.preferred_supplier_id, p.is_active,
            c.name as category_name,
            s.supplier_name
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          LEFT JOIN suppliers s ON p.preferred_supplier_id = s.id
          WHERE p.barcode = ? AND p.is_active = 1
        `);
        break;
      case 'skuLookup':
        preparedStatements[name] = db.prepare(`
          SELECT 
            p.id, p.sku, p.barcode, p.name_en, p.name_si, p.name_ta,
            p.unit, p.category_id, p.is_scale_item, p.tax_code,
            p.price_retail, p.price_wholesale, p.price_credit, p.price_other,
            p.cost, p.reorder_level, p.preferred_supplier_id, p.is_active,
            c.name as category_name,
            s.supplier_name
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          LEFT JOIN suppliers s ON p.preferred_supplier_id = s.id
          WHERE p.sku = ? AND p.is_active = 1
        `);
        break;
      default:
        throw new Error(`Unknown prepared statement: ${name}`);
    }
  }
  return preparedStatements[name];
}

// Cached barcode lookup with performance monitoring and SKU fallback
export function getProductByBarcode(barcode: string, requestId?: string, fallbackToSku: boolean = true): any {
  const startTime = Date.now();
  
  try {
    // Check cache first
    let product = barcodeCache.get(barcode);
    
    if (!product) {
      // Cache miss - try barcode lookup first
      const barcodeStmt = getPreparedStatement('barcodeLookup');
      product = barcodeStmt.get(barcode);
      
      // If not found by barcode and fallback is enabled, try SKU lookup
      if (!product && fallbackToSku) {
        const skuStmt = getPreparedStatement('skuLookup');
        product = skuStmt.get(barcode);
      }
      
      if (product) {
        barcodeCache.set(barcode, product);
      }
    }
    
    const duration = Date.now() - startTime;
    performanceMonitor.record({
      operation: 'BARCODE_LOOKUP',
      duration,
      success: !!product,
      requestId,
      metadata: { 
        barcode, 
        cacheHit: !!barcodeCache.get(barcode),
        lookupType: product ? (product.barcode === barcode ? 'barcode' : 'sku') : 'none'
      }
    });
    
    return product;
  } catch (error) {
    const duration = Date.now() - startTime;
    performanceMonitor.record({
      operation: 'BARCODE_LOOKUP',
      duration,
      success: false,
      requestId,
      metadata: { barcode, error: error instanceof Error ? error.message : 'Unknown error' }
    });
    throw error;
  }
}

// Cached product lookup by ID
export function getProductById(id: number, requestId?: string): any {
  const startTime = Date.now();
  
  try {
    // Check cache first
    let product = productCache.get(id);
    
    if (!product) {
      // Cache miss - query database
      const stmt = getPreparedStatement('productById');
      product = stmt.get(id);
      
      if (product) {
        productCache.set(id, product);
      }
    }
    
    const duration = Date.now() - startTime;
    performanceMonitor.record({
      operation: 'PRODUCT_BY_ID',
      duration,
      success: !!product,
      requestId,
      metadata: { productId: id, cacheHit: !!productCache.get(id) }
    });
    
    return product;
  } catch (error) {
    const duration = Date.now() - startTime;
    performanceMonitor.record({
      operation: 'PRODUCT_BY_ID',
      duration,
      success: false,
      requestId,
      metadata: { productId: id, error: error instanceof Error ? error.message : 'Unknown error' }
    });
    throw error;
  }
}

// Product search with performance monitoring
export function searchProducts(query: string, limit: number = 50, requestId?: string): any[] {
  const startTime = Date.now();
  
  try {
    const stmt = getPreparedStatement('productSearch');
    const searchTerm = `%${query}%`;
    const products = stmt.all(searchTerm, searchTerm, searchTerm, searchTerm, limit);
    
    const duration = Date.now() - startTime;
    performanceMonitor.record({
      operation: 'PRODUCT_SEARCH',
      duration,
      success: true,
      requestId,
      metadata: { query, limit, resultCount: products.length }
    });
    
    return products;
  } catch (error) {
    const duration = Date.now() - startTime;
    performanceMonitor.record({
      operation: 'PRODUCT_SEARCH',
      duration,
      success: false,
      requestId,
      metadata: { query, limit, error: error instanceof Error ? error.message : 'Unknown error' }
    });
    throw error;
  }
}

// Cents-safe math utilities
export function centsToDecimal(cents: number): number {
  return Math.round(cents) / 100;
}

export function decimalToCents(decimal: number): number {
  return Math.round(decimal * 100);
}

export function safeAdd(a: number, b: number): number {
  return decimalToCents(centsToDecimal(a) + centsToDecimal(b));
}

export function safeSubtract(a: number, b: number): number {
  return decimalToCents(centsToDecimal(a) - centsToDecimal(b));
}

export function safeMultiply(a: number, b: number): number {
  return decimalToCents(centsToDecimal(a) * centsToDecimal(b));
}

// Performance targets validation
export const PERFORMANCE_TARGETS = {
  BARCODE_LOOKUP: 50,      // ms
  PRODUCT_SEARCH: 200,     // ms
  INVOICE_CREATE: 100,     // ms
  Z_REPORT: 500,           // ms
  COLD_START: 300          // ms
};

export function validatePerformanceTarget(operation: string, duration: number): boolean {
  const target = PERFORMANCE_TARGETS[operation as keyof typeof PERFORMANCE_TARGETS];
  return target ? duration <= target : true;
}

export function getPerformanceReport(): any {
  return {
    barcodeLookup: performanceMonitor.getStats('BARCODE_LOOKUP'),
    productSearch: performanceMonitor.getStats('PRODUCT_SEARCH'),
    invoiceCreate: performanceMonitor.getStats('INVOICE_CREATE'),
    zReport: performanceMonitor.getStats('Z_REPORT'),
    cacheStats: {
      barcodeCache: barcodeCache.size(),
      productCache: productCache.size()
    }
  };
}

// Clear caches (useful for testing)
export function clearCaches(): void {
  barcodeCache.clear();
  productCache.clear();
}

// Export caches for direct access
export { barcodeCache, productCache };
