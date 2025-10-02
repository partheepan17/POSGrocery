/**
 * GRN (Goods Received Note) Service
 * Manages supplier deliveries, receiving, and inventory updates
 */

import { dataService } from './dataService';
import { authService } from './authService';

export interface GrnHeader {
  id: number;
  supplier_id: number;
  supplier_name?: string;
  ref_no: string;
  note?: string;
  status: 'DRAFT' | 'POSTED';
  grn_date: string;
  posted_at?: string;
  by_user: number;
  approval_user?: number;
  by_user_name?: string;
  approval_user_name?: string;
  created_at: string;
  updated_at: string;
  line_count?: number;
  total_qty?: number;
  total_cost?: number;
}

export interface GrnLine {
  id: number;
  grn_id: number;
  product_id: number;
  product_sku: string;
  product_barcode?: string;
  product_name: string;
  product_unit: string;
  qty: number;
  cost: number;
  line_total: number;
  created_at: string;
}

export interface GrnFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: 'DRAFT' | 'POSTED' | 'ALL';
  supplierId?: number;
  search?: string;
}

export interface GrnCreateInput {
  supplierId: number;
  refNo: string;
  note?: string;
  date: string;
}

export interface GrnLineInput {
  productId: number;
  qty: number;
  cost: number;
}

export interface BulkGrnLineInput {
  barcode?: string;
  sku?: string;
  qty: number;
  cost: number;
}

export interface PostGrnOptions {
  approvalPin?: string;
  updateProductCost?: boolean;
}

class GrnService {
  /**
   * Create new GRN
   */
  async createGrn(input: GrnCreateInput): Promise<GrnHeader> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Validate supplier exists
      const suppliers = await dataService.query(
        'SELECT * FROM suppliers WHERE id = ? AND active = true',
        [input.supplierId]
      );

      if (suppliers.length === 0) {
        throw new Error('Supplier not found or inactive');
      }

