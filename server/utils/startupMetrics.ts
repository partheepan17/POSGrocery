import { getLogger } from './logger';

export interface StartupMetrics {
  startTime: number;
  listeningTime: number;
  totalStartupTime: number;
  databaseInitTime?: number;
  hardwareCheckTime?: number;
  memoryUsage: NodeJS.MemoryUsage;
  environment: string;
  fastDev: boolean;
}

class StartupMetricsCollector {
  private startTime: number;
  private listeningTime: number = 0;
  private databaseInitTime: number = 0;
  private hardwareCheckTime: number = 0;
  private logger = getLogger();

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Record when the server starts listening
   */
  recordListening(): void {
    this.listeningTime = Date.now();
    const listeningDuration = this.listeningTime - this.startTime;
    
    this.logger.info({
      event: 'server_listening',
      startupTime: listeningDuration,
      threshold: 300,
      withinSLA: listeningDuration <= 300,
      message: `Server listening in ${listeningDuration}ms (SLA: <300ms)`
    });
  }

  /**
   * Record database initialization time
   */
  recordDatabaseInit(duration: number): void {
    this.databaseInitTime = duration;
    this.logger.info({
      event: 'database_initialized',
      duration: duration,
      message: `Database initialized in ${duration}ms`
    });
  }

  /**
   * Record hardware check completion time
   */
  recordHardwareCheck(duration: number): void {
    this.hardwareCheckTime = duration;
    this.logger.info({
      event: 'hardware_checks_completed',
      duration: duration,
      message: `Hardware checks completed in ${duration}ms`
    });
  }

  /**
   * Get complete startup metrics
   */
  getMetrics(): StartupMetrics {
    const totalStartupTime = this.listeningTime - this.startTime;
    
    return {
      startTime: this.startTime,
      listeningTime: this.listeningTime,
      totalStartupTime: totalStartupTime,
      databaseInitTime: this.databaseInitTime || undefined,
      hardwareCheckTime: this.hardwareCheckTime || undefined,
      memoryUsage: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'unknown',
      fastDev: process.env.FAST_DEV === 'true'
    };
  }

  /**
   * Check if startup meets SLA requirements
   */
  checkSLA(): {
    meetsSLA: boolean;
    violations: string[];
    metrics: StartupMetrics;
  } {
    const metrics = this.getMetrics();
    const violations: string[] = [];

    // SLA: <300ms to listening
    if (metrics.totalStartupTime > 300) {
      violations.push(`Startup time ${metrics.totalStartupTime}ms exceeds SLA of 300ms`);
    }

    // SLA: <500ms for database init (if not fast dev)
    if (!metrics.fastDev && metrics.databaseInitTime && metrics.databaseInitTime > 500) {
      violations.push(`Database init time ${metrics.databaseInitTime}ms exceeds SLA of 500ms`);
    }

    // SLA: <1000ms for hardware checks (if not fast dev)
    if (!metrics.fastDev && metrics.hardwareCheckTime && metrics.hardwareCheckTime > 1000) {
      violations.push(`Hardware check time ${metrics.hardwareCheckTime}ms exceeds SLA of 1000ms`);
    }

    const meetsSLA = violations.length === 0;

    this.logger.info({
      event: 'startup_sla_check',
      meetsSLA: meetsSLA,
      violations: violations,
      metrics: metrics,
      message: meetsSLA ? 'Startup meets SLA requirements' : 'Startup SLA violations detected'
    });

    return {
      meetsSLA,
      violations,
      metrics
    };
  }

  /**
   * Get startup performance summary
   */
  getPerformanceSummary(): {
    status: 'excellent' | 'good' | 'warning' | 'critical';
    score: number;
    recommendations: string[];
    metrics: StartupMetrics;
  } {
    const metrics = this.getMetrics();
    const slaCheck = this.checkSLA();
    
    let score = 100;
    const recommendations: string[] = [];

    // Calculate performance score
    if (metrics.totalStartupTime <= 100) {
      score -= 0; // Excellent
    } else if (metrics.totalStartupTime <= 200) {
      score -= 10; // Good
    } else if (metrics.totalStartupTime <= 300) {
      score -= 20; // Warning
    } else {
      score -= 40; // Critical
    }

    // Add recommendations based on performance
    if (metrics.totalStartupTime > 200) {
      recommendations.push('Consider optimizing startup sequence');
    }
    
    if (metrics.databaseInitTime && metrics.databaseInitTime > 300) {
      recommendations.push('Database initialization is slow - check connection pool settings');
    }
    
    if (metrics.hardwareCheckTime && metrics.hardwareCheckTime > 500) {
      recommendations.push('Hardware checks are slow - consider running asynchronously');
    }

    if (metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal > 0.8) {
      recommendations.push('High memory usage during startup - check for memory leaks');
    }

    // Determine status
    let status: 'excellent' | 'good' | 'warning' | 'critical';
    if (score >= 90) {
      status = 'excellent';
    } else if (score >= 75) {
      status = 'good';
    } else if (score >= 60) {
      status = 'warning';
    } else {
      status = 'critical';
    }

    return {
      status,
      score: Math.max(0, score),
      recommendations,
      metrics
    };
  }
}

// Global startup metrics collector
export const startupMetrics = new StartupMetricsCollector();

/**
 * Get current startup metrics
 */
export function getStartupMetrics(): StartupMetrics {
  return startupMetrics.getMetrics();
}

/**
 * Check startup SLA compliance
 */
export function checkStartupSLA() {
  return startupMetrics.checkSLA();
}

/**
 * Get startup performance summary
 */
export function getStartupPerformanceSummary() {
  return startupMetrics.getPerformanceSummary();
}




