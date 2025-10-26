/**
 * Telemetry Service
 * Handles frontend feature usage tracking
 */

// import { createContextLogger } from '../server/utils/logger';

// const logger = createContextLogger({ operation: 'telemetry_service' });
const logger = {
  error: (message: string, data?: any) => console.error(message, data),
  info: (message: string, data?: any) => console.info(message, data),
  warn: (message: string, data?: any) => console.warn(message, data)
};

export interface TelemetryEvent {
  featureCode: string;
  eventType: 'route_visit' | 'action_click' | 'feature_toggle' | 'api_call' | 'ui_interaction';
  eventData?: Record<string, any>;
  metadata?: {
    route?: string;
    component?: string;
    action?: string;
    duration?: number;
    success?: boolean;
  };
}

export interface UsageAnalytics {
  usageData: { [featureCode: string]: UsageDataPoint[] };
  summary: FeatureSummary[];
  recommendations: FeatureRecommendation[];
  period: {
    start: string;
    end: string;
    groupBy: string;
  };
  metadata: {
    totalFeatures: number;
    totalDataPoints: number;
    generatedAt: string;
  };
}

export interface UsageDataPoint {
  period: string;
  usage: number;
  avgUsage: number;
  peakUsage: number;
  uniqueUsers: number;
  activeDays: number;
}

export interface FeatureSummary {
  featureCode: string;
  totalUsage: number;
  avgDailyUsage: number;
  peakDailyUsage: number;
  totalUniqueUsers: number;
  activeDays: number;
  firstUsage: string;
  lastUsage: string;
  usageTrend: 'increasing' | 'decreasing' | 'stable';
}

export interface FeatureRecommendation {
  featureCode: string;
  recommendation: string;
  confidence: number;
  reasoning: string;
  usageData: any;
}

class TelemetryService {
  private baseUrl: string;
  private isEnabled: boolean = true;
  private eventQueue: TelemetryEvent[] = [];
  private flushInterval: number = 30000; // 30 seconds
  private maxQueueSize: number = 100;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || '/api';
    this.startFlushTimer();
  }

  /**
   * Track a feature usage event
   */
  trackFeatureUsage(event: TelemetryEvent): void {
    if (!this.isEnabled) {
      return;
    }

    try {
      // Add to queue
      this.eventQueue.push({
        ...event,
        metadata: {
          ...event.metadata,
          // timestamp: Date.now() // Not part of metadata interface
        }
      });

      // Flush if queue is full
      if (this.eventQueue.length >= this.maxQueueSize) {
        this.flushEvents();
      }

      logger.info('Feature usage tracked', {
        featureCode: event.featureCode,
        eventType: event.eventType,
        queueSize: this.eventQueue.length
      });

    } catch (error) {
      logger.error('Failed to track feature usage', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Track route visit
   */
  trackRouteVisit(route: string, featureCode?: string): void {
    this.trackFeatureUsage({
      featureCode: featureCode || this.extractFeatureFromRoute(route),
      eventType: 'route_visit',
      metadata: {
        route,
        component: 'Router'
      }
    });
  }

  /**
   * Track action click
   */
  trackActionClick(action: string, featureCode: string, component?: string): void {
    this.trackFeatureUsage({
      featureCode,
      eventType: 'action_click',
      metadata: {
        action,
        component: component || 'Button'
      }
    });
  }

  /**
   * Track feature toggle
   */
  trackFeatureToggle(featureCode: string, enabled: boolean, success: boolean = true): void {
    this.trackFeatureUsage({
      featureCode,
      eventType: 'feature_toggle',
      eventData: {
        enabled,
        success
      },
      metadata: {
        action: 'toggle',
        component: 'FeatureToggle',
        success
      }
    });
  }

  /**
   * Track API call
   */
  trackApiCall(endpoint: string, featureCode: string, duration?: number, success: boolean = true): void {
    this.trackFeatureUsage({
      featureCode,
      eventType: 'api_call',
      eventData: {
        endpoint,
        duration,
        success
      },
      metadata: {
        action: 'api_call',
        component: 'ApiService',
        duration,
        success
      }
    });
  }

  /**
   * Track UI interaction
   */
  trackUiInteraction(interaction: string, featureCode: string, component?: string, duration?: number): void {
    this.trackFeatureUsage({
      featureCode,
      eventType: 'ui_interaction',
      eventData: {
        interaction,
        duration
      },
      metadata: {
        action: interaction,
        component: component || 'UI',
        duration
      }
    });
  }

  /**
   * Get usage analytics
   */
  async getUsageAnalytics(params?: {
    featureCode?: string;
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month';
    limit?: number;
  }): Promise<UsageAnalytics> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.featureCode) queryParams.append('featureCode', params.featureCode);
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      if (params?.groupBy) queryParams.append('groupBy', params.groupBy);
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const response = await fetch(`${this.baseUrl}/telemetry/usage-analytics?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data;

    } catch (error) {
      logger.error('Failed to get usage analytics', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Get feature recommendations
   */
  async getFeatureRecommendations(): Promise<FeatureRecommendation[]> {
    try {
      const response = await fetch(`${this.baseUrl}/telemetry/feature-recommendations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data.recommendations;

    } catch (error) {
      logger.error('Failed to get feature recommendations', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Enable/disable telemetry
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (enabled) {
      this.startFlushTimer();
    } else {
      this.stopFlushTimer();
    }
  }

  /**
   * Flush all pending events
   */
  async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) {
      return;
    }

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const response = await fetch(`${this.baseUrl}/telemetry/feature-usage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(events)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      logger.info('Telemetry events flushed', { count: events.length });

    } catch (error) {
      logger.error('Failed to flush telemetry events', { error: error instanceof Error ? error.message : String(error) });
      // Re-queue events for retry
      this.eventQueue.unshift(...events);
    }
  }

  /**
   * Extract feature code from route
   */
  private extractFeatureFromRoute(route: string): string {
    // Map routes to feature codes
    const routeMap: { [key: string]: string } = {
      '/dashboard': 'dashboard.view',
      '/sales': 'sales.view',
      '/sales/checkout': 'sales.checkout',
      '/sales/returns': 'sales.return',
      '/inventory': 'inventory.view',
      '/inventory/products': 'inventory.products',
      '/inventory/grn': 'inventory.receive',
      '/reports': 'reports.view',
      '/reports/sales': 'reports.sales',
      '/reports/inventory': 'reports.inventory',
      '/admin': 'admin.view',
      '/admin/features': 'admin.features',
      '/admin/users': 'admin.users',
      '/admin/audit': 'admin.audit'
    };

    return routeMap[route] || 'unknown.feature';
  }

  /**
   * Get authentication token
   */
  private getAuthToken(): string {
    return localStorage.getItem('authToken') || '';
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    this.stopFlushTimer();
    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, this.flushInterval);
  }

  /**
   * Stop flush timer
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Cleanup on page unload
   */
  destroy(): void {
    this.stopFlushTimer();
    this.flushEvents(); // Flush remaining events
  }
}

// Export singleton instance
export const telemetryService = new TelemetryService();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    telemetryService.destroy();
  });
}
