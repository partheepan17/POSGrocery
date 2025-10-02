/**
 * Shift Service
 * Handles session management, cash events, and shift reporting
 */

import { dataService } from './dataService';
import { authService, User } from './authService';

export interface Session {
  id: number;
  cashier_id: number;
  cashier_name?: string;
  terminal: string;
  started_at: string;
  ended_at: string | null;
  opening_float: number;
  closing_cash: number | null;
  notes: string | null;
  status: 'OPEN' | 'CLOSED';
  created_at: string;
  updated_at: string;
}

export interface CashEvent {
  id: number;
  session_id: number;
  type: 'IN' | 'OUT';
  amount: number;
  reason: string;
  created_at: string;
  created_by: number | null;
  created_by_name?: string;
}

export interface SessionSummary {
  session: Session;
  totals: {
    invoices: number;
    gross: number;
    discount: number;
    tax: number;
    net: number;
    cash: number;
    card: number;
    wallet: number;
    cash_in: number;
    cash_out: number;
    expected_cash: number;
    counted_cash?: number;
    variance?: number;
  };
  cashEvents: CashEvent[];
  salesData: any[];
}

export interface XReport extends SessionSummary {
  generated_at: string;
}

export interface ZReport extends SessionSummary {
  ended_at: string;
  counted_cash: number;
  variance: number;
  closed_by: number;
  closed_by_name?: string;
}

export interface SessionFilters {
  dateFrom?: string;
  dateTo?: string;
  cashierId?: number;
  terminal?: string;
  status?: 'OPEN' | 'CLOSED';
}

class ShiftService {
  /**
   * Start a new session for cashier and terminal
   */
  async startSession(cashierId: number, terminal: string, openingFloat: number = 0): Promise<Session> {
    try {
      // Check if there's already an open session for this cashier+terminal
      const existingSessions = await dataService.query<Session>(
        'SELECT * FROM sessions WHERE cashier_id = ? AND terminal = ? AND status = "OPEN"',
        [cashierId, terminal]
      );

      if (existingSessions.length > 0) {
        throw new Error('An open session already exists for this cashier and terminal');
      }

      // Create new session
      const result = await dataService.execute(
        'INSERT INTO sessions (cashier_id, terminal, opening_float, status) VALUES (?, ?, ?, "OPEN")',
        [cashierId, terminal, openingFloat]
      );

      const sessions = await dataService.query<Session>(
        `SELECT s.*, u.name as cashier_name 
         FROM sessions s 
         JOIN users u ON s.cashier_id = u.id 
         WHERE s.id = ?`,
        [result.lastInsertRowid]
      );

      const session = sessions[0];

      // Dispatch session started event
      window.dispatchEvent(new CustomEvent('session-started', { 
        detail: { session } 
      }));

      return session;
    } catch (error) {
      console.error('Failed to start session:', error);
      throw error;
    }
  }

  /**
   * End a session
   */
  async endSession(
    sessionId: number, 
    countedCash: number, 
    notes?: string, 
    closedBy?: number
  ): Promise<ZReport> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      if (session.status === 'CLOSED') {
        throw new Error('Session is already closed');
      }

      const currentUser = authService.getCurrentUser();
      const closingUserId = closedBy || currentUser?.id;

      if (!closingUserId) {
        throw new Error('User not authenticated');
      }

      // Update session
      await dataService.execute(
        `UPDATE sessions 
         SET status = "CLOSED", ended_at = ?, closing_cash = ?, notes = ?, updated_at = ?
         WHERE id = ?`,
        [new Date().toISOString(), countedCash, notes, new Date().toISOString(), sessionId]
      );

      // Generate Z report
      const zReport = await this.getZReport(sessionId, closingUserId);

      // Dispatch session ended event
      window.dispatchEvent(new CustomEvent('session-ended', { 
        detail: { session, zReport } 
      }));

