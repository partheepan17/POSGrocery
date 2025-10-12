import pino from 'pino';
import { Request } from 'express';
import { env } from '../config/env';

// Create base logger
const baseLogger = pino({
  level: env.FAST_DEV ? 'warn' : env.LOG_LEVEL,
  // Production logging: structured JSON, no pretty formatting
  ...(env.NODE_ENV === 'production' ? {
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
      service: 'pos-grocery',
      version: '1.0.0',
      environment: env.NODE_ENV
    }
  } : {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname'
      }
    }
  })
});

/**
 * Create a logger with request context
 */
export function createRequestLogger(req: Request) {
  return baseLogger.child({
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get ? req.get('User-Agent') : req.headers?.['user-agent'],
    ip: req.ip
  });
}

/**
 * Create a logger with custom context
 */
export function createContextLogger(context: Record<string, any>) {
  return baseLogger.child(context);
}

/**
 * Get the base logger
 */
export function getLogger() {
  return baseLogger;
}

/**
 * Log levels for reference
 */
export const LogLevel = {
  TRACE: 'trace',
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal'
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];



