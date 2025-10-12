/**
 * Stock Service - Frontend API client for stock management
 * Provides methods to interact with stock endpoints
 */

export interface StockItem {
  product_id: number;
  sku: string;
  name_en: string;
  name_si?: string;
  name_ta?: string;
  unit: string;
  category_id?: number;
  category_name?: string;
  qty_on_hand: number;
  value_cents: number;
  method: 'FIFO' | 'AVERAGE' | 'LIFO';
  has_unknown_cost: boolean;
}

export interface StockMeta {
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface StockResponse {
  ok: boolean;
  items: StockItem[];
  meta: StockMeta;
  requestId?: string;
}

export interface StockMovement {
  id: number;
  created_at: string;
  delta_qty: number;
  balance_after: number;
  reason: string;
  ref_id?: number;
  unit_cost_cents?: number;
  lot_id?: number;
  notes?: string;
}

export interface StockMovementsResponse {
  ok: boolean;
  product: {
    id: number;
    sku: string;
    name_en: string;
  };
  movements: StockMovement[];
  meta: {
    limit: number;
    count: number;
    hasMore: boolean;
  };
  requestId?: string;
}

export interface StockValuation {
  method: 'FIFO' | 'AVERAGE' | 'LIFO';
  total_value_cents: number;
  total_products: number;
  products_with_unknown_cost: number;
  items: Array<{
    product_id: number;
    qty_on_hand: number;
    value_cents: number;
    has_unknown_cost: boolean;
  }>;
  requestId?: string;
}

export interface StockSnapshot {
  date: string;
  product_id: number;
  sku: string;
  name_en: string;
  qty_on_hand: number;
  value_cents: number;
  method: string;
}

export interface StockSnapshotResponse {
  ok: boolean;
  date: string;
  method: string;
  total_value_cents: number;
  items: StockSnapshot[];
  requestId?: string;
}

class StockService {
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
  }

  /**
   * Get stock on hand with search, filters, and pagination
   */
  async getStockOnHand(params: {
    search?: string;
    category_id?: number;
    page?: number;
    pageSize?: number;
    method?: 'fifo' | 'average' | 'lifo';
  } = {}): Promise<StockResponse> {
    const searchParams = new URLSearchParams();
    
    if (params.search) searchParams.append('search', params.search);
    if (params.category_id) searchParams.append('category_id', params.category_id.toString());
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
    if (params.method) searchParams.append('method', params.method);

    const response = await fetch(`${this.apiBaseUrl}/api/stock/soh?${searchParams.toString()}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to fetch stock on hand');
    }

    return response.json();
  }

  /**
   * Get product movement history
   */
  async getProductMovements(
    productId: number,
    params: {
      from?: string;
      to?: string;
      limit?: number;
    } = {}
  ): Promise<StockMovementsResponse> {
    const searchParams = new URLSearchParams();
    
    if (params.from) searchParams.append('from', params.from);
    if (params.to) searchParams.append('to', params.to);
    if (params.limit) searchParams.append('limit', params.limit.toString());

    const response = await fetch(
      `${this.apiBaseUrl}/api/stock/${productId}/movements?${searchParams.toString()}`
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to fetch product movements');
    }

    return response.json();
  }

  /**
   * Get full inventory valuation
   */
  async getInventoryValuation(method: 'fifo' | 'average' | 'lifo' = 'average'): Promise<StockValuation> {
    const response = await fetch(`${this.apiBaseUrl}/api/stock/valuation?method=${method}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to fetch inventory valuation');
    }

    return response.json();
  }

  /**
   * Get daily stock snapshot
   */
  async getStockSnapshot(
    date?: string,
    method: 'fifo' | 'average' | 'lifo' = 'average'
  ): Promise<StockSnapshotResponse> {
    const searchParams = new URLSearchParams();
    
    if (date) searchParams.append('date', date);
    searchParams.append('method', method);

    const response = await fetch(`${this.apiBaseUrl}/api/stock/snapshot?${searchParams.toString()}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to fetch stock snapshot');
    }

    return response.json();
  }

  /**
   * Format currency from cents
   */
  formatCurrency(cents: number): string {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(cents / 100);
  }

  /**
   * Format quantity with unit
   */
  formatQuantity(quantity: number, unit: string): string {
    return `${quantity.toLocaleString()} ${unit}`;
  }

  /**
   * Get stock status color
   */
  getStockStatusColor(qtyOnHand: number): string {
    if (qtyOnHand <= 0) return 'text-red-600';
    if (qtyOnHand <= 10) return 'text-yellow-600';
    return 'text-green-600';
  }

  /**
   * Get stock status badge
   */
  getStockStatusBadge(qtyOnHand: number): { text: string; variant: 'success' | 'warning' | 'danger' } {
    if (qtyOnHand <= 0) return { text: 'Out of Stock', variant: 'danger' };
    if (qtyOnHand <= 10) return { text: 'Low Stock', variant: 'warning' };
    return { text: 'In Stock', variant: 'success' };
  }
}

export const stockService = new StockService();
