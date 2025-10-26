/**
 * Telemetry Provider
 * Provides telemetry context and automatic tracking
 */

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { telemetryService } from '@/services/telemetryService';
import { useTelemetry } from '@/hooks/useTelemetry';

interface TelemetryContextType {
  trackFeatureUsage: (featureCode: string, eventType: string, data?: any) => void;
  trackRouteVisit: (route: string, featureCode?: string) => void;
  trackActionClick: (action: string, featureCode: string, component?: string) => void;
  trackFeatureToggle: (featureCode: string, enabled: boolean, success?: boolean) => void;
  trackApiCall: (endpoint: string, featureCode: string, duration?: number, success?: boolean) => void;
  trackUiInteraction: (interaction: string, featureCode: string, component?: string, duration?: number) => void;
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);

interface TelemetryProviderProps {
  children: ReactNode;
  enabled?: boolean;
}

export function TelemetryProvider({ children, enabled = true }: TelemetryProviderProps) {
  const location = useLocation();
  const { trackClick, trackInteraction } = useTelemetry({
    featureCode: 'app.telemetry',
    component: 'TelemetryProvider'
  });

  useEffect(() => {
    // Set initial enabled state
    telemetryService.setEnabled(enabled);
  }, [enabled]);

  useEffect(() => {
    // Track route changes
    const featureCode = extractFeatureFromRoute(location.pathname);
    telemetryService.trackRouteVisit(location.pathname, featureCode);
  }, [location.pathname]);

  const trackFeatureUsage = (featureCode: string, eventType: string, data?: any) => {
    telemetryService.trackFeatureUsage({
      featureCode,
      eventType: eventType as any,
      eventData: data
    });
  };

  const trackRouteVisit = (route: string, featureCode?: string) => {
    telemetryService.trackRouteVisit(route, featureCode);
  };

  const trackActionClick = (action: string, featureCode: string, component?: string) => {
    telemetryService.trackActionClick(action, featureCode, component);
  };

  const trackFeatureToggle = (featureCode: string, enabled: boolean, success: boolean = true) => {
    telemetryService.trackFeatureToggle(featureCode, enabled, success);
  };

  const trackApiCall = (endpoint: string, featureCode: string, duration?: number, success: boolean = true) => {
    telemetryService.trackApiCall(endpoint, featureCode, duration, success);
  };

  const trackUiInteraction = (interaction: string, featureCode: string, component?: string, duration?: number) => {
    telemetryService.trackUiInteraction(interaction, featureCode, component, duration);
  };

  const setEnabled = (enabled: boolean) => {
    telemetryService.setEnabled(enabled);
  };

  const contextValue: TelemetryContextType = {
    trackFeatureUsage,
    trackRouteVisit,
    trackActionClick,
    trackFeatureToggle,
    trackApiCall,
    trackUiInteraction,
    isEnabled: enabled,
    setEnabled
  };

  return (
    <TelemetryContext.Provider value={contextValue}>
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetryContext(): TelemetryContextType {
  const context = useContext(TelemetryContext);
  if (context === undefined) {
    throw new Error('useTelemetryContext must be used within a TelemetryProvider');
  }
  return context;
}

/**
 * Extract feature code from route
 */
function extractFeatureFromRoute(route: string): string {
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
    '/admin/audit': 'admin.audit',
    '/admin/analytics': 'admin.analytics'
  };

  return routeMap[route] || 'unknown.feature';
}

/**
 * Higher-order component for automatic telemetry tracking
 */
export function withTelemetry<P extends object>(
  Component: React.ComponentType<P>,
  featureCode: string,
  options?: {
    trackMount?: boolean;
    trackUnmount?: boolean;
    trackClicks?: boolean;
    trackInteractions?: boolean;
  }
) {
  const WrappedComponent = (props: P) => {
    const { trackInteraction } = useTelemetry({
      featureCode,
      component: Component.displayName || Component.name,
      ...options
    });

    useEffect(() => {
      if (options?.trackMount) {
        trackInteraction('component_mount');
      }

      return () => {
        if (options?.trackUnmount) {
          trackInteraction('component_unmount');
        }
      };
    }, [trackInteraction]);

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withTelemetry(${Component.displayName || Component.name})`;
  return WrappedComponent;
}










