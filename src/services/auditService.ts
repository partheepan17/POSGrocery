/**
 * Audit Service
 * Handles audit logging, tracking, and reporting for security compliance
 */

import { dataService } from './dataService';
import { authService } from './authService';

export interface AuditLog {
  id: number;
  at: string;
  user_id: number;
  user_name: string;
  terminal?: string;
  action: string;
  entity?: string;
  entity_id?: string;
  payload_json?: string;
  created_at: string;
}

export interface AuditLogInput {
  action: string;
  entity?: string;
  entityId?: string | number;
  payload?: Record<string, any>;
  terminal?: string;
}

export interface AuditFilters {
  dateFrom?: string;
  dateTo?: string;
  userId?: number;
  action?: string;
  entity?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// Common audit actions
export const AUDIT_ACTIONS = {
  // Authentication
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAIL: 'LOGIN_FAIL',
  LOGOUT: 'LOGOUT',
  PIN_LOCKOUT: 'PIN_LOCKOUT',
  PIN_UNLOCK: 'PIN_UNLOCK',
  SESSION_LOCKED: 'SESSION_LOCKED',
  SESSION_RESUMED: 'SESSION_RESUMED',
  
  // Sales Operations
  SALE_CREATE: 'SALE_CREATE',
  SALE_COMPLETE: 'SALE_COMPLETE',
  PRICE_OVERRIDE: 'PRICE_OVERRIDE',
  DISCOUNT_OVERRIDE: 'DISCOUNT_OVERRIDE',
  SALE_VOID: 'SALE_VOID',
  
  // Returns & Refunds
  REFUND_CREATE: 'REFUND_CREATE',
  REFUND_APPROVE: 'REFUND_APPROVE',
  
  // Shift Operations
  SHIFT_START: 'SHIFT_START',
  SHIFT_END: 'SHIFT_END',
  X_REPORT: 'X_REPORT',
  Z_CLOSE: 'Z_CLOSE',
  
  // Hold Operations
  HOLD_CREATE: 'HOLD_CREATE',
  HOLD_RESUME: 'HOLD_RESUME',
  HOLD_DELETE: 'HOLD_DELETE',
  
  // Inventory
  STOCKTAKE_CREATE: 'STOCKTAKE_CREATE',
  STOCKTAKE_FINALIZE: 'STOCKTAKE_FINALIZE',
  GRN_CREATE: 'GRN_CREATE',
  GRN_POST: 'GRN_POST',
  
  // System Operations
  SETTINGS_CHANGE: 'SETTINGS_CHANGE',
  BACKUP_CREATE: 'BACKUP_CREATE',
  BACKUP_RESTORE: 'BACKUP_RESTORE',
  CSV_EXPORT: 'CSV_EXPORT',
  
  // Security Events
  MANAGER_ESCALATION: 'MANAGER_ESCALATION',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  
  // User Management
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  USER_ROLE_CHANGE: 'USER_ROLE_CHANGE',
  USER_ACTIVATE: 'USER_ACTIVATE',
  USER_DEACTIVATE: 'USER_DEACTIVATE',
  USER_PIN_RESET: 'USER_PIN_RESET',
  USER_LOCK_RESET: 'USER_LOCK_RESET',
  USERS_CSV_EXPORT: 'USERS_CSV_EXPORT',
  USERS_CSV_IMPORT: 'USERS_CSV_IMPORT',
  
  // Data Access
  AUDIT_VIEW: 'AUDIT_VIEW',
  AUDIT_EXPORT: 'AUDIT_EXPORT',
} as const;

class AuditService {
  /**
   * Log an audit event
   */
  async log(input: AuditLogInput): Promise<void> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        console.warn('Audit log attempted without authenticated user');
        return;
      }

      const terminal = input.terminal || this.getCurrentTerminal();
      const payloadJson = input.payload ? JSON.stringify(input.payload) : null;

