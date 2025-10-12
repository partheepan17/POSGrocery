import { Router, Request, Response } from 'express';
import { getDatabase } from '../db';
import { env } from '../config/env';
import { asyncHandler } from '../middleware/error';
import { createError, ErrorContext } from '../types/errors';
import { createRequestLogger } from '../utils/logger';
import { dbHealthChecker, HealthCheck, IntegrityCheck } from '../utils/dbHealth';
import { getStartupMetrics, checkStartupSLA, getStartupPerformanceSummary } from '../utils/startupMetrics';
import { getBackupStatus } from '../jobs/backup';

export const healthRouter = Router();

// Safe database check that won't crash if DB is down
const checkDatabase = () => {
  try {
    const db = getDatabase();
    const start = Date.now();
    db.prepare('SELECT 1').get();
    const responseTime = Date.now() - start;
    return { ok: true, responseTime };
  } catch (error) {
    return { 
      ok: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'DATABASE_ERROR'
    };
  }
};

// Basic health check - always returns ok:true if server is running
const basicHealthCheck = (req: Request, res: Response) => {
  try {
    // Debug environment variables
    console.log('DEBUG: env.APP_NAME:', env.APP_NAME);
    console.log('DEBUG: env.APP_VERSION:', env.APP_VERSION);
    console.log('DEBUG: env.BUILD_SHA:', env.BUILD_SHA);
    console.log('DEBUG: env.BUILD_TIME:', env.BUILD_TIME);
    
    // Generate build time if not set in env or is 'unknown'
    const buildTime = (env.BUILD_TIME && env.BUILD_TIME !== 'unknown') ? env.BUILD_TIME : 
      new Date().toISOString().split('T')[0];
    
    // Generate build SHA if not set in env or is 'unknown'
    const buildSha = (env.BUILD_SHA && env.BUILD_SHA !== 'unknown') ? env.BUILD_SHA : 
      'dev-' + Date.now().toString(36);

    const health = {
      ok: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: env.APP_VERSION,
      environment: env.NODE_ENV,
      service: 'pos-grocery',
      build: {
        name: env.APP_NAME,
        version: env.APP_VERSION,
        buildSha: buildSha,
        buildTime: buildTime
      }
    };

    res.json(health);
  } catch (error) {
    console.error('Error in basicHealthCheck:', error);
    res.status(500).json({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Check backup status
const checkBackupStatus = () => {
  const backupStatus = getBackupStatus();
  const now = new Date();
  
  // Check if last backup was more than 24 hours ago
  const lastBackupAge = backupStatus.lastSuccess 
    ? now.getTime() - backupStatus.lastSuccess.getTime()
    : Infinity;
  
  const isBackupStale = lastBackupAge > 24 * 60 * 60 * 1000; // 24 hours in ms
  const hasRecentErrors = backupStatus.errorCount > 0;
  
  return {
    ok: !isBackupStale && !hasRecentErrors,
    lastBackup: backupStatus.lastBackup,
    lastSuccess: backupStatus.lastSuccess,
    lastError: backupStatus.lastError,
    errorCount: backupStatus.errorCount,
    totalBackups: backupStatus.totalBackups,
    isStale: isBackupStale,
    ageHours: lastBackupAge !== Infinity ? Math.round(lastBackupAge / (60 * 60 * 1000) * 100) / 100 : null
  };
};

// Detailed health check with service status
const detailedHealthCheck = asyncHandler(async (req, res) => {
  const dbCheck = checkDatabase();
  const memoryUsage = process.memoryUsage();
  const memoryUsagePercent = memoryUsage.heapUsed / memoryUsage.heapTotal;
  const backupCheck = checkBackupStatus();

  const health = {
    ok: true, // Always true if server is responding
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: env.APP_VERSION,
    environment: env.NODE_ENV,
    service: 'pos-grocery',
    build: {
      name: env.APP_NAME,
      version: env.APP_VERSION,
      buildSha: env.BUILD_SHA || 'unknown',
      buildTime: env.BUILD_TIME || 'unknown'
    },
    services: {
      database: dbCheck,
      memory: {
        ok: memoryUsagePercent < 0.9, // Alert if >90% memory usage
        usage: Math.round(memoryUsagePercent * 100) / 100,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal
      },
      backup: backupCheck
    },
    warnings: [] as string[]
  };

  // Add warnings for backup issues
  if (backupCheck.isStale) {
    health.warnings.push(`Last backup was ${backupCheck.ageHours} hours ago (threshold: 24h)`);
  }
  if (backupCheck.errorCount > 0) {
    health.warnings.push(`Backup has ${backupCheck.errorCount} recent errors`);
  }

  // Set appropriate HTTP status based on critical services
  const statusCode = dbCheck.ok ? 200 : 503;
  res.status(statusCode).json(health);
});

// Readiness probe - checks if app is ready to serve traffic
const readinessCheck = asyncHandler(async (req, res) => {
  const dbReadinessCheck = await dbHealthChecker.checkReadiness();
  
  const readiness = {
    ok: dbReadinessCheck.status === 'pass', // Only ready if database is ready
    timestamp: new Date().toISOString(),
    service: 'pos-grocery',
    checks: {
      database: {
        status: dbReadinessCheck.status,
        message: dbReadinessCheck.message,
        duration: dbReadinessCheck.duration,
        details: dbReadinessCheck.details
      }
    }
  };

  const statusCode = dbReadinessCheck.status === 'pass' ? 200 : 503;
  res.status(statusCode).json(readiness);
});

// Liveness probe - checks if app is alive (always returns ok if server is running)
const livenessCheck = (req: Request, res: Response) => {
  const liveness = {
    ok: true,
    timestamp: new Date().toISOString(),
    service: 'pos-grocery',
    uptime: process.uptime()
  };

  res.json(liveness);
};

// Startup metrics endpoint - provides detailed startup performance data
const startupMetricsCheck = asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const metrics = getStartupMetrics();
    const slaCheck = checkStartupSLA();
    const performanceSummary = getStartupPerformanceSummary();
    
    const startupData = {
      ok: slaCheck.meetsSLA,
      timestamp: new Date().toISOString(),
      service: 'pos-grocery',
      metrics: {
        startup: metrics,
        sla: slaCheck,
        performance: performanceSummary
      },
      thresholds: {
        listening: '300ms',
        databaseInit: '500ms',
        hardwareCheck: '1000ms'
      },
      status: slaCheck.meetsSLA ? 'healthy' : 'degraded'
    };
    
    requestLogger.info('Startup metrics requested', {
      startupTime: metrics.totalStartupTime,
      meetsSLA: slaCheck.meetsSLA,
      violations: slaCheck.violations.length
    });
    
    const statusCode = slaCheck.meetsSLA ? 200 : 503;
    res.status(statusCode).json(startupData);
    
  } catch (error) {
    const context: ErrorContext = {
      requestId: req.requestId,
      operation: 'STARTUP_METRICS',
      resource: '/api/health/startup'
    };
    
    requestLogger.error('Startup metrics check failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    const errorResponse = {
      ok: false,
      timestamp: new Date().toISOString(),
      service: 'pos-grocery',
      error: 'Startup metrics check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
    
    res.status(500).json(errorResponse);
  }
});

// Integrity check - comprehensive database integrity validation
const integrityCheck = asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    requestLogger.debug('Starting database integrity check');
    
    const integrityChecks = await dbHealthChecker.checkIntegrity();
    const failedChecks = integrityChecks.filter(check => check.status === 'fail');
    const allPassed = failedChecks.length === 0;
    
    const integrity = {
      ok: allPassed,
      timestamp: new Date().toISOString(),
      service: 'pos-grocery',
      checks: integrityChecks,
      summary: {
        total: integrityChecks.length,
        passed: integrityChecks.filter(c => c.status === 'pass').length,
        failed: failedChecks.length
      }
    };

    if (allPassed) {
      requestLogger.info('Database integrity check passed', {
        totalChecks: integrityChecks.length,
        duration: integrityChecks.reduce((sum, check) => sum + (check.duration || 0), 0)
      });
      res.json(integrity);
    } else {
      requestLogger.warn('Database integrity check failed', {
        failedChecks: failedChecks.map(c => c.name),
        totalChecks: integrityChecks.length
      });
      
      // Return 200 with ok: false for integrity checks (non-blocking)
      // This allows the service to continue running even with integrity issues
      res.json(integrity);
    }
    
  } catch (error) {
    const context: ErrorContext = {
      requestId: req.requestId,
      operation: 'INTEGRITY_CHECK',
      resource: '/api/health/integrity'
    };
    
    requestLogger.error('Database integrity check failed with error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Return error response but don't crash the process
    const errorResponse = {
      ok: false,
      timestamp: new Date().toISOString(),
      service: 'pos-grocery',
      error: 'Integrity check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      checks: []
    };
    
    res.status(500).json(errorResponse);
  }
});

