import { Request, Response, NextFunction } from 'express';
import { createStandardError, ERROR_CODES } from '../utils/errorCodes';
import { createRequestLogger } from '../utils/logger';

// Simple in-memory rate limiter
class RateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.requests.entries()) {
      if (now > data.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  isAllowed(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const key = identifier;
    const data = this.requests.get(key);

    if (!data || now > data.resetTime) {
      // New window or expired window
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs
      };
    }

    if (data.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: data.resetTime
      };
    }

    data.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - data.count,
      resetTime: data.resetTime
    };
  }
}

// Global rate limiters
const globalRateLimiter = new RateLimiter(60000, 1000); // 1000 req/min
const apiRateLimiter = new RateLimiter(60000, 200); // 200 req/min per IP
const authRateLimiter = new RateLimiter(300000, 10); // 10 auth attempts per 5min

export function globalRateLimit(req: Request, res: Response, next: NextFunction): void {
  const identifier = 'global';
  const result = globalRateLimiter.isAllowed(identifier);
  
  if (!result.allowed) {
    const logger = createRequestLogger(req);
    logger.warn('Global rate limit exceeded', { identifier });
    
    res.status(429).json(createStandardError(
      'Too many requests globally',
      ERROR_CODES.RATE_LIMITED,
      {
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
      },
      req.requestId
    ));
    return;
  }
  
  res.set('X-RateLimit-Limit', '1000');
  res.set('X-RateLimit-Remaining', result.remaining.toString());
  res.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
  
  next();
}

export function apiRateLimit(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const identifier = `api:${ip}`;
  const result = apiRateLimiter.isAllowed(identifier);
  
  if (!result.allowed) {
    const logger = createRequestLogger(req);
    logger.warn('API rate limit exceeded', { ip, identifier });
    
    res.status(429).json(createStandardError(
      'Too many requests from this IP',
      ERROR_CODES.RATE_LIMITED,
      {
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
      },
      req.requestId
    ));
    return;
  }
  
  res.set('X-RateLimit-Limit', '200');
  res.set('X-RateLimit-Remaining', result.remaining.toString());
  res.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
  
  next();
}

export function authRateLimit(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const identifier = `auth:${ip}`;
  const result = authRateLimiter.isAllowed(identifier);
  
  if (!result.allowed) {
    const logger = createRequestLogger(req);
    logger.warn('Auth rate limit exceeded', { ip, identifier });
    
    res.status(429).json(createStandardError(
      'Too many authentication attempts',
      ERROR_CODES.RATE_LIMITED,
      {
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
      },
      req.requestId
    ));
    return;
  }
  
  res.set('X-RateLimit-Limit', '10');
  res.set('X-RateLimit-Remaining', result.remaining.toString());
  res.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
  
  next();
}

// Body size limiter
export function bodySizeLimit(maxSize: number = 2 * 1024 * 1024) { // 2MB default
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('content-length') || '0');
    
    if (contentLength > maxSize) {
      const logger = createRequestLogger(req);
      logger.warn('Request body too large', { 
        contentLength, 
        maxSize,
        ip: req.ip 
      });
      
      res.status(413).json(createStandardError(
        'Request body too large',
        ERROR_CODES.INVALID_INPUT,
        {
          maxSize,
          receivedSize: contentLength
        },
        req.requestId
      ));
      return;
    }
    
    next();
  };
}
