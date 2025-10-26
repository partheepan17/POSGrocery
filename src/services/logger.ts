/**
 * Structured Logging Utility
 * Provides consistent logging across all services
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  service: string;
  operation?: string;
  data?: any;
  error?: Error;
  timestamp: string;
  requestId?: string;
  userId?: string;
  duration?: number;
}

class Logger {
  private serviceName: string;
  private minLevel: LogLevel;

  constructor(serviceName: string, minLevel: LogLevel = LogLevel.INFO) {
    this.serviceName = serviceName;
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    operation?: string,
    data?: any,
    error?: Error,
    requestId?: string,
    userId?: string,
    duration?: number
  ): LogEntry {
    return {
      level,
      message,
      service: this.serviceName,
      operation,
      data,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
      timestamp: new Date().toISOString(),
      requestId,
      userId,
      duration,
    };
  }

  private log(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    // In development, use console with colors
    const isDev = (typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process.env?.NODE_ENV === 'development') ||
                  (typeof window !== 'undefined' && (window as any).VITE_APP_ENV === 'development');
    if (isDev) {
      const colorMap = {
        [LogLevel.DEBUG]: '\x1b[36m', // Cyan
        [LogLevel.INFO]: '\x1b[32m',  // Green
        [LogLevel.WARN]: '\x1b[33m',  // Yellow
        [LogLevel.ERROR]: '\x1b[31m', // Red
      };
      const reset = '\x1b[0m';
      const color = colorMap[entry.level];
      
      console.log(
        `${color}[${entry.level}]${reset} ${entry.service}${entry.operation ? `:${entry.operation}` : ''} - ${entry.message}`,
        entry.data ? entry.data : '',
        entry.error ? entry.error : ''
      );
    } else {
      // In production, use structured logging
      console.log(JSON.stringify(entry));
    }
  }

  debug(message: string, operation?: string, data?: any, requestId?: string): void {
    this.log(this.createLogEntry(LogLevel.DEBUG, message, operation, data, undefined, requestId));
  }

  info(message: string, operation?: string, data?: any, requestId?: string): void {
    this.log(this.createLogEntry(LogLevel.INFO, message, operation, data, undefined, requestId));
  }

  warn(message: string, operation?: string, data?: any, requestId?: string): void {
    this.log(this.createLogEntry(LogLevel.WARN, message, operation, data, undefined, requestId));
  }

  error(message: string, error?: Error, operation?: string, data?: any, requestId?: string): void {
    this.log(this.createLogEntry(LogLevel.ERROR, message, operation, data, error, requestId));
  }

  // Performance logging
  timeStart(operation: string, requestId?: string): () => void {
    const startTime = Date.now();
    this.debug(`Starting ${operation}`, operation, undefined, requestId);
    
    return () => {
      const duration = Date.now() - startTime;
      this.info(`Completed ${operation}`, operation, { duration }, requestId);
    };
  }

  // Business operation logging
  businessOperation(
    operation: string,
    message: string,
    data?: any,
    requestId?: string,
    _userId?: string
  ): void {
    this.info(message, operation, data, requestId);
  }

  // Error with context
  errorWithContext(
    message: string,
    error: Error,
    operation: string,
    context?: any,
    requestId?: string,
    _userId?: string
  ): void {
    this.error(message, error, operation, context, requestId);
  }
}

// Create logger instances for each service
export const createLogger = (serviceName: string, minLevel?: LogLevel): Logger => {
  return new Logger(serviceName, minLevel);
};

// Default loggers for common services
export const dataServiceLogger = createLogger('DataService');
export const productServiceLogger = createLogger('ProductService');
export const customerServiceLogger = createLogger('CustomerService');
export const salesServiceLogger = createLogger('SalesService');
export const refundServiceLogger = createLogger('RefundService');
export const grnServiceLogger = createLogger('GRNService');
export const backupServiceLogger = createLogger('BackupService');
export const healthServiceLogger = createLogger('HealthService');
