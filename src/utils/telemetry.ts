export interface TelemetryEvent {
  id: string;
  type: 'user_action' | 'system_event' | 'error' | 'performance' | 'feature_usage';
  name: string;
  data: Record<string, any>;
  timestamp: Date;
  sessionId: string;
  userId?: string;
  version: string;
}

export interface TelemetryConfig {
  enabled: boolean;
  endpoint?: string;
  batchSize: number;
  flushInterval: number; // milliseconds
  maxRetries: number;
  debug: boolean;
}

class TelemetryLogger {
  private config: TelemetryConfig;
  private events: TelemetryEvent[] = [];
  private sessionId: string;
  private flushTimer?: NodeJS.Timeout;
  private isFlushing = false;

  constructor(config: TelemetryConfig) {
    this.config = config;
    this.sessionId = this.generateSessionId();
    this.startFlushTimer();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startFlushTimer(): void {
    if (this.config.enabled && this.config.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.flush();
      }, this.config.flushInterval);
    }
  }

  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  log(
    type: TelemetryEvent['type'],
    name: string,
    data: Record<string, any> = {},
    userId?: string
  ): void {
    if (!this.config.enabled) return;

    const event: TelemetryEvent = {
      id: this.generateEventId(),
      type,
      name,
      data,
      timestamp: new Date(),
      sessionId: this.sessionId,
      userId,
      version: '1.0.0', // Should come from package.json
    };

    this.events.push(event);

    if (this.config.debug) {
      console.log('Telemetry event:', event);
    }

    // Auto-flush if batch size is reached
    if (this.events.length >= this.config.batchSize) {
      this.flush();
    }
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async flush(): Promise<void> {
    if (this.isFlushing || this.events.length === 0) return;

    this.isFlushing = true;
    const eventsToFlush = [...this.events];
    this.events = [];

    try {
      if (this.config.endpoint) {
        await this.sendEvents(eventsToFlush);
      } else {
        // Store locally or in console for debugging
        if (this.config.debug) {
          console.log('Telemetry events (local):', eventsToFlush);
        }
        this.storeLocally(eventsToFlush);
      }
    } catch (error) {
      console.error('Failed to flush telemetry events:', error);
      // Put events back in queue for retry
      this.events.unshift(...eventsToFlush);
    } finally {
      this.isFlushing = false;
    }
  }

  private async sendEvents(events: TelemetryEvent[]): Promise<void> {
    let retries = 0;
    
    while (retries < this.config.maxRetries) {
      try {
        const response = await fetch(this.config.endpoint!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            events,
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
          }),
        });

        if (response.ok) {
          return;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        retries++;
        if (retries >= this.config.maxRetries) {
          throw error;
        }
        
        // Exponential backoff
        const delay = Math.pow(2, retries) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  private storeLocally(events: TelemetryEvent[]): void {
    try {
      const existing = JSON.parse(localStorage.getItem('telemetry_events') || '[]');
      const updated = [...existing, ...events];
      
      // Keep only last 1000 events to prevent storage bloat
      if (updated.length > 1000) {
        updated.splice(0, updated.length - 1000);
      }
      
      localStorage.setItem('telemetry_events', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to store telemetry events locally:', error);
    }
  }

  // Convenience methods
  logUserAction(action: string, data: Record<string, any> = {}, userId?: string): void {
    this.log('user_action', action, data, userId);
  }

  logSystemEvent(event: string, data: Record<string, any> = {}): void {
    this.log('system_event', event, data);
  }

  logError(error: string, data: Record<string, any> = {}): void {
    this.log('error', error, data);
  }

  logPerformance(metric: string, value: number, data: Record<string, any> = {}): void {
    this.log('performance', metric, { value, ...data });
  }

  logFeatureUsage(feature: string, data: Record<string, any> = {}): void {
    this.log('feature_usage', feature, data);
  }

  updateConfig(config: Partial<TelemetryConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.enabled !== undefined) {
      if (config.enabled) {
        this.startFlushTimer();
      } else {
        this.stopFlushTimer();
      }
    }
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getPendingEventsCount(): number {
    return this.events.length;
  }

  async destroy(): Promise<void> {
    this.stopFlushTimer();
    await this.flush();
  }
}

// Default configuration
const defaultConfig: TelemetryConfig = {
  enabled: process.env.NODE_ENV === 'development' || false,
  batchSize: 10,
  flushInterval: 30000, // 30 seconds
  maxRetries: 3,
  debug: process.env.NODE_ENV === 'development',
};

// Create singleton instance
export const telemetry = new TelemetryLogger(defaultConfig);

// Performance monitoring helpers
export function measurePerformance<T>(
  name: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  const start = performance.now();
  
  const result = fn();
  
  if (result instanceof Promise) {
    return result.then((value) => {
      const duration = performance.now() - start;
      telemetry.logPerformance(name, duration);
      return value;
    });
  } else {
    const duration = performance.now() - start;
    telemetry.logPerformance(name, duration);
    return result;
  }
}

// Error boundary integration
export function logError(error: Error, errorInfo?: any): void {
  telemetry.logError(error.message, {
    stack: error.stack,
    errorInfo,
    url: window.location.href,
    userAgent: navigator.userAgent,
  });
}

// Auto-track page views
export function trackPageView(path: string): void {
  telemetry.logUserAction('page_view', { path });
}

// Auto-track component usage
export function trackComponentUsage(componentName: string, action: string, data: Record<string, any> = {}): void {
  telemetry.logFeatureUsage('component', {
    component: componentName,
    action,
    ...data,
  });
}









