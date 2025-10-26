/**
 * Simple logger implementation for frontend
 */

export interface Logger {
  error: (message: string, data?: any) => void;
  info: (message: string, data?: any) => void;
  warn: (message: string, data?: any) => void;
  debug: (message: string, data?: any) => void;
}

export function createContextLogger(context: { operation: string }): Logger {
  const prefix = `[${context.operation}]`;
  
  return {
    error: (message: string, data?: any) => {
      console.error(`${prefix} ${message}`, data);
    },
    info: (message: string, data?: any) => {
      console.info(`${prefix} ${message}`, data);
    },
    warn: (message: string, data?: any) => {
      console.warn(`${prefix} ${message}`, data);
    },
    debug: (message: string, data?: any) => {
      console.debug(`${prefix} ${message}`, data);
    }
  };
}










