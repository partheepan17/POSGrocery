import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { initDatabase, closeDatabase } from './db';
import { errorHandler } from './middleware/error';
import { requestIdMiddleware } from './middleware/requestId';
import { createRequestLogger, getLogger } from './utils/logger';
import { startupMetrics } from './utils/startupMetrics';
import { healthRouter } from './routes/health';
import { catalogRouter } from './routes/catalog';
import { discountRouter } from './routes/discounts';
import { refundRouter } from './routes/refunds';
import { cashRouter } from './routes/cash';
import metricsRouter from './routes/metrics';
import errorsRouter from './routes/errors';
import invoicesRouter from './routes/invoices';
import reportsRouter from './routes/reports';
import performanceRouter from './routes/performance';
import stockAlertsRouter from './routes/stockAlerts';
import snapshotReportsRouter from './routes/snapshotReports';
import quickSalesRouter from './routes/quickSales';
import pricingRouter from './routes/pricing';
import { adminRouter } from './routes/admin';
import purchasingRouter from './routes/purchasing';
import salesRouter from './routes/sales';
import returnsRouter from './routes/returns';
import stockRouter from './routes/stock';
import { globalRateLimit, apiRateLimit, bodySizeLimit } from './middleware/rateLimiter';
import { metricsMiddleware } from './middleware/metricsCollector';
import { securityHeaders, requestSizeLimiter, sqlInjectionProtection } from './middleware/security';
import { initializePreparedStatements } from './utils/performance';
import { initializeConcurrency } from './utils/concurrency';
import { scheduler } from './utils/scheduler';
import { runDailyBackup } from './jobs/backup';
import { scheduledSnapshotService } from './jobs/scheduledSnapshots';

// Initialize logger
const logger = getLogger();

// Initialize database with timing
const dbInitStart = Date.now();
initDatabase();
const dbInitTime = Date.now() - dbInitStart;
startupMetrics.recordDatabaseInit(dbInitTime);

// Initialize concurrency settings
initializeConcurrency();

if (!env.FAST_DEV) {
  logger.info({
    event: 'database_initialized',
    duration: dbInitTime,
    message: `Database initialized in ${dbInitTime}ms`
  });
}

// Create Express app
const app = express();

// Request ID middleware (must be first)
app.use(requestIdMiddleware);

// Global rate limiting
app.use(globalRateLimit);

// Security middleware
app.use(helmet());

// Compression
app.use(compression());

