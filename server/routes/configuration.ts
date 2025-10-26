/**
 * Configuration Routes
 * Handles export/import of feature configurations per tenant
 */

import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { createContextLogger } from '../utils/logger';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { extractTenant, requirePolicy } from '../../src/middleware/policy';
import { getDatabase } from '../db/database';

const router = Router();
const logger = createContextLogger({ operation: 'configuration_routes' });

// Validation schemas
const ImportConfigurationSchema = z.object({
  configuration: z.object({
    tenantId: z.string(),
    tenantName: z.string(),
    exportedAt: z.string(),
    version: z.string(),
    features: z.array(z.object({
      featureCode: z.string(),
      isEnabled: z.boolean(),
      isCore: z.boolean(),
      dependsOn: z.array(z.string()),
      category: z.string(),
      name: z.string(),
      description: z.string()
    })),
    roles: z.array(z.object({
      roleId: z.number(),
      roleCode: z.string(),
      roleName: z.string(),
      permissions: z.array(z.string()),
      featureOverrides: z.record(z.boolean())
    })),
    settings: z.object({
      defaultFeatureState: z.enum(['enabled', 'disabled']),
      allowCoreFeatureToggle: z.boolean(),
      requireApprovalForChanges: z.boolean()
    })
  }),
  options: z.object({
    overwriteExisting: z.boolean().default(true),
    validateDependencies: z.boolean().default(true),
    createMissingRoles: z.boolean().default(false)
  }).optional()
});

const UndoActionSchema = z.object({
  auditId: z.number(),
  tenantId: z.string()
});

/**
 * GET /api/admin/features/export
 * Export current tenant configuration
 */
