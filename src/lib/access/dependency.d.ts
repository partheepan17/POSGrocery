/**
 * Feature Dependency Management
 * Handles feature dependency validation and dependency chain analysis
 */
export interface DependencyChain {
    featureCode: string;
    dependencies: string[];
    dependents: string[];
    depth: number;
    isCircular: boolean;
}
export interface DependencyValidation {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    circularDependencies: string[][];
}
export declare class DependencyError extends Error {
    code: string;
    details?: any;
    constructor(message: string, code: string, details?: any);
}
export declare class FeatureDependencyManager {
    private db;
    /**
     * Get all features that depend on a given feature
     */
    getDependents(tenantId: string, featureCode: string): Promise<string[]>;
    /**
     * Get all features that a given feature depends on (recursive)
     */
    getDependencies(tenantId: string, featureCode: string): Promise<string[]>;
    /**
     * Compute all enabled features that require this feature (transitively)
     */
    computeEffectiveDependents(tenantId: string, featureCode: string): Promise<string[]>;
    /**
     * Validate if a feature can be disabled without breaking dependencies
     */
    validateDisable(tenantId: string, featureCode: string): Promise<{
        canDisable: boolean;
        blockingDependents: string[];
        enabledDependents: string[];
        disabledDependents: string[];
    }>;
    /**
     * Validate disable with cascade option
     */
    validateDisableWithCascade(tenantId: string, featureCode: string): Promise<{
        canDisable: boolean;
        blockingDependents: string[];
        cascadeTargets: string[];
        effectiveDependents: string[];
        enabledDependents: string[];
        disabledDependents: string[];
    }>;
    /**
     * Get complete dependency chain for a feature
     */
    getDependencyChain(tenantId: string, featureCode: string): Promise<DependencyChain>;
    /**
     * Detect circular dependencies
     */
    private detectCircularDependency;
    /**
     * Calculate the maximum depth of dependencies
     */
    private calculateDependencyDepth;
    /**
     * Validate all feature dependencies in the system
     */
    validateAllDependencies(tenantId: string): Promise<DependencyValidation>;
    /**
     * Find circular dependency path
     */
    private findCircularPath;
    /**
     * Get features that can be safely disabled (no enabled dependents)
     */
    getDisableableFeatures(tenantId: string): Promise<string[]>;
    /**
     * Get features that must be enabled for a given feature to work
     */
    getRequiredFeatures(tenantId: string, featureCode: string): Promise<string[]>;
    /**
     * Check if enabling a feature would create circular dependencies
     */
    wouldCreateCircularDependency(tenantId: string, featureCode: string, newDependency: string): Promise<boolean>;
    /**
     * Get dependency statistics for a tenant
     */
    getDependencyStats(tenantId: string): Promise<{
        totalFeatures: number;
        coreFeatures: number;
        optionalFeatures: number;
        maxDepth: number;
        circularDependencies: number;
        disableableFeatures: number;
    }>;
}
export declare const dependencyManager: FeatureDependencyManager;