// CORS
app.use(cors({
  origin: env.CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body size limiting
app.use(bodySizeLimit(2 * 1024 * 1024)); // 2MB limit

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_RPM + env.RATE_LIMIT_BURST, // Allow burst on top of base rate
  message: {
    error: 'Too many requests',
    message: `Rate limit exceeded. Maximum ${env.RATE_LIMIT_RPM} requests per minute with ${env.RATE_LIMIT_BURST} burst allowance.`,
    retryAfter: Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000)
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    const requestLogger = createRequestLogger(req);
    requestLogger.warn('Rate limit exceeded');
    
    res.status(429).json({
      error: 'Too many requests',
      code: 'RATE_LIMITED',
      details: {
        limit: env.RATE_LIMIT_RPM,
        burst: env.RATE_LIMIT_BURST,
        retryAfter: Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000)
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Apply additional rate limiting for API routes
app.use('/api', apiRateLimit);
app.use(limiter);

// Apply security middleware
app.use(securityHeaders);
app.use(requestSizeLimiter(env.JSON_LIMIT_MB * 1024 * 1024)); // Convert MB to bytes
app.use(sqlInjectionProtection);

// Apply metrics collection middleware
app.use(metricsMiddleware);

// Body parsing with configurable limits
const jsonLimit = `${env.JSON_LIMIT_MB}mb`;
const urlEncodedLimit = `${env.URL_ENCODED_LIMIT_MB}mb`;

app.use(express.json({ 
  limit: jsonLimit,
  verify: (req: any, res: any, buf: Buffer) => {
    // Log oversized requests
    if (buf.length > env.JSON_LIMIT_MB * 1024 * 1024) {
      const requestLogger = createRequestLogger(req);
      requestLogger.warn({
        message: 'Oversized JSON request blocked',
        contentLength: buf.length,
        limit: jsonLimit
      });
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: urlEncodedLimit,
  verify: (req: any, res: any, buf: Buffer) => {
    // Log oversized requests
    if (buf.length > env.URL_ENCODED_LIMIT_MB * 1024 * 1024) {
      const requestLogger = createRequestLogger(req);
      requestLogger.warn({
        message: 'Oversized URL-encoded request blocked',
        contentLength: buf.length,
        limit: urlEncodedLimit
      });
    }
  }
}));

// Request logging (skip in fast dev mode)
if (!env.FAST_DEV) {
  app.use((req, res, next) => {
    const requestLogger = createRequestLogger(req);
    requestLogger.info('Request received');
    next();
  });
}

// API index endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Virtual POS API',
    version: '1.0.0',
    endpoints: {
      health: ['GET /health', 'GET /api/health'],
      catalog: [
        'GET /api/categories',
        'GET /api/suppliers',
        'GET /api/products/search',
        'GET /api/products/barcode/:code'
      ]
    },
    documentation: 'https://github.com/your-org/virtual-pos'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Virtual POS API Server',
    version: '1.0.0',
    status: 'running',
    endpoints: '/api'
  });
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ ok: true, message: 'Test endpoint working' });
});

// Mount routers
app.use(healthRouter);
app.use(catalogRouter);
app.use(discountRouter);
app.use(refundRouter);
app.use(cashRouter);
app.use('/api/metrics', metricsRouter);
app.use(invoicesRouter);
app.use(reportsRouter);
app.use(performanceRouter);
app.use(stockAlertsRouter);
app.use(snapshotReportsRouter);
app.use(quickSalesRouter);
app.use(pricingRouter);
app.use(adminRouter);
app.use(purchasingRouter);
app.use(salesRouter);
app.use(returnsRouter);
app.use(stockRouter);
app.use('/api/errors', errorsRouter);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
// Initialize prepared statements before starting server
initializePreparedStatements();

// Initialize scheduler for daily backups
if (!env.FAST_DEV) {
  scheduler.scheduleDaily(
    'daily-backup',
    'Daily Database Backup',
    '20:00', // 8:00 PM local time
    async () => {
      logger.info('Starting scheduled daily backup');
      const result = runDailyBackup();
      if (result.ok) {
        logger.info('Scheduled backup completed successfully', { file: result.file });
      } else {
        logger.error('Scheduled backup failed', { error: result.error });
      }
    }
  );
  
  logger.info('Daily backup scheduler initialized for 20:00');
}

// Start scheduled snapshots
if (!env.FAST_DEV) {
  scheduledSnapshotService.start();
  logger.info('Daily snapshot scheduler started');
}

const server = app.listen(env.PORT, () => {
  // Record listening time
  startupMetrics.recordListening();
  
  const metrics = startupMetrics.getMetrics();
  const slaCheck = startupMetrics.checkSLA();
  
  logger.info({
    event: 'server_started',
    port: env.PORT,
    env: env.NODE_ENV,
    corsOrigins: env.CORS_ORIGINS,
    fastDev: env.FAST_DEV,
    startupTime: metrics.totalStartupTime,
    meetsSLA: slaCheck.meetsSLA,
    violations: slaCheck.violations,
    message: `Server started in ${metrics.totalStartupTime}ms (SLA: <300ms)`
  });
  
  // Delay hardware checks until after server is listening
  if (!env.FAST_DEV && !env.SKIP_HARDWARE_CHECKS) {
    setImmediate(() => {
      performHardwareChecks();
    });
  }
});

// Hardware checks (delayed until after server starts)
function performHardwareChecks(): void {
  const hwCheckStart = Date.now();
  logger.info('Performing hardware checks...');
  
  // Add any hardware initialization here
  // This runs after the server is already listening
  // so it doesn't block startup
  
  const hwCheckTime = Date.now() - hwCheckStart;
  startupMetrics.recordHardwareCheck(hwCheckTime);
  
  logger.info({
    event: 'hardware_checks_completed',
    duration: hwCheckTime,
    message: `Hardware checks completed in ${hwCheckTime}ms`
  });
}

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  // Shutdown scheduler first
  scheduler.shutdown();
  
  // Stop scheduled snapshots
  scheduledSnapshotService.stop();
  
  server.close((err) => {
    if (err) {
      logger.error('Error during server shutdown:', err);
      process.exit(1);
    }
    
    logger.info('Server closed');
    closeDatabase();
    logger.info('Database closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
