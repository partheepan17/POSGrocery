/**
 * Structured Logging System
 * Provides consistent, structured logging across the application
 */

import winston from 'winston';
import { env } from '../config/env';

export interface LogContext {
  operation?: string;
  requestId?: string;
  userId?: string;
  terminalId?: string;
  sessionId?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  performance?: {
    duration: number;
    memoryUsage: NodeJS.MemoryUsage;
  };
  metadata?: Record<string, any>;
}

class StructuredLogger {
  private logger: winston.Logger;
  private requestId: string | null = null;

  constructor() {
    this.logger = this.createLogger();
  }

  /**
   * Create Winston logger instance
   */
  private createLogger(): winston.Logger {
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf((info) => {
        const logEntry: LogEntry = {
          timestamp: info.timestamp,
          level: info.level,
          message: info.message,
          context: info.context,
          error: info.error,
          performance: info.performance,
          metadata: info.metadata
        };

        return JSON.stringify(logEntry);
      })
    );

    const transports: winston.transport[] = [
      // Console transport
      new winston.transports.Console({
        level: env.LOG_LEVEL,
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ];

    // File transport for production
    if (env.NODE_ENV === 'production') {
      transports.push(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: logFormat,
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: logFormat,
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5
        })
      );
    }

    return winston.createLogger({
      level: env.LOG_LEVEL,
      format: logFormat,
      transports,
      exitOnError: false
    });
  }

  /**
   * Set request ID for correlation
   */
  setRequestId(requestId: string): void {
    this.requestId = requestId;
  }

  /**
   * Clear request ID
   */
  clearRequestId(): void {
    this.requestId = null;
  }

  /**
   * Create context-aware logger
   */
  createContextLogger(context: LogContext): {
    debug: (message: string, meta?: any) => void;
    info: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    error: (message: string, meta?: any) => void;
  } {
    const baseContext = {
      ...context,
      requestId: this.requestId
    };

    return {
      debug: (message: string, meta?: any) => this.debug(message, { ...baseContext, ...meta }),
      info: (message: string, meta?: any) => this.info(message, { ...baseContext, ...meta }),
      warn: (message: string, meta?: any) => this.warn(message, { ...baseContext, ...meta }),
      error: (message: string, meta?: any) => this.error(message, { ...baseContext, ...meta })
    };
  }

  /**
   * Debug log
   */
  debug(message: string, context?: LogContext, metadata?: any): void {
    this.logger.debug(message, { context, metadata });
  }

  /**
   * Info log
   */
  info(message: string, context?: LogContext, metadata?: any): void {
    this.logger.info(message, { context, metadata });
  }

  /**
   * Warning log
   */
  warn(message: string, context?: LogContext, metadata?: any): void {
    this.logger.warn(message, { context, metadata });
  }

  /**
   * Error log
   */
  error(message: string, context?: LogContext, metadata?: any): void {
    this.logger.error(message, { context, metadata });
  }

  /**
   * Log with performance metrics
   */
  logWithPerformance(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    duration: number,
    context?: LogContext,
    metadata?: any
  ): void {
    const performance = {
      duration,
      memoryUsage: process.memoryUsage()
    };

    this.logger.log(level, message, { context, performance, metadata });
  }

  /**
   * Log API request
   */
  logApiRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    const message = `API ${method} ${path} - ${statusCode}`;
    const metadata = {
      method,
      path,
      statusCode,
      duration
    };

    if (statusCode >= 400) {
      this.error(message, context, metadata);
    } else if (statusCode >= 300) {
      this.warn(message, context, metadata);
    } else {
      this.info(message, context, metadata);
    }
  }

  /**
   * Log database operation
   */
  logDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    context?: LogContext,
    metadata?: any
  ): void {
    const message = `Database ${operation} on ${table}`;
    const dbMetadata = {
      operation,
      table,
      duration,
      ...metadata
    };

    if (duration > 1000) {
      this.warn(message, context, dbMetadata);
    } else {
      this.debug(message, context, dbMetadata);
    }
  }

  /**
   * Log authentication event
   */
  logAuthEvent(
    event: 'login' | 'logout' | 'token_refresh' | 'login_failed' | 'access_denied',
    userId?: string,
    context?: LogContext,
    metadata?: any
  ): void {
    const message = `Authentication ${event}`;
    const authContext = {
      ...context,
      userId,
      event
    };

    if (event === 'login_failed' || event === 'access_denied') {
      this.warn(message, authContext, metadata);
    } else {
      this.info(message, authContext, metadata);
    }
  }

  /**
   * Log business event
   */
  logBusinessEvent(
    event: string,
    entity: string,
    entityId: string,
    context?: LogContext,
    metadata?: any
  ): void {
    const message = `Business event: ${event}`;
    const businessContext = {
      ...context,
      event,
      entity,
      entityId
    };

    this.info(message, businessContext, metadata);
  }

  /**
   * Log security event
   */
  logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context?: LogContext,
    metadata?: any
  ): void {
    const message = `Security event: ${event}`;
    const securityContext = {
      ...context,
      event,
      severity
    };

    switch (severity) {
      case 'critical':
      case 'high':
        this.error(message, securityContext, metadata);
        break;
      case 'medium':
        this.warn(message, securityContext, metadata);
        break;
      case 'low':
        this.info(message, securityContext, metadata);
        break;
    }
  }

  /**
   * Log system event
   */
  logSystemEvent(
    event: string,
    context?: LogContext,
    metadata?: any
  ): void {
    const message = `System event: ${event}`;
    this.info(message, context, metadata);
  }

  /**
   * Log error with stack trace
   */
  logError(error: Error, context?: LogContext, metadata?: any): void {
    const errorInfo = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as any).code
    };

    this.error(`Error: ${error.message}`, context, { error: errorInfo, ...metadata });
  }

  /**
   * Get logger instance
   */
  getLogger(): winston.Logger {
    return this.logger;
  }

  /**
   * Close logger
   */
  close(): void {
    this.logger.close();
  }
}

export const structuredLogger = new StructuredLogger();

/**
 * Create context logger helper
 */
export function createContextLogger(context: LogContext) {
  return structuredLogger.createContextLogger(context);
}

/**
 * Logging middleware for Express
 */
export function loggingMiddleware(req: any, res: any, next: any) {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Set request ID
  structuredLogger.setRequestId(requestId);
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  // Log request
  const context = {
    operation: 'http_request',
    requestId,
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress
  };

  structuredLogger.info(`Request started: ${req.method} ${req.path}`, context);

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const responseContext = {
      ...context,
      statusCode: res.statusCode,
      duration
    };

    structuredLogger.logApiRequest(req.method, req.path, res.statusCode, duration, responseContext);
  });

  next();
}







