import { db } from './database';
import { dataService } from './dataService';

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
  unit: string;
  current_stock: number;
  counted_qty: number;
  delta: number;
  note?: string;
}

export interface StockFilters {
  search?: string;
  category?: string;
  supplier?: string;
  lowStockOnly?: boolean;
  unit?: 'pc' | 'kg';
  active?: boolean;
  limit?: number;
  offset?: number;
}

export interface MovementLogFilters {
  fromDate?: Date;
  toDate?: Date;
  type?: 'RECEIVE' | 'ADJUST' | 'WASTE';
  sku?: string;
  reason?: string;
  limit?: number;
  offset?: number;
}

export interface MovementLogRow {
  id: number;
  datetime: Date;
  type: 'RECEIVE' | 'ADJUST' | 'WASTE';
  sku: string;
  name_en: string;
  qty: number;
  reason?: string;
  note?: string;
  terminal?: string;
  cashier?: string;
}

class InventoryService {
  
  // Get current stock for products (aggregated from movements)
  async getCurrentStockMap(options?: { productIds?: number[] }): Promise<{ [productId: number]: number }> {
    let query = `
      SELECT 
        product_id,
        COALESCE(SUM(qty), 0) as current_stock
      FROM inventory_movements
    `;
    
    const params: any[] = [];
    
    if (options?.productIds && options.productIds.length > 0) {
      query += ` WHERE product_id IN (${options.productIds.map(() => '?').join(',')})`;
      params.push(...options.productIds);
    }
    
    query += ' GROUP BY product_id';
    
    const results = await db.query<{ product_id: number; current_stock: number }>(query, params);
    
    const stockMap: { [productId: number]: number } = {};
    results.forEach(row => {
      stockMap[row.product_id] = row.current_stock;
    });
    
    return stockMap;
  }

