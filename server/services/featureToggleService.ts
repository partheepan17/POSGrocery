/**
 * Feature Toggle Service
 * Handles feature flag toggling and emits realtime update events
 */

import { getDatabase } from '../db/database';
import { createContextLogger } from '../utils/logger';
import { emitFeatureUpdate, emitCacheInvalidation } from '../../src/lib/events';
import { featureCache } from '../../src/lib/access/FeatureCache';

const logger = createContextLogger({ operation: 'feature_toggle_service' });

export interface ToggleFeatureRequest {
  tenantId: string;
  featureCode: string;
  isEnabled: boolean;
  updatedBy: string;
  cascade?: boolean;
}

export interface ToggleRoleOverrideRequest {
  tenantId: string;
  roleId: number;
  featureCode: string;
  isEnabled: boolean;
  updatedBy: string;
}

export interface FeatureToggleResult {
  success: boolean;
  featureCode: string;
  isEnabled: boolean;
  updatedBy: string;
  updatedAt: string;
  message?: string;
  error?: string;
  blockingDependents?: string[];
  cascadeTargets?: string[];
}

/**
 * Toggle a feature flag for a tenant
 */
export async function toggleTenantFeature(request: ToggleFeatureRequest): Promise<FeatureToggleResult> {
  const { tenantId, featureCode, isEnabled, updatedBy, cascade = false } = request;
  
  logger.info('Toggling tenant feature', {
    tenantId,
    featureCode,
    isEnabled,
    updatedBy,
    cascade
  });

  try {
    const db = getDatabase();
    
    // Check if feature exists
    const feature = db.prepare(`
      SELECT id, code, name, is_core FROM features WHERE code = ?
    `).get(featureCode) as { id: number; code: string; name: string; is_core: boolean } | undefined;

    if (!feature) {
      throw new Error(`Feature '${featureCode}' not found`);
    }

    if (feature.is_core && !isEnabled) {
      throw new Error(`Cannot disable core feature '${featureCode}'`);
    }

    // Import dependency manager
    const { dependencyManager } = await import('../../src/lib/access/dependency');

    // If disabling and not using cascade, check dependencies
    if (!isEnabled && !cascade) {
      const validation = await dependencyManager.validateDisable(tenantId, featureCode);
      if (!validation.canDisable) {
        return {
          success: false,
          featureCode,
          isEnabled,
          updatedBy,
          updatedAt: new Date().toISOString(),
          message: `Cannot disable feature '${featureCode}': has enabled dependents`,
          error: 'DEPENDENTS',
          blockingDependents: validation.blockingDependents
        };
      }
    }

    // If disabling with cascade, get all features to disable
    let cascadeTargets: string[] = [];
    if (!isEnabled && cascade) {
      const cascadeValidation = await dependencyManager.validateDisableWithCascade(tenantId, featureCode);
      cascadeTargets = cascadeValidation.cascadeTargets;
    }

    // Start transaction
    const transaction = db.transaction(() => {
      const now = new Date().toISOString();
      const featuresToToggle = [featureCode, ...cascadeTargets];

      for (const code of featuresToToggle) {
        // Check if tenant feature flag exists
        const existingFlag = db.prepare(`
          SELECT id, is_enabled FROM tenant_feature_flags 
          WHERE tenant_id = ? AND feature_code = ?
        `).get(tenantId, code) as { id: number; is_enabled: boolean } | undefined;

        if (existingFlag) {
          // Update existing flag
          db.prepare(`
            UPDATE tenant_feature_flags 
            SET is_enabled = ?, updated_by = ?, updated_at = ?
            WHERE tenant_id = ? AND feature_code = ?
          `).run(isEnabled, updatedBy, now, tenantId, code);
        } else {
          // Create new flag
          db.prepare(`
            INSERT INTO tenant_feature_flags (tenant_id, feature_code, is_enabled, updated_by, updated_at)
            VALUES (?, ?, ?, ?, ?)
          `).run(tenantId, code, isEnabled, updatedBy, now);
        }
      }

      return now;
    });

    const now = transaction();

    // Invalidate cache
    featureCache.invalidateTenant(tenantId);

    // Emit realtime update event
    emitFeatureUpdate(tenantId, featureCode, updatedBy);

    logger.info('Feature toggled successfully', {
      tenantId,
      featureCode,
      isEnabled,
      updatedBy,
      cascade,
      cascadeTargets: cascadeTargets.length
    });

    const message = cascade && cascadeTargets.length > 0
      ? `Feature '${featureCode}' and ${cascadeTargets.length} dependent features ${isEnabled ? 'enabled' : 'disabled'} for tenant '${tenantId}'`
      : `Feature '${featureCode}' ${isEnabled ? 'enabled' : 'disabled'} for tenant '${tenantId}'`;

    return {
      success: true,
      featureCode,
      isEnabled,
      updatedBy,
      updatedAt: now,
      message,
      cascadeTargets: cascade ? cascadeTargets : undefined
    };

  } catch (error) {
    logger.error('Failed to toggle tenant feature', {
      tenantId,
      featureCode,
      isEnabled,
      updatedBy,
      cascade,
      error: error.message
    });

    throw error;
  }
}

