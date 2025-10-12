import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Extend Express Request interface to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

/**
 * Request ID middleware
 * - Extracts x-request-id from headers if present
 * - Generates new UUID if not present
 * - Attaches requestId to req object
 * - Adds x-request-id to response headers
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Extract or generate request ID
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  
  // Attach to request object
  req.requestId = requestId;
  
  // Add to response headers
  res.setHeader('x-request-id', requestId);
  
  next();
}

/**
 * Generate a new request ID (utility function)
 */
export function generateRequestId(): string {
  return uuidv4();
}




