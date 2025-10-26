/**
 * useFeatures Hook
 * Utility functions for feature and permission checking
 */

import { useCallback, useMemo } from 'react';
import { useFeatures as useFeatureContext } from './FeatureProvider';

// Types
export interface FeatureCheckResult {
  hasFeature: boolean;
  canUse: boolean;
  dependencies: string[];
  missingDependencies: string[];
}

export interface PermissionCheckResult {
  hasPermission: boolean;
  isAdmin: boolean;
  role: string;
}

export interface FeatureSummary {
  totalFeatures: number;
  enabledFeatures: number;
  totalPermissions: number;
  enabledPermissions: number;
  featureCategories: string[];
  enabledFeatureCodes: string[];
  enabledPermissionCodes: string[];
}

/**
 * Main useFeatures hook with utility functions
 */
export const useFeatures = () => {
  const context = useFeatureContext();

  // Feature checking
  const hasFeature = useCallback((featureCode: string): boolean => {
    return context.hasFeature(featureCode);
  }, [context.hasFeature]);

  // Permission checking
  const can = useCallback((permissionCode: string): boolean => {
    return context.can(permissionCode);
  }, [context.can]);

  // List enabled features
  const listEnabled = useCallback((): string[] => {
    return context.listEnabled();
  }, [context.listEnabled]);

  // List enabled permissions
  const listEnabledPermissions = useCallback((): string[] => {
    return context.listEnabledPermissions();
  }, [context.listEnabledPermissions]);

  // Check multiple features at once
  const hasFeatures = useCallback((featureCodes: string[]): { [key: string]: boolean } => {
    return featureCodes.reduce((acc, code) => {
      acc[code] = hasFeature(code);
      return acc;
    }, {} as { [key: string]: boolean });
  }, [hasFeature]);

  // Check multiple permissions at once
  const canAll = useCallback((permissionCodes: string[]): { [key: string]: boolean } => {
    return permissionCodes.reduce((acc, code) => {
      acc[code] = can(code);
      return acc;
    }, {} as { [key: string]: boolean });
  }, [can]);

  // Check if user has all specified features
  const hasAllFeatures = useCallback((featureCodes: string[]): boolean => {
    return featureCodes.every(code => hasFeature(code));
  }, [hasFeature]);

  // Check if user has any of the specified features
  const hasAnyFeature = useCallback((featureCodes: string[]): boolean => {
    return featureCodes.some(code => hasFeature(code));
  }, [hasFeature]);

  // Check if user has all specified permissions
  const canAllPermissions = useCallback((permissionCodes: string[]): boolean => {
    return permissionCodes.every(code => can(code));
  }, [can]);

  // Check if user has any of the specified permissions
  const canAnyPermission = useCallback((permissionCodes: string[]): boolean => {
    return permissionCodes.some(code => can(code));
  }, [can]);

  // Check feature with dependency validation
  const checkFeature = useCallback((featureCode: string): FeatureCheckResult => {
    if (!context.features) {
      return {
        hasFeature: false,
        canUse: false,
        dependencies: [],
        missingDependencies: []
      };
    }

    const hasFeatureFlag = hasFeature(featureCode);
    const dependencies = context.features.dependencies[featureCode] || [];
    const missingDependencies = dependencies.filter(dep => !hasFeature(dep));
    const canUse = hasFeatureFlag && missingDependencies.length === 0;

    return {
      hasFeature: hasFeatureFlag,
      canUse,
      dependencies,
      missingDependencies
    };
  }, [context.features, hasFeature]);

  // Check permission with role information
  const checkPermission = useCallback((permissionCode: string): PermissionCheckResult => {
    if (!context.features) {
      return {
        hasPermission: false,
        isAdmin: false,
        role: 'unknown'
      };
    }

    const hasPermissionFlag = can(permissionCode);
    const role = context.features.user.role;
    const isAdmin = role === 'admin' || can('admin.all');

    return {
      hasPermission: hasPermissionFlag,
      isAdmin,
      role
    };
  }, [context.features, can]);

  // Get feature summary
  const getSummary = useCallback((): FeatureSummary | null => {
    if (!context.features) return null;

    return {
      totalFeatures: context.features.summary.totalFeatures,
      enabledFeatures: context.features.summary.enabledFeatures,
      totalPermissions: context.features.summary.totalPermissions,
      enabledPermissions: context.features.summary.enabledPermissions,
      featureCategories: context.features.summary.featureCategories,
      enabledFeatureCodes: listEnabled(),
      enabledPermissionCodes: listEnabledPermissions()
    };
  }, [context.features, listEnabled, listEnabledPermissions]);

  // Get features by category
  const getFeaturesByCategory = useCallback((category: string): string[] => {
    if (!context.features) return [];
    
    return Object.entries(context.features.enabled)
      .filter(([code, enabled]) => enabled && code.startsWith(category))
      .map(([code, _]) => code);
  }, [context.features]);

  // Get permissions by category
  const getPermissionsByCategory = useCallback((category: string): string[] => {
    if (!context.features) return [];
    
    return Object.entries(context.features.permissions)
      .filter(([code, enabled]) => enabled && code.startsWith(category))
      .map(([code, _]) => code);
  }, [context.features]);

  // Check if user is admin
  const isAdmin = useCallback((): boolean => {
    if (!context.features) return false;
    return context.features.user.role === 'admin' || can('admin.all');
  }, [context.features, can]);

  // Check if user is manager or admin
  const isManager = useCallback((): boolean => {
    if (!context.features) return false;
    return ['admin', 'manager', 'supervisor'].includes(context.features.user.role);
  }, [context.features]);

  // Check if user is cashier
  const isCashier = useCallback((): boolean => {
    if (!context.features) return false;
    return context.features.user.role === 'cashier';
  }, [context.features]);

  // Get user role
  const getUserRole = useCallback((): string => {
    if (!context.features) return 'unknown';
    return context.features.user.role;
  }, [context.features]);

  // Get user info
  const getUserInfo = useCallback(() => {
    if (!context.features) return null;
    return context.features.user;
  }, [context.features]);

  // Get tenant info
  const getTenant = useCallback((): string => {
    if (!context.features) return 'unknown';
    return context.features.tenant;
  }, [context.features]);

  // Check if features are loaded
  const isLoaded = useCallback((): boolean => {
    return context.features !== null;
  }, [context.features]);

  // Check if there's an error
  const hasError = useCallback((): boolean => {
    return context.error !== null;
  }, [context.error]);

  // Check if currently loading
  const isLoading = useCallback((): boolean => {
    return context.loading;
  }, [context.loading]);

  // Check if connected to real-time updates
  const isConnected = useCallback((): boolean => {
    return context.connected;
  }, [context.connected]);

  // Memoized feature categories
  const featureCategories = useMemo(() => {
    if (!context.features) return [];
    
    const categories = new Set<string>();
    Object.keys(context.features.enabled).forEach(code => {
      const parts = code.split('.');
      if (parts.length > 1) {
        categories.add(parts[0]);
      }
    });
    
    return Array.from(categories).sort();
  }, [context.features]);

  // Memoized permission categories
  const permissionCategories = useMemo(() => {
    if (!context.features) return [];
    
    const categories = new Set<string>();
    Object.keys(context.features.permissions).forEach(code => {
      const parts = code.split('.');
      if (parts.length > 1) {
        categories.add(parts[0]);
      }
    });
    
    return Array.from(categories).sort();
  }, [context.features]);

  return {
    // Core context
    ...context,
    
    // Enhanced utility functions
    hasFeatures,
    canAll,
    hasAllFeatures,
    hasAnyFeature,
    canAllPermissions,
    canAnyPermission,
    checkFeature,
    checkPermission,
    getSummary,
    getFeaturesByCategory,
    getPermissionsByCategory,
    isAdmin,
    isManager,
    isCashier,
    getUserRole,
    getUserInfo,
    getTenant,
    isLoaded,
    hasError,
    isLoading,
    isConnected,
    featureCategories,
    permissionCategories
  };
};

