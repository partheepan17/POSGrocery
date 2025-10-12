import { getDatabase } from '../db';
import { 
  AuditLogEntry, 
  AuditAction, 
  ActorType, 
  EntityType, 
  AuditContext, 
  AuditData 
} from '../types/audit';
import { createRequestLogger } from './logger';

/**
 * Audit writer utility for logging sensitive actions
 * Ensures compliance and enables post-incident analysis
 */
export class AuditWriter {
  private get db() {
    return getDatabase();
  }

  /**
   * Write an audit log entry
   */
  async writeAuditLog(
    action: AuditAction,
    data: AuditData,
    context: AuditContext,
    entityType?: EntityType,
    entityId?: string
  ): Promise<void> {
    try {
      const requestLogger = createRequestLogger({ requestId: context.requestId } as any);
      
      // Sanitize data to remove sensitive information
      const sanitizedData = this.sanitizeData(data);
      
      const auditEntry: Omit<AuditLogEntry, 'id' | 'timestamp'> = {
        requestId: context.requestId,
        actorId: context.actorId,
        actorType: context.actorType,
        action,
        entityType,
        entityId,
        dataSummary: JSON.stringify(sanitizedData),
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        sessionId: context.sessionId
      };

      // Insert audit log entry
      const stmt = this.db.prepare(`
        INSERT INTO audit_logs (
          request_id, actor_id, actor_type, action, entity_type, entity_id,
          data_summary, ip_address, user_agent, session_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        auditEntry.requestId,
        auditEntry.actorId,
        auditEntry.actorType,
        auditEntry.action,
        auditEntry.entityType,
        auditEntry.entityId,
        auditEntry.dataSummary,
        auditEntry.ipAddress,
        auditEntry.userAgent,
        auditEntry.sessionId
      );

      requestLogger.info({
        action,
        entityType,
        entityId,
        actorId: context.actorId
      }, 'Audit log written');

    } catch (error) {
      // Log audit failure but don't throw to avoid breaking business logic
      console.error('Failed to write audit log:', {
        action,
        context,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Sanitize data to remove sensitive information
   */
  private sanitizeData(data: AuditData): Record<string, any> {
    const sanitized = { ...data };
    
    // Remove sensitive fields
    const sensitiveFields = [
      'pin',
      'password',
      'ssn',
      'creditCard',
      'cvv',
      'token',
      'secret',
      'key',
      'authToken',
      'sessionToken'
    ];

    // Recursively remove sensitive fields
    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }

      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          // Replace sensitive fields with boolean or hash indicator
          if (lowerKey.includes('pin') || lowerKey.includes('password')) {
            result[key] = '[REDACTED]';
          } else {
            result[key] = '[SENSITIVE]';
          }
        } else {
          result[key] = sanitizeObject(value);
        }
      }
      return result;
    };

    return sanitizeObject(sanitized);
  }

  /**
   * Get audit logs for a specific request
   */
  getAuditLogsByRequestId(requestId: string): AuditLogEntry[] {
    const stmt = this.db.prepare(`
      SELECT * FROM audit_logs 
      WHERE request_id = ? 
      ORDER BY timestamp DESC
    `);
    
    return stmt.all(requestId) as AuditLogEntry[];
  }

  /**
   * Get audit logs for a specific actor
   */
  getAuditLogsByActor(actorId: string, limit: number = 100): AuditLogEntry[] {
    const stmt = this.db.prepare(`
      SELECT * FROM audit_logs 
      WHERE actor_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    
    return stmt.all(actorId, limit) as AuditLogEntry[];
  }

  /**
   * Get audit logs for a specific action
   */
  getAuditLogsByAction(action: AuditAction, limit: number = 100): AuditLogEntry[] {
    const stmt = this.db.prepare(`
      SELECT * FROM audit_logs 
      WHERE action = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    
    return stmt.all(action, limit) as AuditLogEntry[];
  }

  /**
   * Get audit logs within a time range
   */
  getAuditLogsByTimeRange(
    startTime: Date, 
    endTime: Date, 
    limit: number = 1000
  ): AuditLogEntry[] {
    const stmt = this.db.prepare(`
      SELECT * FROM audit_logs 
      WHERE timestamp BETWEEN ? AND ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    
    return stmt.all(startTime.toISOString(), endTime.toISOString(), limit) as AuditLogEntry[];
  }
}

// Singleton instance
export const auditWriter = new AuditWriter();

/**
 * Convenience function for writing audit logs
 */
export async function writeAuditLog(
  action: AuditAction,
  data: AuditData,
  context: AuditContext,
  entityType?: EntityType,
  entityId?: string
): Promise<void> {
  return auditWriter.writeAuditLog(action, data, context, entityType, entityId);
}

/**
 * Create audit context from request
 */
export function createAuditContext(req: any): AuditContext {
  return {
    requestId: req.requestId,
    actorId: req.user?.id || req.actorId,
    actorType: req.user?.role === 'admin' ? ActorType.ADMIN : ActorType.USER,
    ipAddress: req.ip,
    userAgent: req.get ? req.get('User-Agent') : req.headers?.['user-agent'],
    sessionId: req.session?.id
  };
}
