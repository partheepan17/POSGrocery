/**
 * Refund Service
 * Handles returns, refunds, and void operations
 */

import { dataService } from './dataService';
import { authService } from './authService';

export interface RefundableSale {
  id: number;
  invoice_number: string;
  datetime: string;
  cashier_id: number;
  cashier_name?: string;
  customer_id?: number;
  customer_name?: string;
  price_tier: 'Retail' | 'Wholesale' | 'Credit' | 'Other';
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  payment_method: 'CASH' | 'CARD' | 'WALLET';
  terminal_name?: string;
  type: 'SALE' | 'REFUND';
}

export interface RefundableLine {
  id: number;
  product_id: number;
  product_sku: string;
  product_name: string;
  quantity_sold: number;
  quantity_refunded: number;
  quantity_returnable: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  line_total: number;
}

export interface RefundLineInput {
  original_line_id: number;
  product_id: number;
  quantity: number;
  restock: boolean;
  reason?: string;
}

export interface RefundInput {
  original_sale_id: number;
  cashier_id: number;
  refund_method: 'CASH' | 'CARD' | 'WALLET';
  lines: RefundLineInput[];
  manager_pin?: string;
  notes?: string;
}

export interface RefundResult {
  refund_id: number;
  refund_amount: number;
  lines_processed: number;
  inventory_updated: number;
}

export interface RefundSummary {
  id: number;
  refund_datetime: string;
  original_invoice: string;
  customer_name?: string;
  cashier_name?: string;
  terminal: string;
  method: string;
  restock_count: number;
  refund_net: number;
  reason?: string;
}

export interface RefundFilters {
  dateFrom?: string;
  dateTo?: string;
  cashierId?: number;
  method?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface ReturnSettings {
  enableReturns: boolean;
  managerPinRequiredAbove: number;
  defaultRestock: boolean;
  returnWindowDays: number;
  allowVoidWithinHours: number;
}

class RefundService {
  private defaultSettings: ReturnSettings = {
    enableReturns: true,
    managerPinRequiredAbove: 1000,
    defaultRestock: true,
    returnWindowDays: 30,
    allowVoidWithinHours: 2
  };

  /**
   * Find sale by invoice number or receipt barcode
   */
  async findSaleByNumberOrBarcode(reference: string): Promise<RefundableSale | null> {
    try {
      // Try to find by invoice number first
      let sales = await dataService.query<RefundableSale>(
        `SELECT s.*, u.name as cashier_name, c.customer_name 
         FROM sales s 
         LEFT JOIN users u ON s.cashier_id = u.id 
         LEFT JOIN customers c ON s.customer_id = c.id 
         WHERE s.invoice_number = ? AND s.type = 'SALE' AND s.voided_at IS NULL`,
        [reference]
      );

      // If not found, try by ID (assuming barcode contains sale ID)
      if (sales.length === 0) {
        const saleId = parseInt(reference.replace(/\D/g, ''), 10);
        if (!isNaN(saleId)) {
          sales = await dataService.query<RefundableSale>(
            `SELECT s.*, u.name as cashier_name, c.customer_name 
             FROM sales s 
             LEFT JOIN users u ON s.cashier_id = u.id 
             LEFT JOIN customers c ON s.customer_id = c.id 
             WHERE s.id = ? AND s.type = 'SALE' AND s.voided_at IS NULL`,
            [saleId]
          );
        }
      }

      return sales[0] || null;
    } catch (error) {
      console.error('Failed to find sale:', error);
      throw error;
    }
  }