      await dataService.execute(
        `INSERT INTO audit_logs (
          user_id, user_name, terminal, action, entity, entity_id, payload_json, at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          currentUser.id,
          currentUser.name,
          terminal,
          input.action,
          input.entity || null,
          input.entityId?.toString() || null,
          payloadJson,
          new Date().toISOString()
        ]
      );

      console.log(`📋 Audit: ${input.action} by ${currentUser.name}${input.entity ? ` on ${input.entity}:${input.entityId}` : ''}`);

    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw - audit logging should not break normal operations
    }
  }

  /**
   * List audit logs with filters
   */
  async list(filters: AuditFilters = {}): Promise<{
    logs: AuditLog[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      let query = `
        SELECT * FROM audit_logs
        WHERE 1=1
      `;
      
      const params: any[] = [];

      if (filters.dateFrom) {
        query += ' AND DATE(at) >= ?';
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        query += ' AND DATE(at) <= ?';
        params.push(filters.dateTo);
      }

      if (filters.userId) {
        query += ' AND user_id = ?';
        params.push(filters.userId);
      }

      if (filters.action) {
        query += ' AND action = ?';
        params.push(filters.action);
      }

      if (filters.entity) {
        query += ' AND entity = ?';
        params.push(filters.entity);
      }

      if (filters.search) {
        query += ' AND (action LIKE ? OR user_name LIKE ? OR entity LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      // Get total count
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
      const countResult = await dataService.query<{ count: number }>(countQuery, params);
      const total = countResult[0]?.count || 0;

      // Add ordering and pagination
      query += ' ORDER BY at DESC';
      
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const logs = await dataService.query<AuditLog>(query, params);
      const hasMore = (offset + logs.length) < total;

      return { logs, total, hasMore };

    } catch (error) {
      console.error('Failed to list audit logs:', error);
      throw error;
    }
  }

  /**
   * Get recent audit events for health check
   */
  async getRecentEvents(limit: number = 5): Promise<AuditLog[]> {
    try {
      return await dataService.query<AuditLog>(
        'SELECT * FROM audit_logs ORDER BY at DESC LIMIT ?',
        [limit]
      );
    } catch (error) {
      console.error('Failed to get recent audit events:', error);
      return [];
    }
  }

  /**
   * Get audit statistics
   */
  async getStats(days: number = 7): Promise<{
    totalEvents: number;
    uniqueUsers: number;
    topActions: Array<{ action: string; count: number }>;
    recentFailures: number;
  }> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceStr = since.toISOString();

      const [totalResult, usersResult, actionsResult, failuresResult] = await Promise.all([
        // Total events
        dataService.query<{ count: number }>(
          'SELECT COUNT(*) as count FROM audit_logs WHERE at >= ?',
          [sinceStr]
        ),
        
        // Unique users
        dataService.query<{ count: number }>(
          'SELECT COUNT(DISTINCT user_id) as count FROM audit_logs WHERE at >= ?',
          [sinceStr]
        ),
        
        // Top actions
        dataService.query<{ action: string; count: number }>(
          `SELECT action, COUNT(*) as count 
           FROM audit_logs 
           WHERE at >= ? 
           GROUP BY action 
           ORDER BY count DESC 
           LIMIT 5`,
          [sinceStr]
        ),
        
        // Recent failures
        dataService.query<{ count: number }>(
          `SELECT COUNT(*) as count 
           FROM audit_logs 
           WHERE at >= ? AND action LIKE '%_FAIL%'`,
          [sinceStr]
        )
      ]);

      return {
        totalEvents: totalResult[0]?.count || 0,
        uniqueUsers: usersResult[0]?.count || 0,
        topActions: actionsResult || [],
        recentFailures: failuresResult[0]?.count || 0
      };

    } catch (error) {
      console.error('Failed to get audit stats:', error);
      return {
        totalEvents: 0,
        uniqueUsers: 0,
        topActions: [],
        recentFailures: 0
      };
    }
  }

  /**
   * Log authentication events
   */
  async logAuth(action: 'LOGIN_SUCCESS' | 'LOGIN_FAIL' | 'LOGOUT', userId?: number, details?: any): Promise<void> {
    // For failed logins, we might not have a current user
    if (action === 'LOGIN_FAIL' && userId) {
      try {
        const users = await dataService.query<{name: string}>('SELECT name FROM users WHERE id = ?', [userId]);
        const userName = users[0]?.name || 'Unknown';
        
        await dataService.execute(
          `INSERT INTO audit_logs (
            user_id, user_name, terminal, action, payload_json, at
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            userId,
            userName,
            this.getCurrentTerminal(),
            action,
            details ? JSON.stringify(details) : null,
            new Date().toISOString()
          ]
        );
      } catch (error) {
        console.error('Failed to log auth event:', error);
      }
    } else {
      await this.log({
        action,
        payload: details
      });
    }
  }

  /**
   * Log permission escalation
   */
  async logEscalation(permission: string, approvedBy: number, reason?: string): Promise<void> {
    const approver = await dataService.query<{name: string}>('SELECT name FROM users WHERE id = ?', [approvedBy]);
    
    await this.log({
      action: AUDIT_ACTIONS.MANAGER_ESCALATION,
      payload: {
        permission,
        approved_by: approver[0]?.name || 'Unknown',
        reason: reason || 'No reason provided'
      }
    });
  }

  /**
   * Log permission denied
   */
  async logPermissionDenied(permission: string, attempted_action?: string): Promise<void> {
    await this.log({
      action: AUDIT_ACTIONS.PERMISSION_DENIED,
      payload: {
        permission,
        attempted_action
      }
    });
  }

  /**
   * Get current terminal identifier
   */
  private getCurrentTerminal(): string {
    // In production, this would get the actual terminal ID
    return typeof window !== 'undefined' 
      ? `${window.location.hostname}-${Date.now() % 1000}`
      : 'SERVER';
  }

  /**
   * Clean old audit logs (for maintenance)
   */
  async cleanOldLogs(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const result = await dataService.execute(
        'DELETE FROM audit_logs WHERE at < ?',
        [cutoffDate.toISOString()]
      );

      const deletedCount = (result as any).changes || 0;
      
      if (deletedCount > 0) {
        await this.log({
          action: 'AUDIT_CLEANUP',
          payload: {
            deleted_count: deletedCount,
            days_kept: daysToKeep
          }
        });
      }

      return deletedCount;

    } catch (error) {
      console.error('Failed to clean old audit logs:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const auditService = new AuditService();