      const result = await dataService.execute(
        `INSERT INTO grn_headers (
          supplier_id, ref_no, note, grn_date, by_user, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          input.supplierId,
          input.refNo,
          input.note || null,
          input.date,
          currentUser.id,
          new Date().toISOString(),
          new Date().toISOString()
        ]
      );

      const grnId = result.lastInsertRowid;
      const grn = await this.getGrn(grnId);
      
      if (!grn) {
        throw new Error('Failed to retrieve created GRN');
      }

      console.log(`GRN created: ${input.refNo} (ID: ${grnId})`);
      return grn;

    } catch (error) {
      console.error('Failed to create GRN:', error);
      throw error;
    }
  }

  /**
   * Get GRN by ID with lines
   */
  async getGrn(grnId: number): Promise<GrnHeader | null> {
    try {
      const grns = await dataService.query<any>(
        `SELECT 
          g.*,
          s.supplier_name,
          u1.name as by_user_name,
          u2.name as approval_user_name,
          COUNT(l.id) as line_count,
          SUM(l.qty) as total_qty,
          SUM(l.line_total) as total_cost
        FROM grn_headers g
        LEFT JOIN suppliers s ON g.supplier_id = s.id
        LEFT JOIN users u1 ON g.by_user = u1.id
        LEFT JOIN users u2 ON g.approval_user = u2.id
        LEFT JOIN grn_lines l ON g.id = l.grn_id
        WHERE g.id = ?
        GROUP BY g.id`,
        [grnId]
      );

      return grns[0] || null;

    } catch (error) {
      console.error('Failed to get GRN:', error);
      throw error;
    }
  }

  /**
   * Get GRN lines
   */
  async getGrnLines(grnId: number): Promise<GrnLine[]> {
    try {
      return await dataService.query<GrnLine>(
        `SELECT 
          l.*,
          p.sku as product_sku,
          p.barcode as product_barcode,
          p.name_en as product_name,
          p.unit as product_unit
        FROM grn_lines l
        JOIN products p ON l.product_id = p.id
        WHERE l.grn_id = ?
        ORDER BY l.created_at`,
        [grnId]
      );

    } catch (error) {
      console.error('Failed to get GRN lines:', error);
      throw error;
    }
  }

  /**
   * Add line to GRN
   */
  async addGrnLine(grnId: number, input: GrnLineInput): Promise<void> {
    try {
      // Check if GRN exists and is not posted
      const grn = await this.getGrn(grnId);
      if (!grn) {
        throw new Error('GRN not found');
      }
      if (grn.status === 'POSTED') {
        throw new Error('Cannot modify posted GRN');
      }

      // Validate input
      if (input.qty <= 0) {
        throw new Error('Quantity must be greater than 0');
      }
      if (input.cost < 0) {
        throw new Error('Cost cannot be negative');
      }

      const lineTotal = input.qty * input.cost;

      await dataService.execute(
        `INSERT INTO grn_lines (grn_id, product_id, qty, cost, line_total, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [grnId, input.productId, input.qty, input.cost, lineTotal, new Date().toISOString()]
      );

      // Update GRN timestamp
      await dataService.execute(
        'UPDATE grn_headers SET updated_at = ? WHERE id = ?',
        [new Date().toISOString(), grnId]
      );

    } catch (error) {
      console.error('Failed to add GRN line:', error);
      throw error;
    }
  }

  /**
   * Import GRN lines from CSV
   */
  async importGrnLines(grnId: number, rows: BulkGrnLineInput[]): Promise<{
    success: number;
    errors: Array<{ row: number; error: string; data: BulkGrnLineInput }>;
  }> {
    try {
      const grn = await this.getGrn(grnId);
      if (!grn) {
        throw new Error('GRN not found');
      }
      if (grn.status === 'POSTED') {
        throw new Error('Cannot modify posted GRN');
      }

      const results = { success: 0, errors: [] as any[] };

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
            results.errors.push({
              row: i + 1,
              error: `Product not found: ${row.barcode || row.sku}`,
              data: row
            });
            continue;
          }

          const product = products[0];
          
          // Validate input
          if (isNaN(row.qty) || row.qty <= 0) {
            results.errors.push({
              row: i + 1,
              error: 'Invalid quantity (must be > 0)',
              data: row
            });
            continue;
          }

          if (isNaN(row.cost) || row.cost < 0) {
            results.errors.push({
              row: i + 1,
              error: 'Invalid cost (cannot be negative)',
              data: row
            });
            continue;
          }

          // Add GRN line
          await this.addGrnLine(grnId, {
            productId: product.id,
            qty: row.qty,
            cost: row.cost
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
      console.error('Failed to import GRN lines:', error);
      throw error;
    }
  }

  /**
   * Post GRN (finalize and create inventory movements)
   */
  async postGrn(grnId: number, options: PostGrnOptions = {}): Promise<void> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const grn = await this.getGrn(grnId);
      if (!grn) {
        throw new Error('GRN not found');
      }
      if (grn.status === 'POSTED') {
        throw new Error('GRN already posted');
      }

      // Get GRN lines
      const lines = await this.getGrnLines(grnId);
      if (lines.length === 0) {
        throw new Error('Cannot post GRN with no lines');
      }

      // Verify manager PIN if provided
      if (options.approvalPin) {
        const verification = await authService.verifyPin(options.approvalPin, 'MANAGER');
        if (!verification.success) {
          throw new Error('Invalid manager PIN');
        }
      }

      // Create inventory movements for each line
      for (const line of lines) {
        await dataService.execute(
          `INSERT INTO inventory_movements (
            product_id, movement_type, quantity_change, unit_cost,
            reference_type, reference_id, notes, created_at, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            line.product_id,
            'RECEIVE',
            line.qty,
            line.cost,
            'GRN',
            grnId,
            `GRN ${grn.ref_no} - Received from ${grn.supplier_name}`,
            new Date().toISOString(),
            currentUser.id
          ]
        );

        // Update product cost if enabled
        if (options.updateProductCost) {
          const stockSettings = this.getStockSettings();
          
          if (stockSettings.costUpdateOnGRN === 'always') {
            await dataService.execute(
              'UPDATE products SET cost_price = ?, updated_at = ? WHERE id = ?',
              [line.cost, new Date().toISOString(), line.product_id]
            );
          } else if (stockSettings.costUpdateOnGRN === 'if-empty') {
            await dataService.execute(
              `UPDATE products 
               SET cost_price = ?, updated_at = ? 
               WHERE id = ? AND (cost_price IS NULL OR cost_price = 0)`,
              [line.cost, new Date().toISOString(), line.product_id]
            );
          }
        }
      }

      // Mark GRN as posted
      await dataService.execute(
        `UPDATE grn_headers 
         SET status = 'POSTED', posted_at = ?, approval_user = ?, updated_at = ?
         WHERE id = ?`,
        [new Date().toISOString(), currentUser.id, new Date().toISOString(), grnId]
      );

      console.log(`GRN ${grnId} posted with ${lines.length} lines`);

    } catch (error) {
      console.error('Failed to post GRN:', error);
      throw error;
    }
  }

  /**
   * List GRNs with filters
   */
  async listGrn(filters: GrnFilters = {}): Promise<GrnHeader[]> {
    try {
      let query = `
        SELECT 
          g.*,
          s.supplier_name,
          u1.name as by_user_name,
          u2.name as approval_user_name,
          COUNT(l.id) as line_count,
          SUM(l.qty) as total_qty,
          SUM(l.line_total) as total_cost
        FROM grn_headers g
        LEFT JOIN suppliers s ON g.supplier_id = s.id
        LEFT JOIN users u1 ON g.by_user = u1.id
        LEFT JOIN users u2 ON g.approval_user = u2.id
        LEFT JOIN grn_lines l ON g.id = l.grn_id
        WHERE 1=1
      `;

      const params: any[] = [];

      if (filters.dateFrom) {
        query += ' AND DATE(g.grn_date) >= ?';
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        query += ' AND DATE(g.grn_date) <= ?';
        params.push(filters.dateTo);
      }

      if (filters.status && filters.status !== 'ALL') {
        query += ' AND g.status = ?';
        params.push(filters.status);
      }

      if (filters.supplierId) {
        query += ' AND g.supplier_id = ?';
        params.push(filters.supplierId);
      }

      if (filters.search) {
        query += ' AND (g.ref_no LIKE ? OR g.note LIKE ? OR s.supplier_name LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      query += ' GROUP BY g.id ORDER BY g.created_at DESC';

      return await dataService.query<GrnHeader>(query, params);

    } catch (error) {
      console.error('Failed to list GRNs:', error);
      throw error;
    }
  }

  /**
   * Delete GRN (only if DRAFT)
   */
  async deleteGrn(grnId: number): Promise<void> {
    try {
      const grn = await this.getGrn(grnId);
      if (!grn) {
        throw new Error('GRN not found');
      }
      if (grn.status === 'POSTED') {
        throw new Error('Cannot delete posted GRN');
      }

      // Delete lines first
      await dataService.execute(
        'DELETE FROM grn_lines WHERE grn_id = ?',
        [grnId]
      );

      // Delete GRN
      await dataService.execute(
        'DELETE FROM grn_headers WHERE id = ?',
        [grnId]
      );

      console.log(`GRN ${grnId} deleted`);

    } catch (error) {
      console.error('Failed to delete GRN:', error);
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
   * Get stock settings (shared with stocktake)
   */
  getStockSettings(): any {
    // In production, this would load from app settings
    return {
      costUpdateOnGRN: 'if-empty'
    };
  }

  /**
   * Get GRN statistics
   */
  async getGrnStats(): Promise<{
    draftCount: number;
    postedCount: number;
    recentPostedCount: number;
  }> {
    try {
      const stats = await dataService.query<any>(
        `SELECT 
          COUNT(CASE WHEN status = 'DRAFT' THEN 1 END) as draft_count,
          COUNT(CASE WHEN status = 'POSTED' THEN 1 END) as posted_count,
          COUNT(CASE WHEN status = 'POSTED' AND posted_at >= date('now', '-7 days') THEN 1 END) as recent_posted_count
        FROM grn_headers`
      );

      return {
        draftCount: stats[0]?.draft_count || 0,
        postedCount: stats[0]?.posted_count || 0,
        recentPostedCount: stats[0]?.recent_posted_count || 0
      };

    } catch (error) {
      console.error('Failed to get GRN stats:', error);
      return { draftCount: 0, postedCount: 0, recentPostedCount: 0 };
    }
  }
}

// Export singleton instance
export const grnService = new GrnService();
