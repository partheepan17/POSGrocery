import { database } from './database';
import { Shift, ShiftMovement, ShiftSummary, ShiftStatus, ShiftMovementType } from '../types';

export class ShiftService {
  private db = database;

  /**
   * Get active shift for a terminal and optionally cashier
   */
  async getCurrentSession(cashierId: number, terminal: string): Promise<Shift | null> {
    return this.getActiveShift(terminal, cashierId);
  }

  async getActiveShift(terminal: string, cashierId?: number): Promise<Shift | null> {
    try {
      let query = `
        SELECT * FROM shifts 
        WHERE terminal_name = ? AND status = 'OPEN'
      `;
      const params: any[] = [terminal];
      
      if (cashierId) {
        query += ' AND cashier_id = ?';
        params.push(cashierId);
      }
      
      query += ' ORDER BY opened_at DESC LIMIT 1';
      
      const result = await this.db.query(query, params);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Error getting active shift:', error);
      throw new Error('Failed to get active shift');
    }
  }

  /**
   * Open a new shift
   */
  async openShift(payload: {
    terminal_name: string;
    cashier_id: number;
    opening_cash: number;
    note?: string;
  }): Promise<number> {
    try {
      // Check if there's already an open shift for this terminal
      const existingShift = await this.getActiveShift(payload.terminal_name);
      if (existingShift) {
        throw new Error('There is already an open shift for this terminal');
      }

      const query = `
        INSERT INTO shifts (terminal_name, cashier_id, opening_cash, note, status)
        VALUES (?, ?, ?, ?, 'OPEN')
      `;
      
      const result = await this.db.execute(query, [
        payload.terminal_name,
        payload.cashier_id,
        payload.opening_cash,
        payload.note || null
      ]);
      
      return result.lastID;
    } catch (error) {
      console.error('Error opening shift:', error);
      throw new Error('Failed to open shift');
    }
  }

  /**
   * Add a movement to a shift
   */
  async addMovement(movement: Omit<ShiftMovement, 'id' | 'datetime'>): Promise<number> {
    try {
      const query = `
        INSERT INTO shift_movements (shift_id, type, amount, reason)
        VALUES (?, ?, ?, ?)
      `;
      
      const result = await this.db.execute(query, [
        movement.shift_id,
        movement.type,
        movement.amount,
        movement.reason || null
      ]);
      
      return result.lastID;
    } catch (error) {
      console.error('Error adding movement:', error);
      throw new Error('Failed to add movement');
    }
  }

  /**
   * Close a shift
   */
  async closeShift(id: number, declaredCash: number, note?: string): Promise<void> {
    try {
      // Get the shift first
      const shift = await this.getShift(id);
      if (!shift) {
        throw new Error('Shift not found');
      }
      
      if (shift.header.status !== 'OPEN') {
        throw new Error('Shift is not open');
      }

      // Calculate expected cash
      const expectedCash = await this.expectedCashForShift(id);
      const variance = declaredCash - expectedCash;

      const query = `
        UPDATE shifts 
        SET status = 'CLOSED', 
            closed_at = CURRENT_TIMESTAMP,
            declared_cash = ?,
            variance_cash = ?,
            note = COALESCE(?, note)
        WHERE id = ?
      `;
      
      await this.db.execute(query, [declaredCash, variance, note, id]);
    } catch (error) {
      console.error('Error closing shift:', error);
      throw new Error('Failed to close shift');
    }
  }

  /**
   * Void a shift (only if OPEN)
   */
  async voidShift(id: number, reason?: string): Promise<void> {
    try {
      const shift = await this.getShift(id);
      if (!shift) {
        throw new Error('Shift not found');
      }
      
      if (shift.header.status !== 'OPEN') {
        throw new Error('Only open shifts can be voided');
      }

      const query = `
        UPDATE shifts 
        SET status = 'VOID', 
            closed_at = CURRENT_TIMESTAMP,
            note = COALESCE(?, note)
        WHERE id = ?
      `;
      
      await this.db.execute(query, [reason, id]);
    } catch (error) {
      console.error('Error voiding shift:', error);
      throw new Error('Failed to void shift');
    }
  }

  /**
   * Get shift with movements
   */
  async getShift(id: number): Promise<{ header: Shift; movements: ShiftMovement[] }> {
    try {
      const shiftQuery = 'SELECT * FROM shifts WHERE id = ?';
      const shiftResult = await this.db.query(shiftQuery, [id]);
      
      if (shiftResult.length === 0) {
        throw new Error('Shift not found');
      }

      const movementsQuery = `
        SELECT * FROM shift_movements 
        WHERE shift_id = ? 
        ORDER BY datetime ASC
      `;
      const movementsResult = await this.db.query(movementsQuery, [id]);

      return {
        header: shiftResult[0],
        movements: movementsResult
      };
    } catch (error) {
      console.error('Error getting shift:', error);
      throw new Error('Failed to get shift');
    }
  }

