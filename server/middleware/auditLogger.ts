import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../db';
import { createRequestLogger } from '../utils/logger';
import { performanceMetrics } from '../utils/performanceMetrics';

interface AuditEvent {
  action: string;
  entityType?: string;
  entityId?: string;
  dataSummary?: any;
  actorId?: string;
  actorType?: string;
}

// Audit log helper
export class AuditLogger {
  private getDb() {
    try {
      return getDatabase();
    } catch (error) {
      // Database not initialized yet, return null
      return null;
    }
  }
  
  log(event: AuditEvent, req: Request): void {
    try {
      const db = this.getDb();
      if (!db) {
        // Database not ready, skip logging
        return;
      }
      
      const stmt = db.prepare(`
        INSERT INTO audit_logs (
          request_id, actor_id, actor_type, action, entity_type, entity_id,
          data_summary, ip_address, user_agent, session_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        req.requestId,
        event.actorId || 'system',
        event.actorType || 'user',
        event.action,
        event.entityType,
        event.entityId,
        event.dataSummary ? JSON.stringify(event.dataSummary) : null,
        req.ip,
        req.get('user-agent'),
        (req as any).sessionID
      );
    } catch (error) {
      const logger = createRequestLogger(req);
      logger.error('Failed to write audit log', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        event 
      });
    }
  }
}

export const auditLogger = new AuditLogger();

// Middleware to log sensitive operations
export function auditMiddleware(operation: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalSend = res.send;
    
    res.send = function(data: any) {
      // Log successful operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        auditLogger.log({
          action: operation,
          dataSummary: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode
          }
        }, req);
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
}

// Specific audit decorators for common operations
export const auditDiscountOverride = auditMiddleware('DISCOUNT_OVERRIDE');
export const auditRefundCreated = auditMiddleware('REFUND_CREATED');
export const auditCashMovement = auditMiddleware('CASH_MOVEMENT');
export const auditShiftOpen = auditMiddleware('SHIFT_OPEN');
export const auditShiftClose = auditMiddleware('SHIFT_CLOSE');
export const auditPinVerify = auditMiddleware('PIN_VERIFY_SUCCESS');
export const auditPinFail = auditMiddleware('PIN_VERIFY_FAILURE');

// PIN verification audit with failure tracking
export function auditPinVerification(success: boolean, userId: string, failureReason?: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const db = getDatabase();
      const stmt = db.prepare(`
        INSERT INTO pin_verification_audit (
          request_id, user_id, success, failure_reason, ip_address, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        req.requestId,
        userId,
        success,
        failureReason,
        req.ip,
        req.get('user-agent')
      );
      
      // Log to audit_logs as well
      auditLogger.log({
        action: success ? 'PIN_VERIFY_SUCCESS' : 'PIN_VERIFY_FAILURE',
        entityType: 'user',
        entityId: userId,
        dataSummary: {
          success,
          failureReason,
          ip: req.ip
        },
        actorId: userId,
        actorType: 'user'
      }, req);
      
    } catch (error) {
      const logger = createRequestLogger(req);
      logger.error('Failed to log PIN verification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        success
      });
    }
    
    next();
  };
}

// Performance audit logging
export function auditPerformance(operation: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    
    const originalSend = res.send;
    res.send = function(data: any) {
      const duration = Date.now() - startTime;
      const success = res.statusCode >= 200 && res.statusCode < 400;
      
      // Record performance metric
      performanceMetrics.recordMetric(
        operation,
        duration,
        success,
        success ? undefined : `HTTP ${res.statusCode}`,
        {
          endpoint: req.originalUrl,
          method: req.method,
          statusCode: res.statusCode
        }
      );
      
      try {
        const db = getDatabase();
        // Check if performance_audit table exists before trying to insert
        const tableExists = db.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name='performance_audit'
        `).get();
        
        if (tableExists) {
          const stmt = db.prepare(`
            INSERT INTO performance_audit (
              request_id, operation, duration_ms, success, error_code, metadata
            ) VALUES (?, ?, ?, ?, ?, ?)
          `);
          
          stmt.run(
            req.requestId,
            operation,
            duration,
            res.statusCode >= 200 && res.statusCode < 300,
            res.statusCode >= 400 ? `HTTP_${res.statusCode}` : null,
            JSON.stringify({
              method: req.method,
              path: req.path,
              statusCode: res.statusCode
            })
          );
        }
      } catch (error) {
        // Silently ignore performance audit errors to avoid spam
        // const logger = createRequestLogger(req);
        // logger.error('Failed to log performance audit', {
        //   error: error instanceof Error ? error.message : 'Unknown error',
        //   operation,
        //   duration
        // });
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
}
