/**
 * Caching Middleware
 * Provides intelligent caching for API responses
 */

import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { cacheHeaders, networkConfig } from '../config/network';
import { createContextLogger } from '../utils/logger';

const logger = createContextLogger({ operation: 'caching_middleware' });

interface CacheOptions {
  ttl?: number;
  key?: string;
  vary?: string[];
  skipCache?: boolean;
  skipIfError?: boolean;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  etag: string;
  headers: Record<string, string>;
}

// In-memory cache (in production, use Redis)
const memoryCache = new Map<string, CacheEntry>();

/**
 * Generate cache key from request
 */
function generateCacheKey(req: Request, customKey?: string): string {
  if (customKey) {
    return `custom:${customKey}`;
  }

  const key = `${req.method}:${req.originalUrl}`;
  const hash = createHash('md5').update(key).digest('hex');
  return `api:${hash}`;
}

/**
 * Generate ETag for response data
 */
function generateETag(data: any): string {
  const content = JSON.stringify(data);
  return `"${createHash('md5').update(content).digest('hex')}"`;
}

/**
 * Check if request should be cached
 */
function shouldCache(req: Request, res: Response): boolean {
  // Don't cache non-GET requests
  if (req.method !== 'GET') {
    return false;
  }

  // Don't cache if caching is disabled
  if (!networkConfig.caching.enabled) {
    return false;
  }

  // Don't cache if explicitly disabled
  if (req.headers['x-no-cache'] === 'true') {
    return false;
  }

  // Don't cache error responses
  if (res.statusCode >= 400) {
    return false;
  }

  // Don't cache if response is too large
  const contentLength = res.get('content-length');
  if (contentLength && parseInt(contentLength) > networkConfig.caching.maxSize) {
    return false;
  }

  return true;
}

/**
 * Get cache entry
 */
function getCacheEntry(key: string): CacheEntry | null {
  const entry = memoryCache.get(key);
  
  if (!entry) {
    return null;
  }

  // Check if entry has expired
  const now = Date.now();
  if (now - entry.timestamp > entry.ttl * 1000) {
    memoryCache.delete(key);
    return null;
  }

  return entry;
}

/**
 * Set cache entry
 */
function setCacheEntry(key: string, data: any, ttl: number, headers: Record<string, string>): void {
  const etag = generateETag(data);
  
  const entry: CacheEntry = {
    data,
    timestamp: Date.now(),
    ttl,
    etag,
    headers
  };

  memoryCache.set(key, entry);

  // Clean up expired entries periodically
  if (memoryCache.size > 1000) {
    cleanupExpiredEntries();
  }
}

/**
 * Clean up expired cache entries
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  
  for (const [key, entry] of memoryCache.entries()) {
    if (now - entry.timestamp > entry.ttl * 1000) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Cache middleware factory
 */
export function createCacheMiddleware(options: CacheOptions = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip caching if disabled
    if (options.skipCache || !shouldCache(req, res)) {
      return next();
    }

    const cacheKey = generateCacheKey(req, options.key);
    const entry = getCacheEntry(cacheKey);

    // Check if client has cached version
    const clientETag = req.headers['if-none-match'];
    if (clientETag && entry && entry.etag === clientETag) {
      logger.debug({ cacheKey, etag: entry.etag }, 'Cache hit - returning 304');
      res.status(304).end();
      return;
    }

    // Store original response methods
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;

    let responseData: any = null;
    let responseHeaders: Record<string, string> = {};

    // Override response methods to capture data
    res.json = function(data: any) {
      responseData = data;
      return originalJson.call(this, data);
    };

    res.send = function(data: any) {
      responseData = data;
      return originalSend.call(this, data);
    };

    res.end = function(data?: any) {
      if (data) {
        responseData = data;
      }
      return originalEnd.call(this, data);
    };

    // Set cache headers
    const ttl = options.ttl || networkConfig.caching.defaultTTL;
    const cacheControl = `private, max-age=${ttl}`;
    
    res.set({
      'Cache-Control': cacheControl,
      'Vary': options.vary?.join(', ') || 'Accept-Encoding'
    });

    // Handle response
    res.on('finish', () => {
      if (responseData && res.statusCode < 400) {
        const etag = generateETag(responseData);
        
        // Set ETag header
        res.set('ETag', etag);
        
        // Cache the response
        setCacheEntry(cacheKey, responseData, ttl, responseHeaders);
        
        logger.debug({ 
          cacheKey, 
          ttl, 
          etag,
          statusCode: res.statusCode 
        }, 'Response cached');
      }
    });

    next();
  };
}

/**
 * Cache invalidation middleware
 */
export function createCacheInvalidationMiddleware(patterns: string[] = []) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Store original response methods
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;

    // Override response methods to invalidate cache after successful write
    res.json = function(data: any) {
      if (res.statusCode < 400) {
        invalidateCache(patterns);
      }
      return originalJson.call(this, data);
    };

    res.send = function(data: any) {
      if (res.statusCode < 400) {
        invalidateCache(patterns);
      }
      return originalSend.call(this, data);
    };

    res.end = function(data?: any) {
      if (res.statusCode < 400) {
        invalidateCache(patterns);
      }
      return originalEnd.call(this, data);
    };

    next();
  };
}

/**
 * Invalidate cache entries matching patterns
 */
function invalidateCache(patterns: string[]): void {
  if (patterns.length === 0) {
    // Clear all cache
    memoryCache.clear();
    logger.info('All cache entries invalidated');
    return;
  }

  let invalidatedCount = 0;
  
  for (const [key, entry] of memoryCache.entries()) {
    if (patterns.some(pattern => key.includes(pattern))) {
      memoryCache.delete(key);
      invalidatedCount++;
    }
  }

  logger.info({ invalidatedCount, patterns }, 'Cache entries invalidated');
}

/**
 * Cache statistics
 */
export function getCacheStats(): {
  size: number;
  entries: Array<{
    key: string;
    age: number;
    ttl: number;
    size: number;
  }>;
} {
  const now = Date.now();
  const entries = Array.from(memoryCache.entries()).map(([key, entry]) => ({
    key,
    age: now - entry.timestamp,
    ttl: entry.ttl,
    size: JSON.stringify(entry.data).length
  }));

  return {
    size: memoryCache.size,
    entries
  };
}

/**
 * Clear all cache
 */
export function clearCache(): void {
  memoryCache.clear();
  logger.info('Cache cleared');
}

/**
 * Predefined cache middlewares for common use cases
 */
export const cacheMiddlewares = {
  // API responses (5 minutes)
  api: createCacheMiddleware({ ttl: 300 }),
  
  // User data (1 minute)
  user: createCacheMiddleware({ ttl: 60 }),
  
  // Static data (1 hour)
  static: createCacheMiddleware({ ttl: 3600 }),
  
  // Real-time data (no cache)
  realtime: createCacheMiddleware({ skipCache: true }),
  
  // Health checks (no cache)
  health: createCacheMiddleware({ skipCache: true })
};

/**
 * Cache invalidation middlewares
 */
export const invalidationMiddlewares = {
  // Invalidate product cache
  products: createCacheInvalidationMiddleware(['products', 'categories']),
  
  // Invalidate user cache
  users: createCacheInvalidationMiddleware(['users', 'auth']),
  
  // Invalidate all cache
  all: createCacheInvalidationMiddleware([])
};







