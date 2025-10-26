import { Database } from 'better-sqlite3';

export interface StockLevel {
  id: number;
  product_id: number;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
  last_movement_at?: string;
  last_movement_type?: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: number;
  product_id: number;
  movement_type: string;
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
  reference_type?: string;
  reference_id?: number;
  reason?: string;
  notes?: string;
  created_by?: number;
  created_at: string;
}

export interface StockAdjustment {
  product_id: number;
  quantity: number;
  reason: string;
  notes?: string;
  created_by: number;
}

export interface StockTakeSession {
  id: number;
  name: string;
  status: string;
  started_at: string;
  completed_at?: string;
  created_by: number;
  notes?: string;
}

export interface StockTakeItem {
  id: number;
  session_id: number;
  product_id: number;
  expected_quantity: number;
  counted_quantity: number;
  variance: number;
  notes?: string;
  counted_by?: number;
  counted_at?: string;
}

export class InventoryService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async getStockLevels(filters: {
    productId?: number;
    lowStock?: boolean;
    zeroStock?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<StockLevel[]> {
    let query = `
      SELECT sl.*, p.name as product_name, p.sku, p.unit
      FROM stock_levels sl
      JOIN products p ON sl.product_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.productId) {
      query += ' AND sl.product_id = ?';
      params.push(filters.productId);
    }

    if (filters.lowStock) {
      query += ' AND sl.available_stock <= p.min_stock_level';
    }

    if (filters.zeroStock) {
      query += ' AND sl.available_stock = 0';
    }

    query += ' ORDER BY sl.available_stock ASC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const stockLevels = this.db.prepare(query).all(...params) as StockLevel[];
    return stockLevels;
  }

  async adjustStock(adjustment: StockAdjustment): Promise<boolean> {
    const transaction = this.db.transaction(() => {
      try {
        // Create inventory movement
        this.db.prepare(`
          INSERT INTO inventory_movements (
            product_id, movement_type, quantity, reason, created_by
          ) VALUES (?, ?, ?, ?, ?)
        `).run(
          adjustment.product_id,
          'ADJUSTMENT',
          adjustment.quantity,
          adjustment.reason,
          adjustment.created_by
        );

        return true;
      } catch (error) {
        throw error;
      }
    });

    return transaction();
  }

  async getInventoryMovements(filters: {
    productId?: number;
    movementType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<InventoryMovement[]> {
    let query = `
      SELECT im.*, p.name as product_name, p.sku
      FROM inventory_movements im
      JOIN products p ON im.product_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.productId) {
      query += ' AND im.product_id = ?';
      params.push(filters.productId);
    }

    if (filters.movementType) {
      query += ' AND im.movement_type = ?';
      params.push(filters.movementType);
    }

    if (filters.startDate) {
      query += ' AND im.created_at >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ' AND im.created_at <= ?';
      params.push(filters.endDate);
    }

    query += ' ORDER BY im.created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const movements = this.db.prepare(query).all(...params) as InventoryMovement[];
    return movements;
  }

  async createStockTakeSession(name: string, createdBy: number, notes?: string): Promise<StockTakeSession> {
    const result = this.db.prepare(`
      INSERT INTO stock_take_sessions (name, status, created_by, notes)
      VALUES (?, ?, ?, ?)
    `).run(name, 'in_progress', createdBy, notes || null);

    const session = this.db.prepare(`
      SELECT * FROM stock_take_sessions WHERE id = ?
    `).get(result.lastInsertRowid) as StockTakeSession;

    return session;
  }

  async getStockTakeSessions(filters: {
    status?: string;
    createdBy?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<StockTakeSession[]> {
    let query = 'SELECT * FROM stock_take_sessions WHERE 1=1';
    const params: any[] = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.createdBy) {
      query += ' AND created_by = ?';
      params.push(filters.createdBy);
    }

    query += ' ORDER BY started_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const sessions = this.db.prepare(query).all(...params) as StockTakeSession[];
    return sessions;
  }

  async addStockTakeItem(sessionId: number, productId: number, countedQuantity: number, countedBy: number, notes?: string): Promise<boolean> {
    const transaction = this.db.transaction(() => {
      try {
        // Get current stock level
        const stockLevel = this.db.prepare(`
          SELECT available_stock FROM stock_levels WHERE product_id = ?
        `).get(productId) as any;

        const expectedQuantity = stockLevel ? stockLevel.available_stock : 0;
        const variance = countedQuantity - expectedQuantity;

        // Insert or update stock take item
        this.db.prepare(`
          INSERT OR REPLACE INTO stock_take_items (
            session_id, product_id, expected_quantity, counted_quantity, 
            variance, notes, counted_by, counted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
          sessionId,
          productId,
          expectedQuantity,
          countedQuantity,
          variance,
          notes || null,
          countedBy
        );

        return true;
      } catch (error) {
        throw error;
      }
    });

    return transaction();
  }

  async completeStockTake(sessionId: number, completedBy: number): Promise<boolean> {
    const transaction = this.db.transaction(() => {
      try {
        // Get all items with variances
        const items = this.db.prepare(`
          SELECT * FROM stock_take_items 
          WHERE session_id = ? AND variance != 0
        `).all(sessionId) as StockTakeItem[];

        // Create inventory movements for variances
        for (const item of items) {
          this.db.prepare(`
            INSERT INTO inventory_movements (
              product_id, movement_type, quantity, reference_type, 
              reference_id, reason, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            item.product_id,
            'STOCKTAKE',
            item.variance,
            'STOCKTAKE',
            sessionId,
            'STOCKTAKE',
            completedBy
          );
        }

        // Update session status
        this.db.prepare(`
          UPDATE stock_take_sessions 
          SET status = 'completed', completed_at = datetime('now')
          WHERE id = ?
        `).run(sessionId);

        return true;
      } catch (error) {
        throw error;
      }
    });

    return transaction();
  }

  async getStockTakeItems(sessionId: number): Promise<StockTakeItem[]> {
    const items = this.db.prepare(`
      SELECT sti.*, p.name as product_name, p.sku
      FROM stock_take_items sti
      JOIN products p ON sti.product_id = p.id
      WHERE sti.session_id = ?
      ORDER BY p.name
    `).all(sessionId) as StockTakeItem[];

    return items;
  }

  async exportStockLevels(): Promise<string> {
    const stockLevels = this.db.prepare(`
      SELECT 
        p.sku,
        p.name as product_name,
        p.unit,
        sl.current_stock,
        sl.reserved_stock,
        sl.available_stock,
        p.min_stock_level,
        p.max_stock_level,
        sl.last_movement_at,
        sl.updated_at
      FROM stock_levels sl
      JOIN products p ON sl.product_id = p.id
      ORDER BY p.name
    `).all();

    // Convert to CSV
    const headers = [
      'SKU', 'Product Name', 'Unit', 'Current Stock', 'Reserved Stock',
      'Available Stock', 'Min Stock Level', 'Max Stock Level',
      'Last Movement', 'Updated At'
    ];

    const csvRows = [headers.join(',')];
    
    for (const row of stockLevels) {
      const csvRow = [
        row.sku || '',
        `"${row.product_name}"`,
        row.unit || '',
        row.current_stock,
        row.reserved_stock,
        row.available_stock,
        row.min_stock_level || 0,
        row.max_stock_level || 0,
        row.last_movement_at || '',
        row.updated_at
      ];
      csvRows.push(csvRow.join(','));
    }

    return csvRows.join('\n');
  }

  async importStockLevels(csvData: string, createdBy: number): Promise<{ success: number; errors: string[] }> {
    const lines = csvData.split('\n');
    const errors: string[] = [];
    let success = 0;

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const [sku, quantityStr] = line.split(',');
        const quantity = parseFloat(quantityStr);

        if (isNaN(quantity)) {
          errors.push(`Line ${i + 1}: Invalid quantity "${quantityStr}"`);
          continue;
        }

        // Find product by SKU
        const product = this.db.prepare(`
          SELECT id FROM products WHERE sku = ?
        `).get(sku) as any;

        if (!product) {
          errors.push(`Line ${i + 1}: Product with SKU "${sku}" not found`);
          continue;
        }

        // Create adjustment movement
        this.db.prepare(`
          INSERT INTO inventory_movements (
            product_id, movement_type, quantity, reason, created_by
          ) VALUES (?, ?, ?, ?, ?)
        `).run(
          product.id,
          'ADJUSTMENT',
          quantity,
          'IMPORT',
          createdBy
        );

        success++;
      } catch (error) {
        errors.push(`Line ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { success, errors };
  }
}










