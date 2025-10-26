/**
 * Performance Monitoring Utilities
 * Tracks performance metrics, budgets, and provides optimization insights
 */

import { createContextLogger } from './logger';

const logger = createContextLogger({ operation: 'performance_monitor' });

export interface PerformanceMetrics {
  timestamp: Date;
  operation: string;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  requestId?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceBudget {
  name: string;
  threshold: number;
  unit: 'ms' | 'bytes' | 'count';
  category: 'api' | 'database' | 'memory' | 'cpu';
  severity: 'warning' | 'error' | 'critical';
}

export interface PerformanceReport {
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalOperations: number;
    averageDuration: number;
    p95Duration: number;
    p99Duration: number;
    maxDuration: number;
    minDuration: number;
  };
  budgets: Array<{
    budget: PerformanceBudget;
    violations: number;
    worstViolation: number;
  }>;
  recommendations: string[];
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private budgets: PerformanceBudget[] = [];
  private maxMetrics = 10000; // Keep last 10k metrics

  constructor() {
    this.initializeBudgets();
    this.startPeriodicCleanup();
  }

  /**
   * Initialize performance budgets
   */
  private initializeBudgets(): void {
    this.budgets = [
      // API Response Times
      {
        name: 'API Response Time - Fast',
        threshold: 100,
        unit: 'ms',
        category: 'api',
        severity: 'warning'
      },
      {
        name: 'API Response Time - Slow',
        threshold: 500,
        unit: 'ms',
        category: 'api',
        severity: 'error'
      },
      {
        name: 'API Response Time - Critical',
        threshold: 1000,
        unit: 'ms',
        category: 'api',
        severity: 'critical'
      },

      // Database Operations
      {
        name: 'Database Query Time',
        threshold: 200,
        unit: 'ms',
        category: 'database',
        severity: 'warning'
      },
      {
        name: 'Database Query Time - Slow',
        threshold: 1000,
        unit: 'ms',
        category: 'database',
        severity: 'error'
      },

      // Memory Usage
      {
        name: 'Memory Usage - Warning',
        threshold: 100 * 1024 * 1024, // 100MB
        unit: 'bytes',
        category: 'memory',
        severity: 'warning'
      },
      {
        name: 'Memory Usage - Critical',
        threshold: 500 * 1024 * 1024, // 500MB
        unit: 'bytes',
        category: 'memory',
        severity: 'critical'
      },

      // CPU Usage
      {
        name: 'CPU Usage - High',
        threshold: 80, // 80%
        unit: 'ms',
        category: 'cpu',
        severity: 'warning'
      }
    ];
  }

  /**
   * Start performance monitoring for an operation
   */
  startOperation(operation: string, requestId?: string): () => void {
    const startTime = process.hrtime.bigint();
    const startCpuUsage = process.cpuUsage();
    const startMemoryUsage = process.memoryUsage();

    return () => {
      const endTime = process.hrtime.bigint();
      const endCpuUsage = process.cpuUsage(startCpuUsage);
      const endMemoryUsage = process.memoryUsage();

      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      const cpuUsage = (endCpuUsage.user + endCpuUsage.system) / 1000; // Convert to milliseconds

      const metric: PerformanceMetrics = {
        timestamp: new Date(),
        operation,
        duration,
        memoryUsage: endMemoryUsage,
        cpuUsage: { user: endCpuUsage.user, system: endCpuUsage.system },
        requestId,
        metadata: {
          memoryDelta: endMemoryUsage.heapUsed - startMemoryUsage.heapUsed,
          cpuDelta: cpuUsage
        }
      };

      this.recordMetric(metric);
    };
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);

    // Check budgets
    this.checkBudgets(metric);

