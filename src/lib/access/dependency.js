"use strict";
/**
 * Feature Dependency Management
 * Handles feature dependency validation and dependency chain analysis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dependencyManager = exports.FeatureDependencyManager = exports.DependencyError = void 0;
const db_1 = require("../../db");
const FeatureCache_1 = require("./FeatureCache");
class DependencyError extends Error {
    constructor(message, code, details) {
        super(message);
        this.name = 'DependencyError';
        this.code = code;
        this.details = details;
    }
}
exports.DependencyError = DependencyError;
class FeatureDependencyManager {
    constructor() {
        this.db = (0, db_1.getDatabase)();
    }
    /**
     * Get all features that depend on a given feature
     */
    async getDependents(tenantId, featureCode) {
        try {
            const allFeatures = await FeatureCache_1.featureCache.getAllFeatures(tenantId);
            const dependents = [];
            allFeatures.forEach(feature => {
                if (feature.dependsOn.includes(featureCode)) {
                    dependents.push(feature.featureCode);
                }
            });
            return dependents;
        }
        catch (error) {
            console.error('Error getting dependents:', error);
            throw new DependencyError(`Failed to get dependents for feature '${featureCode}'`, 'DEPENDENTS_FETCH_ERROR', { featureCode, error: error instanceof Error ? error.message : String(error) });
        }
    }
    /**
     * Get all features that a given feature depends on (recursive)
     */
    async getDependencies(tenantId, featureCode) {
        try {
            const allFeatures = await FeatureCache_1.featureCache.getAllFeatures(tenantId);
            const dependencies = new Set();
            const visited = new Set();
            const addDependencies = (code) => {
                if (visited.has(code))
                    return;
                visited.add(code);
                const feature = allFeatures.find(f => f.featureCode === code);
                if (feature) {
                    feature.dependsOn.forEach(dep => {
                        dependencies.add(dep);
                        addDependencies(dep);
                    });
                }
            };
            addDependencies(featureCode);
            return Array.from(dependencies);
        }
        catch (error) {
            console.error('Error getting dependencies:', error);
            throw new DependencyError(`Failed to get dependencies for feature '${featureCode}'`, 'DEPENDENCIES_FETCH_ERROR', { featureCode, error: error instanceof Error ? error.message : String(error) });
        }
    }
    /**
     * Compute all enabled features that require this feature (transitively)
     */
    async computeEffectiveDependents(tenantId, featureCode) {
        try {
            const allFeatures = await FeatureCache_1.featureCache.getAllFeatures(tenantId);
            const effectiveDependents = new Set();
            const visited = new Set();
            const findDependents = async (code) => {
                if (visited.has(code))
                    return;
                visited.add(code);
                const directDependents = allFeatures.filter(f => f.dependsOn.includes(code));
                for (const dep of directDependents) {
                    const isEnabled = await FeatureCache_1.featureCache.isTenantFeatureEnabled(tenantId, dep.featureCode);
                    if (isEnabled) {
                        effectiveDependents.add(dep.featureCode);
                        // Recursively find dependents of this dependent
                        await findDependents(dep.featureCode);
                    }
                }
            };
            await findDependents(featureCode);
            return Array.from(effectiveDependents);
        }
        catch (error) {
            console.error('Error computing effective dependents:', error);
            throw new DependencyError(`Failed to compute effective dependents for feature '${featureCode}'`, 'EFFECTIVE_DEPENDENTS_ERROR', { featureCode, error: error instanceof Error ? error.message : String(error) });
        }
    }
    /**
     * Validate if a feature can be disabled without breaking dependencies
     */
    async validateDisable(tenantId, featureCode) {
        try {
            const dependents = await this.getDependents(tenantId, featureCode);
            const enabledDependents = [];
            const disabledDependents = [];
            // Check which dependents are currently enabled
            for (const dependent of dependents) {
                const isEnabled = await FeatureCache_1.featureCache.isTenantFeatureEnabled(tenantId, dependent);
                if (isEnabled) {
                    enabledDependents.push(dependent);
                }
                else {
                    disabledDependents.push(dependent);
                }
            }
            return {
                canDisable: enabledDependents.length === 0,
                blockingDependents: enabledDependents,
                enabledDependents,
                disabledDependents
            };
        }
        catch (error) {
            console.error('Error validating disable:', error);
            throw new DependencyError(`Failed to validate disable for feature '${featureCode}'`, 'DISABLE_VALIDATION_ERROR', { featureCode, error: error instanceof Error ? error.message : String(error) });
        }
    }
    /**
     * Validate disable with cascade option
     */
    async validateDisableWithCascade(tenantId, featureCode) {
        try {
            const effectiveDependents = await this.computeEffectiveDependents(tenantId, featureCode);
            const directDependents = await this.getDependents(tenantId, featureCode);
            // Find which dependents are currently enabled
            const enabledDependents = [];
            const disabledDependents = [];
            for (const dependent of directDependents) {
                const isEnabled = await FeatureCache_1.featureCache.isTenantFeatureEnabled(tenantId, dependent);
                if (isEnabled) {
                    enabledDependents.push(dependent);
                }
                else {
                    disabledDependents.push(dependent);
                }
            }
            // Cascade targets are all effective dependents that would be disabled
            const cascadeTargets = effectiveDependents;
            return {
                canDisable: true, // With cascade, we can always disable
                blockingDependents: enabledDependents,
                cascadeTargets,
                effectiveDependents,
                enabledDependents,
                disabledDependents
            };
        }
        catch (error) {
            console.error('Error validating disable with cascade:', error);
            throw new DependencyError(`Failed to validate disable with cascade for feature '${featureCode}'`, 'CASCADE_VALIDATION_ERROR', { featureCode, error: error instanceof Error ? error.message : String(error) });
        }
    }
    /**
     * Get complete dependency chain for a feature
     */
    async getDependencyChain(tenantId, featureCode) {
        try {
            const [dependencies, dependents] = await Promise.all([
                this.getDependencies(tenantId, featureCode),
                this.getDependents(tenantId, featureCode)
            ]);
            // Check for circular dependencies
            const isCircular = this.detectCircularDependency(tenantId, featureCode, dependencies, dependents);
            // Calculate depth (longest dependency path)
            const depth = await this.calculateDependencyDepth(tenantId, featureCode);
            return {
                featureCode,
                dependencies,
                dependents,
                depth,
                isCircular
            };
        }
        catch (error) {
            console.error('Error getting dependency chain:', error);
            throw new DependencyError(`Failed to get dependency chain for feature '${featureCode}'`, 'CHAIN_FETCH_ERROR', { featureCode, error: error instanceof Error ? error.message : String(error) });
        }
    }
    /**
     * Detect circular dependencies
     */
    detectCircularDependency(tenantId, featureCode, dependencies, dependents) {
        // Check if any dependency also depends on this feature (direct circular)
        return dependencies.includes(featureCode) ||
            dependencies.some(dep => dependents.includes(dep));
    }
    /**
     * Calculate the maximum depth of dependencies
     */
    async calculateDependencyDepth(tenantId, featureCode) {
        const allFeatures = await FeatureCache_1.featureCache.getAllFeatures(tenantId);
        const visited = new Set();
        let maxDepth = 0;
        const calculateDepth = (code, currentDepth) => {
            if (visited.has(code))
                return currentDepth;
            visited.add(code);
            const feature = allFeatures.find(f => f.featureCode === code);
            if (!feature || feature.dependsOn.length === 0) {
                return currentDepth;
            }
            let maxChildDepth = currentDepth;
            feature.dependsOn.forEach(dep => {
                const childDepth = calculateDepth(dep, currentDepth + 1);
                maxChildDepth = Math.max(maxChildDepth, childDepth);
            });
            return maxChildDepth;
        };
        return calculateDepth(featureCode, 0);
    }
    /**
     * Validate all feature dependencies in the system
     */
    async validateAllDependencies(tenantId) {
        try {
            const allFeatures = await FeatureCache_1.featureCache.getAllFeatures(tenantId);
            const errors = [];
            const warnings = [];
            const circularDependencies = [];
            for (const feature of allFeatures) {
                const chain = await this.getDependencyChain(tenantId, feature.featureCode);
                if (chain.isCircular) {
                    const circular = this.findCircularPath(tenantId, feature.featureCode);
                    if (circular.length > 0) {
                        circularDependencies.push(circular);
                        errors.push(`Circular dependency detected: ${circular.join(' -> ')}`);
                    }
                }
                // Check for missing dependencies
                for (const dep of feature.dependsOn) {
                    const depFeature = allFeatures.find(f => f.featureCode === dep);
                    if (!depFeature) {
                        errors.push(`Feature '${feature.featureCode}' depends on non-existent feature '${dep}'`);
                    }
                }
                // Check for excessive depth (warning)
                if (chain.depth > 5) {
                    warnings.push(`Feature '${feature.featureCode}' has deep dependency chain (depth: ${chain.depth})`);
                }
            }
            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                circularDependencies
            };
        }
        catch (error) {
            console.error('Error validating all dependencies:', error);
            throw new DependencyError('Failed to validate all dependencies', 'VALIDATION_ERROR', { error: error instanceof Error ? error.message : String(error) });
        }
    }
    /**
     * Find circular dependency path
     */
    findCircularPath(tenantId, featureCode) {
        // This is a simplified implementation
        // In a real scenario, you'd want to implement a proper cycle detection algorithm
        const visited = new Set();
        const path = [];
        const findCycle = (current) => {
            if (visited.has(current)) {
                const cycleStart = path.indexOf(current);
                if (cycleStart !== -1) {
                    return path.slice(cycleStart).concat([current]);
                }
                return [];
            }
            visited.add(current);
            path.push(current);
            // This would need to be implemented with actual dependency traversal
            // For now, return empty array
            return [];
        };
        return findCycle(featureCode);
    }
    /**
     * Get features that can be safely disabled (no enabled dependents)
     */
    async getDisableableFeatures(tenantId) {
        try {
            const allFeatures = await FeatureCache_1.featureCache.getAllFeatures(tenantId);
            const disableableFeatures = [];
            for (const feature of allFeatures) {
                if (feature.isCore)
                    continue; // Core features cannot be disabled
                const validation = await this.validateDisable(tenantId, feature.featureCode);
                if (validation.canDisable) {
                    disableableFeatures.push(feature.featureCode);
                }
            }
            return disableableFeatures;
        }
        catch (error) {
            console.error('Error getting disableable features:', error);
            throw new DependencyError('Failed to get disableable features', 'DISABLEABLE_FETCH_ERROR', { error: error instanceof Error ? error.message : String(error) });
        }
    }
    /**
     * Get features that must be enabled for a given feature to work
     */
    async getRequiredFeatures(tenantId, featureCode) {
        try {
            const dependencies = await this.getDependencies(tenantId, featureCode);
            const requiredFeatures = [];
            for (const dep of dependencies) {
                const depFeature = await FeatureCache_1.featureCache.getFeatureDependencies(tenantId, dep);
                if (depFeature && depFeature.isCore) {
                    requiredFeatures.push(dep);
                }
            }
            return requiredFeatures;
        }
        catch (error) {
            console.error('Error getting required features:', error);
            throw new DependencyError(`Failed to get required features for '${featureCode}'`, 'REQUIRED_FEATURES_ERROR', { featureCode, error: error instanceof Error ? error.message : String(error) });
        }
    }
    /**
     * Check if enabling a feature would create circular dependencies
     */
    async wouldCreateCircularDependency(tenantId, featureCode, newDependency) {
        try {
            const dependents = await this.getDependents(tenantId, featureCode);
            return dependents.includes(newDependency);
        }
        catch (error) {
            console.error('Error checking circular dependency:', error);
            return false;
        }
    }
    /**
     * Get dependency statistics for a tenant
     */
    async getDependencyStats(tenantId) {
        try {
            const allFeatures = await FeatureCache_1.featureCache.getAllFeatures(tenantId);
            const coreFeatures = allFeatures.filter(f => f.isCore).length;
            const optionalFeatures = allFeatures.length - coreFeatures;
            let maxDepth = 0;
            let circularCount = 0;
            for (const feature of allFeatures) {
                const chain = await this.getDependencyChain(tenantId, feature.featureCode);
                maxDepth = Math.max(maxDepth, chain.depth);
                if (chain.isCircular) {
                    circularCount++;
                }
            }
            const disableableFeatures = await this.getDisableableFeatures(tenantId);
            return {
                totalFeatures: allFeatures.length,
                coreFeatures,
                optionalFeatures,
                maxDepth,
                circularDependencies: circularCount,
                disableableFeatures: disableableFeatures.length
            };
        }
        catch (error) {
            console.error('Error getting dependency stats:', error);
            throw new DependencyError('Failed to get dependency statistics', 'STATS_ERROR', { error: error instanceof Error ? error.message : String(error) });
        }
    }
}
exports.FeatureDependencyManager = FeatureDependencyManager;
// Export singleton instance
exports.dependencyManager = new FeatureDependencyManager();
// Export error class for external use
// DependencyError is already exported above
