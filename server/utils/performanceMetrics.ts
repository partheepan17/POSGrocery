/**
 * Performance Metrics Collection and Analysis
 * Tracks system performance, database queries, and API response times
 */

import { createRequestLogger } from './logger';

interface PerformanceMetric {
  id: string;
  operation: string;
  duration: number;
  timestamp: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

interface SystemMetrics {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_response_time: number;
  slowest_operation: string;
  slowest_duration: number;
  database_queries: number;
  cache_hits: number;
  cache_misses: number;
  memory_usage: number;
  uptime: number;
}

interface DatabaseMetrics {
  total_queries: number;
  slow_queries: number;
  average_query_time: number;
  slowest_query: string;
  slowest_duration: number;
  connection_pool_size: number;
  active_connections: number;
}

interface APIMetrics {
  endpoint: string;
  method: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_response_time: number;
  min_response_time: number;
  max_response_time: number;
  last_request: string;
}

export class PerformanceMetricsCollector {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 10000; // Keep last 10k metrics
  private logger = createRequestLogger({} as any);
  private startTime = Date.now();

  /**
   * Record a performance metric
   */
  recordMetric(operation: string, duration: number, success: boolean, error?: string, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      operation,
      duration,
      timestamp: new Date().toISOString(),
      success,
      error,
      metadata
    };

    this.metrics.push(metric);

    // Keep only the last maxMetrics entries
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow operations
    if (duration > 1000) { // 1 second
      this.logger.warn({
        operation,
        duration,
        success,
        error
      }, 'Slow operation detected');
    }
  }

  /**
   * Get system-wide metrics
   */
  getSystemMetrics(): SystemMetrics {
    const now = Date.now();
    const uptime = now - this.startTime;
    
    const successful = this.metrics.filter(m => m.success);
    const failed = this.metrics.filter(m => !m.success);
    
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const averageResponseTime = this.metrics.length > 0 ? totalDuration / this.metrics.length : 0;
    
    const slowest = this.metrics.reduce((slowest, current) => 
      current.duration > slowest.duration ? current : slowest, 
      { duration: 0, operation: 'none' }
    );

    const dbQueries = this.metrics.filter(m => m.operation.includes('database')).length;
    const cacheHits = this.metrics.filter(m => m.operation.includes('cache') && m.success).length;
    const cacheMisses = this.metrics.filter(m => m.operation.includes('cache') && !m.success).length;

    return {
      total_requests: this.metrics.length,
      successful_requests: successful.length,
      failed_requests: failed.length,
      average_response_time: Math.round(averageResponseTime),
      slowest_operation: slowest.operation,
      slowest_duration: slowest.duration,
      database_queries: dbQueries,
      cache_hits: cacheHits,
      cache_misses: cacheMisses,
      memory_usage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      uptime: Math.round(uptime / 1000) // seconds
    };
  }

  /**
   * Get database-specific metrics
   */
  getDatabaseMetrics(): DatabaseMetrics {
    const dbMetrics = this.metrics.filter(m => m.operation.includes('database'));
    const slowQueries = dbMetrics.filter(m => m.duration > 100); // > 100ms
    
    const totalDuration = dbMetrics.reduce((sum, m) => sum + m.duration, 0);
    const averageQueryTime = dbMetrics.length > 0 ? totalDuration / dbMetrics.length : 0;
    
    const slowest = dbMetrics.reduce((slowest, current) => 
      current.duration > slowest.duration ? current : slowest, 
      { duration: 0, operation: 'none' }
    );

    return {
      total_queries: dbMetrics.length,
      slow_queries: slowQueries.length,
      average_query_time: Math.round(averageQueryTime),
      slowest_query: slowest.operation,
      slowest_duration: slowest.duration,
      connection_pool_size: 1, // SQLite doesn't have connection pooling
      active_connections: 1
    };
  }