    // Trim metrics if needed
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Check performance budgets
   */
  private checkBudgets(metric: PerformanceMetrics): void {
    for (const budget of this.budgets) {
      let value: number;

      switch (budget.category) {
        case 'api':
        case 'database':
          if (metric.operation.includes(budget.category) || budget.name.includes(metric.operation)) {
            value = metric.duration;
          } else {
            continue;
          }
          break;
        case 'memory':
          value = metric.memoryUsage.heapUsed;
          break;
        case 'cpu':
          value = metric.cpuUsage.user + metric.cpuUsage.system;
          break;
        default:
          continue;
      }

      if (value > budget.threshold) {
        this.handleBudgetViolation(budget, value, metric);
      }
    }
  }

  /**
   * Handle budget violation
   */
  private handleBudgetViolation(budget: PerformanceBudget, value: number, metric: PerformanceMetrics): void {
    const message = `Performance budget violation: ${budget.name} - ${value}${budget.unit} exceeds ${budget.threshold}${budget.unit}`;
    
    const logData = {
      budget: budget.name,
      threshold: budget.threshold,
      actual: value,
      unit: budget.unit,
      operation: metric.operation,
      requestId: metric.requestId,
      severity: budget.severity
    };

    switch (budget.severity) {
      case 'warning':
        logger.warn(logData, message);
        break;
      case 'error':
        logger.error(logData, message);
        break;
      case 'critical':
        logger.error(logData, `CRITICAL: ${message}`);
        break;
    }
  }

  /**
   * Get performance report for a time period
   */
  getPerformanceReport(startDate: Date, endDate: Date): PerformanceReport {
    const periodMetrics = this.metrics.filter(
      m => m.timestamp >= startDate && m.timestamp <= endDate
    );

    if (periodMetrics.length === 0) {
      return {
        period: { start: startDate, end: endDate },
        metrics: {
          totalOperations: 0,
          averageDuration: 0,
          p95Duration: 0,
          p99Duration: 0,
          maxDuration: 0,
          minDuration: 0
        },
        budgets: [],
        recommendations: []
      };
    }

    const durations = periodMetrics.map(m => m.duration).sort((a, b) => a - b);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);

