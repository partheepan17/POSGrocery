/**
 * Redis Cache Service
 * Provides caching functionality for API responses
 */

import { createClient, RedisClientType } from 'redis';
import { createContextLogger } from '../utils/logger';

const logger = createContextLogger({ service: 'cache' });

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  keyPrefix?: string;
}

export interface CacheResult<T> {
  hit: boolean;
  data?: T;
  error?: string;
}

class CacheService {
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;
  private defaultTTL: number = 60; // 60 seconds default

  constructor() {
    // Only initialize Redis if explicitly configured. In dev, we run fine without it.
    const disabled = process.env.REDIS_DISABLED === '1' || process.env.REDIS_DISABLED === 'true';
    const hasUrl = Boolean(process.env.REDIS_URL);
    if (disabled || !hasUrl) {
      logger.warn('Redis cache disabled (set REDIS_URL to enable)');
      this.client = null;
      this.isConnected = false;
      return;
    }
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL as string;
      
      this.client = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 5000,
          // Stop noisy reconnect loops in development
          reconnectStrategy: () => new Error('Redis reconnect disabled (dev)')
        }
      });

      this.client.on('error', (err) => {
        logger.error('Redis client error', { error: err.message });
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        logger.warn('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      logger.info('Redis cache service initialized');
    } catch (error) {
      logger.error('Failed to initialize Redis cache service', { error: error instanceof Error ? error.message : String(error) });
      this.client = null;
      this.isConnected = false;
    }
  }

  /**
   * Generate a cache key from a normalized query string
   */
  private generateKey(queryString: string, prefix: string = 'api'): string {
    // Normalize query string by sorting parameters
    const url = new URL(`http://localhost${queryString}`);
    const params = new URLSearchParams(url.search);
    const sortedParams = new URLSearchParams();
    
    // Sort parameters for consistent key generation
    Array.from(params.keys()).sort().forEach(key => {
      sortedParams.append(key, params.get(key) || '');
    });
    
    const normalizedQuery = sortedParams.toString();
    return `${prefix}:${normalizedQuery}`;
  }

  /**
   * Get data from cache
   */
  async get<T>(queryString: string, options: CacheOptions = {}): Promise<CacheResult<T>> {
    if (!this.client || !this.isConnected) {
      return { hit: false };
    }

    try {
      const key = this.generateKey(queryString, options.keyPrefix);
      const cached = await this.client.get(key);
      
      if (cached) {
        logger.debug('Cache hit', { key });
        return {
          hit: true,
          data: JSON.parse(cached)
        };
      }

      logger.debug('Cache miss', { key });
      return { hit: false };
    } catch (error) {
      logger.error('Cache get error', { error: error instanceof Error ? error.message : String(error), queryString });
      return { hit: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Set data in cache
   */
  async set<T>(queryString: string, data: T, options: CacheOptions = {}): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      const key = this.generateKey(queryString, options.keyPrefix);
      const ttl = options.ttl || this.defaultTTL;
      
      await this.client.setEx(key, ttl, JSON.stringify(data));
      logger.debug('Cache set', { key, ttl });
      return true;
    } catch (error) {
      logger.error('Cache set error', { error: error instanceof Error ? error.message : String(error), queryString });
      return false;
    }
  }

  /**
   * Delete data from cache
   */
  async del(queryString: string, options: CacheOptions = {}): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      const key = this.generateKey(queryString, options.keyPrefix);
      await this.client.del(key);
      logger.debug('Cache deleted', { key });
      return true;
    } catch (error) {
      logger.error('Cache delete error', { error: error instanceof Error ? error.message : String(error), queryString });
      return false;
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    if (!this.client || !this.isConnected) {
      return 0;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        const deleted = await this.client.del(keys);
        logger.info('Cache pattern invalidated', { pattern, deleted });
        return deleted;
      }
      return 0;
    } catch (error) {
      logger.error('Cache pattern invalidation error', { error: error instanceof Error ? error.message : String(error), pattern });
      return 0;
    }
  }

  /**
   * Invalidate all product-related cache
   */
  async invalidateProducts(): Promise<number> {
    return this.invalidatePattern('api:/api/products*');
  }

  /**
   * Invalidate all cache for a specific endpoint
   */
  async invalidateEndpoint(endpoint: string): Promise<number> {
    return this.invalidatePattern(`api:${endpoint}*`);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ connected: boolean; memory?: any; keys?: number }> {
    if (!this.client || !this.isConnected) {
      return { connected: false };
    }

    try {
      const info = await this.client.info('memory');
      const keys = await this.client.dbSize();
      
      return {
        connected: true,
        memory: info,
        keys
      };
    } catch (error) {
      logger.error('Cache stats error', { error: error instanceof Error ? error.message : String(error) });
      return { connected: false };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      await this.client.ping();
      return true;
    } catch (error) {
      logger.error('Redis health check failed', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      logger.info('Redis cache service closed');
    }
  }
}

export const cacheService = new CacheService();
