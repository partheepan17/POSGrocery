/**
 * React hook for telemetry tracking
 * Provides easy-to-use telemetry functions for components
 */

import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { telemetryService, TelemetryEvent } from '../services/telemetryService';

export interface UseTelemetryOptions {
  featureCode?: string;
  component?: string;
  trackRouteVisits?: boolean;
  trackClicks?: boolean;
  trackInteractions?: boolean;
}

export function useTelemetry(options: UseTelemetryOptions = {}) {
  const location = useLocation();
  const startTimeRef = useRef<number>(Date.now());
  const interactionCountRef = useRef<number>(0);

  const {
    featureCode,
    component,
    trackRouteVisits = true,
    trackClicks = true,
    trackInteractions = true
  } = options;

  // Track route visits
  useEffect(() => {
    if (trackRouteVisits && featureCode) {
      telemetryService.trackRouteVisit(location.pathname, featureCode);
    }
  }, [location.pathname, featureCode, trackRouteVisits]);

  // Track component mount/unmount
  useEffect(() => {
    if (featureCode) {
      const mountTime = Date.now();
      startTimeRef.current = mountTime;

      return () => {
        const duration = Date.now() - mountTime;
        telemetryService.trackUiInteraction(
          'component_unmount',
          featureCode,
          component,
          duration
        );
      };
    }
  }, [featureCode, component]);

  // Track clicks
  const trackClick = useCallback((action: string, customFeatureCode?: string) => {
    if (trackClicks) {
      telemetryService.trackActionClick(
        action,
        customFeatureCode || featureCode || 'unknown.feature',
        component
      );
    }
  }, [trackClicks, featureCode, component]);

  // Track interactions
  const trackInteraction = useCallback((interaction: string, customFeatureCode?: string) => {
    if (trackInteractions) {
      interactionCountRef.current += 1;
      telemetryService.trackUiInteraction(
        interaction,
        customFeatureCode || featureCode || 'unknown.feature',
        component
      );
    }
  }, [trackInteractions, featureCode, component]);

  // Track feature toggle
  const trackToggle = useCallback((enabled: boolean, success: boolean = true) => {
    if (featureCode) {
      telemetryService.trackFeatureToggle(featureCode, enabled, success);
    }
  }, [featureCode]);

  // Track API calls
  const trackApiCall = useCallback((endpoint: string, duration?: number, success: boolean = true) => {
    if (featureCode) {
      telemetryService.trackApiCall(endpoint, featureCode, duration, success);
    }
  }, [featureCode]);

  // Track custom events
  const trackEvent = useCallback((event: Omit<TelemetryEvent, 'featureCode'>) => {
    if (featureCode) {
      telemetryService.trackFeatureUsage({
        ...event,
        featureCode: featureCode
      });
    }
  }, [featureCode]);

  // Track performance metrics
  const trackPerformance = useCallback((metric: string, value: number, unit: string = 'ms') => {
    if (featureCode) {
      telemetryService.trackFeatureUsage({
        featureCode,
        eventType: 'ui_interaction',
        eventData: {
          metric,
          value,
          unit
        },
        metadata: {
          action: 'performance_metric',
          component: component || 'Performance'
        }
      });
    }
  }, [featureCode, component]);

  // Track errors
  const trackError = useCallback((error: Error, context?: string) => {
    if (featureCode) {
      telemetryService.trackFeatureUsage({
        featureCode,
        eventType: 'ui_interaction',
        eventData: {
          error: error.message,
          stack: error.stack,
          context
        },
        metadata: {
          action: 'error',
          component: component || 'ErrorBoundary',
          success: false
        }
      });
    }
  }, [featureCode, component]);

  // Track user engagement
  const trackEngagement = useCallback((engagementType: string, data?: any) => {
    if (featureCode) {
      telemetryService.trackFeatureUsage({
        featureCode,
        eventType: 'ui_interaction',
        eventData: {
          engagementType,
          data,
          interactionCount: interactionCountRef.current,
          timeOnPage: Date.now() - startTimeRef.current
        },
        metadata: {
          action: 'engagement',
          component: component || 'Engagement'
        }
      });
    }
  }, [featureCode, component]);

  return {
    trackClick,
    trackInteraction,
    trackToggle,
    trackApiCall,
    trackEvent,
    trackPerformance,
    trackError,
    trackEngagement
  };
}

/**
 * Hook for tracking feature usage in components
 */
export function useFeatureTracking(featureCode: string, component?: string) {
  return useTelemetry({
    featureCode,
    component,
    trackRouteVisits: true,
    trackClicks: true,
    trackInteractions: true
  });
}

/**
 * Hook for tracking page visits
 */
export function usePageTracking(featureCode?: string) {
  return useTelemetry({
    featureCode,
    trackRouteVisits: true,
    trackClicks: false,
    trackInteractions: false
  });
}

/**
 * Hook for tracking user interactions
 */
export function useInteractionTracking(featureCode: string, component?: string) {
  return useTelemetry({
    featureCode,
    component,
    trackRouteVisits: false,
    trackClicks: true,
    trackInteractions: true
  });
}










