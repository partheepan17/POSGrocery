/**
 * Stocktake Service
 * Manages inventory counting sessions, variance calculations, and adjustments
 */

import { dataService } from './dataService';
import { authService } from './authService';

export interface StocktakeSession {
  id: number;
  name: string;
  note?: string;
  status: 'DRAFT' | 'FINALIZED';
  created_at: string;
  finalized_at?: string;
  by_user: number;
  approval_user?: number;
  by_user_name?: string;
  approval_user_name?: string;
  count_lines?: number;
  variance_items?: number;
}

export interface StocktakeCount {
  id: number;
  session_id: number;
  product_id: number;
  product_sku: string;
  product_barcode?: string;
  product_name: string;
  product_unit: string;
  qty: number;
  source: 'scan' | 'manual' | 'csv';
  updated_at: string;
  last_known_stock?: number;
  delta?: number;
}

export interface StocktakeVariance {
  product_id: number;
  product_sku: string;
  product_name: string;
  counted_qty: number;
  system_qty: number;
  delta: number;
  delta_type: 'POSITIVE' | 'NEGATIVE' | 'ZERO';
  unit_cost: number;
  value_impact: number;
}

export interface StocktakeFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: 'DRAFT' | 'FINALIZED' | 'ALL';
  search?: string;
  userId?: number;
}

export interface CountLineInput {
  productId: number;
  qty: number;
  source: 'scan' | 'manual' | 'csv';
}

export interface BulkCountInput {
  barcode?: string;
  sku?: string;
  qty: number;
  note?: string;
}

export interface FinalizeOptions {
  approvalPin?: string;
  createAdjustForPositive: boolean;
  createWasteForNegative: boolean;
}

export interface StockSettings {
  defaultCountMode: 'scan-first' | 'grid';
  allowNegativeAdjust: boolean;
  requireManagerForNegative: boolean;
  autoCreateMissingBarcodes: boolean;
  costUpdateOnGRN: 'never' | 'if-empty' | 'always';
}

class StocktakeService {
  private defaultSettings: StockSettings = {
    defaultCountMode: 'scan-first',
    allowNegativeAdjust: true,
    requireManagerForNegative: true,
    autoCreateMissingBarcodes: false,
    costUpdateOnGRN: 'if-empty'
  };

  /**
   * Create a new stocktake session
   */
  async createSession(input: { name: string; note?: string }): Promise<StocktakeSession> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const result = await dataService.execute(
        `INSERT INTO stocktake_sessions (name, note, by_user, created_at) 
         VALUES (?, ?, ?, ?)`,
        [input.name, input.note || null, currentUser.id, new Date().toISOString()]
      );

      const sessionId = result.lastInsertRowid;
    const session = await this.getSession(Number(sessionId ?? 0));
      
      if (!session) {
        throw new Error('Failed to retrieve created session');
      }

