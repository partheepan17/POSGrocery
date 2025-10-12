import { Request, Response, NextFunction } from 'express';
import { createRequestLogger } from '../utils/logger';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class QuickSalesRateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private readonly WINDOW_MS = 60000; // 1 minute
  private readonly MAX_REQUESTS_PER_IP = 30; // 30 requests per minute per IP
  private readonly MAX_LINES_PER_IP = 100; // 100 lines per minute per IP

  /**
   * Check rate limit for Quick Sales operations
   */
  checkRateLimit(req: Request, res: Response, next: NextFunction): void {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const logger = createRequestLogger(req);

    try {
      // Clean up expired entries
      this.cleanupExpiredEntries(now);

      // Get current limit for this IP
      const currentLimit = this.limits.get(ip) || { count: 0, resetTime: now + this.WINDOW_MS };

      // Check if window has expired
      if (now > currentLimit.resetTime) {
        currentLimit.count = 0;
        currentLimit.resetTime = now + this.WINDOW_MS;
      }

      // Check if limit exceeded
      if (currentLimit.count >= this.MAX_REQUESTS_PER_IP) {
        logger.warn('Rate limit exceeded for Quick Sales', {
          ip,
          count: currentLimit.count,
          limit: this.MAX_REQUESTS_PER_IP,
          resetTime: new Date(currentLimit.resetTime).toISOString()
        });

        res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many Quick Sales requests. Please slow down.',
          retryAfter: Math.ceil((currentLimit.resetTime - now) / 1000)
        });
        return;
      }

      // Increment counter
      currentLimit.count++;
      this.limits.set(ip, currentLimit);

      // Add rate limit info to response headers
      res.set({
        'X-RateLimit-Limit': this.MAX_REQUESTS_PER_IP.toString(),
        'X-RateLimit-Remaining': Math.max(0, this.MAX_REQUESTS_PER_IP - currentLimit.count).toString(),
        'X-RateLimit-Reset': Math.ceil(currentLimit.resetTime / 1000).toString()
      });

      next();
    } catch (error) {
      logger.error('Rate limiter error', { error, ip });
      next(); // Continue on error to avoid blocking requests
    }
  }

  /**
   * Check rate limit for line additions specifically
   */
  checkLineRateLimit(req: Request, res: Response, next: NextFunction): void {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const logger = createRequestLogger(req);

    try {
      // Clean up expired entries
      this.cleanupExpiredEntries(now);

      // Get current limit for this IP
      const currentLimit = this.limits.get(ip) || { count: 0, resetTime: now + this.WINDOW_MS };

      // Check if window has expired
      if (now > currentLimit.resetTime) {
        currentLimit.count = 0;
        currentLimit.resetTime = now + this.WINDOW_MS;
      }

      // Check if limit exceeded (more restrictive for line additions)
      if (currentLimit.count >= this.MAX_LINES_PER_IP) {
        logger.warn('Line rate limit exceeded for Quick Sales', {
          ip,
          count: currentLimit.count,
          limit: this.MAX_LINES_PER_IP,
          resetTime: new Date(currentLimit.resetTime).toISOString()
        });

        res.status(429).json({
          error: 'Line rate limit exceeded',
          message: 'Too many line additions. Please slow down.',
          retryAfter: Math.ceil((currentLimit.resetTime - now) / 1000)
        });
        return;
      }

      // Increment counter
      currentLimit.count++;
      this.limits.set(ip, currentLimit);

      // Add rate limit info to response headers
      res.set({
        'X-RateLimit-Limit': this.MAX_LINES_PER_IP.toString(),
        'X-RateLimit-Remaining': Math.max(0, this.MAX_LINES_PER_IP - currentLimit.count).toString(),
        'X-RateLimit-Reset': Math.ceil(currentLimit.resetTime / 1000).toString()
      });

      next();
    } catch (error) {
      logger.error('Line rate limiter error', { error, ip });
      next(); // Continue on error to avoid blocking requests
    }
  }

  /**
   * Clean up expired rate limit entries
   */
  private cleanupExpiredEntries(now: number): void {
    for (const [ip, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(ip);
      }
    }
  }

  /**
   * Get current rate limit status for an IP
   */
  getRateLimitStatus(ip: string): { count: number; limit: number; resetTime: number; remaining: number } {
    const entry = this.limits.get(ip);
    const now = Date.now();

    if (!entry || now > entry.resetTime) {
      return {
        count: 0,
        limit: this.MAX_REQUESTS_PER_IP,
        resetTime: now + this.WINDOW_MS,
        remaining: this.MAX_REQUESTS_PER_IP
      };
    }

    return {
      count: entry.count,
      limit: this.MAX_REQUESTS_PER_IP,
      resetTime: entry.resetTime,
      remaining: Math.max(0, this.MAX_REQUESTS_PER_IP - entry.count)
    };
  }
}

export const quickSalesRateLimiter = new QuickSalesRateLimiter();


