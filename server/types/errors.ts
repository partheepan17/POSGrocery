// Standardized error codes for consistent client handling
export enum ErrorCode {
  // Client errors (4xx)
  INVALID_INPUT = 'INVALID_INPUT',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  PAYMENT_MISMATCH = 'PAYMENT_MISMATCH',
  PIN_REQUIRED = 'PIN_REQUIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // Server errors (5xx)
  INTERNAL = 'INTERNAL',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

// HTTP status code mapping
export const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.PAYMENT_MISMATCH]: 400,
  [ErrorCode.PIN_REQUIRED]: 401,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.PAYLOAD_TOO_LARGE]: 413,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.INTERNAL]: 500,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503
};

// Standardized error response interface
export interface ErrorResponse {
  error: string;
  code: ErrorCode;
  details?: any;
  timestamp?: string;
  requestId?: string;
}

// Error context for logging
export interface ErrorContext {
  userId?: string;
  requestId?: string;
  operation?: string;
  resource?: string;
  metadata?: Record<string, any>;
}

// Typed error class
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly context?: ErrorContext;
  public readonly details?: any;

  constructor(
    code: ErrorCode,
    message: string,
    context?: ErrorContext,
    details?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = ERROR_STATUS_MAP[code];
    this.context = context;
    this.details = details;
  }

  toJSON(): ErrorResponse {
    return {
      error: this.message,
      code: this.code,
      details: this.details,
      timestamp: new Date().toISOString(),
      requestId: this.context?.requestId
    };
  }
}

// Error helper functions
export const createError = {
  invalidInput: (message: string, details?: any, context?: ErrorContext) =>
    new AppError(ErrorCode.INVALID_INPUT, message, context, details),
  
  notFound: (resource: string, context?: ErrorContext) =>
    new AppError(ErrorCode.NOT_FOUND, `${resource} not found`, context),
  
  conflict: (message: string, details?: any, context?: ErrorContext) =>
    new AppError(ErrorCode.CONFLICT, message, context, details),
  
  paymentMismatch: (message: string, details?: any, context?: ErrorContext) =>
    new AppError(ErrorCode.PAYMENT_MISMATCH, message, context, details),
  
  pinRequired: (message: string = 'PIN required for this operation', context?: ErrorContext) =>
    new AppError(ErrorCode.PIN_REQUIRED, message, context),
  
  unauthorized: (message: string = 'Unauthorized access', context?: ErrorContext) =>
    new AppError(ErrorCode.UNAUTHORIZED, message, context),
  
  forbidden: (message: string = 'Access forbidden', context?: ErrorContext) =>
    new AppError(ErrorCode.FORBIDDEN, message, context),
  
  payloadTooLarge: (message: string = 'Request payload too large', context?: ErrorContext) =>
    new AppError(ErrorCode.PAYLOAD_TOO_LARGE, message, context),
  
  rateLimited: (message: string = 'Rate limit exceeded', context?: ErrorContext) =>
    new AppError(ErrorCode.RATE_LIMITED, message, context),
  
  internal: (message: string = 'Internal server error', details?: any, context?: ErrorContext) =>
    new AppError(ErrorCode.INTERNAL, message, context, details),
  
  databaseError: (message: string = 'Database operation failed', details?: any, context?: ErrorContext) =>
    new AppError(ErrorCode.DATABASE_ERROR, message, context, details),
  
  externalServiceError: (service: string, details?: any, context?: ErrorContext) =>
    new AppError(ErrorCode.EXTERNAL_SERVICE_ERROR, `${service} service unavailable`, context, details),
  
  serviceUnavailable: (message: string = 'Service temporarily unavailable', context?: ErrorContext) =>
    new AppError(ErrorCode.SERVICE_UNAVAILABLE, message, context)
};

// Validation error mapping
export const mapValidationError = (error: any, context?: ErrorContext): AppError => {
  if (error.name === 'ZodError') {
    const details = error.errors?.map((err: any) => ({
      field: err.path?.join('.'),
      message: err.message,
      code: err.code
    }));
    
    return createError.invalidInput(
      'Validation failed',
      details,
      context
    );
  }
  
  return createError.invalidInput(
    error.message || 'Invalid input',
    error.details,
    context
  );
};

// Database error mapping
export const mapDatabaseError = (error: any, context?: ErrorContext): AppError => {
  if (error.message?.includes('UNIQUE constraint failed')) {
    return createError.conflict(
      'Resource already exists',
      { constraint: error.message },
      context
    );
  }
  
  if (error.message?.includes('FOREIGN KEY constraint failed')) {
    return createError.invalidInput(
      'Invalid reference',
      { constraint: error.message },
      context
    );
  }
  
  if (error.message?.includes('NOT NULL constraint failed')) {
    return createError.invalidInput(
      'Required field missing',
      { constraint: error.message },
      context
    );
  }
  
  return createError.databaseError(
    'Database operation failed',
    { originalError: error.message },
    context
  );
};




