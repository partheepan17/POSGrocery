/**
 * Comprehensive Error Handling System
 * Provides centralized error handling, logging, and user feedback
 */

export interface ErrorInfo {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  userId?: string;
  component?: string;
  action?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class AppError extends Error {
  public code: string;
  public details?: any;
  public isUserFriendly: boolean;
  public shouldRetry: boolean;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    details?: any,
    isUserFriendly: boolean = false,
    shouldRetry: boolean = false
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.isUserFriendly = isUserFriendly;
    this.shouldRetry = shouldRetry;
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: ErrorInfo[] = [];
  private maxLogSize = 100;

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle and log errors
   */
  public handleError(
    error: Error | AppError,
    context?: {
      component?: string;
      action?: string;
      userId?: string;
    }
  ): ErrorInfo {
    const errorInfo: ErrorInfo = {
      code: error instanceof AppError ? error.code : 'UNKNOWN_ERROR',
      message: error.message,
      details: error instanceof AppError ? error.details : undefined,
      timestamp: new Date(),
      userId: context?.userId,
      component: context?.component,
      action: context?.action,
    };

    // Add to log
    this.errorLog.unshift(errorInfo);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Error handled:', errorInfo);
    }

    // Send to external logging service in production
    if (import.meta.env.PROD) {
      this.sendToLoggingService(errorInfo);
    }

    return errorInfo;
  }

  /**
   * Create user-friendly error messages
   */
  public getUserFriendlyMessage(error: Error | AppError): string {
    if (error instanceof AppError && error.isUserFriendly) {
      return error.message;
    }

    // Map common error codes to user-friendly messages
    const errorCode = error instanceof AppError ? error.code : 'UNKNOWN_ERROR';
    
    const friendlyMessages: Record<string, string> = {
      'NETWORK_ERROR': 'Unable to connect to the server. Please check your internet connection.',
      'AUTHENTICATION_ERROR': 'Your session has expired. Please log in again.',
      'PERMISSION_ERROR': 'You do not have permission to perform this action.',
      'VALIDATION_ERROR': 'Please check your input and try again.',
      'SERVER_ERROR': 'Something went wrong on our end. Please try again later.',
      'NOT_FOUND': 'The requested item could not be found.',
      'DUPLICATE_ERROR': 'This item already exists.',
      'INSUFFICIENT_STOCK': 'Not enough stock available for this operation.',
      'INVALID_OPERATION': 'This operation is not allowed in the current state.',
      'UNKNOWN_ERROR': 'An unexpected error occurred. Please try again.',
    };

    return friendlyMessages[errorCode] || friendlyMessages['UNKNOWN_ERROR'];
  }

  /**
   * Get error log for debugging
   */
  public getErrorLog(): ErrorInfo[] {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  public clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Send error to external logging service
   */
  private async sendToLoggingService(errorInfo: ErrorInfo): Promise<void> {
    try {
      await fetch('/api/logs/error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorInfo),
      });
    } catch (error) {
      console.error('Failed to send error to logging service:', error);
    }
  }
}

/**
 * Error boundary hook for functional components
 */
export function useErrorHandler() {
  const errorHandler = ErrorHandler.getInstance();

  const handleError = (
    error: Error | AppError,
    context?: {
      component?: string;
      action?: string;
      userId?: string;
    }
  ) => {
    return errorHandler.handleError(error, context);
  };

  const getUserFriendlyMessage = (error: Error | AppError): string => {
    return errorHandler.getUserFriendlyMessage(error);
  };

  return {
    handleError,
    getUserFriendlyMessage,
    getErrorLog: () => errorHandler.getErrorLog(),
    clearErrorLog: () => errorHandler.clearErrorLog(),
  };
}

/**
 * Common error types for the POS system
 */
export const ErrorCodes = {
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',
  SERVER_UNAVAILABLE: 'SERVER_UNAVAILABLE',

  // Authentication errors
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  // Permission errors
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',

  // Business logic errors
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  INVALID_OPERATION: 'INVALID_OPERATION',
  DUPLICATE_ERROR: 'DUPLICATE_ERROR',
  NOT_FOUND: 'NOT_FOUND',

  // System errors
  SERVER_ERROR: 'SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

/**
 * Create specific error types
 */
export const createError = {
  network: (message: string, details?: any) => 
    new AppError(message, ErrorCodes.NETWORK_ERROR, details, true, true),
  
  auth: (message: string, details?: any) => 
    new AppError(message, ErrorCodes.AUTHENTICATION_ERROR, details, true, false),
  
  permission: (message: string, details?: any) => 
    new AppError(message, ErrorCodes.PERMISSION_ERROR, details, true, false),
  
  validation: (message: string, details?: any) => 
    new AppError(message, ErrorCodes.VALIDATION_ERROR, details, true, false),
  
  business: (message: string, code: string = ErrorCodes.INVALID_OPERATION, details?: any) => 
    new AppError(message, code, details, true, false),
  
  system: (message: string, details?: any) => 
    new AppError(message, ErrorCodes.SERVER_ERROR, details, false, true),
};