/**
 * Toggle a role feature override for a tenant
 */
export async function toggleRoleOverride(request: ToggleRoleOverrideRequest): Promise<FeatureToggleResult> {
  const { tenantId, roleId, featureCode, isEnabled, updatedBy } = request;
  
  logger.info('Toggling role feature override', {
    tenantId,
    roleId,
    featureCode,
    isEnabled,
    updatedBy
  });

  try {
    const db = getDatabase();
    
    // Check if feature exists
    const feature = db.prepare(`
      SELECT id, code, name, is_core FROM features WHERE code = ?
    `).get(featureCode) as { id: number; code: string; name: string; is_core: boolean } | undefined;

    if (!feature) {
      throw new Error(`Feature '${featureCode}' not found`);
    }

    // Check if role exists
    const role = db.prepare(`
      SELECT id, code, name FROM roles WHERE id = ?
    `).get(roleId) as { id: number; code: string; name: string } | undefined;

    if (!role) {
      throw new Error(`Role with ID '${roleId}' not found`);
    }

    // Check if role feature override exists
    const existingOverride = db.prepare(`
      SELECT id, is_enabled FROM role_feature_overrides 
      WHERE tenant_id = ? AND role_id = ? AND feature_code = ?
    `).get(tenantId, roleId, featureCode) as { id: number; is_enabled: boolean } | undefined;

    const now = new Date().toISOString();

    if (existingOverride) {
      // Update existing override
      db.prepare(`
        UPDATE role_feature_overrides 
        SET is_enabled = ?, updated_by = ?, updated_at = ?
        WHERE tenant_id = ? AND role_id = ? AND feature_code = ?
      `).run(isEnabled, updatedBy, now, tenantId, roleId, featureCode);
    } else {
      // Create new override
      db.prepare(`
        INSERT INTO role_feature_overrides (tenant_id, role_id, feature_code, is_enabled, updated_by, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(tenantId, roleId, featureCode, isEnabled, updatedBy, now);
    }

    // Invalidate cache
    featureCache.invalidateTenant(tenantId);

    // Emit realtime update event
    emitFeatureUpdate(tenantId, featureCode, updatedBy);

    logger.info('Role feature override toggled successfully', {
      tenantId,
      roleId,
      featureCode,
      isEnabled,
      updatedBy
    });

    return {
      success: true,
      featureCode,
      isEnabled,
      updatedBy,
      updatedAt: now,
      message: `Feature '${featureCode}' ${isEnabled ? 'enabled' : 'disabled'} for role '${role.code}' in tenant '${tenantId}'`
    };

  } catch (error) {
    logger.error('Failed to toggle role feature override', {
      tenantId,
      roleId,
      featureCode,
      isEnabled,
      updatedBy,
      error: error.message
    });

    throw error;
  }
}

/**
 * Get all feature flags for a tenant
 */
export async function getTenantFeatures(tenantId: string): Promise<Array<{
  featureCode: string;
  featureName: string;
  isEnabled: boolean;
  isCore: boolean;
  source: 'default' | 'tenant_override' | 'role_override';
  updatedBy?: string;
  updatedAt?: string;
}>> {
  logger.debug('Getting tenant features', { tenantId });

  try {
    const db = getDatabase();
    
    // Get all features with their tenant flags
    const features = db.prepare(`
      SELECT 
        f.code as feature_code,
        f.name as feature_name,
        f.is_core as is_core,
        tff.is_enabled as tenant_enabled,
        tff.updated_by as tenant_updated_by,
        tff.updated_at as tenant_updated_at
      FROM features f
      LEFT JOIN tenant_feature_flags tff ON f.code = tff.feature_code AND tff.tenant_id = ?
      ORDER BY f.code
    `).all(tenantId) as Array<{
      feature_code: string;
      feature_name: string;
      is_core: boolean;
      tenant_enabled: boolean | null;
      tenant_updated_by: string | null;
      tenant_updated_at: string | null;
    }>;

    return features.map(feature => ({
      featureCode: feature.feature_code,
      featureName: feature.feature_name,
      isEnabled: feature.tenant_enabled ?? feature.is_core,
      isCore: feature.is_core,
      source: feature.tenant_enabled !== null ? 'tenant_override' : 'default',
      updatedBy: feature.tenant_updated_by || undefined,
      updatedAt: feature.tenant_updated_at || undefined
    }));

  } catch (error) {
    logger.error('Failed to get tenant features', {
      tenantId,
      error: error.message
    });

    throw error;
  }
}

/**
 * Get feature flags for a specific role in a tenant
 */
export async function getRoleFeatures(tenantId: string, roleId: number): Promise<Array<{
  featureCode: string;
  featureName: string;
  isEnabled: boolean;
  isCore: boolean;
  source: 'default' | 'tenant_override' | 'role_override';
  updatedBy?: string;
  updatedAt?: string;
}>> {
  logger.debug('Getting role features', { tenantId, roleId });

  try {
    const db = getDatabase();
    
    // Get all features with their tenant flags and role overrides
    const features = db.prepare(`
      SELECT 
        f.code as feature_code,
        f.name as feature_name,
        f.is_core as is_core,
        tff.is_enabled as tenant_enabled,
        rfo.is_enabled as role_enabled,
        COALESCE(rfo.updated_by, tff.updated_by) as updated_by,
        COALESCE(rfo.updated_at, tff.updated_at) as updated_at
      FROM features f
      LEFT JOIN tenant_feature_flags tff ON f.code = tff.feature_code AND tff.tenant_id = ?
      LEFT JOIN role_feature_overrides rfo ON f.code = rfo.feature_code AND rfo.tenant_id = ? AND rfo.role_id = ?
      ORDER BY f.code
    `).all(tenantId, tenantId, roleId) as Array<{
      feature_code: string;
      feature_name: string;
      is_core: boolean;
      tenant_enabled: boolean | null;
      role_enabled: boolean | null;
      updated_by: string | null;
      updated_at: string | null;
    }>;

    return features.map(feature => {
      let isEnabled = feature.is_core; // Default to core status
      let source: 'default' | 'tenant_override' | 'role_override' = 'default';

      if (feature.role_enabled !== null) {
        isEnabled = feature.role_enabled;
        source = 'role_override';
      } else if (feature.tenant_enabled !== null) {
        isEnabled = feature.tenant_enabled;
        source = 'tenant_override';
      }

      return {
        featureCode: feature.feature_code,
        featureName: feature.feature_name,
        isEnabled,
        isCore: feature.is_core,
        source,
        updatedBy: feature.updated_by || undefined,
        updatedAt: feature.updated_at || undefined
      };
    });

  } catch (error) {
    logger.error('Failed to get role features', {
      tenantId,
      roleId,
      error: error.message
    });

    throw error;
  }
}

/**
 * Bulk toggle features for a tenant
 */
export async function bulkToggleTenantFeatures(
  tenantId: string,
  features: Array<{ featureCode: string; isEnabled: boolean }>,
  updatedBy: string
): Promise<Array<FeatureToggleResult>> {
  logger.info('Bulk toggling tenant features', {
    tenantId,
    featureCount: features.length,
    updatedBy
  });

  const results: FeatureToggleResult[] = [];

  for (const feature of features) {
    try {
      const result = await toggleTenantFeature({
        tenantId,
        featureCode: feature.featureCode,
        isEnabled: feature.isEnabled,
        updatedBy
      });
      results.push(result);
    } catch (error) {
      logger.error('Failed to toggle feature in bulk operation', {
        tenantId,
        featureCode: feature.featureCode,
        error: error.message
      });
      
      results.push({
        success: false,
        featureCode: feature.featureCode,
        isEnabled: feature.isEnabled,
        updatedBy,
        updatedAt: new Date().toISOString(),
        message: `Failed to toggle feature: ${error.message}`
      });
    }
  }

  // Emit single bulk update event
  emitFeatureUpdate(tenantId, undefined, updatedBy);

  logger.info('Bulk feature toggle completed', {
    tenantId,
    successCount: results.filter(r => r.success).length,
    failureCount: results.filter(r => !r.success).length,
    updatedBy
  });

  return results;
}

export const featureToggleService = {
  toggleTenantFeature,
  toggleRoleOverride,
  getTenantFeatures,
  getRoleFeatures,
  bulkToggleTenantFeatures
};
