import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCode, createError, mapValidationError, mapDatabaseError, ErrorContext } from '../types/errors';
import { createRequestLogger } from '../utils/logger';

// Legacy HttpError for backward compatibility
export class HttpError extends Error {
  public status: number;
  public code: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code || 'HTTP_ERROR';
    this.name = 'HttpError';
  }
}

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(
  error: Error | AppError | HttpError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestLogger = createRequestLogger(req);
  const context: ErrorContext = {
    requestId: req.requestId,
    operation: req.method,
    resource: req.path,
    metadata: {
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      url: req.url
    }
  };

  // Log error with structured format using request logger
  requestLogger.error({
    message: error.message,
    stack: error.stack,
    code: error instanceof AppError ? error.code : 'UNKNOWN',
    status: error instanceof AppError ? error.status : 500
  });

  let appError: AppError;

  // Handle AppError (our standardized errors)
  if (error instanceof AppError) {
    appError = error;
  }
  // Handle legacy HttpError
  else if (error instanceof HttpError) {
    appError = new AppError(
      error.code as ErrorCode || ErrorCode.INTERNAL,
      error.message,
      context
    );
  }
  // Handle payload too large errors (413)
  else if (error.message?.includes('request entity too large') || 
           error.message?.includes('PayloadTooLargeError') ||
           (error as any).type === 'entity.too.large') {
    appError = createError.payloadTooLarge(
      'Request body exceeds the maximum allowed size',
      context
    );
  }
  // Handle validation errors (Zod)
  else if (error.name === 'ZodError') {
    appError = mapValidationError(error, context);
  }
  // Handle database errors
  else if (error.message?.includes('UNIQUE constraint failed') ||
           error.message?.includes('FOREIGN KEY constraint failed') ||
           error.message?.includes('NOT NULL constraint failed')) {
    appError = mapDatabaseError(error, context);
  }
  // Handle rate limiting errors
  else if (error.message?.includes('Too many requests') || 
           (error as any).status === 429) {
    appError = createError.rateLimited(
      'Rate limit exceeded',
      context
    );
  }
  // Handle generic errors
  else {
    appError = createError.internal(
      error.message || 'Internal server error',
      { originalError: error.name },
      context
    );
  }

  // Send standardized error response
  res.status(appError.status).json(appError.toJSON());
}