  /**
   * List shifts with filters
   */
  async listShifts(params: {
    q?: string;
    status?: ShiftStatus;
    from?: string;
    to?: string;
    cashier_id?: number;
    terminal?: string;
    limit?: number;
  }): Promise<Shift[]> {
    try {
      let query = 'SELECT * FROM shifts WHERE 1=1';
      const queryParams: any[] = [];

      if (params.q) {
        query += ' AND (terminal_name LIKE ? OR note LIKE ?)';
        queryParams.push(`%${params.q}%`, `%${params.q}%`);
      }

      if (params.status) {
        query += ' AND status = ?';
        queryParams.push(params.status);
      }

      if (params.from) {
        query += ' AND opened_at >= ?';
        queryParams.push(params.from);
      }

      if (params.to) {
        query += ' AND opened_at <= ?';
        queryParams.push(params.to);
      }

      if (params.cashier_id) {
        query += ' AND cashier_id = ?';
        queryParams.push(params.cashier_id);
      }

      if (params.terminal) {
        query += ' AND terminal_name = ?';
        queryParams.push(params.terminal);
      }

      query += ' ORDER BY opened_at DESC';

      if (params.limit) {
        query += ' LIMIT ?';
        queryParams.push(params.limit);
      }

      return await this.db.query(query, queryParams);
    } catch (error) {
      console.error('Error listing shifts:', error);
      throw new Error('Failed to list shifts');
    }
  }

  /**
   * Get shift summary with sales and cash drawer calculations
   */
  async getShiftSummary(id: number): Promise<ShiftSummary> {
    try {
      const shiftData = await this.getShift(id);
      const shift = shiftData.header;

      // Get sales data for this shift
      const salesQuery = `
        SELECT 
          COUNT(*) as invoices,
          COALESCE(SUM(subtotal), 0) as gross,
          COALESCE(SUM(discount), 0) as discount,
          COALESCE(SUM(tax), 0) as tax,
          COALESCE(SUM(total), 0) as net
        FROM sales 
        WHERE shift_id = ?
      `;
      const salesResult = await this.db.query(salesQuery, [id]);
      const sales = salesResult[0] || { invoices: 0, gross: 0, discount: 0, tax: 0, net: 0 };

      // Get payment breakdown
      const paymentsQuery = `
        SELECT 
          COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0) as cash,
          COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total ELSE 0 END), 0) as card,
          COALESCE(SUM(CASE WHEN payment_method = 'wallet' THEN total ELSE 0 END), 0) as wallet,
          COALESCE(SUM(CASE WHEN payment_method NOT IN ('cash', 'card', 'wallet') THEN total ELSE 0 END), 0) as other
        FROM sales 
        WHERE shift_id = ?
      `;
      const paymentsResult = await this.db.query(paymentsQuery, [id]);
      const payments = paymentsResult[0] || { cash: 0, card: 0, wallet: 0, other: 0 };

      // Calculate cash drawer movements
      const movements = shiftData.movements;
      const cashDrawer = {
        opening: shift.opening_cash,
        cashIn: movements.filter(m => m.type === 'CASH_IN').reduce((sum, m) => sum + m.amount, 0),
        cashOut: movements.filter(m => m.type === 'CASH_OUT').reduce((sum, m) => sum + m.amount, 0),
        drops: movements.filter(m => m.type === 'DROP').reduce((sum, m) => sum + m.amount, 0),
        pickups: movements.filter(m => m.type === 'PICKUP').reduce((sum, m) => sum + m.amount, 0),
        petty: movements.filter(m => m.type === 'PETTY').reduce((sum, m) => sum + m.amount, 0),
        expectedCash: 0, // Will be calculated below
        declaredCash: shift.declared_cash,
        variance: shift.variance_cash
      };

      // Calculate expected cash
      cashDrawer.expectedCash = 
        cashDrawer.opening + 
        payments.cash + 
        cashDrawer.cashIn - 
        cashDrawer.cashOut - 
        cashDrawer.drops - 
        cashDrawer.petty;

      return {
        shift,
        sales,
        payments,
        cashDrawer
      };
    } catch (error) {
      console.error('Error getting shift summary:', error);
      throw new Error('Failed to get shift summary');
    }
  }

  /**
   * Bind a sale to the active shift
   */
  async bindSaleToActiveShift(saleId: number, terminal: string, cashierId: number): Promise<void> {
    try {
      const activeShift = await this.getActiveShift(terminal, cashierId);
      if (!activeShift) {
        return; // No active shift, no-op
      }

      const query = 'UPDATE sales SET shift_id = ? WHERE id = ?';
      await this.db.execute(query, [activeShift.id, saleId]);
    } catch (error) {
      console.error('Error binding sale to shift:', error);
      // Don't throw error as this is not critical
    }
  }

  /**
   * Calculate expected cash for a shift
   */
  async expectedCashForShift(id: number): Promise<number> {
    try {
      const summary = await this.getShiftSummary(id);
      return summary.cashDrawer.expectedCash;
    } catch (error) {
      console.error('Error calculating expected cash:', error);
      throw new Error('Failed to calculate expected cash');
    }
  }

  /**
   * Get X Report data (same as shift summary)
   */
  async xReportData(id: number): Promise<ShiftSummary> {
    return this.getShiftSummary(id);
  }

  /**
   * Get Z Report data (same as shift summary)
   */
  async zReportData(id: number): Promise<ShiftSummary> {
    return this.getShiftSummary(id);
  }
}

export const shiftService = new ShiftService();
