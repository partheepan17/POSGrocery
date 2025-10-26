"use strict";
/**
 * Feature Cache
 * In-memory cache for tenant feature flags, role feature overrides, and feature dependencies
 * Implements TTL-based caching with 60-second expiration
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.featureCache = exports.FeatureCache = void 0;
const db_1 = require("../../db");
const events_1 = require("./events");
class FeatureCache {
    constructor() {
        this.cache = new Map();
        this.userCache = new Map();
        this.TTL_MS = 60 * 1000; // 60 seconds
        this.USER_TTL_MS = 30 * 1000; // 30 seconds for user-specific cache
        this.db = (0, db_1.getDatabase)();
    }
    /**
     * Get cached feature data for a tenant
     */
    getCachedData(tenantId) {
        const cached = this.cache.get(tenantId);
        if (!cached)
            return null;
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
    async loadFeatureData(tenantId) {
        const now = Date.now();
        // Load tenant feature flags
        const tenantFlagsQuery = `
      SELECT tenant_id, feature_code, is_enabled, updated_by, updated_at
      FROM tenant_feature_flags
      WHERE tenant_id = ?
    `;
        const tenantFlags = this.db.prepare(tenantFlagsQuery).all(tenantId);
        // Load role feature overrides
        const roleOverridesQuery = `
      SELECT tenant_id, role_id, feature_code, is_enabled, updated_by, updated_at
      FROM role_feature_overrides
      WHERE tenant_id = ?
    `;
        const roleOverrides = this.db.prepare(roleOverridesQuery).all(tenantId);
        // Load feature dependencies
        const dependenciesQuery = `
      SELECT code as feature_code, depends_on, is_core
      FROM features
    `;
        const dependencies = this.db.prepare(dependenciesQuery).all();
        // Process dependencies
        const dependencyMap = new Map();
        dependencies.forEach(dep => {
            const dependsOn = dep.depends_on ? JSON.parse(dep.depends_on) : [];
            dependencyMap.set(dep.feature_code, {
                featureCode: dep.feature_code,
                dependsOn,
                isCore: Boolean(dep.is_core)
            });
        });
        // Process tenant flags
        const tenantFlagsMap = new Map();
        tenantFlags.forEach(flag => {
            const key = `${flag.tenantId}:${flag.featureCode}`;
            tenantFlagsMap.set(key, flag);
        });
        // Process role overrides
        const roleOverridesMap = new Map();
        roleOverrides.forEach(override => {
            const key = `${override.tenantId}:${override.roleId}:${override.featureCode}`;
            roleOverridesMap.set(key, override);
        });
        const cachedData = {
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
    async getTenantFeatureFlag(tenantId, featureCode) {
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
    async getRoleFeatureOverride(tenantId, roleId, featureCode) {
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
    async getFeatureDependencies(tenantId, featureCode) {
        let cachedData = this.getCachedData(tenantId);
        if (!cachedData) {
            cachedData = await this.loadFeatureData(tenantId);
        }
        return cachedData.dependencies.get(featureCode) || null;
    }
    /**
     * Get all features for a tenant
     */
    async getAllFeatures(tenantId) {
        let cachedData = this.getCachedData(tenantId);
        if (!cachedData) {
            cachedData = await this.loadFeatureData(tenantId);
        }
        return Array.from(cachedData.dependencies.values());
    }
    /**
     * Check if a feature is enabled at tenant level
     */
    async isTenantFeatureEnabled(tenantId, featureCode) {
        const flag = await this.getTenantFeatureFlag(tenantId, featureCode);
        return flag ? flag.isEnabled : true; // Default to enabled if no flag exists
    }
    /**
     * Check if a feature is enabled for a specific role
     */
    async isRoleFeatureEnabled(tenantId, roleId, featureCode) {
        const override = await this.getRoleFeatureOverride(tenantId, roleId, featureCode);
        return override ? override.isEnabled : true; // Default to enabled if no override exists
    }
    /**
     * Get all dependent features for a given feature
     */
    async getDependentFeatures(tenantId, featureCode) {
        const allFeatures = await this.getAllFeatures(tenantId);
        const dependents = [];
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
    async canDisableFeature(tenantId, featureCode) {
        const dependents = await this.getDependentFeatures(tenantId, featureCode);
        const enabledDependents = [];
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
    invalidateTenant(tenantId) {
        this.cache.delete(tenantId);
        this.invalidateTenantUsers(tenantId);
        // Emit feature update event
        (0, events_1.emitFeatureUpdate)({
            tenantId,
            featureCode: '',
            enabled: false,
            timestamp: Date.now()
        });
        (0, events_1.emitCacheInvalidation)({
            tenantId,
            cacheKey: 'features',
            timestamp: Date.now()
        });
    }
    /**
     * Invalidate entire cache
     */
    invalidateAll() {
        this.cache.clear();
        this.userCache.clear();
        // Emit cache invalidation event for all tenants
        (0, events_1.emitCacheInvalidation)({
            tenantId: '*',
            cacheKey: 'all',
            timestamp: Date.now()
        });
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        const tenants = Array.from(this.cache.keys());
        const now = Date.now();
        let oldestEntry = null;
        let newestEntry = null;
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
    getCachedUserData(userId, tenantId) {
        const key = `${tenantId}:${userId}`;
        const cached = this.userCache.get(key);
        if (!cached)
            return null;
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
    setCachedUserData(userId, tenantId, enabledFeatures, enabledPermissions, featureDependencies) {
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
    async getUserFeaturesAndPermissions(userId, tenantId, user) {
        // Check user cache first
        const cachedUserData = this.getCachedUserData(userId, tenantId);
        if (cachedUserData) {
            const enabledFeatures = {};
            const enabledPermissions = {};
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
        const enabledFeatures = {};
        const enabledPermissions = {};
        const dependencies = {};
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
        this.setCachedUserData(userId, tenantId, userFeatures, userPermissions, dependencies);
        return {
            enabledFeatures,
            enabledPermissions,
            dependencies
        };
    }
    /**
     * Get all available permissions
     */
    async getAllPermissions() {
        const db = (0, db_1.getDatabase)();
        const permissions = db.prepare(`
      SELECT code FROM permissions ORDER BY code
    `).all();
        return permissions.map(p => p.code);
    }
    /**
     * Get user features (delegates to access policy)
     */
    async getUserFeatures(tenantId, user) {
        const { accessPolicy } = await Promise.resolve().then(() => __importStar(require('./policy')));
        return accessPolicy.getUserFeatures(tenantId, user);
    }
    /**
     * Get user permissions (delegates to access policy)
     */
    async getUserPermissions(user) {
        const { accessPolicy } = await Promise.resolve().then(() => __importStar(require('./policy')));
        return accessPolicy.getUserPermissions(user);
    }
    /**
     * Invalidate user cache
     */
    invalidateUser(userId, tenantId) {
        const key = `${tenantId}:${userId}`;
        this.userCache.delete(key);
        // Emit permission update event
        (0, events_1.emitCacheInvalidation)({
            tenantId,
            cacheKey: 'permissions',
            timestamp: Date.now()
        });
    }
    /**
     * Invalidate all user caches for a tenant
     */
    invalidateTenantUsers(tenantId) {
        const keysToDelete = [];
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
    cleanup() {
        const now = Date.now();
        const expiredTenants = [];
        const expiredUsers = [];
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
exports.FeatureCache = FeatureCache;
// Export singleton instance
exports.featureCache = new FeatureCache();
// Cleanup expired entries every 5 minutes
setInterval(() => {
    exports.featureCache.cleanup();
}, 5 * 60 * 1000);