// Build metadata endpoint
const buildMetadataCheck = (req: Request, res: Response) => {
  const build = {
    name: env.APP_NAME,
    version: env.APP_VERSION,
    buildSha: env.BUILD_SHA || 'unknown',
    buildTime: env.BUILD_TIME || 'unknown',
    timestamp: new Date().toISOString()
  };

  res.json(build);
};

// Backup status endpoint
const backupStatusCheck = (req: Request, res: Response) => {
  const backupStatus = getBackupStatus();
  const backupCheck = checkBackupStatus();
  
  res.json({
    ok: backupCheck.ok,
    timestamp: new Date().toISOString(),
    service: 'pos-grocery',
    backup: {
      ...backupCheck,
      status: backupCheck.ok ? 'healthy' : 'unhealthy',
      nextScheduled: backupStatus.nextScheduled
    }
  });
};

// Health endpoints
healthRouter.get('/health', basicHealthCheck);
// Simple test endpoint
healthRouter.get('/api/health/test', (req: Request, res: Response) => {
  res.json({ ok: true, message: 'Test endpoint working' });
});

healthRouter.get('/api/health', detailedHealthCheck);
healthRouter.get('/api/health/ready', readinessCheck);
healthRouter.get('/api/health/live', livenessCheck);
healthRouter.get('/api/health/integrity', integrityCheck);
healthRouter.get('/api/health/startup', startupMetricsCheck);
healthRouter.get('/api/health/build', buildMetadataCheck);
healthRouter.get('/api/health/backup', backupStatusCheck);
