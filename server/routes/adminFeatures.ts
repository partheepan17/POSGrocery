/**
 * Admin Features Routes
 * Safe mutations with audit logs and dependency checks for feature management
 */

import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { createContextLogger } from '../utils/logger';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { extractTenant, requirePolicy } from '../../src/middleware/policy';
import { getDatabase } from '../db/database';
import { dependencyManager } from '../../src/lib/access/dependency';
import { emitFeatureUpdate } from '../../src/lib/events';
import { featureCache } from '../../src/lib/access/FeatureCache';

const router = Router();
const logger = createContextLogger({ operation: 'admin_features_routes' });

// Validation schemas
const ToggleFeatureSchema = z.object({
  featureCode: z.string().min(1).max(100),
  isEnabled: z.boolean(),
  cascade: z.boolean().optional().default(false)
});

const OverrideFeatureSchema = z.object({
  roleId: z.number().int().positive(),
  featureCode: z.string().min(1).max(100),
  isEnabled: z.boolean()
});

/**
 * POST /api/admin/features/toggle
 * Toggle a feature flag for the current tenant with audit logging and dependency checks
 */
router.post('/api/admin/features/toggle', 
  extractTenant,
  authenticateToken,
  requirePolicy({ feature: 'feature_flags_console', permission: 'feature.toggle' }),
  asyncHandler(async (req: AuthRequest, res) => {
    const requestLogger = createContextLogger({ 
      operation: 'admin_toggle_feature', 
      requestId: req.requestId,
      userId: req.user?.id,
      tenantId: req.tenant
    });

    const tenantId = req.tenant!;
    const userId = req.user?.id!;
    const username = req.user?.username || 'unknown';

    try {
      // Validate request body
      const validationResult = ToggleFeatureSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid request data',
          details: validationResult.error.errors
        });
      }

      const { featureCode, isEnabled, cascade } = validationResult.data;

      requestLogger.info('Starting feature toggle', {
        tenantId,
        featureCode,
        isEnabled,
        cascade,
        userId,
        username
      });

      // Use the feature toggle service
      const { toggleTenantFeature } = await import('../services/featureToggleService');
      
      const result = await toggleTenantFeature({
        tenantId,
        featureCode,
        isEnabled,
        updatedBy: username,
        cascade
      });

      // Check if the toggle was successful
      if (!result.success) {
        if (result.error === 'DEPENDENTS') {
          return res.status(400).json({
            ok: false,
            error: 'DEPENDENTS',
            message: result.message,
            blockingDependents: result.blockingDependents
          });
        }
        
        return res.status(400).json({
          ok: false,
          error: result.error || 'Toggle failed',
          message: result.message
        });
      }

      // Invalidate cache and emit events
      featureCache.invalidateTenant(tenantId);
      emitFeatureUpdate(tenantId, featureCode, username);

      requestLogger.info('Feature toggle completed successfully', {
        tenantId,
        featureCode,
        isEnabled,
        cascade,
        cascadeTargets: result.cascadeTargets?.length || 0,
        userId,
        username
      });

      res.json({
        ok: true,
        message: result.message,
        data: {
          featureCode: result.featureCode,
          isEnabled: result.isEnabled,
          updatedBy: result.updatedBy,
          updatedAt: result.updatedAt,
          cascadeTargets: result.cascadeTargets
        }
      });

    } catch (error: any) {
      requestLogger.error('Feature toggle failed', {
        tenantId,
        featureCode: req.body?.featureCode,
        isEnabled: req.body?.isEnabled,
        cascade: req.body?.cascade,
        userId,
        username,
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        ok: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  })
);

/**
 * POST /api/admin/features/override
 * Override a feature flag for a specific role within the current tenant
 */
