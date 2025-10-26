// Simple logger implementation
const logger = {
  debug: (message: string, meta?: any) => console.debug(`[HealthCheck] ${message}`, meta),
  info: (message: string, meta?: any) => console.info(`[HealthCheck] ${message}`, meta),
  warn: (message: string, meta?: any) => console.warn(`[HealthCheck] ${message}`, meta),
  error: (message: string, meta?: any) => console.error(`[HealthCheck] ${message}`, meta),
};

interface HealthCheckResult {
  isOnline: boolean;
  lastChecked: Date;
  error?: string;
}

class HealthCheckService {
  private logger = logger;
  private isOnline = false;
  private lastChecked: Date | null = null;
  private subscribers: Set<(result: HealthCheckResult) => void> = new Set();
  private intervalId: NodeJS.Timeout | null = null;
  private isChecking = false;
  
  // Configuration
  private readonly CHECK_INTERVAL = 2 * 60 * 1000; // 2 minutes
  private readonly TIMEOUT = 10000; // 10 seconds
  private readonly RETRY_INTERVAL = 30 * 1000; // 30 seconds when offline

  constructor() {
    this.startHealthChecks();
  }

  /**
   * Subscribe to health check updates
   */
  subscribe(callback: (result: HealthCheckResult) => void): () => void {
    this.subscribers.add(callback);
    
    // Immediately send current status
    callback(this.getCurrentResult());
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get current health status
   */
  getCurrentResult(): HealthCheckResult {
    return {
      isOnline: this.isOnline,
      lastChecked: this.lastChecked || new Date(),
    };
  }

  /**
   * Force a health check
   */
  async checkNow(): Promise<HealthCheckResult> {
    if (this.isChecking) {
      return this.getCurrentResult();
    }

    this.isChecking = true;
    
    try {
      const result = await this.performHealthCheck();
      this.updateStatus(result);
      return result;
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    // Initial check
    this.checkNow();
    
    // Set up interval
    this.intervalId = setInterval(() => {
      this.checkNow();
    }, this.CHECK_INTERVAL);
  }

  /**
   * Stop health checks
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Perform actual health check
   */
  private async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 
        `${window.location.protocol}//${window.location.host}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);
      
      const response = await fetch(`${apiBaseUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      clearTimeout(timeoutId);
      
      const duration = Date.now() - startTime;
      
      if (response.ok) {
        this.logger.debug('Health check successful', { 
          status: response.status, 
          duration 
        });
        
        return {
          isOnline: true,
          lastChecked: new Date(),
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.warn('Health check failed', { 
        error: errorMessage, 
        duration 
      });
      
      return {
        isOnline: false,
        lastChecked: new Date(),
        error: errorMessage,
      };
    }
  }

  /**
   * Update status and notify subscribers
   */
  private updateStatus(result: HealthCheckResult): void {
    const wasOnline = this.isOnline;
    this.isOnline = result.isOnline;
    this.lastChecked = result.lastChecked;
    
    // Notify all subscribers
    this.subscribers.forEach(callback => {
      try {
        callback(result);
      } catch (error) {
        this.logger.error('Error in health check subscriber', { error });
      }
    });
    
    // Log status changes
    if (wasOnline !== this.isOnline) {
      if (this.isOnline) {
        this.logger.info('System came online');
      } else {
        this.logger.warn('System went offline', { error: result.error });
      }
    }
  }

  /**
   * Get singleton instance
   */
  private static instance: HealthCheckService | null = null;
  
  static getInstance(): HealthCheckService {
    if (!this.instance) {
      this.instance = new HealthCheckService();
    }
    return this.instance;
  }
}

// Export singleton instance
export const healthCheckService = HealthCheckService.getInstance();

// Export types
export type { HealthCheckResult };