  /**
   * Get returnable lines for a sale
   */
  async getReturnableLines(saleId: number): Promise<RefundableLine[]> {
    try {
      const lines = await dataService.query<any>(
        `SELECT 
           si.id,
           si.product_id,
           p.sku as product_sku,
           p.name_en as product_name,
           si.quantity as quantity_sold,
           COALESCE(refunded.quantity_refunded, 0) as quantity_refunded,
           (si.quantity - COALESCE(refunded.quantity_refunded, 0)) as quantity_returnable,
           si.unit_price,
           si.discount_amount,
           si.tax_amount,
           si.total_amount as line_total
         FROM sale_items si
         JOIN products p ON si.product_id = p.id
         LEFT JOIN (
           SELECT 
             rsi.original_line_id,
             SUM(rsi.quantity) as quantity_refunded
           FROM sale_items rsi
           JOIN sales rs ON rsi.sale_id = rs.id
           WHERE rs.type = 'REFUND' AND rs.voided_at IS NULL
           GROUP BY rsi.original_line_id
         ) refunded ON si.id = refunded.original_line_id
         WHERE si.sale_id = ?
         ORDER BY si.id`,
        [saleId]
      );

      return lines.map(line => ({
        id: line.id,
        product_id: line.product_id,
        product_sku: line.product_sku,
        product_name: line.product_name,
        quantity_sold: line.quantity_sold,
        quantity_refunded: line.quantity_refunded,
        quantity_returnable: Math.max(0, line.quantity_returnable),
        unit_price: line.unit_price,
        discount_amount: line.discount_amount || 0,
        tax_amount: line.tax_amount || 0,
        line_total: line.line_total
      }));
    } catch (error) {
      console.error('Failed to get returnable lines:', error);
      throw error;
    }
  }

  /**
   * Create a refund
   */
  async createRefund(refundInput: RefundInput): Promise<RefundResult> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get original sale
      const originalSale = await dataService.query<RefundableSale>(
        'SELECT * FROM sales WHERE id = ? AND type = "SALE" AND voided_at IS NULL',
        [refundInput.original_sale_id]
      );

      if (originalSale.length === 0) {
        throw new Error('Original sale not found or already voided');
      }

      // Get returnable lines to validate quantities
      const returnableLines = await this.getReturnableLines(refundInput.original_sale_id);
      
      // Validate refund quantities
      for (const refundLine of refundInput.lines) {
        const returnableLine = returnableLines.find(rl => rl.id === refundLine.original_line_id);
        if (!returnableLine) {
          throw new Error(`Original line ${refundLine.original_line_id} not found`);
        }
        
        if (refundLine.quantity > returnableLine.quantity_returnable) {
          throw new Error(`Cannot refund ${refundLine.quantity} of ${returnableLine.product_name}. Only ${returnableLine.quantity_returnable} available for return`);
        }
      }

      // Calculate refund total
      let refundTotal = 0;
      for (const refundLine of refundInput.lines) {
        const returnableLine = returnableLines.find(rl => rl.id === refundLine.original_line_id);
        if (returnableLine) {
          const lineRefund = (returnableLine.unit_price * refundLine.quantity) - 
                           (returnableLine.discount_amount * (refundLine.quantity / returnableLine.quantity_sold));
          refundTotal += lineRefund;
        }
      }

      // Check if manager PIN required for large refunds
      const settings = this.getReturnSettings();
      if (refundTotal > settings.managerPinRequiredAbove && refundInput.manager_pin) {
        const verification = await authService.verifyPin(refundInput.manager_pin, 'MANAGER');
        if (!verification.success) {
          throw new Error('Manager authorization required for large refunds');
        }
      }

