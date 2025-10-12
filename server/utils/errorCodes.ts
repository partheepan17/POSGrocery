// Import AppError and ErrorCode from the types
import { AppError, ErrorCode as AppErrorCode } from '../types/errors';

// Standardized error codes for stable API responses
export const ERROR_CODES = {
  // Input validation errors
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Business logic errors
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  PAYMENT_MISMATCH: 'PAYMENT_MISMATCH',
  INVALID_PAYMENT_METHOD: 'INVALID_PAYMENT_METHOD',
  
  // GRN & Purchasing errors
  GRN_NOT_FOUND: 'GRN_NOT_FOUND',
  GRN_ALREADY_FINALIZED: 'GRN_ALREADY_FINALIZED',
  SUPPLIER_NOT_FOUND: 'SUPPLIER_NOT_FOUND',
  PO_NOT_FOUND: 'PO_NOT_FOUND',
  
  // Sales & Stock errors
  STOCK_VALIDATION_FAILED: 'STOCK_VALIDATION_FAILED',
  SALE_TRANSACTION_FAILED: 'SALE_TRANSACTION_FAILED',
  
  // Printer errors
  PRINTER_ERROR: 'PRINTER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  
  // Idempotency errors
  DUPLICATE_IDEMPOTENCY: 'DUPLICATE_IDEMPOTENCY',
  
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  PIN_REQUIRED: 'PIN_REQUIRED',
  PIN_INCORRECT: 'PIN_INCORRECT',
  PIN_LOCKED: 'PIN_LOCKED',
  
  // System errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  RATE_LIMITED: 'RATE_LIMITED',
  
  // General errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  
  // Concurrency errors
  CONFLICT: 'CONFLICT',
  LOCK_TIMEOUT: 'LOCK_TIMEOUT',
  
  // Resource errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_EXHAUSTED: 'RESOURCE_EXHAUSTED',
  
  // Audit & Compliance
  AUDIT_REQUIRED: 'AUDIT_REQUIRED',
  COMPLIANCE_VIOLATION: 'COMPLIANCE_VIOLATION'
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

export interface StandardError {
  error: string;
  code: ErrorCode;
  details?: any;
  requestId?: string;
  timestamp?: string;
}

export function createStandardError(
  message: string,
  code: ErrorCode,
  details?: any,
  requestId?: string
): never {
  // Map our error codes to the AppError ErrorCode enum
  const appErrorCode = mapToAppErrorCode(code);
  const context = requestId ? { requestId } : undefined;
  throw new AppError(appErrorCode, message, context, details);
}

function mapToAppErrorCode(code: ErrorCode): AppErrorCode {
  switch (code) {
    case ERROR_CODES.INVALID_INPUT:
    case ERROR_CODES.MISSING_REQUIRED_FIELD:
    case ERROR_CODES.INVALID_FORMAT:
    case ERROR_CODES.VALIDATION_ERROR:
      return AppErrorCode.INVALID_INPUT;
    case ERROR_CODES.NOT_FOUND:
    case ERROR_CODES.PRODUCT_NOT_FOUND:
    case ERROR_CODES.SUPPLIER_NOT_FOUND:
    case ERROR_CODES.GRN_NOT_FOUND:
    case ERROR_CODES.PO_NOT_FOUND:
    case ERROR_CODES.RESOURCE_NOT_FOUND:
      return AppErrorCode.NOT_FOUND;
    case ERROR_CODES.CONFLICT:
    case ERROR_CODES.DUPLICATE_IDEMPOTENCY:
      return AppErrorCode.CONFLICT;
    case ERROR_CODES.UNAUTHORIZED:
      return AppErrorCode.UNAUTHORIZED;
    case ERROR_CODES.FORBIDDEN:
      return AppErrorCode.FORBIDDEN;
    case ERROR_CODES.RATE_LIMITED:
      return AppErrorCode.RATE_LIMITED;
    case ERROR_CODES.SERVICE_UNAVAILABLE:
      return AppErrorCode.SERVICE_UNAVAILABLE;
    default:
      return AppErrorCode.INTERNAL;
  }
}

function getStatusCodeForErrorCode(code: ErrorCode): number {
  switch (code) {
    case ERROR_CODES.INVALID_INPUT:
    case ERROR_CODES.MISSING_REQUIRED_FIELD:
    case ERROR_CODES.INVALID_FORMAT:
    case ERROR_CODES.VALIDATION_ERROR:
      return 400;
    case ERROR_CODES.UNAUTHORIZED:
      return 401;
    case ERROR_CODES.FORBIDDEN:
      return 403;
    case ERROR_CODES.NOT_FOUND:
    case ERROR_CODES.PRODUCT_NOT_FOUND:
    case ERROR_CODES.SUPPLIER_NOT_FOUND:
    case ERROR_CODES.GRN_NOT_FOUND:
    case ERROR_CODES.PO_NOT_FOUND:
    case ERROR_CODES.RESOURCE_NOT_FOUND:
      return 404;
    case ERROR_CODES.CONFLICT:
    case ERROR_CODES.DUPLICATE_IDEMPOTENCY:
      return 409;
    case ERROR_CODES.RATE_LIMITED:
      return 429;
    case ERROR_CODES.SERVICE_UNAVAILABLE:
      return 503;
    default:
      return 500;
  }
}

// Error code mappings for common scenarios
export const ERROR_MAPPINGS = {
  VALIDATION: ERROR_CODES.INVALID_INPUT,
  NOT_FOUND: ERROR_CODES.RESOURCE_NOT_FOUND,
  UNAUTHORIZED: ERROR_CODES.UNAUTHORIZED,
  FORBIDDEN: ERROR_CODES.FORBIDDEN,
  CONFLICT: ERROR_CODES.CONFLICT,
  DATABASE: ERROR_CODES.DATABASE_ERROR,
  TIMEOUT: ERROR_CODES.TIMEOUT,
  RATE_LIMIT: ERROR_CODES.RATE_LIMITED
} as const;


