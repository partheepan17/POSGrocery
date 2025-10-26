/**
 * Feature Cache
 * In-memory cache for tenant feature flags, role feature overrides, and feature dependencies
 * Implements TTL-based caching with 60-second expiration
 */
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
    tenantFlags: Map<string, TenantFeatureFlag>;
    roleOverrides: Map<string, RoleFeatureOverride>;
    dependencies: Map<string, FeatureDependency>;
    lastUpdated: number;
}
export interface UserFeatureCache {
    userId: number;
    tenantId: string;
    enabledFeatures: string[];
    enabledPermissions: string[];
    featureDependencies: {
        [featureCode: string]: string[];
    };
    lastUpdated: number;
}
export declare class FeatureCache {
    private cache;
    private userCache;
    private readonly TTL_MS;
    private readonly USER_TTL_MS;
    private readonly db;
    /**
     * Get cached feature data for a tenant
     */
    private getCachedData;
    /**
     * Load feature data from database and cache it
     */
    private loadFeatureData;
    /**
     * Get tenant feature flag
     */
    getTenantFeatureFlag(tenantId: string, featureCode: string): Promise<TenantFeatureFlag | null>;
    /**
     * Get role feature override
     */
    getRoleFeatureOverride(tenantId: string, roleId: number, featureCode: string): Promise<RoleFeatureOverride | null>;
    /**
     * Get feature dependencies
     */
    getFeatureDependencies(tenantId: string, featureCode: string): Promise<FeatureDependency | null>;
    /**
     * Get all features for a tenant
     */
    getAllFeatures(tenantId: string): Promise<FeatureDependency[]>;
    /**
     * Check if a feature is enabled at tenant level
     */
    isTenantFeatureEnabled(tenantId: string, featureCode: string): Promise<boolean>;
    /**
     * Check if a feature is enabled for a specific role
     */
    isRoleFeatureEnabled(tenantId: string, roleId: number, featureCode: string): Promise<boolean>;
    /**
     * Get all dependent features for a given feature
     */
    getDependentFeatures(tenantId: string, featureCode: string): Promise<string[]>;
    /**
     * Check if disabling a feature would break dependencies
     */
    canDisableFeature(tenantId: string, featureCode: string): Promise<{
        canDisable: boolean;
        blockingDependents: string[];
    }>;
    /**
     * Invalidate cache for a specific tenant
     */
    invalidateTenant(tenantId: string): void;
    /**
     * Invalidate entire cache
     */
    invalidateAll(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        tenantCount: number;
        totalEntries: number;
        oldestEntry: number | null;
        newestEntry: number | null;
    };
    /**
     * Get cached user feature data
     */
    private getCachedUserData;
    /**
     * Cache user feature data
     */
    private setCachedUserData;
    /**
     * Get user features and permissions with caching
     */
    getUserFeaturesAndPermissions(userId: number, tenantId: string, user: any): Promise<{
        enabledFeatures: {
            [featureCode: string]: boolean;
        };
        enabledPermissions: {
            [permissionCode: string]: boolean;
        };
        dependencies: {
            [featureCode: string]: string[];
        };
    }>;
    /**
     * Get all available permissions
     */
    private getAllPermissions;
    /**
     * Get user features (delegates to access policy)
     */
    private getUserFeatures;
    /**
     * Get user permissions (delegates to access policy)
     */
    private getUserPermissions;
    /**
     * Invalidate user cache
     */
    invalidateUser(userId: number, tenantId: string): void;
    /**
     * Invalidate all user caches for a tenant
     */
    invalidateTenantUsers(tenantId: string): void;
    /**
     * Clean up expired entries
     */
    cleanup(): void;
}
export declare const featureCache: FeatureCache;
