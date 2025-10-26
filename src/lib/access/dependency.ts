/**
 * Feature Dependency Management
 * Handles feature dependency validation and dependency chain analysis
 */

import { getDatabase } from '../../db';
import { featureCache } from './FeatureCache';

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

export class DependencyError extends Error {
  public code: string;
  public details?: any;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'DependencyError';
    this.code = code;
    this.details = details;
  }
}

export class FeatureDependencyManager {
  private db = getDatabase();

  /**
   * Get all features that depend on a given feature
   */
  async getDependents(tenantId: string, featureCode: string): Promise<string[]> {
    try {
      const allFeatures = await featureCache.getAllFeatures(tenantId);
      const dependents: string[] = [];

      allFeatures.forEach(feature => {
        if (feature.dependsOn.includes(featureCode)) {
          dependents.push(feature.featureCode);
        }
      });

      return dependents;
    } catch (error) {
      console.error('Error getting dependents:', error);
      throw new DependencyError(
        `Failed to get dependents for feature '${featureCode}'`,
        'DEPENDENTS_FETCH_ERROR',
        { featureCode, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get all features that a given feature depends on (recursive)
   */
  async getDependencies(tenantId: string, featureCode: string): Promise<string[]> {
    try {
      const allFeatures = await featureCache.getAllFeatures(tenantId);
      const dependencies = new Set<string>();
      const visited = new Set<string>();

      const addDependencies = (code: string) => {
        if (visited.has(code)) return;
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
    } catch (error) {
      console.error('Error getting dependencies:', error);
      throw new DependencyError(
        `Failed to get dependencies for feature '${featureCode}'`,
        'DEPENDENCIES_FETCH_ERROR',
        { featureCode, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Compute all enabled features that require this feature (transitively)
   */
  async computeEffectiveDependents(tenantId: string, featureCode: string): Promise<string[]> {
    try {
      const allFeatures = await featureCache.getAllFeatures(tenantId);
      const effectiveDependents = new Set<string>();
      const visited = new Set<string>();

      const findDependents = async (code: string) => {
        if (visited.has(code)) return;
        visited.add(code);

        const directDependents = allFeatures.filter(f => f.dependsOn.includes(code));
        for (const dep of directDependents) {
          const isEnabled = await featureCache.isTenantFeatureEnabled(tenantId, dep.featureCode);
          if (isEnabled) {
            effectiveDependents.add(dep.featureCode);
            // Recursively find dependents of this dependent
            await findDependents(dep.featureCode);
          }
        }
      };

      await findDependents(featureCode);
      return Array.from(effectiveDependents);
    } catch (error) {
      console.error('Error computing effective dependents:', error);
      throw new DependencyError(
        `Failed to compute effective dependents for feature '${featureCode}'`,
        'EFFECTIVE_DEPENDENTS_ERROR',
        { featureCode, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Validate if a feature can be disabled without breaking dependencies
   */
  async validateDisable(tenantId: string, featureCode: string): Promise<{
    canDisable: boolean;
    blockingDependents: string[];
    enabledDependents: string[];
    disabledDependents: string[];
  }> {
    try {
      const dependents = await this.getDependents(tenantId, featureCode);
      const enabledDependents: string[] = [];
      const disabledDependents: string[] = [];

      // Check which dependents are currently enabled
      for (const dependent of dependents) {
        const isEnabled = await featureCache.isTenantFeatureEnabled(tenantId, dependent);
        if (isEnabled) {
          enabledDependents.push(dependent);
        } else {
          disabledDependents.push(dependent);
        }
      }

      return {
        canDisable: enabledDependents.length === 0,
        blockingDependents: enabledDependents,
        enabledDependents,
        disabledDependents
      };
    } catch (error) {
      console.error('Error validating disable:', error);
      throw new DependencyError(
        `Failed to validate disable for feature '${featureCode}'`,
        'DISABLE_VALIDATION_ERROR',
        { featureCode, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Validate disable with cascade option
   */
  async validateDisableWithCascade(tenantId: string, featureCode: string): Promise<{
    canDisable: boolean;
    blockingDependents: string[];
    cascadeTargets: string[];
    effectiveDependents: string[];
    enabledDependents: string[];
    disabledDependents: string[];
  }> {
    try {
      const effectiveDependents = await this.computeEffectiveDependents(tenantId, featureCode);
      const directDependents = await this.getDependents(tenantId, featureCode);
      
      // Find which dependents are currently enabled
      const enabledDependents: string[] = [];
      const disabledDependents: string[] = [];

      for (const dependent of directDependents) {
        const isEnabled = await featureCache.isTenantFeatureEnabled(tenantId, dependent);
        if (isEnabled) {
          enabledDependents.push(dependent);
        } else {
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
    } catch (error) {
      console.error('Error validating disable with cascade:', error);
      throw new DependencyError(
        `Failed to validate disable with cascade for feature '${featureCode}'`,
        'CASCADE_VALIDATION_ERROR',
        { featureCode, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get complete dependency chain for a feature
   */
  async getDependencyChain(tenantId: string, featureCode: string): Promise<DependencyChain> {
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
    } catch (error) {
      console.error('Error getting dependency chain:', error);
      throw new DependencyError(
        `Failed to get dependency chain for feature '${featureCode}'`,
        'CHAIN_FETCH_ERROR',
        { featureCode, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Detect circular dependencies
   */
  private detectCircularDependency(
    tenantId: string,
    featureCode: string,
    dependencies: string[],
    dependents: string[]
  ): boolean {
    // Check if any dependency also depends on this feature (direct circular)
    return dependencies.includes(featureCode) || 
           dependencies.some(dep => dependents.includes(dep));
  }

  /**
   * Calculate the maximum depth of dependencies
   */
  private async calculateDependencyDepth(tenantId: string, featureCode: string): Promise<number> {
    const allFeatures = await featureCache.getAllFeatures(tenantId);
    const visited = new Set<string>();
    let maxDepth = 0;

    const calculateDepth = (code: string, currentDepth: number): number => {
      if (visited.has(code)) return currentDepth;
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
  async validateAllDependencies(tenantId: string): Promise<DependencyValidation> {
    try {
      const allFeatures = await featureCache.getAllFeatures(tenantId);
      const errors: string[] = [];
      const warnings: string[] = [];
      const circularDependencies: string[][] = [];

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
    } catch (error) {
      console.error('Error validating all dependencies:', error);
      throw new DependencyError(
        'Failed to validate all dependencies',
        'VALIDATION_ERROR',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Find circular dependency path
   */
  private findCircularPath(tenantId: string, featureCode: string): string[] {
    // This is a simplified implementation
    // In a real scenario, you'd want to implement a proper cycle detection algorithm
    const visited = new Set<string>();
    const path: string[] = [];

    const findCycle = (current: string): string[] => {
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
  async getDisableableFeatures(tenantId: string): Promise<string[]> {
    try {
      const allFeatures = await featureCache.getAllFeatures(tenantId);
      const disableableFeatures: string[] = [];

      for (const feature of allFeatures) {
        if (feature.isCore) continue; // Core features cannot be disabled

        const validation = await this.validateDisable(tenantId, feature.featureCode);
        if (validation.canDisable) {
          disableableFeatures.push(feature.featureCode);
        }
      }

      return disableableFeatures;
    } catch (error) {
      console.error('Error getting disableable features:', error);
      throw new DependencyError(
        'Failed to get disableable features',
        'DISABLEABLE_FETCH_ERROR',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Get features that must be enabled for a given feature to work
   */
  async getRequiredFeatures(tenantId: string, featureCode: string): Promise<string[]> {
    try {
      const dependencies = await this.getDependencies(tenantId, featureCode);
      const requiredFeatures: string[] = [];

      for (const dep of dependencies) {
        const depFeature = await featureCache.getFeatureDependencies(tenantId, dep);
        if (depFeature && depFeature.isCore) {
          requiredFeatures.push(dep);
        }
      }

      return requiredFeatures;
    } catch (error) {
      console.error('Error getting required features:', error);
      throw new DependencyError(
        `Failed to get required features for '${featureCode}'`,
        'REQUIRED_FEATURES_ERROR',
        { featureCode, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Check if enabling a feature would create circular dependencies
   */
  async wouldCreateCircularDependency(
    tenantId: string,
    featureCode: string,
    newDependency: string
  ): Promise<boolean> {
    try {
      const dependents = await this.getDependents(tenantId, featureCode);
      return dependents.includes(newDependency);
    } catch (error) {
      console.error('Error checking circular dependency:', error);
      return false;
    }
  }

  /**
   * Get dependency statistics for a tenant
   */
  async getDependencyStats(tenantId: string): Promise<{
    totalFeatures: number;
    coreFeatures: number;
    optionalFeatures: number;
    maxDepth: number;
    circularDependencies: number;
    disableableFeatures: number;
  }> {
    try {
      const allFeatures = await featureCache.getAllFeatures(tenantId);
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
    } catch (error) {
      console.error('Error getting dependency stats:', error);
      throw new DependencyError(
        'Failed to get dependency statistics',
        'STATS_ERROR',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }
}

// Export singleton instance
export const dependencyManager = new FeatureDependencyManager();

// Export error class for external use
// DependencyError is already exported above
