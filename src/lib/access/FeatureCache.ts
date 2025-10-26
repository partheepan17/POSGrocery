/**
 * Feature Cache
 * In-memory cache for tenant feature flags, role feature overrides, and feature dependencies
 * Implements TTL-based caching with 60-second expiration
 */

import { getDatabase } from '../../db';
import { emitFeatureUpdate, emitCacheInvalidation } from './events';

export interface TenantFeatureFlag {
  tenantId: string;
  featureCode: string;
  isEnabled: boolean;
  updatedBy?: string;
  updatedAt: string;
}

export interface RoleFeatureOverride {
  tenantId: string;
  roleId: number;
  featureCode: string;
  isEnabled: boolean;
  updatedBy?: string;
  updatedAt: string;
}

export interface FeatureDependency {
  featureCode: string;
  dependsOn: string[];
  isCore: boolean;
}

export interface CachedFeatureData {
  tenantFlags: Map<string, TenantFeatureFlag>; // key: `${tenantId}:${featureCode}`
  roleOverrides: Map<string, RoleFeatureOverride>; // key: `${tenantId}:${roleId}:${featureCode}`
  dependencies: Map<string, FeatureDependency>; // key: featureCode
  lastUpdated: number;
}

export interface UserFeatureCache {
  userId: number;
  tenantId: string;
  enabledFeatures: string[];
  enabledPermissions: string[];
  featureDependencies: { [featureCode: string]: string[] };
  lastUpdated: number;
}

export class FeatureCache {
  private cache: Map<string, CachedFeatureData> = new Map();
  private userCache: Map<string, UserFeatureCache> = new Map();
  private readonly TTL_MS = 60 * 1000; // 60 seconds
  private readonly USER_TTL_MS = 30 * 1000; // 30 seconds for user-specific cache
  private readonly db = getDatabase();

  /**
   * Get cached feature data for a tenant
   */
  private getCachedData(tenantId: string): CachedFeatureData | null {
    const cached = this.cache.get(tenantId);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.lastUpdated > this.TTL_MS) {
      this.cache.delete(tenantId);
      return null;
    }