      // Create refund sale record
      const refundSaleResult = await dataService.execute(
        `INSERT INTO sales (
          type, original_sale_id, cashier_id, customer_id, price_tier,
          payment_method, total_amount, tax_amount, discount_amount,
          terminal_name, invoice_number, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'REFUND',
          refundInput.original_sale_id,
          refundInput.cashier_id,
          originalSale[0].customer_id,
          originalSale[0].price_tier,
          refundInput.refund_method,
          -refundTotal, // Negative amount for refund
          0, // Tax calculation would be more complex in production
          0, // Discount calculation would be more complex in production
          originalSale[0].terminal_name,
          `REF-${Date.now()}`,
          new Date().toISOString()
        ]
      );

      const refundId = refundSaleResult.lastInsertRowid;

      // Create refund line items
      let inventoryUpdated = 0;
      for (const refundLine of refundInput.lines) {
        const returnableLine = returnableLines.find(rl => rl.id === refundLine.original_line_id);
        if (!returnableLine) continue;

        // Create refund line
        await dataService.execute(
          `INSERT INTO sale_items (
            sale_id, product_id, quantity, unit_price, discount_amount,
            tax_amount, total_amount, original_line_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            refundId,
            refundLine.product_id,
            refundLine.quantity,
            returnableLine.unit_price,
            returnableLine.discount_amount * (refundLine.quantity / returnableLine.quantity_sold),
            returnableLine.tax_amount * (refundLine.quantity / returnableLine.quantity_sold),
            returnableLine.unit_price * refundLine.quantity,
            refundLine.original_line_id
          ]
        );

        // Update inventory if restocking
        if (refundLine.restock) {
          // In production, this would update the inventory table
          console.log(`Restocking ${refundLine.quantity} of product ${refundLine.product_id}`);
          inventoryUpdated++;
        }
      }

      // Log the refund event
      console.log(`Refund created: ID ${refundId}, Amount: -${refundTotal}, Lines: ${refundInput.lines.length}`);