      console.log(`Stocktake session created: ${input.name} (ID: ${sessionId})`);
      return session;

    } catch (error) {
      console.error('Failed to create stocktake session:', error);
      throw error;
    }
  }

  /**
   * List stocktake sessions with filters
   */
  async listSessions(filters: StocktakeFilters = {}): Promise<StocktakeSession[]> {
    try {
      let query = `
        SELECT 
          s.*,
          u1.name as by_user_name,
          u2.name as approval_user_name,
          COUNT(c.id) as count_lines,
          COUNT(CASE WHEN c.qty != COALESCE(stock.qty, 0) THEN 1 END) as variance_items
        FROM stocktake_sessions s
        LEFT JOIN users u1 ON s.by_user = u1.id
        LEFT JOIN users u2 ON s.approval_user = u2.id
        LEFT JOIN stocktake_counts c ON s.id = c.session_id
        LEFT JOIN (
          SELECT product_id, SUM(quantity_change) as qty 
          FROM inventory_movements 
          GROUP BY product_id
        ) stock ON c.product_id = stock.product_id
        WHERE 1=1
      `;

      const params: any[] = [];

      if (filters.dateFrom) {
        query += ' AND DATE(s.created_at) >= ?';
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        query += ' AND DATE(s.created_at) <= ?';
        params.push(filters.dateTo);
      }

      if (filters.status && filters.status !== 'ALL') {
        query += ' AND s.status = ?';
        params.push(filters.status);
      }

      if (filters.search) {
        query += ' AND (s.name LIKE ? OR s.note LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm);
      }

      if (filters.userId) {
        query += ' AND s.by_user = ?';
        params.push(filters.userId);
      }

      query += ' GROUP BY s.id ORDER BY s.created_at DESC';

      return await dataService.query<StocktakeSession>(query, params);

    } catch (error) {
      console.error('Failed to list stocktake sessions:', error);
      throw error;
    }
  }

  /**
   * Get stocktake session by ID
   */
  async getSession(sessionId: number): Promise<StocktakeSession | null> {
    try {
      const sessions = await dataService.query<StocktakeSession>(
        `SELECT 
          s.*,
          u1.name as by_user_name,
          u2.name as approval_user_name,
          COUNT(c.id) as count_lines
        FROM stocktake_sessions s
        LEFT JOIN users u1 ON s.by_user = u1.id
        LEFT JOIN users u2 ON s.approval_user = u2.id
        LEFT JOIN stocktake_counts c ON s.id = c.session_id
        WHERE s.id = ?
        GROUP BY s.id`,
        [sessionId]
      );

      return sessions[0] || null;

    } catch (error) {
      console.error('Failed to get stocktake session:', error);
      throw error;
    }
  }

  /**
   * Get counts for a session
   */
  async getSessionCounts(sessionId: number): Promise<StocktakeCount[]> {
    try {
      return await dataService.query<StocktakeCount>(
        `SELECT 
          c.*,
          p.sku as product_sku,
          p.barcode as product_barcode,
          p.name_en as product_name,
          p.unit as product_unit,
          COALESCE(stock.qty, 0) as last_known_stock,
          (c.qty - COALESCE(stock.qty, 0)) as delta
        FROM stocktake_counts c
        JOIN products p ON c.product_id = p.id
        LEFT JOIN (
          SELECT product_id, SUM(quantity_change) as qty 
          FROM inventory_movements 
          GROUP BY product_id
        ) stock ON c.product_id = stock.product_id
        WHERE c.session_id = ?
        ORDER BY c.updated_at DESC`,
        [sessionId]
      );

    } catch (error) {
      console.error('Failed to get session counts:', error);
      throw error;
    }
  }

  /**
   * Add or update count line
   */
  async addCountLine(sessionId: number, input: CountLineInput): Promise<void> {
    try {
      // Check if session exists and is not finalized
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('Stocktake session not found');
      }
      if (session.status === 'FINALIZED') {
        throw new Error('Cannot modify finalized stocktake session');
      }

      // Upsert count record
      await dataService.execute(
        `INSERT INTO stocktake_counts (session_id, product_id, qty, source, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(session_id, product_id) 
         DO UPDATE SET qty = ?, source = ?, updated_at = ?`,
        [
          sessionId, 
          input.productId, 
          input.qty, 
          input.source, 
          new Date().toISOString(),
          input.qty,
          input.source,
          new Date().toISOString()
        ]
      );

    } catch (error) {
      console.error('Failed to add count line:', error);
      throw error;
    }
  }

  /**
   * Bulk upsert counts from CSV import
   */
  async bulkUpsertCounts(sessionId: number, rows: BulkCountInput[]): Promise<{
    success: number;
    errors: Array<{ row: number; error: string; data: BulkCountInput }>;
  }> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('Stocktake session not found');
      }
      if (session.status === 'FINALIZED') {
        throw new Error('Cannot modify finalized stocktake session');
      }

      const results = { success: 0, errors: [] as any[] };
      const settings = this.getStockSettings();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        try {
          // Find product by barcode or SKU
          let products: any[] = [];
          
          if (row.barcode) {
            products = await dataService.query(
              'SELECT * FROM products WHERE barcode = ? AND active = true',
              [row.barcode]
            );
          }
          
          if (products.length === 0 && row.sku) {
            products = await dataService.query(
              'SELECT * FROM products WHERE sku = ? AND active = true',
              [row.sku]
            );
          }

          if (products.length === 0) {
            if (settings.autoCreateMissingBarcodes) {
              // Would create missing product here in production
              results.errors.push({
                row: i + 1,
                error: 'Auto-create missing products not implemented',
                data: row
              });
            } else {
              results.errors.push({
                row: i + 1,
                error: `Product not found: ${row.barcode || row.sku}`,
                data: row
              });
            }
            continue;
          }

          const product = products[0];
          
          // Validate quantity
          if (isNaN(row.qty) || row.qty < 0) {
            results.errors.push({
              row: i + 1,
              error: 'Invalid quantity',
              data: row
            });
            continue;
          }

          // Add count line
          await this.addCountLine(sessionId, {
            productId: product.id,
            qty: row.qty,
            source: 'csv'
          });

          results.success++;

        } catch (error) {
          results.errors.push({
            row: i + 1,
            error: error instanceof Error ? error.message : 'Unknown error',
            data: row
          });
        }
      }

      return results;

    } catch (error) {
      console.error('Failed to bulk upsert counts:', error);
      throw error;
    }
  }

  /**
   * Compute variance for session
   */
  async computeVariance(sessionId: number): Promise<StocktakeVariance[]> {
    try {
      const variances = await dataService.query<any>(
        `SELECT 
          c.product_id,
          p.sku as product_sku,
          p.name_en as product_name,
          c.qty as counted_qty,
          COALESCE(stock.qty, 0) as system_qty,
          (c.qty - COALESCE(stock.qty, 0)) as delta,
          p.cost_price as unit_cost
        FROM stocktake_counts c
        JOIN products p ON c.product_id = p.id
        LEFT JOIN (
          SELECT product_id, SUM(quantity_change) as qty 
          FROM inventory_movements 
          GROUP BY product_id
        ) stock ON c.product_id = stock.product_id
        WHERE c.session_id = ?
        ORDER BY ABS(c.qty - COALESCE(stock.qty, 0)) DESC`,
        [sessionId]
      );

      return variances.map(v => ({
        product_id: v.product_id,
        product_sku: v.product_sku,
        product_name: v.product_name,
        counted_qty: v.counted_qty,
        system_qty: v.system_qty,
        delta: v.delta,
        delta_type: v.delta > 0 ? 'POSITIVE' : v.delta < 0 ? 'NEGATIVE' : 'ZERO',
        unit_cost: v.unit_cost || 0,
        value_impact: v.delta * (v.unit_cost || 0)
      }));

    } catch (error) {
      console.error('Failed to compute variance:', error);
      throw error;
    }
  }

  /**
   * Finalize stocktake session
   */
  async finalize(sessionId: number, options: FinalizeOptions): Promise<void> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('Stocktake session not found');
      }
      if (session.status === 'FINALIZED') {
        throw new Error('Session already finalized');
      }

      // Get variances
      const variances = await this.computeVariance(sessionId);
      const negativeVariances = variances.filter(v => v.delta < 0);
      
      // Check manager PIN for negative adjustments
      const settings = this.getStockSettings();
      if (negativeVariances.length > 0 && settings.requireManagerForNegative) {
        if (!options.approvalPin) {
          throw new Error('Manager PIN required for negative adjustments');
        }
        
        const verification = await authService.verifyPin(options.approvalPin, 'MANAGER');
        if (!verification.success) {
          throw new Error('Invalid manager PIN');
        }
      }

      // Create inventory movements
      for (const variance of variances) {
        if (variance.delta === 0) continue;

        const movementType = variance.delta > 0 
          ? (options.createAdjustForPositive ? 'ADJUST' : 'ADJUST')
          : (options.createWasteForNegative ? 'WASTE' : 'ADJUST');

        await dataService.execute(
          `INSERT INTO inventory_movements (
            product_id, movement_type, quantity_change, unit_cost, 
            reference_type, reference_id, notes, created_at, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            variance.product_id,
            movementType,
            variance.delta,
            variance.unit_cost,
            'STOCKTAKE',
            sessionId,
            `Stocktake adjustment: ${session.name}`,
            new Date().toISOString(),
            currentUser.id
          ]
        );
      }

      // Mark session as finalized
      await dataService.execute(
        `UPDATE stocktake_sessions 
         SET status = 'FINALIZED', finalized_at = ?, approval_user = ?
         WHERE id = ?`,
        [new Date().toISOString(), currentUser.id, sessionId]
      );

      console.log(`Stocktake session ${sessionId} finalized with ${variances.length} adjustments`);

    } catch (error) {
      console.error('Failed to finalize stocktake:', error);
      throw error;
    }
  }

  /**
   * Delete stocktake session (only if DRAFT)
   */
  async deleteSession(sessionId: number): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('Stocktake session not found');
      }
      if (session.status === 'FINALIZED') {
        throw new Error('Cannot delete finalized stocktake session');
      }

      // Delete counts first (cascade should handle this, but being explicit)
      await dataService.execute(
        'DELETE FROM stocktake_counts WHERE session_id = ?',
        [sessionId]
      );

      // Delete session
      await dataService.execute(
        'DELETE FROM stocktake_sessions WHERE id = ?',
        [sessionId]
      );

      console.log(`Stocktake session ${sessionId} deleted`);

    } catch (error) {
      console.error('Failed to delete stocktake session:', error);
      throw error;
    }
  }

  /**
   * Find product by barcode or SKU
   */
  async findProduct(identifier: string): Promise<any | null> {
    try {
      // Try barcode first
      let products = await dataService.query(
        'SELECT * FROM products WHERE barcode = ? AND active = true',
        [identifier]
      );

      // Fallback to SKU
      if (products.length === 0) {
        products = await dataService.query(
          'SELECT * FROM products WHERE sku = ? AND active = true',
          [identifier]
        );
      }

      return products[0] || null;

    } catch (error) {
      console.error('Failed to find product:', error);
      throw error;
    }
  }

  /**
   * Get stock settings
   */
  getStockSettings(): StockSettings {
    // In production, this would load from app settings
    return this.defaultSettings;
  }

  /**
   * Update stock settings
   */
  updateStockSettings(settings: Partial<StockSettings>): void {
    // In production, this would save to app settings
    Object.assign(this.defaultSettings, settings);
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    draftSessions: number;
    finalizedSessions: number;
    lastFinalizedDate?: string;
  }> {
    try {
      const stats = await dataService.query<any>(
        `SELECT 
          COUNT(CASE WHEN status = 'DRAFT' THEN 1 END) as draft_sessions,
          COUNT(CASE WHEN status = 'FINALIZED' THEN 1 END) as finalized_sessions,
          MAX(CASE WHEN status = 'FINALIZED' THEN finalized_at END) as last_finalized_date
        FROM stocktake_sessions`
      );

      return {
        draftSessions: stats[0]?.draft_sessions || 0,
        finalizedSessions: stats[0]?.finalized_sessions || 0,
        lastFinalizedDate: stats[0]?.last_finalized_date
      };

    } catch (error) {
      console.error('Failed to get session stats:', error);
      return { draftSessions: 0, finalizedSessions: 0 };
    }
  }
}

// Export singleton instance
export const stocktakeService = new StocktakeService();