  /**
   * Get API endpoint metrics
   */
  getAPIMetrics(): APIMetrics[] {
    const apiMetrics = this.metrics.filter(m => m.operation.includes('api'));
    const grouped = new Map<string, PerformanceMetric[]>();

    // Group by endpoint
    apiMetrics.forEach(metric => {
      const key = metric.metadata?.endpoint || 'unknown';
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(metric);
    });

    return Array.from(grouped.entries()).map(([endpoint, metrics]) => {
      const successful = metrics.filter(m => m.success);
      const failed = metrics.filter(m => !m.success);
      
      const durations = metrics.map(m => m.duration);
      const totalDuration = durations.reduce((sum, d) => sum + d, 0);
      
      return {
        endpoint,
        method: metrics[0]?.metadata?.method || 'unknown',
        total_requests: metrics.length,
        successful_requests: successful.length,
        failed_requests: failed.length,
        average_response_time: Math.round(totalDuration / metrics.length),
        min_response_time: Math.min(...durations),
        max_response_time: Math.max(...durations),
        last_request: metrics[metrics.length - 1]?.timestamp || 'never'
      };
    });
  }

  /**
   * Get recent metrics (last N minutes)
   */
  getRecentMetrics(minutes: number = 5): PerformanceMetric[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.metrics.filter(m => new Date(m.timestamp).getTime() > cutoff);
  }

  /**
   * Get performance trends over time
   */
  getPerformanceTrends(hours: number = 24): { timestamp: string; metrics: SystemMetrics }[] {
    const now = Date.now();
    const interval = 60 * 60 * 1000; // 1 hour intervals
    const trends = [];

    for (let i = 0; i < hours; i++) {
      const startTime = now - (i + 1) * interval;
      const endTime = now - i * interval;
      
      const periodMetrics = this.metrics.filter(m => {
        const time = new Date(m.timestamp).getTime();
        return time >= startTime && time < endTime;
      });

      const successful = periodMetrics.filter(m => m.success);
      const totalDuration = periodMetrics.reduce((sum, m) => sum + m.duration, 0);
      
      trends.unshift({
        timestamp: new Date(startTime).toISOString(),
        metrics: {
          total_requests: periodMetrics.length,
          successful_requests: successful.length,
          failed_requests: periodMetrics.length - successful.length,
          average_response_time: periodMetrics.length > 0 ? Math.round(totalDuration / periodMetrics.length) : 0,
          slowest_operation: 'N/A',
          slowest_duration: 0,
          database_queries: periodMetrics.filter(m => m.operation.includes('database')).length,
          cache_hits: 0,
          cache_misses: 0,
          memory_usage: 0,
          uptime: 0
        }
      });
    }

    return trends;
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(olderThanHours: number = 24): number {
    const cutoff = Date.now() - (olderThanHours * 60 * 60 * 1000);
    const initialLength = this.metrics.length;
    
    this.metrics = this.metrics.filter(m => new Date(m.timestamp).getTime() > cutoff);
    
    const removed = initialLength - this.metrics.length;
    this.logger.info({ removed, remaining: this.metrics.length }, 'Cleared old metrics');
    
    return removed;
  }

  /**
   * Get health status based on metrics
   */
  getHealthStatus(): { status: 'healthy' | 'warning' | 'critical'; issues: string[] } {
    const issues: string[] = [];
    const systemMetrics = this.getSystemMetrics();
    
    // Check error rate
    const errorRate = systemMetrics.total_requests > 0 ? 
      (systemMetrics.failed_requests / systemMetrics.total_requests) * 100 : 0;
    
    if (errorRate > 10) {
      issues.push(`High error rate: ${errorRate.toFixed(1)}%`);
    }
    
    // Check response time
    if (systemMetrics.average_response_time > 2000) {
      issues.push(`Slow average response time: ${systemMetrics.average_response_time}ms`);
    }
    
    // Check memory usage
    if (systemMetrics.memory_usage > 500) { // 500MB
      issues.push(`High memory usage: ${systemMetrics.memory_usage.toFixed(1)}MB`);
    }
    
    // Check slowest operation
    if (systemMetrics.slowest_duration > 5000) { // 5 seconds
      issues.push(`Very slow operation: ${systemMetrics.slowest_operation} (${systemMetrics.slowest_duration}ms)`);
    }
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (issues.length > 0) {
      status = issues.some(issue => issue.includes('High error rate') || issue.includes('Very slow')) ? 'critical' : 'warning';
    }
    
    return { status, issues };
  }
}

export const performanceMetrics = new PerformanceMetricsCollector();
