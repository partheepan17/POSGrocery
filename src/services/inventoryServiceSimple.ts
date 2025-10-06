import { db } from './database';

export interface InventoryMovement {
  id: number;
  product_id: number;
  qty: number; // DECIMAL(10,3) - positive for RECEIVE, +/- for ADJUST, negative for WASTE
  type: 'RECEIVE' | 'ADJUST' | 'WASTE';
  reason?: string;
  note?: string;
  terminal?: string;
  cashier?: string;
  created_at: Date;
}

export interface StockRow {
  id: number;
  sku: string;
  name_en: string;
  name_si?: string;
  name_ta?: string;
  unit: 'pc' | 'kg';
  current_stock: number;
  reorder_level?: number;
  preferred_supplier?: string;
  category_name?: string;
  is_low_stock: boolean;
  is_scale_item: boolean;
  updated_at: Date;
}

export interface ReceiveLine {
  sku: string;
  product_id?: number;
  qty: number;
  cost?: number;
  note?: string;
}

export interface AdjustLine {
  sku: string;
  product_id?: number;
  qty: number; // For ADJUST: +/-, For WASTE: always treated as negative
  note?: string;
}

export interface StocktakeDiff {
  sku: string;
  product_id: number;
  name_en: string;
  expected_qty: number;
  actual_qty: number;
  difference: number;
  cost: number;
  value: number;
}

export interface StockFilters {
  search?: string;
  category?: string;
  supplier?: string;
  unit?: 'pc' | 'kg';
  active?: boolean;
  lowStock?: boolean;
  zeroStock?: boolean;
  limit?: number;
  offset?: number;
}

export interface MovementLogRow {
  id: number;
  product_id: number;
  sku: string;
  name_en: string;
  qty: number;
  type: string;
  reason?: string;
  note?: string;
  terminal?: string;
  cashier?: string;
  created_at: Date;
  datetime: Date;
}

export interface MovementLogFilters {
  fromDate?: Date;
  toDate?: Date;
  productIds?: number[];
  types?: string[];
  type?: string;
  sku?: string;
  reason?: string;
  limit?: number;
  offset?: number;
}

class InventoryServiceSimple {
  // Get stock rows with product details and current stock
  async getStockRows(filters: StockFilters = {}): Promise<StockRow[]> {
    try {
      // Get all products first
      const products = await db.query('SELECT * FROM products');
      
      // Get categories
      const categories = await db.query('SELECT * FROM categories');
      const categoryMap = new Map(categories.map(c => [c.id, c.name]));
      
      // Get suppliers
      const suppliers = await db.query('SELECT * FROM suppliers');
      const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));
      
      // Get inventory movements for stock calculation
      const movements = await db.query('SELECT * FROM inventory_movements');
      const stockMap = new Map<number, number>();
      
      movements.forEach(movement => {
        const currentStock = stockMap.get(movement.product_id) || 0;
        stockMap.set(movement.product_id, currentStock + movement.qty);
      });
      
      // Filter products by active status if needed
      let filteredProducts = products;
      if (filters.active !== undefined) {
        filteredProducts = products.filter(p => p.is_active === filters.active);
      }
      
      // Map products to stock rows
      let stockRows = filteredProducts.map(product => {
        const currentStock = stockMap.get(product.id) || 0;
        const categoryName = categoryMap.get(product.category_id);
        const supplierName = supplierMap.get(product.supplier_id);
        
        return {
          id: product.id,
          sku: product.sku,
          name_en: product.name_en,
          name_si: product.name_si,
          name_ta: product.name_ta,
          unit: product.unit,
          current_stock: currentStock,
          reorder_level: product.reorder_level || 0,
          preferred_supplier: supplierName,
          category_name: categoryName,
          is_low_stock: (product.reorder_level || 0) > 0 && currentStock <= (product.reorder_level || 0),
          is_scale_item: product.unit === 'kg',
          updated_at: new Date(product.updated_at || product.created_at)
        } as StockRow;
      });
      
