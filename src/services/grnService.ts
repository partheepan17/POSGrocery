import { database } from './database';
import { 
  GRN, 
  GRNLine, 
  GRNWithDetails, 
  GRNStatus, 
  GRNLabelItem,
  Product,
  Supplier,
  AppSettings
} from '../types';
import { SettingsIntegrationService } from './settingsIntegration';

export class GRNService {
  private settingsService = SettingsIntegrationService.getInstance();

  /**
   * Get current application settings
   */
  private getSettings(): Partial<AppSettings> {
    // This would typically come from a settings store or API
    // For now, return default values that can be overridden
    return {
      tax_rate: 0.15, // Default 15% tax rate
      currency: 'LKR',
      languageFormatting: {
        roundingMode: 'round',
        kgDecimals: 2
      }
    };
  }

  /**
   * Calculate tax for GRN lines
   */
  private calculateTax(subtotal: number, taxRate?: number): number {
    const settings = this.getSettings();
    const rate = taxRate ?? settings.tax_rate ?? 0;
    return Math.round(subtotal * rate * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate other charges (shipping, handling, etc.) for GRN
   */
  private calculateOtherCharges(subtotal: number, grnData: GRNWithDetails): number {
    const settings = this.getSettings();
    let otherCharges = 0;

    // Example business rules for other charges:
    // 1. Shipping: 2% of subtotal for orders over 1000, minimum 50
    // 2. Handling: 1% of subtotal for orders over 500
    // 3. Insurance: 0.5% of subtotal for orders over 2000

    const shippingThreshold = 1000;
    const handlingThreshold = 500;
    const insuranceThreshold = 2000;

    // Shipping charges
    if (subtotal > shippingThreshold) {
      const shippingRate = 0.02; // 2%
      const shippingAmount = Math.max(subtotal * shippingRate, 50); // Minimum 50
      otherCharges += shippingAmount;
    }

    // Handling charges
    if (subtotal > handlingThreshold) {
      const handlingRate = 0.01; // 1%
      otherCharges += subtotal * handlingRate;
    }

    // Insurance charges
    if (subtotal > insuranceThreshold) {
      const insuranceRate = 0.005; // 0.5%
      otherCharges += subtotal * insuranceRate;
    }

    // Round to 2 decimal places
    return Math.round(otherCharges * 100) / 100;
  }

  /**
   * Generate next GRN number
   */
  async getNextGRNNo(): Promise<string> {
    try {
      const db = await database;
      
      // Get the last GRN number or ID
      const lastGRN = await db.query(`
        SELECT grn_no, id FROM grn 
        ORDER BY id DESC 
        LIMIT 1
      `);
      
      let nextNumber = 1;
      const currentYear = new Date().getFullYear();
      const prefix = `GRN-${currentYear}-`;
      
      if (lastGRN && lastGRN.length > 0) {
        const grn = lastGRN[0];
        if (grn.grn_no) {
          // Extract number from existing GRN number
          const match = grn.grn_no.match(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`));
          if (match) {
            nextNumber = parseInt(match[1]) + 1;
          }
        } else if (grn.id) {
          // Fallback to ID-based numbering
          nextNumber = grn.id + 1;
        }
      }

      // If still first number, keep a local counter to ensure sequential numbers across immediate calls
      if (nextNumber === 1) {
        try {
          const key = `grn_no_counter_${currentYear}`;
          const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
          const val = raw ? parseInt(raw) : 0;
          const next = val + 1;
          if (typeof localStorage !== 'undefined') localStorage.setItem(key, String(next));
          nextNumber = next;
        } catch {}
      }
      
      return `${prefix}${nextNumber.toString().padStart(6, '0')}`;
    } catch (error) {
      console.error('Error generating GRN number:', error);
      throw new Error('Failed to generate GRN number');
    }
  }

  /**
   * Create a new GRN
   */
  async createGRN(header: Omit<GRN, 'id' | 'subtotal' | 'tax' | 'other' | 'total' | 'status' | 'grn_no'> & { note?: string }): Promise<number> {
    try {
      const db = await database;
      
      const grnNo = await this.getNextGRNNo();
      
      const result = await db.execute(`
        INSERT INTO grn (supplier_id, grn_no, received_by, note, status, subtotal, tax, other, total)
        VALUES (?, ?, ?, ?, 'OPEN', 0, 0, 0, 0)
      `, [
        header.supplier_id,
        grnNo,
        header.received_by || null,
        header.note || null
      ]);
      
      const insertedId = (result as any).lastInsertRowid || (result as any).lastID;
      return Number(insertedId);
    } catch (error) {
      console.error('Error creating GRN:', error);
      throw new Error('Failed to create GRN');
    }
  }

  /**
   * Upsert GRN line (insert or update)
   */
  async upsertGRNLine(line: Omit<GRNLine, 'id' | 'line_total'>): Promise<{ lineId: number }> {
    try {
      const db = await database;
      
      const lineTotal = (line.qty_received || line.qty || 0) * line.unit_cost;
      
      if ((line as any).id) {
        // Update existing line
        await db.execute(`
          UPDATE grn_lines 
          SET product_id = ?, qty_ordered = ?, qty_received = ?, unit_cost = ?, mrp = ?, batch_no = ?, expiry_date = ?, line_total = ?
          WHERE id = ?
        `, [
          line.product_id,
          line.qty_ordered,
          line.qty_received,
          line.unit_cost,
          line.mrp || null,
          line.batch_no || null,
          line.expiry_date || null,
          lineTotal,
          (line as any).id
        ]);
        
        return { lineId: (line as any).id };
      } else {
        // Insert new line
        const result = await db.execute(`
          INSERT INTO grn_lines (grn_id, product_id, qty_ordered, qty_received, unit_cost, mrp, batch_no, expiry_date, line_total)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          line.grn_id,
          line.product_id,
          line.qty_ordered,
          line.qty_received,
          line.unit_cost,
          line.mrp || null,
          line.batch_no || null,
          line.expiry_date || null,
          lineTotal
        ]);
        
        return { lineId: result.lastID };
      }
    } catch (error) {
      console.error('Error upserting GRN line:', error);
      throw new Error('Failed to save GRN line');
    }
  }

  /**
   * Get GRN with details
   */
  async getGRN(id: number): Promise<{ header: GRN; lines: (GRNLine & { product: Product })[]; supplier: Supplier }> {
    try {
      const db = await database;
      
      // Get GRN header
      const header = await db.query(`
        SELECT * FROM grn WHERE id = ?
      `, [id]);
      
      if (!header || header.length === 0) {
        throw new Error('GRN not found');
      }
      
      const grnHeader = header[0];
      
      // Get supplier details
      const supplierId = (grnHeader as any).supplier_id ?? (grnHeader as any).supplierId;
      const supplier = await db.query(`
        SELECT * FROM suppliers WHERE id = ?
      `, [supplierId]);
      
      // If missing supplier, return a minimal placeholder to keep flow
      const supplierRow = (supplier && supplier.length > 0) ? supplier[0] : { id: supplierId, supplier_name: 'Unknown Supplier', active: 1, created_at: new Date().toISOString() };
      
      // Get GRN lines with product details
      const lines = await db.query(`
        SELECT 
          gl.*,
          p.sku, p.name_en, p.name_si, p.name_ta, p.barcode, p.unit, p.cost,
          p.price_retail, p.price_wholesale, p.price_credit, p.price_other
        FROM grn_lines gl
        JOIN products p ON gl.product_id = p.id
        WHERE gl.grn_id = ?
        ORDER BY gl.id
      `, [id]);
      
      return {
        header: grnHeader,
        lines: lines.map((line: any) => ({
          ...line,
          product: {
            id: line.product_id.toString(),
            sku: line.sku,
            name: line.name_en,
            nameSinhala: line.name_si,
            nameTamil: line.name_ta,
            barcode: line.barcode,
            category: '', // Not needed for GRN
            price: line.price_retail,
            cost: line.cost,
            stock: 0, // Not needed for GRN
            minStock: 0,
            maxStock: 0,
            unit: line.unit,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })),
        supplier: {
          id: supplierRow.id?.toString(),
          supplier_name: supplierRow.supplier_name,
          contact_phone: supplierRow.contact_phone || undefined,
          contact_email: supplierRow.contact_email || undefined,
          address: supplierRow.address || undefined,
          tax_id: supplierRow.tax_id || undefined,
          active: supplierRow.active || true,
          created_at: new Date(supplierRow.created_at || new Date()).toISOString(),
          // Legacy fields for compatibility
          is_active: supplierRow.active || true,
          updated_at: new Date(supplierRow.updated_at || supplierRow.created_at || new Date()).toISOString()
        }
      };
    } catch (error) {
      console.error('Error getting GRN:', error);
      throw new Error('Failed to get GRN details');
    }
  }

  /**
   * List GRNs with filters
   */
  async listGRN(params: {
    q?: string;
    supplier_id?: number;
    status?: GRNStatus;
    date_from?: string;
    date_to?: string;
    limit?: number;
  }): Promise<GRN[]> {
    try {
      const db = await database;
      
      let whereClause = 'WHERE 1=1';
      const queryParams: any[] = [];
      
      if (params.q) {
        whereClause += ' AND (grn_no LIKE ? OR s.supplier_name LIKE ?)';
        const searchTerm = `%${params.q}%`;
        queryParams.push(searchTerm, searchTerm);
      }
      
      if (params.supplier_id) {
        whereClause += ' AND g.supplier_id = ?';
        queryParams.push(params.supplier_id);
      }
      
      if (params.status) {
        whereClause += ' AND g.status = ?';
        queryParams.push(params.status);
      }
      
      if (params.date_from) {
        whereClause += ' AND DATE(g.datetime) >= ?';
        queryParams.push(params.date_from);
      }
      
      if (params.date_to) {
        whereClause += ' AND DATE(g.datetime) <= ?';
        queryParams.push(params.date_to);
      }
      
      const limitClause = params.limit ? `LIMIT ${params.limit}` : '';
      
      const query = `
        SELECT 
          g.*,
          s.supplier_name,
          COUNT(gl.id) as line_count
        FROM grn g
        LEFT JOIN suppliers s ON g.supplier_id = s.id
        LEFT JOIN grn_lines gl ON g.id = gl.grn_id
        ${whereClause}
        GROUP BY g.id
        ORDER BY g.datetime DESC
        ${limitClause}
      `;
      
      return await db.query(query, queryParams);
        } catch (error) {
      console.error('Error listing GRNs:', error);
      throw new Error('Failed to list GRNs');
    }
  }

  /**
   * Delete GRN line
   */
  async deleteGRNLine(lineId: number): Promise<void> {
    try {
      const db = await database;
      
      await db.execute('DELETE FROM grn_lines WHERE id = ?', [lineId]);
    } catch (error) {
      console.error('Error deleting GRN line:', error);
      throw new Error('Failed to delete GRN line');
    }
  }

  /**
   * Update GRN header
   */
  async updateGRNHeader(partial: Partial<GRN> & { id: number }): Promise<void> {
    try {
      const db = await database;
      
      const updates: string[] = [];
      const values: any[] = [];
      
      if (partial.supplier_id !== undefined) {
        updates.push('supplier_id = ?');
        values.push(partial.supplier_id);
      }
      
      if (partial.note !== undefined) {
        updates.push('note = ?');
        values.push(partial.note);
      }
      
      if (partial.received_by !== undefined) {
        updates.push('received_by = ?');
        values.push(partial.received_by);
      }
      
      if (partial.subtotal !== undefined) {
        updates.push('subtotal = ?');
        values.push(partial.subtotal);
      }
      
      if (partial.tax !== undefined) {
        updates.push('tax = ?');
        values.push(partial.tax);
      }
      
      if (partial.other !== undefined) {
        updates.push('other = ?');
        values.push(partial.other);
      }
      
      if (partial.total !== undefined) {
        updates.push('total = ?');
        values.push(partial.total);
      }
      
      if (updates.length === 0) {
        return; // No updates to perform
      }
      
      values.push(partial.id);
      
      await db.execute(`
        UPDATE grn 
        SET ${updates.join(', ')}
        WHERE id = ?
      `, values);
    } catch (error) {
      console.error('Error updating GRN header:', error);
      throw new Error('Failed to update GRN header');
    }
  }

  /**
   * Post GRN (finalize and update inventory)
   */
  async postGRN(id: number, opts?: { updateCostPolicy?: 'none' | 'average' | 'latest' }): Promise<void> {
    const db = await database;
    
    try {
      await db.execute('BEGIN TRANSACTION');
      
      // Get GRN details
      const grnData = await this.getGRN(id);
      
      if (grnData.header.status !== 'OPEN' as any) {
        throw new Error('Only OPEN GRNs can be posted');
      }
      
      // Calculate totals
      const subtotal = grnData.lines.reduce((sum, line) => sum + line.line_total, 0);
      const tax = this.calculateTax(subtotal);
      const other = this.calculateOtherCharges(subtotal, grnData as any);
      const total = subtotal + tax + other;
      
      // Update GRN header with totals
      await this.updateGRNHeader({
        id,
        subtotal,
        tax,
        other,
        total,
        status: 'POSTED' as any
      });
      
      // Process each line
      for (const line of grnData.lines) {
        // Insert inventory movement
        await db.execute(`
          INSERT INTO inventory_movements (product_id, qty, type, reason, note)
          VALUES (?, ?, 'RECEIVE', 'GRN', ?)
        `, [line.product_id, line.qty, grnData.header.grn_no]);
        
        // Update product stock
        await db.execute(`
          UPDATE products 
          SET stock = stock + ?
          WHERE id = ?
        `, [line.qty, line.product_id]);
        
        // Update product cost based on policy
        const updateCostPolicy = opts?.updateCostPolicy || 'latest';
        if (updateCostPolicy === 'latest') {
          await db.execute(`
            UPDATE products 
            SET cost = ?
            WHERE id = ?
          `, [line.unit_cost, line.product_id]);
        } else if (updateCostPolicy === 'average') {
          // Simple average: (current_cost + new_cost) / 2
          await db.execute(`
            UPDATE products 
            SET cost = (cost + ?) / 2
            WHERE id = ?
          `, [line.unit_cost, line.product_id]);
        }
        // 'none' policy: do nothing
      }
      
      await db.execute('COMMIT');
    } catch (error) {
      await db.execute('ROLLBACK');
      console.error('Error posting GRN:', error);
      throw new Error('Failed to post GRN');
    }
  }

  /**
   * Void GRN (only if OPEN)
   */
  async voidGRN(id: number, reason?: string): Promise<void> {
    try {
      const db = await database;
      
      // Check if GRN is OPEN
      const grn = await db.query('SELECT status FROM grn WHERE id = ?', [id]);
      if (!grn || grn.length === 0) {
        throw new Error('GRN not found');
      }
      
      if (grn[0].status !== 'OPEN') {
        throw new Error('Only OPEN GRNs can be voided');
      }
      
      // Update status to VOID
      await db.execute(`
        UPDATE grn 
        SET status = 'VOID', note = COALESCE(note || ' | ', '') || ?
        WHERE id = ?
      `, [`VOIDED: ${reason || 'No reason provided'}`, id]);
    } catch (error) {
      console.error('Error voiding GRN:', error);
      throw new Error('Failed to void GRN');
    }
  }

  /**
   * Get GRN statistics
   */
  async getGrnStats(): Promise<any> {
    try {
      const db = await database;
      
      const stats = await db.query(`
        SELECT 
          COUNT(*) as total_grns,
          SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) as open_grns,
          SUM(CASE WHEN status = 'POSTED' THEN 1 ELSE 0 END) as posted_grns,
          SUM(CASE WHEN status = 'VOID' THEN 1 ELSE 0 END) as void_grns,
          SUM(total) as total_value
        FROM grn
      `);
      
      return stats[0] || { total_grns: 0, open_grns: 0, posted_grns: 0, void_grns: 0, total_value: 0 };
    } catch (error) {
      console.error('Error getting GRN stats:', error);
      return { total_grns: 0, open_grns: 0, posted_grns: 0, void_grns: 0, total_value: 0 };
    }
  }

  /**
   * Build label items from GRN for printing
   */
  async buildLabelItemsFromGRN(id: number, lang: 'EN' | 'SI' | 'TA'): Promise<GRNLabelItem[]> {
    try {
      const grnData = await this.getGRN(id);
      
      const labelItems: GRNLabelItem[] = [];
      
      for (const line of grnData.lines) {
        const product = line.product;
        const name = this.getLocalizedProductName(product, lang);
        
        // Create one label item per quantity unit
        for (let i = 0; i < (line.qty || 0); i++) {
          labelItems.push({
            product_id: product.id,
            product_name: name,
            unit_cost: line.unit_cost,
            qty: 1
          });
        }
      }
      
      return labelItems;
    } catch (error) {
      console.error('Error building label items from GRN:', error);
      throw new Error('Failed to build label items');
    }
  }

  /**
   * Helper to get localized product name
   */
  private getLocalizedProductName(product: Product, language: 'EN' | 'SI' | 'TA'): string {
    switch (language) {
      case 'SI':
        return product.name_si || product.name_en || product.name || '';
      case 'TA':
        return product.name_ta || product.name_en || product.name || '';
      default:
        return product.name_en || product.name || '';
    }
  }
}

// Export singleton instance
export const grnService = new GRNService();