router.post('/api/admin/features/override', 
  extractTenant,
  authenticateToken,
  requirePolicy({ feature: 'feature_flags_console', permission: 'feature.toggle' }),
  asyncHandler(async (req: AuthRequest, res) => {
    const requestLogger = createContextLogger({ 
      operation: 'admin_override_feature', 
      requestId: req.requestId,
      userId: req.user?.id,
      tenantId: req.tenant
    });

    const db = getDatabase();
    const tenantId = req.tenant!;
    const userId = req.user?.id!;
    const username = req.user?.username || 'unknown';

    try {
      // Validate request body
      const validationResult = OverrideFeatureSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid request data',
          details: validationResult.error.errors
        });
      }

      const { roleId, featureCode, isEnabled } = validationResult.data;

      requestLogger.info('Starting role feature override', {
        tenantId,
        roleId,
        featureCode,
        isEnabled,
        userId,
        username
      });

      // Check if role exists
      const role = db.prepare(`
        SELECT id, code, name FROM roles WHERE id = ?
      `).get(roleId) as { id: number; code: string; name: string } | undefined;

      if (!role) {
        return res.status(404).json({
          ok: false,
          error: 'Role not found',
          message: `Role with ID ${roleId} does not exist`
        });
      }

      // Check if feature exists
      const feature = db.prepare(`
        SELECT id, code, name, is_core FROM features WHERE code = ?
      `).get(featureCode) as { id: number; code: string; name: string; is_core: boolean } | undefined;

      if (!feature) {
        return res.status(404).json({
          ok: false,
          error: 'Feature not found',
          message: `Feature '${featureCode}' does not exist`
        });
      }

      // Begin transaction
      const transaction = db.transaction(() => {
        const now = new Date().toISOString();

        // Upsert role feature override
        db.prepare(`
          INSERT INTO role_feature_overrides (tenant_id, role_id, feature_code, is_enabled, updated_by, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(tenant_id, role_id, feature_code) DO UPDATE SET
            is_enabled = EXCLUDED.is_enabled,
            updated_by = EXCLUDED.updated_by,
            updated_at = EXCLUDED.updated_at
        `).run(tenantId, roleId, featureCode, isEnabled, username, now);

        // Insert audit log
        const auditData = {
          roleId,
          roleCode: role.code,
          roleName: role.name,
          featureCode,
          featureName: feature.name,
          tenantId,
          newState: isEnabled,
          changeType: 'role_feature_override'
        };

        db.prepare(`
          INSERT INTO audit_logs (actor_id, action, payload_json, created_at)
          VALUES (?, ?, ?, ?)
        `).run(
          userId,
          'ROLE_FEATURE_OVERRIDE',
          JSON.stringify(auditData),
          now
        );

        return { now, auditData };
      });

      const { now, auditData } = transaction();

      // Invalidate cache and emit events
      featureCache.invalidateTenant(tenantId);
      emitFeatureUpdate(tenantId, featureCode, username);

      requestLogger.info('Role feature override completed successfully', {
        tenantId,
        roleId,
        featureCode,
        isEnabled,
        userId,
        username,
        auditData
      });

      res.json({
        ok: true,
        message: `Feature '${featureCode}' ${isEnabled ? 'enabled' : 'disabled'} for role '${role.name}'`,
        data: {
          roleId,
          roleCode: role.code,
          roleName: role.name,
          featureCode,
          isEnabled,
          updatedBy: username,
          updatedAt: now,
          auditData
        }
      });

    } catch (error: any) {
      requestLogger.error('Role feature override failed', {
        tenantId,
        roleId: req.body?.roleId,
        featureCode: req.body?.featureCode,
        isEnabled: req.body?.isEnabled,
        userId,
        username,
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        ok: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  })
);

/**
 * GET /api/admin/features/dependencies/:featureCode
 * Get dependency information for a feature
 */
router.get('/api/admin/features/dependencies/:featureCode',
  extractTenant,
  authenticateToken,
  requirePolicy({ feature: 'feature_flags_console', permission: 'feature.view' }),
  asyncHandler(async (req: AuthRequest, res) => {
    const requestLogger = createContextLogger({ 
      operation: 'get_feature_dependencies', 
      requestId: req.requestId,
      userId: req.user?.id,
      tenantId: req.tenant
    });

    const tenantId = req.tenant!;
    const { featureCode } = req.params;

    try {
      // Get dependency information
      const [dependents, dependencies, cascadeInfo] = await Promise.all([
        dependencyManager.getDependents(tenantId, featureCode),
        dependencyManager.getDependencies(tenantId, featureCode),
        dependencyManager.validateDisableWithCascade(tenantId, featureCode)
      ]);

      requestLogger.info('Feature dependencies retrieved', {
        tenantId,
        featureCode,
        dependentsCount: dependents.length,
        dependenciesCount: dependencies.length,
        cascadeTargetsCount: cascadeInfo.cascadeTargets.length
      });

      res.json({
        ok: true,
        data: {
          featureCode,
          dependents,
          dependencies,
          cascadeInfo: {
            canDisable: cascadeInfo.canDisable,
            blockingDependents: cascadeInfo.blockingDependents,
            cascadeTargets: cascadeInfo.cascadeTargets,
            effectiveDependents: cascadeInfo.effectiveDependents
          }
        }
      });

    } catch (error: any) {
      requestLogger.error('Failed to get feature dependencies', {
        tenantId,
        featureCode,
        userId: req.user?.id,
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        ok: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  })
);

export { router as adminFeaturesRouter };