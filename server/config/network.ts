/**
 * Network and Caching Configuration
 * Centralized configuration for CORS, caching, and network settings
 */

import { env } from './env';

export interface NetworkConfig {
  cors: {
    origins: string[];
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
    maxAge: number;
  };
  caching: {
    enabled: boolean;
    defaultTTL: number;
    maxSize: number;
    compression: boolean;
    etag: boolean;
    lastModified: boolean;
  };
  compression: {
    enabled: boolean;
    level: number;
    threshold: number;
    filter: (req: any, res: any) => boolean;
  };
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    burstLimit: number;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
  };
  security: {
    helmet: boolean;
    hsts: boolean;
    csp: boolean;
    xssProtection: boolean;
    noSniff: boolean;
    frameOptions: string;
  };
  offline: {
    enabled: boolean;
    cacheStrategy: 'cache-first' | 'network-first' | 'stale-while-revalidate';
    maxCacheAge: number;
    fallbackUrls: string[];
  };
}

export const networkConfig: NetworkConfig = {
  cors: {
    origins: env.CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'Pragma',
      'X-API-Key',
      'X-Client-Version',
      'X-Request-ID'
    ],
    exposedHeaders: [
      'X-Total-Count',
      'X-Page-Count',
      'X-Current-Page',
      'X-Per-Page',
      'X-Request-ID',
      'X-Response-Time'
    ],
    maxAge: 86400 // 24 hours
  },

  caching: {
    enabled: env.NODE_ENV === 'production',
    defaultTTL: 300, // 5 minutes
    maxSize: 100 * 1024 * 1024, // 100MB
    compression: true,
    etag: true,
    lastModified: true
  },

  compression: {
    enabled: true,
    level: 6, // Compression level (1-9)
    threshold: 1024, // Only compress responses > 1KB
    filter: (req, res) => {
      // Don't compress if already compressed
      if (req.headers['x-no-compression']) {
        return false;
      }
      
      // Use compression for all responses
      return true;
    }
  },

  rateLimit: {
    enabled: true,
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_RPM,
    burstLimit: env.RATE_LIMIT_BURST,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },

  security: {
    helmet: true,
    hsts: env.NODE_ENV === 'production',
    csp: true,
    xssProtection: true,
    noSniff: true,
    frameOptions: 'DENY'
  },

  offline: {
    enabled: env.NODE_ENV === 'production',
    cacheStrategy: 'stale-while-revalidate',
    maxCacheAge: 3600, // 1 hour
    fallbackUrls: [
      '/offline.html',
      '/static/offline.json'
    ]
  }
};

// Cache control headers for different types of content
export const cacheHeaders = {
  // Static assets (JS, CSS, images)
  static: {
    'Cache-Control': 'public, max-age=31536000, immutable', // 1 year
    'ETag': true
  },
  
  // API responses
  api: {
    'Cache-Control': 'private, max-age=300', // 5 minutes
    'ETag': true,
    'Vary': 'Accept-Encoding, Authorization'
  },
  
  // User-specific data
  user: {
    'Cache-Control': 'private, max-age=60', // 1 minute
    'ETag': true,
    'Vary': 'Authorization'
  },
  
  // Real-time data
  realtime: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  },
  
  // Health checks
  health: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
};

// CORS configuration for different environments
export const corsConfig = {
  development: {
    origin: networkConfig.cors.origins,
    credentials: networkConfig.cors.credentials,
    methods: networkConfig.cors.methods,
    allowedHeaders: networkConfig.cors.allowedHeaders,
    exposedHeaders: networkConfig.cors.exposedHeaders,
    maxAge: networkConfig.cors.maxAge,
    optionsSuccessStatus: 200
  },
  
  production: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      if (networkConfig.cors.origins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: networkConfig.cors.credentials,
    methods: networkConfig.cors.methods,
    allowedHeaders: networkConfig.cors.allowedHeaders,
    exposedHeaders: networkConfig.cors.exposedHeaders,
    maxAge: networkConfig.cors.maxAge,
    optionsSuccessStatus: 200
  }
};

// Security headers configuration
export const securityHeaders = {
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        baseUri: ["'self'"],
        manifestSrc: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  },
  
  custom: {
    'X-Frame-Options': networkConfig.security.frameOptions,
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'X-DNS-Prefetch-Control': 'off',
    'X-Download-Options': 'noopen',
    'X-Permitted-Cross-Domain-Policies': 'none'
  }
};

// Rate limiting configuration
export const rateLimitConfig = {
  global: {
    windowMs: networkConfig.rateLimit.windowMs,
    max: networkConfig.rateLimit.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(networkConfig.rateLimit.windowMs / 1000)
    },
    skip: (req: any) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/api/health';
    }
  },
  
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    standardHeaders: true,
    legacyHeaders: false
  },
  
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
  },
  
  upload: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 uploads per minute
    standardHeaders: true,
    legacyHeaders: false
  }
};

// Offline support configuration
export const offlineConfig = {
  serviceWorker: {
    enabled: networkConfig.offline.enabled,
    cacheName: 'pos-cache-v1',
    strategies: {
      'api': 'network-first',
      'static': 'cache-first',
      'images': 'cache-first',
      'fonts': 'cache-first'
    }
  },
  
  cache: {
    maxAge: networkConfig.offline.maxCacheAge,
    maxEntries: 100,
    purgeOnQuotaError: true
  },
  
  fallback: {
    document: '/offline.html',
    image: '/static/offline-image.png',
    font: '/static/offline-font.woff2'
  }
};

// Print service configuration
export const printConfig = {
  enabled: true,
  defaultPrinter: 'default',
  paperSize: 'A4',
  orientation: 'portrait',
  margins: {
    top: 10,
    right: 10,
    bottom: 10,
    left: 10
  },
  fonts: {
    default: 'Arial',
    monospace: 'Courier New'
  },
  timeout: 30000, // 30 seconds
  retries: 3
};







