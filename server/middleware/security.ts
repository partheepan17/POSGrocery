/**
 * Security Middleware
 * Implements security features like CORS, helmet, and input validation
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Input validation schemas
export const commonValidationSchemas = {
  id: z.number().int().positive(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().min(1).max(100),
  email: z.string().email().max(255),
  phone: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/),
  sku: z.string().min(1).max(50),
  barcode: z.string().min(1).max(50),
  currency: z.string().length(3),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  datetime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/),
  uuid: z.string().uuid(),
  idempotencyKey: z.string().min(1).max(255)
};

// Sanitize input data
export function sanitizeInput(data: any): any {
  if (typeof data === 'string') {
    // Remove potentially dangerous characters
    return data
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeInput);
  }
  
  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[sanitizeInput(key)] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return data;
}

// Validate request body against schema
export function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Sanitize input first
      req.body = sanitizeInput(req.body);
      
      // Validate against schema
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          ok: false,
          message: 'Validation error',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          })),
          requestId: req.requestId
        });
        return;
      }
      
      res.status(400).json({
        ok: false,
        message: 'Invalid request data',
        requestId: req.requestId
      });
    }
  };
}

// Validate query parameters against schema
export function validateQuery(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Sanitize query parameters
      req.query = sanitizeInput(req.query);
      
      // Validate against schema
      const validatedData = schema.parse(req.query);
      req.query = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          ok: false,
          message: 'Query validation error',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          })),
          requestId: req.requestId
        });
        return;
      }
      
      res.status(400).json({
        ok: false,
        message: 'Invalid query parameters',
        requestId: req.requestId
      });
    }
  };
}

// Validate path parameters against schema
export function validateParams(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Sanitize path parameters
      req.params = sanitizeInput(req.params);
      
      // Validate against schema
      const validatedData = schema.parse(req.params);
      req.params = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          ok: false,
          message: 'Path parameter validation error',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          })),
          requestId: req.requestId
        });
        return;
      }
      
      res.status(400).json({
        ok: false,
        message: 'Invalid path parameters',
        requestId: req.requestId
      });
    }
  };
}

// Rate limiting by IP
export function createIPRateLimit(windowMs: number, max: number) {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Clean up old entries
    for (const [key, value] of requests.entries()) {
      if (now > value.resetTime) {
        requests.delete(key);
      }
    }
    
    const requestData = requests.get(ip);
    
    if (!requestData) {
      requests.set(ip, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }
    
    if (now > requestData.resetTime) {
      requests.set(ip, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }
    
    if (requestData.count >= max) {
      res.status(429).json({
        ok: false,
        message: 'Too many requests',
        retryAfter: Math.ceil((requestData.resetTime - now) / 1000),
        requestId: req.requestId
      });
      return;
    }
    
    requestData.count++;
    next();
  };
}

// Security headers middleware
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' ws: wss:; " +
    "frame-ancestors 'none';"
  );
  
  // HSTS (only in production)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
}

// Request size limiter
export function requestSizeLimiter(maxSize: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('content-length') || '0');
    
    if (contentLength > maxSize) {
      res.status(413).json({
        ok: false,
        message: 'Request too large',
        maxSize: maxSize,
        requestId: req.requestId
      });
      return;
    }
    
    next();
  };
}

// SQL injection protection
export function sqlInjectionProtection(req: Request, res: Response, next: NextFunction) {
  const dangerousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    /(\b(OR|AND)\s+'.*?'\s*=\s*'.*?')/gi,
    /(\b(OR|AND)\s+".*?"\s*=\s*".*?")/gi,
    /(;|\-\-|\/\*|\*\/)/g
  ];
  
  const checkString = (str: string): boolean => {
    return dangerousPatterns.some(pattern => pattern.test(str));
  };
  
  const checkObject = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return checkString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.some(checkObject);
    }
    
    if (obj && typeof obj === 'object') {
      return Object.values(obj).some(checkObject);
    }
    
    return false;
  };
  
  if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
    res.status(400).json({
      ok: false,
      message: 'Potentially malicious input detected',
      requestId: req.requestId
    });
    return;
  }
  
  next();
}