    return cached;
  }

  /**
   * Load feature data from database and cache it
   */
  private async loadFeatureData(tenantId: string): Promise<CachedFeatureData> {
    const now = Date.now();
    
    // Load tenant feature flags
    const tenantFlagsQuery = `
      SELECT tenant_id, feature_code, is_enabled, updated_by, updated_at
      FROM tenant_feature_flags
      WHERE tenant_id = ?
    `;
    const tenantFlags = this.db.prepare(tenantFlagsQuery).all(tenantId) as TenantFeatureFlag[];
    
    // Load role feature overrides
    const roleOverridesQuery = `
      SELECT tenant_id, role_id, feature_code, is_enabled, updated_by, updated_at
      FROM role_feature_overrides
      WHERE tenant_id = ?
    `;
    const roleOverrides = this.db.prepare(roleOverridesQuery).all(tenantId) as RoleFeatureOverride[];
    
    // Load feature dependencies
    const dependenciesQuery = `
      SELECT code as feature_code, depends_on, is_core
      FROM features
    `;
    const dependencies = this.db.prepare(dependenciesQuery).all() as Array<{
      feature_code: string;
      depends_on: string;
      is_core: boolean;
    }>;

    // Process dependencies
    const dependencyMap = new Map<string, FeatureDependency>();
    dependencies.forEach(dep => {
      const dependsOn = dep.depends_on ? JSON.parse(dep.depends_on) : [];
      dependencyMap.set(dep.feature_code, {
        featureCode: dep.feature_code,
        dependsOn,
        isCore: Boolean(dep.is_core)
      });
    });

    // Process tenant flags
    const tenantFlagsMap = new Map<string, TenantFeatureFlag>();
    tenantFlags.forEach(flag => {
      const key = `${flag.tenantId}:${flag.featureCode}`;
      tenantFlagsMap.set(key, flag);
    });

    // Process role overrides
    const roleOverridesMap = new Map<string, RoleFeatureOverride>();
    roleOverrides.forEach(override => {
      const key = `${override.tenantId}:${override.roleId}:${override.featureCode}`;
      roleOverridesMap.set(key, override);
    });

    const cachedData: CachedFeatureData = {
      tenantFlags: tenantFlagsMap,
      roleOverrides: roleOverridesMap,
      dependencies: dependencyMap,
      lastUpdated: now
    };

    this.cache.set(tenantId, cachedData);
    return cachedData;
  }

  /**
   * Get tenant feature flag
   */
  async getTenantFeatureFlag(tenantId: string, featureCode: string): Promise<TenantFeatureFlag | null> {
    let cachedData = this.getCachedData(tenantId);
    if (!cachedData) {
      cachedData = await this.loadFeatureData(tenantId);
    }

    const key = `${tenantId}:${featureCode}`;
    return cachedData.tenantFlags.get(key) || null;
  }

  /**
   * Get role feature override
   */
  async getRoleFeatureOverride(tenantId: string, roleId: number, featureCode: string): Promise<RoleFeatureOverride | null> {
    let cachedData = this.getCachedData(tenantId);
    if (!cachedData) {
      cachedData = await this.loadFeatureData(tenantId);
    }

    const key = `${tenantId}:${roleId}:${featureCode}`;
    return cachedData.roleOverrides.get(key) || null;
  }

  /**
   * Get feature dependencies
   */
  async getFeatureDependencies(tenantId: string, featureCode: string): Promise<FeatureDependency | null> {
    let cachedData = this.getCachedData(tenantId);
    if (!cachedData) {
      cachedData = await this.loadFeatureData(tenantId);
    }

    return cachedData.dependencies.get(featureCode) || null;
  }

  /**
   * Get all features for a tenant
   */
  async getAllFeatures(tenantId: string): Promise<FeatureDependency[]> {
    let cachedData = this.getCachedData(tenantId);
    if (!cachedData) {
      cachedData = await this.loadFeatureData(tenantId);
    }

    return Array.from(cachedData.dependencies.values());
  }

  /**
   * Check if a feature is enabled at tenant level
   */
  async isTenantFeatureEnabled(tenantId: string, featureCode: string): Promise<boolean> {
    const flag = await this.getTenantFeatureFlag(tenantId, featureCode);
    return flag ? flag.isEnabled : true; // Default to enabled if no flag exists
  }

  /**
   * Check if a feature is enabled for a specific role
   */
  async isRoleFeatureEnabled(tenantId: string, roleId: number, featureCode: string): Promise<boolean> {
    const override = await this.getRoleFeatureOverride(tenantId, roleId, featureCode);
    return override ? override.isEnabled : true; // Default to enabled if no override exists
  }

  /**
   * Get all dependent features for a given feature
   */
  async getDependentFeatures(tenantId: string, featureCode: string): Promise<string[]> {
    const allFeatures = await this.getAllFeatures(tenantId);
    const dependents: string[] = [];

    allFeatures.forEach(feature => {
      if (feature.dependsOn.includes(featureCode)) {
        dependents.push(feature.featureCode);
      }
    });

    return dependents;
  }

  /**
   * Check if disabling a feature would break dependencies
   */
  async canDisableFeature(tenantId: string, featureCode: string): Promise<{
    canDisable: boolean;
    blockingDependents: string[];
  }> {
    const dependents = await this.getDependentFeatures(tenantId, featureCode);
    const enabledDependents: string[] = [];

    for (const dependent of dependents) {
      const isEnabled = await this.isTenantFeatureEnabled(tenantId, dependent);
      if (isEnabled) {
        enabledDependents.push(dependent);
      }
    }

    return {
      canDisable: enabledDependents.length === 0,
      blockingDependents: enabledDependents
    };
  }

  /**
   * Invalidate cache for a specific tenant
   */
  invalidateTenant(tenantId: string): void {
    this.cache.delete(tenantId);
    this.invalidateTenantUsers(tenantId);
    
    // Emit feature update event
    emitFeatureUpdate({
      tenantId,
      featureCode: '',
      enabled: false,
      timestamp: Date.now()
    });
    emitCacheInvalidation({
      tenantId,
      cacheKey: 'features',
      timestamp: Date.now()
    });
  }

  /**
   * Invalidate entire cache
   */
  invalidateAll(): void {
    this.cache.clear();
    this.userCache.clear();
    
    // Emit cache invalidation event for all tenants
    emitCacheInvalidation({
      tenantId: '*',
      cacheKey: 'all',
      timestamp: Date.now()
    });
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    tenantCount: number;
    totalEntries: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    const tenants = Array.from(this.cache.keys());
    const now = Date.now();
    
    let oldestEntry: number | null = null;
    let newestEntry: number | null = null;
    let totalEntries = 0;

    tenants.forEach(tenantId => {
      const data = this.cache.get(tenantId);
      if (data) {
        totalEntries += data.tenantFlags.size + data.roleOverrides.size + data.dependencies.size;
        
        if (oldestEntry === null || data.lastUpdated < oldestEntry) {
          oldestEntry = data.lastUpdated;
        }
        if (newestEntry === null || data.lastUpdated > newestEntry) {
          newestEntry = data.lastUpdated;
        }
      }
    });

    return {
      tenantCount: tenants.length,
      totalEntries,
      oldestEntry,
      newestEntry
    };
  }

  /**
   * Get cached user feature data
   */
  private getCachedUserData(userId: number, tenantId: string): UserFeatureCache | null {
    const key = `${tenantId}:${userId}`;
    const cached = this.userCache.get(key);
    
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.lastUpdated > this.USER_TTL_MS) {
      this.userCache.delete(key);
      return null;
    }

    return cached;
  }

  /**
   * Cache user feature data
   */
  private setCachedUserData(
    userId: number, 
    tenantId: string, 
    enabledFeatures: string[], 
    enabledPermissions: string[],
    featureDependencies: { [featureCode: string]: string[] }
  ): void {
    const key = `${tenantId}:${userId}`;
    const now = Date.now();
    
    this.userCache.set(key, {
      userId,
      tenantId,
      enabledFeatures,
      enabledPermissions,
      featureDependencies,
      lastUpdated: now
    });
  }

  /**
   * Get user features and permissions with caching
   */
  async getUserFeaturesAndPermissions(
    userId: number, 
    tenantId: string, 
    user: any
  ): Promise<{
    enabledFeatures: { [featureCode: string]: boolean };
    enabledPermissions: { [permissionCode: string]: boolean };
    dependencies: { [featureCode: string]: string[] };
  }> {
    // Check user cache first
    const cachedUserData = this.getCachedUserData(userId, tenantId);
    if (cachedUserData) {
      const enabledFeatures: { [featureCode: string]: boolean } = {};
      const enabledPermissions: { [permissionCode: string]: boolean } = {};

      // Convert arrays to maps
      for (const feature of cachedUserData.enabledFeatures) {
        enabledFeatures[feature] = true;
      }
      for (const permission of cachedUserData.enabledPermissions) {
        enabledPermissions[permission] = true;
      }

      return {
        enabledFeatures,
        enabledPermissions,
        dependencies: cachedUserData.featureDependencies
      };
    }

    // Cache miss - fetch from access policy
    const [userFeatures, userPermissions, allFeatures] = await Promise.all([
      this.getUserFeatures(tenantId, user),
      this.getUserPermissions(user),
      this.getAllFeatures(tenantId)
    ]);

    // Build response maps
    const enabledFeatures: { [featureCode: string]: boolean } = {};
    const enabledPermissions: { [permissionCode: string]: boolean } = {};
    const dependencies: { [featureCode: string]: string[] } = {};

    for (const feature of allFeatures) {
      enabledFeatures[feature.featureCode] = userFeatures.includes(feature.featureCode);
      dependencies[feature.featureCode] = feature.dependsOn;
    }

    // Get all available permissions
    const allPermissions = await this.getAllPermissions();
    for (const permission of allPermissions) {
      enabledPermissions[permission] = userPermissions.includes(permission);
    }

    // Cache the results
    this.setCachedUserData(
      userId, 
      tenantId, 
      userFeatures, 
      userPermissions, 
      dependencies
    );

    return {
      enabledFeatures,
      enabledPermissions,
      dependencies
    };
  }

  /**
   * Get all available permissions
   */
  private async getAllPermissions(): Promise<string[]> {
    const db = getDatabase();
    const permissions = db.prepare(`
      SELECT code FROM permissions ORDER BY code
    `).all() as Array<{ code: string }>;
    
    return permissions.map(p => p.code);
  }

  /**
   * Get user features (delegates to access policy)
   */
  private async getUserFeatures(tenantId: string, user: any): Promise<string[]> {
    const { accessPolicy } = await import('./policy');
    return accessPolicy.getUserFeatures(tenantId, user);
  }

  /**
   * Get user permissions (delegates to access policy)
   */
  private async getUserPermissions(user: any): Promise<string[]> {
    const { accessPolicy } = await import('./policy');
    return accessPolicy.getUserPermissions(user);
  }

  /**
   * Invalidate user cache
   */
  invalidateUser(userId: number, tenantId: string): void {
    const key = `${tenantId}:${userId}`;
    this.userCache.delete(key);
    
    // Emit permission update event
    emitCacheInvalidation({
      tenantId,
      cacheKey: 'permissions',
      timestamp: Date.now()
    });
  }

  /**
   * Invalidate all user caches for a tenant
   */
  invalidateTenantUsers(tenantId: string): void {
    const keysToDelete: string[] = [];
    this.userCache.forEach((data, key) => {
      if (data.tenantId === tenantId) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.userCache.delete(key));
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const expiredTenants: string[] = [];
    const expiredUsers: string[] = [];

    // Cleanup tenant cache
    this.cache.forEach((data, tenantId) => {
      if (now - data.lastUpdated > this.TTL_MS) {
        expiredTenants.push(tenantId);
      }
    });

    // Cleanup user cache
    this.userCache.forEach((data, key) => {
      if (now - data.lastUpdated > this.USER_TTL_MS) {
        expiredUsers.push(key);
      }
    });

    expiredTenants.forEach(tenantId => {
      this.cache.delete(tenantId);
    });

    expiredUsers.forEach(key => {
      this.userCache.delete(key);
    });
  }
}

// Export singleton instance
export const featureCache = new FeatureCache();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  featureCache.cleanup();
}, 5 * 60 * 1000);
