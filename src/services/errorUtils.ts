/**
 * Standardized Error Response Utilities
 * Provides consistent error handling across all services
 */

export interface StandardErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

export interface StandardSuccessResponse<T = any> {
  success: true;
  data: T;
  timestamp: string;
  requestId?: string;
}

export type StandardApiResponse<T = any> = StandardSuccessResponse<T> | StandardErrorResponse;

/**
 * Error codes for consistent error handling
 */
export enum ErrorCodes {
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  
  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  
  // Business logic errors
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  INVALID_OPERATION = 'INVALID_OPERATION',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  
  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  
  // External service errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  PRINTER_ERROR = 'PRINTER_ERROR',
  BACKUP_ERROR = 'BACKUP_ERROR',
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: string,
  code: ErrorCodes = ErrorCodes.INTERNAL_ERROR,
  details?: any,
  requestId?: string
): StandardErrorResponse {
  return {
    success: false,
    error,
    code,
    details,
    timestamp: new Date().toISOString(),
    requestId,
  };
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  requestId?: string
): StandardSuccessResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    requestId,
  };
}

/**
 * Validation error helper
 */
export function createValidationError(
  field: string,
  message: string,
  value?: any,
  requestId?: string
): StandardErrorResponse {
  return createErrorResponse(
    `Validation error for field '${field}': ${message}`,
    ErrorCodes.VALIDATION_ERROR,
    { field, value },
    requestId
  );
}

/**
 * Not found error helper
 */
export function createNotFoundError(
  resource: string,
  identifier: string | number,
  requestId?: string
): StandardErrorResponse {
  return createErrorResponse(
    `${resource} with identifier '${identifier}' not found`,
    ErrorCodes.NOT_FOUND,
    { resource, identifier },
    requestId
  );
}

/**
 * Business logic error helper
 */
export function createBusinessError(
  message: string,
  code: ErrorCodes = ErrorCodes.INVALID_OPERATION,
  details?: any,
  requestId?: string
): StandardErrorResponse {
  return createErrorResponse(message, code, details, requestId);
}

/**
 * System error helper
 */
export function createSystemError(
  message: string,
  originalError?: Error,
  requestId?: string
): StandardErrorResponse {
  return createErrorResponse(
    message,
    ErrorCodes.INTERNAL_ERROR,
    originalError ? {
      name: originalError.name,
      message: originalError.message,
      stack: originalError.stack,
    } : undefined,
    requestId
  );
}

/**
 * Check if a response is an error response
 */
export function isErrorResponse(response: any): response is StandardErrorResponse {
  return response && response.success === false && response.error;
}

/**
 * Check if a response is a success response
 */
export function isSuccessResponse<T>(response: any): response is StandardSuccessResponse<T> {
  return response && response.success === true && response.data !== undefined;
}

/**
 * Extract error message from any response
 */
export function getErrorMessage(response: any): string {
  if (isErrorResponse(response)) {
    return response.error;
  }
  return 'Unknown error occurred';
}

/**
 * Extract error code from any response
 */
export function getErrorCode(response: any): string {
  if (isErrorResponse(response)) {
    return response.code;
  }
  return ErrorCodes.INTERNAL_ERROR;
}