// Convenience hooks for specific use cases
export const useFeature = (featureCode: string): boolean => {
  const { hasFeature } = useFeatures();
  return hasFeature(featureCode);
};

export const usePermission = (permissionCode: string): boolean => {
  const { can } = useFeatures();
  return can(permissionCode);
};

export const useFeaturesList = (featureCodes: string[]): { [key: string]: boolean } => {
  const { hasFeatures } = useFeatures();
  return hasFeatures(featureCodes);
};

export const usePermissions = (permissionCodes: string[]): { [key: string]: boolean } => {
  const { canAll } = useFeatures();
  return canAll(permissionCodes);
};

export const useFeatureCheck = (featureCode: string): FeatureCheckResult => {
  const { checkFeature } = useFeatures();
  return checkFeature(featureCode);
};

export const usePermissionCheck = (permissionCode: string): PermissionCheckResult => {
  const { checkPermission } = useFeatures();
  return checkPermission(permissionCode);
};

export const useFeatureSummary = (): FeatureSummary | null => {
  const { getSummary } = useFeatures();
  return getSummary();
};

export const useUserRole = (): string => {
  const { getUserRole } = useFeatures();
  return getUserRole();
};

export const useIsAdmin = (): boolean => {
  const { isAdmin } = useFeatures();
  return isAdmin();
};

export const useIsManager = (): boolean => {
  const { isManager } = useFeatures();
  return isManager();
};

export const useIsCashier = (): boolean => {
  const { isCashier } = useFeatures();
  return isCashier();
};

export default useFeatures;