      return {
        refund_id: refundId,
        refund_amount: refundTotal,
        lines_processed: refundInput.lines.length,
        inventory_updated: inventoryUpdated
      };

    } catch (error) {
      console.error('Failed to create refund:', error);
      throw error;
    }
  }

  /**
   * Void a sale (only if within time window and no subsequent activity)
   */
  async voidSale(saleId: number, managerPin: string): Promise<void> {
    try {
      // Verify manager PIN
      const verification = await authService.verifyPin(managerPin, 'MANAGER');
      if (!verification.success) {
        throw new Error('Manager authorization required to void sales');
      }

      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get the sale
      const sales = await dataService.query<any>(
        'SELECT * FROM sales WHERE id = ? AND type = "SALE" AND voided_at IS NULL',
        [saleId]
      );

      if (sales.length === 0) {
        throw new Error('Sale not found or already voided');
      }

      const sale = sales[0];
      const settings = this.getReturnSettings();

      // Check time window
      const saleTime = new Date(sale.created_at);
      const now = new Date();
      const hoursDiff = (now.getTime() - saleTime.getTime()) / (1000 * 60 * 60);

      if (hoursDiff > settings.allowVoidWithinHours) {
        throw new Error(`Cannot void sale after ${settings.allowVoidWithinHours} hours. Use refund instead.`);
      }

      // Check for existing refunds
      const refunds = await dataService.query<any>(
        'SELECT COUNT(*) as count FROM sales WHERE original_sale_id = ? AND type = "REFUND"',
        [saleId]
      );

      if (refunds[0].count > 0) {
        throw new Error('Cannot void sale that has existing refunds');
      }

      // Mark sale as voided
      await dataService.execute(
        'UPDATE sales SET voided_at = ?, voided_by = ? WHERE id = ?',
        [new Date().toISOString(), verification.user?.id, saleId]
      );

      // In production, this would also reverse any inventory movements
      console.log(`Sale ${saleId} voided by manager ${verification.user?.name}`);

    } catch (error) {
      console.error('Failed to void sale:', error);
      throw error;
    }
  }

  /**
   * List refunds with filters
   */
  async listRefunds(filters: RefundFilters = {}): Promise<RefundSummary[]> {
    try {
      let query = `
        SELECT 
          r.id,
          r.created_at as refund_datetime,
          os.invoice_number as original_invoice,
          c.customer_name,
          u.name as cashier_name,
          r.terminal_name as terminal,
          r.payment_method as method,
          COUNT(CASE WHEN ri.id IS NOT NULL THEN 1 END) as restock_count,
          r.total_amount as refund_net,
          r.notes as reason
        FROM sales r
        LEFT JOIN sales os ON r.original_sale_id = os.id
        LEFT JOIN customers c ON r.customer_id = c.id
        LEFT JOIN users u ON r.cashier_id = u.id
        LEFT JOIN sale_items ri ON r.id = ri.sale_id
        WHERE r.type = 'REFUND' AND r.voided_at IS NULL
      `;

      const params: any[] = [];

      if (filters.dateFrom) {
        query += ' AND r.created_at >= ?';
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        query += ' AND r.created_at <= ?';
        params.push(filters.dateTo + ' 23:59:59');
      }

      if (filters.cashierId) {
        query += ' AND r.cashier_id = ?';
        params.push(filters.cashierId);
      }

      if (filters.method) {
        query += ' AND r.payment_method = ?';
        params.push(filters.method);
      }

      if (filters.minAmount) {
        query += ' AND ABS(r.total_amount) >= ?';
        params.push(filters.minAmount);
      }

      if (filters.maxAmount) {
        query += ' AND ABS(r.total_amount) <= ?';
        params.push(filters.maxAmount);
      }

      query += ' GROUP BY r.id ORDER BY r.created_at DESC';

      return await dataService.query<RefundSummary>(query, params);
    } catch (error) {
      console.error('Failed to list refunds:', error);
      throw error;
    }
  }

  /**
   * Get refund details by ID
   */
  async getRefundById(refundId: number): Promise<any> {
    try {
      const refunds = await dataService.query<any>(
        `SELECT r.*, os.invoice_number as original_invoice, u.name as cashier_name
         FROM sales r 
         LEFT JOIN sales os ON r.original_sale_id = os.id
         LEFT JOIN users u ON r.cashier_id = u.id
         WHERE r.id = ? AND r.type = 'REFUND'`,
        [refundId]
      );

      if (refunds.length === 0) {
        return null;
      }

      const refund = refunds[0];

      // Get refund lines
      const lines = await dataService.query<any>(
        `SELECT ri.*, p.sku, p.name_en as product_name
         FROM sale_items ri
         JOIN products p ON ri.product_id = p.id
         WHERE ri.sale_id = ?`,
        [refundId]
      );

      return {
        ...refund,
        lines
      };
    } catch (error) {
      console.error('Failed to get refund details:', error);
      throw error;
    }
  }

  /**
   * Get return settings
   */
  getReturnSettings(): ReturnSettings {
    // In production, this would load from app settings
    return this.defaultSettings;
  }

  /**
   * Update return settings
   */
  updateReturnSettings(settings: Partial<ReturnSettings>): void {
    // In production, this would save to app settings
    Object.assign(this.defaultSettings, settings);
  }

  /**
   * Check if refund is allowed for a sale
   */
  async canRefundSale(saleId: number): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const sales = await dataService.query<any>(
        'SELECT * FROM sales WHERE id = ? AND type = "SALE"',
        [saleId]
      );

      if (sales.length === 0) {
        return { allowed: false, reason: 'Sale not found' };
      }

      const sale = sales[0];

      if (sale.voided_at) {
        return { allowed: false, reason: 'Sale has been voided' };
      }

      const settings = this.getReturnSettings();
      if (!settings.enableReturns) {
        return { allowed: false, reason: 'Returns are disabled' };
      }

      // Check return window
      const saleDate = new Date(sale.created_at);
      const now = new Date();
      const daysDiff = (now.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff > settings.returnWindowDays) {
        return { 
          allowed: false, 
          reason: `Return window of ${settings.returnWindowDays} days has expired` 
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Failed to check refund eligibility:', error);
      return { allowed: false, reason: 'Error checking eligibility' };
    }
  }

  /**
   * Format currency amount
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR'
    }).format(Math.abs(amount));
  }
}

// Export singleton instance
export const refundService = new RefundService();