      return zReport;
    } catch (error) {
      console.error('Failed to end session:', error);
      throw error;
    }
  }

  /**
   * Record a cash in/out event
   */
  async recordCashEvent(
    sessionId: number,
    type: 'IN' | 'OUT',
    amount: number,
    reason: string
  ): Promise<CashEvent> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Verify session exists and is open
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      if (session.status === 'CLOSED') {
        throw new Error('Cannot add cash events to closed session');
      }

      // Create cash event
      const result = await dataService.execute(
        'INSERT INTO cash_events (session_id, type, amount, reason, created_by) VALUES (?, ?, ?, ?, ?)',
        [sessionId, type, amount, reason, currentUser.id]
      );

      const cashEvents = await dataService.query<CashEvent>(
        `SELECT ce.*, u.name as created_by_name 
         FROM cash_events ce 
         LEFT JOIN users u ON ce.created_by = u.id 
         WHERE ce.id = ?`,
        [result.lastInsertRowid]
      );

      const cashEvent = cashEvents[0];

      // Dispatch cash event created
      window.dispatchEvent(new CustomEvent('cash-event-created', { 
        detail: { cashEvent, sessionId } 
      }));

      return cashEvent;
    } catch (error) {
      console.error('Failed to record cash event:', error);
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: number): Promise<Session | null> {
    try {
      const sessions = await dataService.query<Session>(
        `SELECT s.*, u.name as cashier_name 
         FROM sessions s 
         JOIN users u ON s.cashier_id = u.id 
         WHERE s.id = ?`,
        [sessionId]
      );

      return sessions[0] || null;
    } catch (error) {
      console.error('Failed to get session:', error);
      throw error;
    }
  }

  /**
   * Get current open session for cashier and terminal
   */
  async getCurrentSession(cashierId: number, terminal: string): Promise<Session | null> {
    try {
      const sessions = await dataService.query<Session>(
        `SELECT s.*, u.name as cashier_name 
         FROM sessions s 
         JOIN users u ON s.cashier_id = u.id 
         WHERE s.cashier_id = ? AND s.terminal = ? AND s.status = "OPEN"
         ORDER BY s.started_at DESC 
         LIMIT 1`,
        [cashierId, terminal]
      );

      return sessions[0] || null;
    } catch (error) {
      console.error('Failed to get current session:', error);
      throw error;
    }
  }

  /**
   * Get session summary with totals and events
   */
  async getSessionSummary(sessionId: number): Promise<SessionSummary> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Get cash events
      const cashEvents = await dataService.query<CashEvent>(
        `SELECT ce.*, u.name as created_by_name 
         FROM cash_events ce 
         LEFT JOIN users u ON ce.created_by = u.id 
         WHERE ce.session_id = ? 
         ORDER BY ce.created_at`,
        [sessionId]
      );

      // Get sales data for this session
      const salesData = await dataService.query(
        `SELECT s.*, 
                COALESCE(SUM(si.quantity * si.unit_price), 0) as gross_amount,
                COALESCE(SUM(si.quantity * si.unit_price * si.discount_percent / 100), 0) as discount_amount,
                COALESCE(s.tax_amount, 0) as tax_amount,
                s.total_amount as net_amount
         FROM sales s
         LEFT JOIN sale_items si ON s.id = si.sale_id
         WHERE s.session_id = ?
         GROUP BY s.id
         ORDER BY s.created_at`,
        [sessionId]
      );

      // Calculate totals
      const totals = this.calculateSessionTotals(salesData, cashEvents, session.opening_float);

      return {
        session,
        totals,
        cashEvents,
        salesData
      };
    } catch (error) {
      console.error('Failed to get session summary:', error);
      throw error;
    }
  }

  /**
   * Generate X Report (point-in-time snapshot)
   */
  async getXReport(sessionId: number): Promise<XReport> {
    try {
      const summary = await this.getSessionSummary(sessionId);
      
      return {
        ...summary,
        generated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to generate X report:', error);
      throw error;
    }
  }

  /**
   * Generate Z Report (end-of-shift report)
   */
  async getZReport(sessionId: number, closedBy?: number): Promise<ZReport> {
    try {
      const summary = await this.getSessionSummary(sessionId);
      
      if (summary.session.status === 'OPEN') {
        throw new Error('Cannot generate Z report for open session');
      }

      const closedByUser = closedBy ? await dataService.query<User>(
        'SELECT * FROM users WHERE id = ?',
        [closedBy]
      ) : [];

      const countedCash = summary.session.closing_cash || 0;
      const variance = countedCash - summary.totals.expected_cash;

      return {
        ...summary,
        ended_at: summary.session.ended_at!,
        counted_cash: countedCash,
        variance,
        closed_by: closedBy || 0,
        closed_by_name: closedByUser[0]?.name
      };
    } catch (error) {
      console.error('Failed to generate Z report:', error);
      throw error;
    }
  }

  /**
   * List sessions with filters
   */
  async listSessions(filters: SessionFilters = {}): Promise<Session[]> {
    try {
      let query = `
        SELECT s.*, u.name as cashier_name 
        FROM sessions s 
        JOIN users u ON s.cashier_id = u.id 
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filters.dateFrom) {
        query += ' AND s.started_at >= ?';
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        query += ' AND s.started_at <= ?';
        params.push(filters.dateTo + ' 23:59:59');
      }

      if (filters.cashierId) {
        query += ' AND s.cashier_id = ?';
        params.push(filters.cashierId);
      }

      if (filters.terminal) {
        query += ' AND s.terminal = ?';
        params.push(filters.terminal);
      }

      if (filters.status) {
        query += ' AND s.status = ?';
        params.push(filters.status);
      }

      query += ' ORDER BY s.started_at DESC';

      return await dataService.query<Session>(query, params);
    } catch (error) {
      console.error('Failed to list sessions:', error);
      throw error;
    }
  }

  /**
   * Calculate session totals
   */
  private calculateSessionTotals(salesData: any[], cashEvents: CashEvent[], openingFloat: number) {
    const invoices = salesData.length;
    let gross = 0;
    let discount = 0;
    let tax = 0;
    let net = 0;
    let cash = 0;
    let card = 0;
    let wallet = 0;

    // Sum up sales data
    salesData.forEach(sale => {
      gross += parseFloat(sale.gross_amount || 0);
      discount += parseFloat(sale.discount_amount || 0);
      tax += parseFloat(sale.tax_amount || 0);
      net += parseFloat(sale.net_amount || 0);

      // Sum payment methods
      if (sale.payment_method === 'CASH') {
        cash += parseFloat(sale.total_amount || 0);
      } else if (sale.payment_method === 'CARD') {
        card += parseFloat(sale.total_amount || 0);
      } else if (sale.payment_method === 'WALLET') {
        wallet += parseFloat(sale.total_amount || 0);
      }
    });

    // Sum cash events
    const cash_in = cashEvents
      .filter(event => event.type === 'IN')
      .reduce((sum, event) => sum + parseFloat(String(event.amount)), 0);

    const cash_out = cashEvents
      .filter(event => event.type === 'OUT')
      .reduce((sum, event) => sum + parseFloat(String(event.amount)), 0);

    // Calculate expected cash
    const expected_cash = openingFloat + cash + cash_in - cash_out;

    return {
      invoices,
      gross: Math.round(gross * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      net: Math.round(net * 100) / 100,
      cash: Math.round(cash * 100) / 100,
      card: Math.round(card * 100) / 100,
      wallet: Math.round(wallet * 100) / 100,
      cash_in: Math.round(cash_in * 100) / 100,
      cash_out: Math.round(cash_out * 100) / 100,
      expected_cash: Math.round(expected_cash * 100) / 100
    };
  }

  /**
   * Get cash event reasons (common reasons)
   */
  getCashEventReasons(): { in: string[]; out: string[] } {
    return {
      in: [
        'Change Float',
        'Petty Cash',
        'Bank Deposit Return',
        'Cash Found',
        'Other'
      ],
      out: [
        'Bank Deposit',
        'Petty Cash',
        'Change Shortage',
        'Cash Drop',
        'Other'
      ]
    };
  }

  /**
   * Get variance color based on amount
   */
  getVarianceColor(variance: number): 'green' | 'amber' | 'red' {
    const absVariance = Math.abs(variance);
    
    if (absVariance <= 10) {
      return 'green';
    } else if (absVariance <= 100) {
      return 'amber';
    } else {
      return 'red';
    }
  }

  /**
   * Format currency amount
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR'
    }).format(amount);
  }
}

// Export singleton instance
export const shiftService = new ShiftService();