      // Apply filters
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        stockRows = stockRows.filter(row => 
          row.sku.toLowerCase().includes(searchTerm) ||
          row.name_en.toLowerCase().includes(searchTerm) ||
          (row.name_si && row.name_si.toLowerCase().includes(searchTerm)) ||
          (row.name_ta && row.name_ta.toLowerCase().includes(searchTerm))
        );
      }
      
      if (filters.category) {
        stockRows = stockRows.filter(row => row.category_name === filters.category);
      }
      
      if (filters.supplier) {
        stockRows = stockRows.filter(row => row.preferred_supplier === filters.supplier);
      }
      
      if (filters.unit) {
        stockRows = stockRows.filter(row => row.unit === filters.unit);
      }
      
      // Active filter already applied to products before mapping
      
      if (filters.lowStock) {
        stockRows = stockRows.filter(row => row.is_low_stock);
      }
      
      if (filters.zeroStock) {
        stockRows = stockRows.filter(row => row.current_stock === 0);
      }
      
      // Sort by name
      stockRows.sort((a, b) => a.name_en.localeCompare(b.name_en));
      
      // Apply limit and offset
      if (filters.limit) {
        const offset = filters.offset || 0;
        stockRows = stockRows.slice(offset, offset + filters.limit);
      }
      
      return stockRows;
    } catch (error) {
      console.error('Error getting stock rows:', error);
      return [];
    }
  }

  // Get movement logs
  async getMovementLogs(filters: MovementLogFilters = {}): Promise<MovementLogRow[]> {
    try {
      const movements = await db.query('SELECT * FROM inventory_movements');
      const products = await db.query('SELECT * FROM products');
      const productMap = new Map(products.map(p => [p.id, p]));
      
      let logs = movements.map(movement => {
        const product = productMap.get(movement.product_id);
        const createdAt = new Date(movement.created_at);
        return {
          id: movement.id,
          product_id: movement.product_id,
          sku: product?.sku || 'Unknown',
          name_en: product?.name_en || 'Unknown Product',
          qty: movement.qty,
          type: movement.type,
          reason: movement.reason,
          note: movement.note,
          terminal: movement.terminal,
          cashier: movement.cashier,
          created_at: createdAt,
          datetime: createdAt
        } as MovementLogRow;
      });
      
      // Apply date filters
      if (filters.fromDate) {
        logs = logs.filter(log => log.created_at >= filters.fromDate!);
      }
      
      if (filters.toDate) {
        logs = logs.filter(log => log.created_at <= filters.toDate!);
      }
      
      // Apply product filters
      if (filters.productIds && filters.productIds.length > 0) {
        logs = logs.filter(log => filters.productIds!.includes(log.product_id));
      }
      
      // Apply type filters
      if (filters.types && filters.types.length > 0) {
        logs = logs.filter(log => filters.types!.includes(log.type));
      }
      
      // Apply single type filter
      if (filters.type) {
        logs = logs.filter(log => log.type === filters.type);
      }
      
      // Apply SKU filter
      if (filters.sku) {
        const skuLower = filters.sku.toLowerCase();
        logs = logs.filter(log => log.sku.toLowerCase().includes(skuLower));
      }
      
      // Apply reason filter
      if (filters.reason) {
        const reasonLower = filters.reason.toLowerCase();
        logs = logs.filter(log => log.reason && log.reason.toLowerCase().includes(reasonLower));
      }
      
      // Sort by date (newest first)
      logs.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      
      // Apply limit and offset
      if (filters.limit) {
        const offset = filters.offset || 0;
        logs = logs.slice(offset, offset + filters.limit);
      }
      
      return logs;
    } catch (error) {
      console.error('Error getting movement logs:', error);
      return [];
    }
  }

  // Get categories for filters
  async getCategories(): Promise<string[]> {
    try {
      const categories = await db.query('SELECT name FROM categories');
      return categories.map(c => c.name).filter(Boolean);
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  // Get suppliers for filters
  async getSuppliers(): Promise<string[]> {
    try {
      const suppliers = await db.query('SELECT name FROM suppliers');
      return suppliers.map(s => s.name).filter(Boolean);
    } catch (error) {
      console.error('Error getting suppliers:', error);
      return [];
    }
  }

  // Add inventory movement
  async addMovement(movement: Omit<InventoryMovement, 'id' | 'created_at'>): Promise<void> {
    try {
      await db.execute(`
        INSERT INTO inventory_movements (product_id, qty, type, reason, note, terminal, cashier)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        movement.product_id,
        movement.qty,
        movement.type,
        movement.reason || null,
        movement.note || null,
        movement.terminal || null,
        movement.cashier || null
      ]);
    } catch (error) {
      console.error('Error adding movement:', error);
      throw error;
    }
  }
}

export const inventoryServiceSimple = new InventoryServiceSimple();