  // Get stock rows with product details and current stock
  async getStockRows(filters: StockFilters = {}): Promise<StockRow[]> {
    let query = `
      SELECT 
        p.id,
        p.sku,
        p.name_en,
        p.name_si,
        p.name_ta,
        p.unit,
        p.reorder_level,
        p.active,
        c.name as category_name,
        s.name as preferred_supplier,
        p.updated_at,
        COALESCE(stock.current_stock, 0) as current_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN (
        SELECT 
          product_id, 
          SUM(qty) as current_stock 
        FROM inventory_movements 
        GROUP BY product_id
      ) stock ON p.id = stock.product_id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    // Apply filters
    if (filters.search) {
      query += ` AND (p.sku LIKE ? OR p.barcode LIKE ? OR p.name_en LIKE ?)`;
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (filters.category) {
      query += ` AND c.name = ?`;
      params.push(filters.category);
    }
    
    if (filters.supplier) {
      query += ` AND s.name = ?`;
      params.push(filters.supplier);
    }
    
    if (filters.unit) {
      query += ` AND p.unit = ?`;
      params.push(filters.unit);
    }
    
    if (filters.active !== undefined) {
      query += ` AND p.active = ?`;
      params.push(filters.active);
    }
    
    query += ` ORDER BY p.name_en`;
    
    if (filters.limit) {
      query += ` LIMIT ?`;
      params.push(filters.limit);
      
      if (filters.offset) {
        query += ` OFFSET ?`;
        params.push(filters.offset);
      }
    }
    
    const rows = await db.query<any>(query, params);
    
    return rows.map(row => ({
      ...row,
      is_low_stock: row.reorder_level > 0 && row.current_stock <= row.reorder_level,
      is_scale_item: row.unit === 'kg',
      updated_at: new Date(row.updated_at)
    })).filter(row => {
      // Apply low stock filter after calculation
      if (filters.lowStockOnly) {
        return row.is_low_stock;
      }
      return true;
    });
  }

  // Post batch receive movements
  async postReceiveBatch(lines: ReceiveLine[], options?: { updateCost?: boolean; terminal?: string; cashier?: string }): Promise<void> {
    const validLines = lines.filter(line => line.qty > 0);
    
    if (validLines.length === 0) {
      throw new Error('No valid lines to receive');
    }

    // Resolve product IDs from SKUs
    for (const line of validLines) {
      if (!line.product_id) {
        const product = await dataService.getProductBySku(line.sku);
        if (!product) {
          throw new Error(`Product not found for SKU: ${line.sku}`);
        }
        line.product_id = product.id;
      }
    }

    // Insert inventory movements
    for (const line of validLines) {
      const movement: Omit<InventoryMovement, 'id' | 'created_at'> = {
        product_id: line.product_id!,
        qty: Math.abs(line.qty), // Always positive for RECEIVE
        type: 'RECEIVE',
        note: line.note,
        terminal: options?.terminal,
        cashier: options?.cashier
      };
      
      await this.insertMovement(movement);
      
      // Update product cost if requested and provided
      if (options?.updateCost && line.cost && line.cost > 0) {
        await dataService.updateProduct(line.product_id!, { cost: line.cost });
      }
    }
  }

  // Post batch adjust/waste movements
  async postAdjustBatch(
    lines: AdjustLine[], 
    options: { 
      mode: 'ADJUST' | 'WASTE'; 
      reason: string; 
      terminal?: string; 
      cashier?: string; 
    }
  ): Promise<void> {
    const validLines = lines.filter(line => line.qty !== 0);
    
    if (validLines.length === 0) {
      throw new Error('No valid lines to adjust');
    }

    // Resolve product IDs from SKUs
    for (const line of validLines) {
      if (!line.product_id) {
        const product = await dataService.getProductBySku(line.sku);
        if (!product) {
          throw new Error(`Product not found for SKU: ${line.sku}`);
        }
        line.product_id = product.id;
      }
    }

    // Insert inventory movements
    for (const line of validLines) {
      const movement: Omit<InventoryMovement, 'id' | 'created_at'> = {
        product_id: line.product_id!,
        qty: options.mode === 'WASTE' ? -Math.abs(line.qty) : line.qty, // WASTE is always negative
        type: options.mode,
        reason: options.reason,
        note: line.note,
        terminal: options?.terminal,
        cashier: options?.cashier
      };
      
      await this.insertMovement(movement);
    }
  }

  // Apply stocktake differences
  async applyStocktakeDifferences(
    diffs: StocktakeDiff[], 
    options?: { terminal?: string; cashier?: string }
  ): Promise<void> {
    const validDiffs = diffs.filter(diff => diff.delta !== 0);
    
    if (validDiffs.length === 0) {
      throw new Error('No differences to apply');
    }

    // Insert ADJUST movements for each difference
    for (const diff of validDiffs) {
      const movement: Omit<InventoryMovement, 'id' | 'created_at'> = {
        product_id: diff.product_id,
        qty: diff.delta,
        type: 'ADJUST',
        reason: 'Stocktake',
        note: diff.note || `Stocktake: ${diff.current_stock} → ${diff.counted_qty}`,
        terminal: options?.terminal,
        cashier: options?.cashier
      };
      
      await this.insertMovement(movement);
    }
  }

  // Get movement logs with filters
  async getMovementLogs(filters: MovementLogFilters = {}): Promise<MovementLogRow[]> {
    let query = `
      SELECT 
        im.id,
        im.created_at as datetime,
        im.type,
        p.sku,
        p.name_en,
        im.qty,
        im.reason,
        im.note,
        im.terminal,
        im.cashier
      FROM inventory_movements im
      JOIN products p ON im.product_id = p.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (filters.fromDate) {
      query += ` AND im.created_at >= ?`;
      params.push(filters.fromDate);
    }
    
    if (filters.toDate) {
      query += ` AND im.created_at <= ?`;
      params.push(filters.toDate);
    }
    
    if (filters.type) {
      query += ` AND im.type = ?`;
      params.push(filters.type);
    }
    
    if (filters.sku) {
      query += ` AND p.sku LIKE ?`;
      params.push(`%${filters.sku}%`);
    }
    
    if (filters.reason) {
      query += ` AND im.reason LIKE ?`;
      params.push(`%${filters.reason}%`);
    }
    
    query += ` ORDER BY im.created_at DESC`;
    
    if (filters.limit) {
      query += ` LIMIT ?`;
      params.push(filters.limit);
      
      if (filters.offset) {
        query += ` OFFSET ?`;
        params.push(filters.offset);
      }
    }
    
    const rows = await db.query<any>(query, params);
    
    return rows.map(row => ({
      ...row,
      datetime: new Date(row.datetime)
    }));
  }

