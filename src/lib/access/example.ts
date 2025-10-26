/**
 * Access Control Integration Example
 * Demonstrates how to use the access control system in your application
 */

import React from 'react';
import { accessPolicy, dependencyManager, featureCache, User } from './index';

/**
 * Example: Check if user can access a feature
 */
export async function checkFeatureAccess(tenantId: string, user: User, featureCode: string): Promise<boolean> {
  try {
    return await accessPolicy.isFeatureEnabled(tenantId, user, featureCode);
  } catch (error) {
    console.error('Error checking feature access:', error);
    return false;
  }
}

/**
 * Example: Check if user has permission
 */
export async function checkUserPermission(user: User, permissionCode: string): Promise<boolean> {
  try {
    return await accessPolicy.hasPermission(user, permissionCode);
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Example: Comprehensive policy check
 */
export async function validateAccess(tenantId: string, user: User, featureCode: string, permissionCode: string): Promise<void> {
  try {
    await accessPolicy.checkPolicy({
      tenantId,
      user,
      feature: featureCode,
      permission: permissionCode
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Access denied: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Example: Get user's accessible features
 */
export async function getUserAccessibleFeatures(tenantId: string, user: User): Promise<string[]> {
  try {
    return await accessPolicy.getUserFeatures(tenantId, user);
  } catch (error) {
    console.error('Error getting user features:', error);
    return [];
  }
}

/**
 * Example: Check if feature can be disabled
 */
export async function canDisableFeature(tenantId: string, featureCode: string): Promise<{
  canDisable: boolean;
  blockingDependents: string[];
}> {
  try {
    const validation = await dependencyManager.validateDisable(tenantId, featureCode);
    return {
      canDisable: validation.canDisable,
      blockingDependents: validation.blockingDependents
    };
  } catch (error) {
    console.error('Error checking feature disable:', error);
    return {
      canDisable: false,
      blockingDependents: []
    };
  }
}

/**
 * Example: Get feature dependencies
 */
export async function getFeatureDependencies(tenantId: string, featureCode: string): Promise<string[]> {
  try {
    return await dependencyManager.getDependencies(tenantId, featureCode);
  } catch (error) {
    console.error('Error getting feature dependencies:', error);
    return [];
  }
}

/**
 * Example: Middleware for Express.js routes
 */
export function createAccessMiddleware(tenantId: string, featureCode?: string, permissionCode?: string) {
  return async (req: any, res: any, next: any) => {
    try {
      const user = req.user; // Assuming user is attached to request
      
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      await accessPolicy.checkPolicy({
        tenantId,
        user,
        feature: featureCode,
        permission: permissionCode
      });

      next();
    } catch (error) {
      if (error instanceof Error) {
        return res.status(403).json({ 
          error: 'Access denied', 
          message: error.message 
        });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Example: React hook for feature access
 */
export function useFeatureAccess(tenantId: string, user: User | null, featureCode: string) {
  const [hasAccess, setHasAccess] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    if (!user) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    checkFeatureAccess(tenantId, user, featureCode)
      .then(setHasAccess)
      .catch(() => setHasAccess(false))
      .finally(() => setLoading(false));
  }, [tenantId, user, featureCode]);

  return { hasAccess, loading };
}

/**
 * Example: React hook for permission check
 */
export function usePermission(user: User | null, permissionCode: string) {
  const [hasPermission, setHasPermission] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    if (!user) {
      setHasPermission(false);
      setLoading(false);
      return;
    }

    checkUserPermission(user, permissionCode)
      .then(setHasPermission)
      .catch(() => setHasPermission(false))
      .finally(() => setLoading(false));
  }, [user, permissionCode]);

  return { hasPermission, loading };
}

/**
 * Example: Feature flag component
 */
export function FeatureFlag({ 
  tenantId, 
  user, 
  feature, 
  children, 
  fallback = null 
}: {
  tenantId: string;
  user: User | null;
  feature: string;
  children: any;
  fallback?: any;
}) {
  const { hasAccess, loading } = useFeatureAccess(tenantId, user, feature);

  if (loading) {
    return { type: 'div', children: 'Loading...' };
  }

  return hasAccess ? children : fallback;
}

/**
 * Example: Permission guard component
 */
export function PermissionGuard({ 
  user, 
  permission, 
  children, 
  fallback = null 
}: {
  user: User | null;
  permission: string;
  children: any;
  fallback?: any;
}) {
  const { hasPermission, loading } = usePermission(user, permission);

  if (loading) {
    return { type: 'div', children: 'Loading...' };
  }

  return hasPermission ? children : fallback;
}

/**
 * Example: API route protection
 */
export async function protectApiRoute(
  req: any, 
  res: any, 
  next: any,
  options: {
    tenantId: string;
    feature?: string;
    permission?: string;
  }
) {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await accessPolicy.checkPolicy({
      tenantId: options.tenantId,
      user,
      feature: options.feature,
      permission: options.permission
    });

    next();
  } catch (error) {
    if (error instanceof Error) {
      return res.status(403).json({ 
        error: 'Access denied', 
        message: error.message 
      });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Example: Batch permission check
 */
export async function checkMultiplePermissions(
  user: User, 
  permissions: string[]
): Promise<{ [key: string]: boolean }> {
  const results: { [key: string]: boolean } = {};
  
  await Promise.all(
    permissions.map(async (permission) => {
      try {
        results[permission] = await accessPolicy.hasPermission(user, permission);
      } catch (error) {
        results[permission] = false;
      }
    })
  );
  
  return results;
}

/**
 * Example: Get user access summary
 */
export async function getUserAccessSummary(tenantId: string, user: User) {
  try {
    const [features, permissions, accessSummary] = await Promise.all([
      accessPolicy.getUserFeatures(tenantId, user),
      accessPolicy.getUserPermissions(user),
      accessPolicy.getAccessSummary(tenantId, user)
    ]);

    return {
      ...accessSummary,
      features,
      permissions
    };
  } catch (error) {
    console.error('Error getting user access summary:', error);
    return {
      features: [],
      permissions: [],
      role: user.role,
      isActive: user.isActive
    };
  }
}

/**
 * Example: Feature dependency analysis
 */
export async function analyzeFeatureDependencies(tenantId: string, featureCode: string) {
  try {
    const [dependencies, dependents, chain, validation] = await Promise.all([
      dependencyManager.getDependencies(tenantId, featureCode),
      dependencyManager.getDependents(tenantId, featureCode),
      dependencyManager.getDependencyChain(tenantId, featureCode),
      dependencyManager.validateDisable(tenantId, featureCode)
    ]);

    return {
      dependencies,
      dependents,
      chain,
      validation,
      canDisable: validation.canDisable,
      blockingDependents: validation.blockingDependents
    };
  } catch (error) {
    console.error('Error analyzing feature dependencies:', error);
    return {
      dependencies: [],
      dependents: [],
      chain: null,
      validation: { canDisable: false, blockingDependents: [] },
      canDisable: false,
      blockingDependents: []
    };
  }
}

// Note: React imports would need to be added if using in a React project
// import React from 'react';