    const metrics = {
      totalOperations: periodMetrics.length,
      averageDuration: totalDuration / periodMetrics.length,
      p95Duration: this.percentile(durations, 0.95),
      p99Duration: this.percentile(durations, 0.99),
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations)
    };

    const budgetViolations = this.calculateBudgetViolations(periodMetrics);
    const recommendations = this.generateRecommendations(metrics, budgetViolations);

    return {
      period: { start: startDate, end: endDate },
      metrics,
      budgets: budgetViolations,
      recommendations
    };
  }

  /**
   * Calculate budget violations
   */
  private calculateBudgetViolations(metrics: PerformanceMetrics[]): Array<{
    budget: PerformanceBudget;
    violations: number;
    worstViolation: number;
  }> {
    const violations: Map<string, { budget: PerformanceBudget; violations: number; worstViolation: number }> = new Map();

    for (const metric of metrics) {
      for (const budget of this.budgets) {
        let value: number;

        switch (budget.category) {
          case 'api':
          case 'database':
            if (metric.operation.includes(budget.category) || budget.name.includes(metric.operation)) {
              value = metric.duration;
            } else {
              continue;
            }
            break;
          case 'memory':
            value = metric.memoryUsage.heapUsed;
            break;
          case 'cpu':
            value = metric.cpuUsage.user + metric.cpuUsage.system;
            break;
          default:
            continue;
        }

        if (value > budget.threshold) {
          const key = budget.name;
          if (!violations.has(key)) {
            violations.set(key, {
              budget,
              violations: 0,
              worstViolation: 0
            });
          }

          const violation = violations.get(key)!;
          violation.violations++;
          violation.worstViolation = Math.max(violation.worstViolation, value);
        }
      }
    }

    return Array.from(violations.values());
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: any, budgetViolations: any[]): string[] {
    const recommendations: string[] = [];

    // Duration recommendations
    if (metrics.averageDuration > 500) {
      recommendations.push('Consider optimizing slow operations - average duration is high');
    }

    if (metrics.p95Duration > 1000) {
      recommendations.push('95th percentile duration is very high - investigate slow queries');
    }

    // Memory recommendations
    const memoryMetrics = this.metrics.slice(-100); // Last 100 metrics
    const avgMemory = memoryMetrics.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / memoryMetrics.length;
    
    if (avgMemory > 200 * 1024 * 1024) { // 200MB
      recommendations.push('High memory usage detected - consider memory optimization');
    }

    // Budget violation recommendations
    for (const violation of budgetViolations) {
      if (violation.violations > 10) {
        recommendations.push(`Frequent violations of ${violation.budget.name} - investigate root cause`);
      }
    }

    // General recommendations
    if (metrics.totalOperations > 1000) {
      recommendations.push('High operation volume - consider implementing caching');
    }

    return recommendations;
  }

  /**
   * Calculate percentile
   */
  private percentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Get current performance snapshot
   */
  getCurrentSnapshot(): {
    timestamp: Date;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    activeOperations: number;
  } {
    return {
      timestamp: new Date(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      activeOperations: this.metrics.length
    };
  }

  /**
   * Start periodic cleanup
   */
  private startPeriodicCleanup(): void {
    setInterval(() => {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Add custom budget
   */
  addBudget(budget: PerformanceBudget): void {
    this.budgets.push(budget);
  }

  /**
   * Get all budgets
   */
  getBudgets(): PerformanceBudget[] {
    return [...this.budgets];
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * Performance decorator for methods
 */
export function measurePerformance(operation: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const endOperation = performanceMonitor.startOperation(operation);
      try {
        const result = await method.apply(this, args);
        return result;
      } finally {
        endOperation();
      }
    };

    return descriptor;
  };
}

/**
 * Performance middleware for Express
 */
export function performanceMiddleware(req: any, res: any, next: any) {
  const operation = `${req.method} ${req.path}`;
  const endOperation = performanceMonitor.startOperation(operation, req.requestId);

  res.on('finish', () => {
    endOperation();
  });

  next();
}

/**
 * Optimized product search function
 */
export function searchProducts(query: string, limit: number = 50, requestId?: string): any[] {
  const endOperation = performanceMonitor.startOperation('search_products', requestId);
  
  try {
    // Import database here to avoid circular dependencies
    const { getDatabase } = require('../db');
    const db = getDatabase();
    
    if (!query || query.trim().length < 2) {
      return [];
    }
    
    const searchTerm = `%${query.trim()}%`;
    
    // Search in multiple fields with proper indexing
    const products = db.prepare(`
          SELECT 
            p.id, p.sku, p.barcode, p.name_en, p.name_si, p.name_ta,
            p.unit, p.category_id, p.is_scale_item, p.tax_code,
            p.price_retail, p.price_wholesale, p.price_credit, p.price_other,
            p.cost, p.reorder_level, p.preferred_supplier_id, p.is_active,
        p.created_at, p.updated_at,
            c.name as category_name,
            s.supplier_name
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          LEFT JOIN suppliers s ON p.preferred_supplier_id = s.id
      WHERE p.is_active = 1 
        AND (
          p.name_en LIKE ? OR 
          p.name_si LIKE ? OR 
          p.name_ta LIKE ? OR 
          p.sku LIKE ? OR 
          p.barcode LIKE ?
        )
      ORDER BY 
        CASE 
          WHEN p.name_en LIKE ? THEN 1
          WHEN p.sku LIKE ? THEN 2
          WHEN p.barcode LIKE ? THEN 3
          ELSE 4
        END,
        p.name_en
      LIMIT ?
    `).all(
      searchTerm, searchTerm, searchTerm, searchTerm, searchTerm,
      searchTerm, searchTerm, searchTerm,
      limit
    );
    
    return products;
    
  } catch (error) {
    console.error('Search products error:', error);
    return [];
  } finally {
    endOperation();
  }
}