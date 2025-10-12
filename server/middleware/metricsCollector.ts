/**
 * Metrics Collector Middleware
 * Collects and aggregates system metrics for observability
 */

import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../db';

interface MetricsData {
  timestamp: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  requestSize: number;
  responseSize: number;
  userAgent?: string;
  ip?: string;
}

interface SystemMetrics {
  totalRequests: number;
  totalErrors: number;
  averageResponseTime: number;
  requestsPerMinute: number;
  errorRate: number;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  recentErrors: Array<{ timestamp: string; endpoint: string; error: string }>;
}

class MetricsCollector {
  private metrics: MetricsData[] = [];
  private maxMetrics = 10000; // Keep last 10k requests
  private startTime = Date.now();

  recordRequest(req: Request, res: Response, responseTime: number) {
    const metric: MetricsData = {
      timestamp: new Date().toISOString(),
      endpoint: req.path,
      method: req.method,
      statusCode: res.statusCode,
      responseTime,
      requestSize: parseInt(req.get('content-length') || '0'),
      responseSize: parseInt(res.get('content-length') || '0'),
      userAgent: req.get('user-agent'),
      ip: req.ip
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow queries
    if (responseTime > 1000) { // > 1 second
      console.warn(`🐌 Slow query detected: ${req.method} ${req.path} took ${responseTime}ms`);
    }
  }

  getSystemMetrics(): SystemMetrics {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentMetrics = this.metrics.filter(m => 
      new Date(m.timestamp).getTime() > oneMinuteAgo
    );

    const totalRequests = this.metrics.length;
    const totalErrors = this.metrics.filter(m => m.statusCode >= 400).length;
    const averageResponseTime = this.metrics.length > 0 
      ? this.metrics.reduce((sum, m) => sum + m.responseTime, 0) / this.metrics.length
      : 0;

    // Count requests per endpoint
    const endpointCounts = new Map<string, number>();
    this.metrics.forEach(m => {
      const key = `${m.method} ${m.endpoint}`;
      endpointCounts.set(key, (endpointCounts.get(key) || 0) + 1);
    });

    const topEndpoints = Array.from(endpointCounts.entries())
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Recent errors
    const recentErrors = this.metrics
      .filter(m => m.statusCode >= 400 && new Date(m.timestamp).getTime() > oneMinuteAgo)
      .map(m => ({
        timestamp: m.timestamp,
        endpoint: `${m.method} ${m.endpoint}`,
        error: `HTTP ${m.statusCode}`
      }))
      .slice(-10);

    return {
      totalRequests,
      totalErrors,
      averageResponseTime: Math.round(averageResponseTime),
      requestsPerMinute: recentMetrics.length,
      errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
      topEndpoints,
      recentErrors
    };
  }

  getDatabaseMetrics() {
    try {
      const db = getDatabase();
      
      // Get database file size
      const fs = require('fs');
      const path = require('path');
      const dbPath = path.join(__dirname, '../data/pos.db');
      const stats = fs.statSync(dbPath);
      const fileSizeMB = Math.round(stats.size / 1024 / 1024);

      // Get table counts
      const tableCounts = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all() as { name: string }[];

      const counts: Record<string, number> = {};
      for (const table of tableCounts) {
        try {
          const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get() as { count: number };
          counts[table.name] = count.count;
        } catch (error) {
          counts[table.name] = 0;
        }
      }

      return {
        fileSizeMB,
        tableCounts: counts,
        totalRecords: Object.values(counts).reduce((sum, count) => sum + count, 0)
      };
    } catch (error) {
      return {
        fileSizeMB: 0,
        tableCounts: {},
        totalRecords: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  getPerformanceMetrics() {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    return {
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(memoryUsage.external / 1024 / 1024) // MB
      },
      uptime: {
        seconds: Math.round(uptime),
        human: this.formatUptime(uptime)
      },
      process: {
        pid: process.pid,
        platform: process.platform,
        nodeVersion: process.version
      }
    };
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  }

  clearMetrics() {
    this.metrics = [];
  }
}

// Singleton instance
export const metricsCollector = new MetricsCollector();

// Middleware to collect metrics
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    metricsCollector.recordRequest(req, res, responseTime);
  });

  next();
}
