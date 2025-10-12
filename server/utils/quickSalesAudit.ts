import { getDatabase } from '../db';
import { createRequestLogger } from './logger';
import { RBACContext } from './rbac';

export interface QuickSalesAuditEvent {
  action: string;
  sessionId?: number;
  lineId?: number;
  productId?: number;
  productSku?: string;
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  lineTotal?: number;
  reason?: string;
  totals?: any;
  invoiceId?: number;
  requestId: string;
  userId: number;
  userRole: string;
  timestamp: string;
}

export class QuickSalesAuditLogger {
  private getDb() {
    try {
      return getDatabase();
    } catch (error) {
      // Database not initialized yet, return null
      return null;
    }
  }

  /**
   * Log Quick Sales line addition
   */
  logLineAdd(context: RBACContext, sessionId: number, productId: number, productSku: string, productName: string, quantity: number, unitPrice: number, lineTotal: number): void {
    try {
      const event: QuickSalesAuditEvent = {
        action: 'QUICK_SALE_LINE_ADD',
        sessionId,
        productId,
        productSku,
        productName,
        quantity,
        unitPrice,
        lineTotal,
        requestId: context.requestId,
        userId: context.user.id,
        userRole: context.user.role,
        timestamp: new Date().toISOString()
      };

      this.insertAuditLog(event);
    } catch (error) {
      console.error('Failed to log Quick Sales line add:', error);
    }
  }

  /**
   * Log Quick Sales line deletion
   */
  logLineDelete(context: RBACContext, sessionId: number, lineId: number, productSku: string, productName: string, quantity: number, lineTotal: number, reason: string): void {
    try {
      const event: QuickSalesAuditEvent = {
        action: 'QUICK_SALE_LINE_DELETE',
        sessionId,
        lineId,
        productSku,
        productName,
        quantity,
        lineTotal,
        reason,
        requestId: context.requestId,
        userId: context.user.id,
        userRole: context.user.role,
        timestamp: new Date().toISOString()
      };

      this.insertAuditLog(event);
    } catch (error) {
      console.error('Failed to log Quick Sales line delete:', error);
    }
  }

  /**
   * Log Quick Sales session close
   */
  logSessionClose(context: RBACContext, sessionId: number, totals: any, invoiceId: number): void {
    try {
      const event: QuickSalesAuditEvent = {
        action: 'QUICK_SALE_CLOSE',
        sessionId,
        totals,
        invoiceId,
        requestId: context.requestId,
        userId: context.user.id,
        userRole: context.user.role,
        timestamp: new Date().toISOString()
      };

      this.insertAuditLog(event);
    } catch (error) {
      console.error('Failed to log Quick Sales session close:', error);
    }
  }

  /**
   * Log PIN verification success
   */
  logPinVerifySuccess(context: RBACContext, operation: string): void {
    try {
      const event: QuickSalesAuditEvent = {
        action: 'PIN_VERIFY_SUCCESS',
        reason: operation,
        requestId: context.requestId,
        userId: context.user.id,
        userRole: context.user.role,
        timestamp: new Date().toISOString()
      };

      this.insertAuditLog(event);
    } catch (error) {
      console.error('Failed to log PIN verify success:', error);
    }
  }

  /**
   * Log PIN verification failure
   */
  logPinVerifyFailure(context: RBACContext, operation: string, reason: string): void {
    try {
      const event: QuickSalesAuditEvent = {
        action: 'PIN_VERIFY_FAILURE',
        reason: `${operation}: ${reason}`,
        requestId: context.requestId,
        userId: context.user.id,
        userRole: context.user.role,
        timestamp: new Date().toISOString()
      };

      this.insertAuditLog(event);
    } catch (error) {
      console.error('Failed to log PIN verify failure:', error);
    }
  }

  /**
   * Log unauthorized access attempt
   */
  logUnauthorizedAccess(context: RBACContext, operation: string, reason: string): void {
    try {
      const event: QuickSalesAuditEvent = {
        action: 'UNAUTHORIZED_ACCESS',
        reason: `${operation}: ${reason}`,
        requestId: context.requestId,
        userId: context.user.id,
        userRole: context.user.role,
        timestamp: new Date().toISOString()
      };

      this.insertAuditLog(event);
    } catch (error) {
      console.error('Failed to log unauthorized access:', error);
    }
  }

  /**
   * Insert audit log into database
   */
  private insertAuditLog(event: QuickSalesAuditEvent): void {
    try {
      const db = this.getDb();
      if (!db) return;

      const stmt = db.prepare(`
        INSERT INTO quick_sales_audit_logs (
          action, session_id, line_id, product_id, product_sku, product_name,
          quantity, unit_price, line_total, reason, totals, invoice_id,
          request_id, user_id, user_role, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        event.action,
        event.sessionId || null,
        event.lineId || null,
        event.productId || null,
        event.productSku || null,
        event.productName || null,
        event.quantity || null,
        event.unitPrice || null,
        event.lineTotal || null,
        event.reason || null,
        event.totals ? JSON.stringify(event.totals) : null,
        event.invoiceId || null,
        event.requestId,
        event.userId,
        event.userRole,
        event.timestamp
      );
    } catch (error) {
      console.error('Failed to insert audit log:', error);
    }
  }

  /**
   * Get audit logs for a session
   */
  getSessionAuditLogs(sessionId: number): QuickSalesAuditEvent[] {
    try {
      const db = this.getDb();
      if (!db) return [];

      const logs = db.prepare(`
        SELECT * FROM quick_sales_audit_logs
        WHERE session_id = ?
        ORDER BY timestamp DESC
      `).all(sessionId) as QuickSalesAuditEvent[];

      return logs;
    } catch (error) {
      console.error('Failed to get session audit logs:', error);
      return [];
    }
  }

  /**
   * Get audit logs for a user
   */
  getUserAuditLogs(userId: number, limit: number = 100): QuickSalesAuditEvent[] {
    try {
      const db = this.getDb();
      if (!db) return [];

      const logs = db.prepare(`
        SELECT * FROM quick_sales_audit_logs
        WHERE user_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `).all(userId, limit) as QuickSalesAuditEvent[];

      return logs;
    } catch (error) {
      console.error('Failed to get user audit logs:', error);
      return [];
    }
  }
}

export const quickSalesAuditLogger = new QuickSalesAuditLogger();