  // Calculate stocktake differences
  async calculateStocktakeDifferences(countedData: { sku: string; counted_qty: number; note?: string }[]): Promise<StocktakeDiff[]> {
    const diffs: StocktakeDiff[] = [];
    
    for (const counted of countedData) {
      const product = await dataService.getProductBySku(counted.sku);
      if (!product) {
        continue; // Skip unknown SKUs
      }
      
      const stockMap = await this.getCurrentStockMap({ productIds: [product.id] });
      const currentStock = stockMap[product.id] || 0;
      const delta = counted.counted_qty - currentStock;
      
      diffs.push({
        sku: counted.sku,
        product_id: product.id,
        name_en: product.name_en,
        unit: product.unit,
        current_stock: currentStock,
        counted_qty: counted.counted_qty,
        delta,
        note: counted.note
      });
    }
    
    return diffs;
  }

  // Helper to insert a movement
  private async insertMovement(movement: Omit<InventoryMovement, 'id' | 'created_at'>): Promise<number> {
    const query = `
      INSERT INTO inventory_movements (product_id, qty, type, reason, note, terminal, cashier, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      movement.product_id,
      movement.qty,
      movement.type,
      movement.reason || null,
      movement.note || null,
      movement.terminal || null,
      movement.cashier || null,
      new Date()
    ];
    
    // Mock implementation - in real app would return inserted ID
    console.log('Inserting inventory movement:', { movement, params });
    return Date.now(); // Mock ID
  }

  // Get available categories for filtering
  async getCategories(): Promise<string[]> {
    const categories = await dataService.getCategories();
    return categories.map(c => c.name);
  }

  // Get available suppliers for filtering
  async getSuppliers(): Promise<string[]> {
    try {
      // Try to get suppliers if method exists, otherwise return empty array
      const suppliers = await dataService.getSuppliers?.() || [];
      return suppliers.map((s: any) => s.name || s.supplier_name || 'Unknown');
    } catch (error) {
      console.warn('getSuppliers not implemented in dataService, returning empty array');
      return [];
    }
  }

  // Get available reasons for adjustments/waste
  getAdjustmentReasons(): string[] {
    return ['Stocktake', 'Damage', 'Expired', 'Theft', 'Other'];
  }

  // Validate quantity based on unit and precision rules
  validateQuantity(qty: number, unit: 'pc' | 'kg', kgDecimals: number = 3): { isValid: boolean; error?: string; correctedQty?: number } {
    if (isNaN(qty) || !isFinite(qty)) {
      return { isValid: false, error: 'Quantity must be a valid number' };
    }

    if (unit === 'pc') {
      // For pieces, should be integer
      if (qty !== Math.floor(qty)) {
        return { 
          isValid: false, 
          error: 'Quantity for piece items must be a whole number',
          correctedQty: Math.round(qty)
        };
      }
    } else if (unit === 'kg') {
      // For kg, respect decimal places
      const factor = Math.pow(10, kgDecimals);
      const rounded = Math.round(qty * factor) / factor;
      
      if (Math.abs(qty - rounded) > 0.0001) {
        return {
          isValid: false,
          error: `Quantity for kg items can have at most ${kgDecimals} decimal places`,
          correctedQty: rounded
        };
      }
    }

    return { isValid: true };
  }
}

// Singleton instance
export const inventoryService = new InventoryService();
