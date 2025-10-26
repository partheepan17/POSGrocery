/**
 * Feature Provider
 * Central state management for features and permissions with real-time updates
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { createContextLogger } from '@/utils/logger';

// Types
export interface FeatureState {
  enabled: { [featureCode: string]: boolean };
  permissions: { [permissionCode: string]: boolean };
  dependencies: { [featureCode: string]: string[] };
  user: {
    id: number;
    username: string;
    role: string;
    isActive: boolean;
  };
  tenant: string;
  summary: {
    totalFeatures: number;
    enabledFeatures: number;
    totalPermissions: number;
    enabledPermissions: number;
    featureCategories: string[];
  };
  timestamp: string;
}

export interface FeatureContextType {
  // State
  features: FeatureState | null;
  loading: boolean;
  error: string | null;
  connected: boolean;
  
  // Actions
  refresh: () => Promise<void>;
  hasFeature: (featureCode: string) => boolean;
  can: (permissionCode: string) => boolean;
  listEnabled: () => string[];
  listEnabledPermissions: () => string[];
  
  // Connection management
  connect: () => void;
  disconnect: () => void;
}

// Create context
const FeatureContext = createContext<FeatureContextType | undefined>(undefined);

// Props interface
interface FeatureProviderProps {
  children: React.ReactNode;
  apiBaseUrl?: string;
  tenantId?: string;
  authToken?: string;
  enableSSE?: boolean;
  enableDevTools?: boolean;
}

// Default configuration
const DEFAULT_CONFIG = {
  // Prefer Vite env at runtime, else fall back to current origin
  apiBaseUrl:
    (import.meta as any).env?.VITE_API_BASE_URL ||
    (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : 'http://localhost:3002'),
  enableSSE: true,
  enableDevTools: (globalThis as any).process?.env?.NODE_ENV === 'development'
};

export const FeatureProvider: React.FC<FeatureProviderProps> = ({
  children,
  apiBaseUrl = DEFAULT_CONFIG.apiBaseUrl,
  tenantId,
  authToken,
  enableSSE = DEFAULT_CONFIG.enableSSE,
  enableDevTools = DEFAULT_CONFIG.enableDevTools
}) => {
  // State
  const [features, setFeatures] = useState<FeatureState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  
  // Refs
  const sseRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const logger = createContextLogger({ operation: 'feature_provider' });

  // DevTools integration
  useEffect(() => {
    if (enableDevTools && features) {
      // Expose to window for DevTools
      (window as any).__FEATURE_STATE__ = {
        features,
        refresh: () => refresh(),
        hasFeature: (code: string) => hasFeature(code),
        can: (perm: string) => can(perm),
        listEnabled: () => listEnabled(),
        listEnabledPermissions: () => listEnabledPermissions()
      };
      
      logger.debug('Feature state exposed to DevTools', { features });
    }
  }, [features, enableDevTools]);

  // Fetch features from API
  const fetchFeatures = useCallback(async (): Promise<FeatureState | null> => {
    if (!authToken || !tenantId) {
      logger.warn('Cannot fetch features: missing authToken or tenantId');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${apiBaseUrl}/api/meta/features`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'X-Tenant-ID': tenantId,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(data.error || 'Failed to fetch features');
      }

      const featureState: FeatureState = data.data;
      
      logger.info('Features fetched successfully', {
        enabledFeatures: featureState.summary.enabledFeatures,
        enabledPermissions: featureState.summary.enabledPermissions,
        tenant: featureState.tenant
      });

      return featureState;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Failed to fetch features', { error: errorMessage });
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, authToken, tenantId, logger]);

  // Refresh function
  const refresh = useCallback(async (): Promise<void> => {
    logger.info('Refreshing features');
    const newFeatures = await fetchFeatures();
    if (newFeatures) {
      setFeatures(newFeatures);
    }
  }, [fetchFeatures, logger]);

  // SSE connection management
  const connectSSE = useCallback(() => {
    if (!enableSSE || !authToken || !tenantId || sseRef.current) {
      return;
    }

    try {
      const sseUrl = `${apiBaseUrl}/api/realtime/events/${tenantId}?token=${authToken}`;
      logger.info('Connecting to SSE', { sseUrl: sseUrl.replace(authToken, '[TOKEN]') });

      const eventSource = new EventSource(sseUrl);
      sseRef.current = eventSource;

      eventSource.onopen = () => {
        logger.info('SSE connection established');
        setConnected(true);
        setError(null);
      };

      eventSource.onerror = (event) => {
        logger.error('SSE connection error', { event });
        setConnected(false);
        
        // Retry connection after 5 seconds
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        
        retryTimeoutRef.current = setTimeout(() => {
          logger.info('Retrying SSE connection');
          disconnectSSE();
          connectSSE();
        }, 5000);
      };

      // Listen for feature updates
      eventSource.addEventListener('features:update', (event) => {
        try {
          const data = JSON.parse(event.data);
          logger.info('Features update received via SSE', { data });
          
          // Refresh features when update is received
          refresh();
        } catch (err) {
          logger.error('Failed to parse SSE features update', { error: err });
        }
      });

      // Listen for other relevant events
      eventSource.addEventListener('permissions:update', (event) => {
        try {
          const data = JSON.parse(event.data);
          logger.info('Permissions update received via SSE', { data });
          refresh();
        } catch (err) {
          logger.error('Failed to parse SSE permissions update', { error: err });
        }
      });

      // Listen for connection events
      eventSource.addEventListener('connected', (event) => {
        try {
          const data = JSON.parse(event.data);
          logger.info('SSE connected', { data });
        } catch (err) {
          logger.error('Failed to parse SSE connected event', { error: err });
        }
      });

      // Listen for heartbeat
      eventSource.addEventListener('heartbeat', (event) => {
        try {
          const data = JSON.parse(event.data);
          logger.debug('SSE heartbeat received', { timestamp: data.timestamp });
        } catch (err) {
          logger.error('Failed to parse SSE heartbeat', { error: err });
        }
      });

    } catch (err) {
      logger.error('Failed to create SSE connection', { error: err });
      setError('Failed to connect to real-time updates');
    }
  }, [apiBaseUrl, authToken, tenantId, enableSSE, refresh, logger]);

  // Disconnect SSE
  const disconnectSSE = useCallback(() => {
    if (sseRef.current) {
      logger.info('Disconnecting SSE');
      sseRef.current.close();
      sseRef.current = null;
      setConnected(false);
    }
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, [logger]);

  // Connect/disconnect functions
  const connect = useCallback(() => {
    connectSSE();
  }, [connectSSE]);

  const disconnect = useCallback(() => {
    disconnectSSE();
  }, [disconnectSSE]);

  // Initial fetch and SSE connection
  useEffect(() => {
    if (authToken && tenantId) {
      fetchFeatures().then(fetchedFeatures => {
        if (fetchedFeatures) {
          setFeatures(fetchedFeatures);
        }
      });
      connectSSE();
    }

    return () => {
      disconnectSSE();
    };
  }, [authToken, tenantId, fetchFeatures, connectSSE, disconnectSSE]);

  // Utility functions
  const hasFeature = useCallback((featureCode: string): boolean => {
    if (!features) return false;
    return features.enabled[featureCode] === true;
  }, [features]);

  const can = useCallback((permissionCode: string): boolean => {
    if (!features) return false;
    return features.permissions[permissionCode] === true;
  }, [features]);

  const listEnabled = useCallback((): string[] => {
    if (!features) return [];
    return Object.entries(features.enabled)
      .filter(([_, enabled]) => enabled)
      .map(([code, _]) => code);
  }, [features]);

  const listEnabledPermissions = useCallback((): string[] => {
    if (!features) return [];
    return Object.entries(features.permissions)
      .filter(([_, enabled]) => enabled)
      .map(([code, _]) => code);
  }, [features]);

  // Context value
  const contextValue: FeatureContextType = {
    // State
    features,
    loading,
    error,
    connected,
    
    // Actions
    refresh,
    hasFeature,
    can,
    listEnabled,
    listEnabledPermissions,
    
    // Connection management
    connect,
    disconnect
  };

  return (
    <FeatureContext.Provider value={contextValue}>
      {children}
    </FeatureContext.Provider>
  );
};

// Hook to use feature context
export const useFeatures = (): FeatureContextType => {
  const context = useContext(FeatureContext);
  if (context === undefined) {
    throw new Error('useFeatures must be used within a FeatureProvider');
  }
  return context;
};

// Hook for feature checking (convenience)
export const useFeature = (featureCode: string): boolean => {
  const { hasFeature } = useFeatures();
  return hasFeature(featureCode);
};

// Hook for permission checking (convenience)
export const usePermission = (permissionCode: string): boolean => {
  const { can } = useFeatures();
  return can(permissionCode);
};

// Hook for multiple features checking
export const useFeaturesList = (featureCodes: string[]): { [key: string]: boolean } => {
  const { hasFeature } = useFeatures();
  return featureCodes.reduce((acc, code) => {
    acc[code] = hasFeature(code);
    return acc;
  }, {} as { [key: string]: boolean });
};

// Hook for multiple permissions checking
export const usePermissions = (permissionCodes: string[]): { [key: string]: boolean } => {
  const { can } = useFeatures();
  return permissionCodes.reduce((acc, code) => {
    acc[code] = can(code);
    return acc;
  }, {} as { [key: string]: boolean });
};

export default FeatureProvider;