router.get('/api/admin/features/export',
  extractTenant,
  authenticateToken,
  requirePolicy({ feature: 'admin.features', permission: 'admin.features.export' }),
  asyncHandler(async (req: AuthRequest, res) => {
    const requestLogger = createContextLogger({
      operation: 'export_configuration',
      requestId: req.requestId,
      userId: req.user?.id,
      tenantId: req.tenant
    });

    const tenantId = req.tenant!;

    try {
      const db = getDatabase();

      // Get all features for the tenant
      const features = db.prepare(`
        SELECT 
          f.code as featureCode,
          f.name,
          f.description,
          f.is_core as isCore,
          f.depends_on as dependsOn,
          f.category,
          COALESCE(tff.is_enabled, f.is_core) as isEnabled
        FROM features f
        LEFT JOIN tenant_feature_flags tff ON f.code = tff.feature_code AND tff.tenant_id = ?
        ORDER BY f.category, f.name
      `).all(tenantId) as Array<{
        featureCode: string;
        name: string;
        description: string;
        isCore: boolean;
        dependsOn: string;
        category: string;
        isEnabled: boolean;
      }>;

      // Get all roles for the tenant
      const roles = db.prepare(`
        SELECT 
          r.id as roleId,
          r.code as roleCode,
          r.name as roleName,
          GROUP_CONCAT(p.code) as permissions
        FROM roles r
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.id
        GROUP BY r.id, r.code, r.name
      `).all() as Array<{
        roleId: number;
        roleCode: string;
        roleName: string;
        permissions: string;
      }>;

      // Get role feature overrides
      const roleOverrides = db.prepare(`
        SELECT 
          r.code as roleCode,
          rfo.feature_code as featureCode,
          rfo.is_enabled as isEnabled
        FROM roles r
        LEFT JOIN role_feature_overrides rfo ON r.id = rfo.role_id AND rfo.tenant_id = ?
      `).all(tenantId) as Array<{
        roleCode: string;
        featureCode: string;
        isEnabled: boolean;
      }>;

      // Process features
      const processedFeatures = features.map(feature => ({
        featureCode: feature.featureCode,
        isEnabled: Boolean(feature.isEnabled),
        isCore: Boolean(feature.isCore),
        dependsOn: JSON.parse(feature.dependsOn || '[]'),
        category: feature.category || 'Other',
        name: feature.name,
        description: feature.description || ''
      }));

      // Process roles
      const processedRoles = roles.map(role => {
        const permissions = role.permissions ? role.permissions.split(',') : [];
        const featureOverrides: { [key: string]: boolean } = {};
        
        roleOverrides
          .filter(ro => ro.roleCode === role.roleCode)
          .forEach(ro => {
            featureOverrides[ro.featureCode] = Boolean(ro.isEnabled);
          });

        return {
          roleId: role.roleId,
          roleCode: role.roleCode,
          roleName: role.roleName,
          permissions,
          featureOverrides
        };
      });

      // Get tenant info
      const tenant = db.prepare(`
        SELECT name FROM tenants WHERE id = ?
      `).get(tenantId) as { name: string } | undefined;

      const configuration = {
        tenantId,
        tenantName: tenant?.name || 'Unknown Tenant',
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        features: processedFeatures,
        roles: processedRoles,
        settings: {
          defaultFeatureState: 'disabled' as const,
          allowCoreFeatureToggle: false,
          requireApprovalForChanges: false
        }
      };

      requestLogger.info('Configuration exported successfully', {
        tenantId,
        featuresCount: processedFeatures.length,
        rolesCount: processedRoles.length
      });

      res.json({
        ok: true,
        data: configuration
      });

    } catch (error: any) {
      requestLogger.error('Failed to export configuration', {
        tenantId,
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
 * POST /api/admin/features/import
 * Import configuration for a tenant
 */
router.post('/api/admin/features/import',
  extractTenant,
  authenticateToken,
  requirePolicy({ feature: 'admin.features', permission: 'admin.features.import' }),
  asyncHandler(async (req: AuthRequest, res) => {
    const requestLogger = createContextLogger({
      operation: 'import_configuration',
      requestId: req.requestId,
      userId: req.user?.id,
      tenantId: req.tenant
    });

    const tenantId = req.tenant!;

    try {
      const validationResult = ImportConfigurationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid request data',
          details: validationResult.error.errors
        });
      }

      const { configuration, options = {} } = validationResult.data;
      const db = getDatabase();

      const result = {
        success: true,
        importedFeatures: 0,
        importedRoles: 0,
        errors: [] as string[],
        warnings: [] as string[],
        conflicts: [] as any[]
      };

      // Start transaction
      const transaction = db.transaction(() => {
        const now = new Date().toISOString();

        // Import features
        for (const feature of configuration.features) {
          try {
            // Check if feature exists
            const existingFeature = db.prepare(`
              SELECT id, is_core FROM features WHERE code = ?
            `).get(feature.featureCode) as { id: number; is_core: boolean } | undefined;

            if (!existingFeature) {
              result.warnings.push(`Feature '${feature.featureCode}' not found in system`);
              continue;
            }

            if (existingFeature.is_core && !feature.isCore) {
              result.warnings.push(`Cannot modify core feature '${feature.featureCode}'`);
              continue;
            }

            // Check current state
            const currentFlag = db.prepare(`
              SELECT is_enabled FROM tenant_feature_flags 
              WHERE tenant_id = ? AND feature_code = ?
            `).get(tenantId, feature.featureCode) as { is_enabled: boolean } | undefined;

            const currentState = currentFlag?.is_enabled ?? feature.isCore;

            if (currentState !== feature.isEnabled) {
              if (options.overwriteExisting || !currentFlag) {
                // Update or create feature flag
                if (currentFlag) {
                  db.prepare(`
                    UPDATE tenant_feature_flags 
                    SET is_enabled = ?, updated_by = ?, updated_at = ?
                    WHERE tenant_id = ? AND feature_code = ?
                  `).run(feature.isEnabled, req.user!.username, now, tenantId, feature.featureCode);
                } else {
                  db.prepare(`
                    INSERT INTO tenant_feature_flags (tenant_id, feature_code, is_enabled, updated_by, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                  `).run(tenantId, feature.featureCode, feature.isEnabled, req.user!.username, now);
                }

                result.importedFeatures++;
              } else {
                result.conflicts.push({
                  featureCode: feature.featureCode,
                  currentState,
                  importedState: feature.isEnabled
                });
              }
            }
          } catch (error: any) {
            result.errors.push(`Failed to import feature '${feature.featureCode}': ${error.message}`);
          }
        }

        // Import role overrides
        for (const role of configuration.roles) {
          try {
            // Check if role exists
            const existingRole = db.prepare(`
              SELECT id FROM roles WHERE code = ?
            `).get(role.roleCode) as { id: number } | undefined;

            if (!existingRole) {
              if (options.createMissingRoles) {
                // Create missing role
                const roleId = db.prepare(`
                  INSERT INTO roles (code, name, created_at, updated_at)
                  VALUES (?, ?, ?, ?)
                `).run(role.roleCode, role.roleName, now, now).lastInsertRowid;

                // Add permissions
                for (const permission of role.permissions) {
                  const perm = db.prepare(`
                    SELECT id FROM permissions WHERE code = ?
                  `).get(permission) as { id: number } | undefined;

                  if (perm) {
                    db.prepare(`
                      INSERT INTO role_permissions (role_id, permission_id)
                      VALUES (?, ?)
                    `).run(roleId, perm.id);
                  }
                }

                result.importedRoles++;
              } else {
                result.warnings.push(`Role '${role.roleCode}' not found and not created`);
                continue;
              }
            } else {
              result.importedRoles++;
            }

            // Import feature overrides
            for (const [featureCode, isEnabled] of Object.entries(role.featureOverrides)) {
              try {
                const existingOverride = db.prepare(`
                  SELECT id FROM role_feature_overrides 
                  WHERE tenant_id = ? AND role_id = ? AND feature_code = ?
                `).get(tenantId, existingRole.id, featureCode) as { id: number } | undefined;

                if (existingOverride) {
                  db.prepare(`
                    UPDATE role_feature_overrides 
                    SET is_enabled = ?, updated_by = ?, updated_at = ?
                    WHERE tenant_id = ? AND role_id = ? AND feature_code = ?
                  `).run(isEnabled, req.user!.username, now, tenantId, existingRole.id, featureCode);
                } else {
                  db.prepare(`
                    INSERT INTO role_feature_overrides (tenant_id, role_id, feature_code, is_enabled, updated_by, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                  `).run(tenantId, existingRole.id, featureCode, isEnabled, req.user!.username, now);
                }
              } catch (error: any) {
                result.errors.push(`Failed to import role override for '${featureCode}': ${error.message}`);
              }
            }
          } catch (error: any) {
            result.errors.push(`Failed to import role '${role.roleCode}': ${error.message}`);
          }
        }

        return result;
      });

      const importResult = transaction();

      requestLogger.info('Configuration imported', {
        tenantId,
        importedFeatures: importResult.importedFeatures,
        importedRoles: importResult.importedRoles,
        errors: importResult.errors.length,
        warnings: importResult.warnings.length,
        conflicts: importResult.conflicts.length
      });

      res.json({
        ok: true,
        data: importResult
      });

    } catch (error: any) {
      requestLogger.error('Failed to import configuration', {
        tenantId,
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
 * POST /api/admin/features/undo
 * Undo a feature change using audit ID
 */
router.post('/api/admin/features/undo',
  extractTenant,
  authenticateToken,
  requirePolicy({ feature: 'admin.features', permission: 'admin.features.undo' }),
  asyncHandler(async (req: AuthRequest, res) => {
    const requestLogger = createContextLogger({
      operation: 'undo_feature_change',
      requestId: req.requestId,
      userId: req.user?.id,
      tenantId: req.tenant
    });

    const tenantId = req.tenant!;

    try {
      const validationResult = UndoActionSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid request data',
          details: validationResult.error.errors
        });
      }

      const { auditId } = validationResult.data;
      const db = getDatabase();

      // Get audit log entry
      const auditLog = db.prepare(`
        SELECT * FROM audit_logs 
        WHERE id = ? AND tenant_id = ? AND action = 'FEATURE_TOGGLE'
        ORDER BY created_at DESC
        LIMIT 1
      `).get(auditId, tenantId) as {
        id: number;
        payload_json: string;
        created_at: string;
      } | undefined;

      if (!auditLog) {
        return res.status(404).json({
          ok: false,
          error: 'Audit log not found or not eligible for undo'
        });
      }

      // Check if undo is within time limit (10 minutes)
      const auditTime = new Date(auditLog.created_at).getTime();
      const now = Date.now();
      const timeDiff = now - auditTime;

      if (timeDiff > 10 * 60 * 1000) { // 10 minutes
        return res.status(400).json({
          ok: false,
          error: 'Undo time limit exceeded (10 minutes)'
        });
      }

      const payload = JSON.parse(auditLog.payload_json);
      const { featureCode, previousState, newState } = payload;

      // Revert the change
      const transaction = db.transaction(() => {
        const now = new Date().toISOString();

        // Update feature flag
        db.prepare(`
          UPDATE tenant_feature_flags 
          SET is_enabled = ?, updated_by = ?, updated_at = ?
          WHERE tenant_id = ? AND feature_code = ?
        `).run(previousState, req.user!.username, now, tenantId, featureCode);

        // Log the undo action
        db.prepare(`
          INSERT INTO audit_logs (actor_id, action, payload_json, created_at)
          VALUES (?, ?, ?, ?)
        `).run(
          req.user!.id,
          'FEATURE_UNDO',
          JSON.stringify({
            originalAuditId: auditId,
            featureCode,
            revertedFrom: newState,
            revertedTo: previousState,
            revertedBy: req.user!.username,
            revertedAt: now
          }),
          now
        );

        return {
          featureCode,
          revertedFrom: newState,
          revertedTo: previousState
        };
      });

      const undoResult = transaction();

      requestLogger.info('Feature change undone', {
        tenantId,
        auditId,
        featureCode: undoResult.featureCode,
        revertedFrom: undoResult.revertedFrom,
        revertedTo: undoResult.revertedTo
      });

      res.json({
        ok: true,
        data: undoResult
      });

    } catch (error: any) {
      requestLogger.error('Failed to undo feature change', {
        tenantId,
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

export { router as configurationRouter };










