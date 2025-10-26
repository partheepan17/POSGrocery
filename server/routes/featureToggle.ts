/**
 * Feature Toggle Routes
 * Handles feature flag toggling with realtime updates
 */

import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { createContextLogger } from '../utils/logger';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { extractTenant, requirePolicy } from '../../src/middleware/policy';
import { featureToggleService } from '../services/featureToggleService';

const router = Router();
const logger = createContextLogger({ operation: 'feature_toggle_routes' });

// Validation schemas
const ToggleTenantFeatureSchema = z.object({
  featureCode: z.string().min(1),
  isEnabled: z.boolean()
});

const ToggleRoleOverrideSchema = z.object({
  roleId: z.number().int().positive(),
  featureCode: z.string().min(1),
  isEnabled: z.boolean()
});

const BulkToggleSchema = z.object({
  features: z.array(z.object({
    featureCode: z.string().min(1),
    isEnabled: z.boolean()
  })).min(1).max(50) // Limit to 50 features per bulk operation
});

/**
 * POST /api/features/toggle
 * Toggle a feature flag for the current tenant
 */
router.post('/api/features/toggle', 
  extractTenant,
  authenticateToken,
  requirePolicy({ feature: 'admin.features', permission: 'admin.features.toggle' }),
  asyncHandler(async (req: AuthRequest, res) => {
    const requestLogger = createContextLogger({ 
      operation: 'toggle_tenant_feature', 
      requestId: req.requestId,
      userId: req.user?.id,
      tenantId: req.tenant
    });

    try {
      const tenantId = req.tenant!;
      const updatedBy = req.user?.username || 'unknown';
      
      // Validate request body
      const validationResult = ToggleTenantFeatureSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid request data',
          details: validationResult.error.errors
        });
      }

      const { featureCode, isEnabled } = validationResult.data;

      requestLogger.info('Toggling tenant feature', {
        tenantId,
        featureCode,
        isEnabled,
        updatedBy
      });

      const result = await featureToggleService.toggleTenantFeature({
        tenantId,
        featureCode,
        isEnabled,
        updatedBy
      });

      requestLogger.info('Feature toggled successfully', {
        tenantId,
        featureCode,
        isEnabled,
        updatedBy
      });

      res.json({
        ok: true,
        data: result
      });

    } catch (error) {
      requestLogger.error('Failed to toggle tenant feature', { 
        error: error.message,
        userId: req.user?.id,
        tenantId: req.tenant
      });

      res.status(500).json({
        ok: false,
        error: 'Failed to toggle feature',
        message: error.message
      });
    }
  })
);

/**
 * POST /api/features/role-override
 * Toggle a role feature override for the current tenant
 */
router.post('/api/features/role-override', 
  extractTenant,
  authenticateToken,
  requirePolicy({ feature: 'admin.features', permission: 'admin.features.toggle' }),
  asyncHandler(async (req: AuthRequest, res) => {
    const requestLogger = createContextLogger({ 
      operation: 'toggle_role_override', 
      requestId: req.requestId,
      userId: req.user?.id,
      tenantId: req.tenant
    });

    try {
      const tenantId = req.tenant!;
      const updatedBy = req.user?.username || 'unknown';
      
      // Validate request body
      const validationResult = ToggleRoleOverrideSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid request data',
          details: validationResult.error.errors
        });
      }

      const { roleId, featureCode, isEnabled } = validationResult.data;

      requestLogger.info('Toggling role feature override', {
        tenantId,
        roleId,
        featureCode,
        isEnabled,
        updatedBy
      });

      const result = await featureToggleService.toggleRoleOverride({
        tenantId,
        roleId,
        featureCode,
        isEnabled,
        updatedBy
      });

      requestLogger.info('Role feature override toggled successfully', {
        tenantId,
        roleId,
        featureCode,
        isEnabled,
        updatedBy
      });

      res.json({
        ok: true,
        data: result
      });

    } catch (error) {
      requestLogger.error('Failed to toggle role feature override', { 
        error: error.message,
        userId: req.user?.id,
        tenantId: req.tenant
      });

      res.status(500).json({
        ok: false,
        error: 'Failed to toggle role feature override',
        message: error.message
      });
    }
  })
);

/**
 * POST /api/features/bulk-toggle
 * Bulk toggle multiple features for the current tenant
 */
router.post('/api/features/bulk-toggle', 
  extractTenant,
  authenticateToken,
  requirePolicy({ feature: 'admin.features', permission: 'admin.features.toggle' }),
  asyncHandler(async (req: AuthRequest, res) => {
    const requestLogger = createContextLogger({ 
      operation: 'bulk_toggle_features', 
      requestId: req.requestId,
      userId: req.user?.id,
      tenantId: req.tenant
    });

    try {
      const tenantId = req.tenant!;
      const updatedBy = req.user?.username || 'unknown';
      
      // Validate request body
      const validationResult = BulkToggleSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid request data',
          details: validationResult.error.errors
        });
      }

      const { features } = validationResult.data;

      requestLogger.info('Bulk toggling features', {
        tenantId,
        featureCount: features.length,
        updatedBy
      });

      const results = await featureToggleService.bulkToggleTenantFeatures(
        tenantId,
        features,
        updatedBy
      );

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      requestLogger.info('Bulk feature toggle completed', {
        tenantId,
        successCount,
        failureCount,
        updatedBy
      });

      res.json({
        ok: true,
        data: {
          results,
          summary: {
            total: results.length,
            success: successCount,
            failures: failureCount
          }
        }
      });

    } catch (error) {
      requestLogger.error('Failed to bulk toggle features', { 
        error: error.message,
        userId: req.user?.id,
        tenantId: req.tenant
      });

      res.status(500).json({
        ok: false,
        error: 'Failed to bulk toggle features',
        message: error.message
      });
    }
  })
);

/**
 * GET /api/features/tenant
 * Get all feature flags for the current tenant
 */
router.get('/api/features/tenant', 
  extractTenant,
  authenticateToken,
  requirePolicy({ feature: 'admin.features', permission: 'admin.features.view' }),
  asyncHandler(async (req: AuthRequest, res) => {
    const requestLogger = createContextLogger({ 
      operation: 'get_tenant_features', 
      requestId: req.requestId,
      userId: req.user?.id,
      tenantId: req.tenant
    });

    try {
      const tenantId = req.tenant!;

      requestLogger.debug('Getting tenant features', { tenantId });

      const features = await featureToggleService.getTenantFeatures(tenantId);

      requestLogger.info('Tenant features retrieved', {
        tenantId,
        featureCount: features.length,
        enabledCount: features.filter(f => f.isEnabled).length
      });

      res.json({
        ok: true,
        data: {
          features,
          summary: {
            total: features.length,
            enabled: features.filter(f => f.isEnabled).length,
            disabled: features.filter(f => !f.isEnabled).length,
            core: features.filter(f => f.isCore).length,
            overrides: features.filter(f => f.source !== 'default').length
          }
        }
      });

    } catch (error) {
      requestLogger.error('Failed to get tenant features', { 
        error: error.message,
        userId: req.user?.id,
        tenantId: req.tenant
      });

      res.status(500).json({
        ok: false,
        error: 'Failed to get tenant features',
        message: error.message
      });
    }
  })
);

/**
 * GET /api/features/role/:roleId
 * Get feature flags for a specific role in the current tenant
 */
router.get('/api/features/role/:roleId', 
  extractTenant,
  authenticateToken,
  requirePolicy({ feature: 'admin.features', permission: 'admin.features.view' }),
  asyncHandler(async (req: AuthRequest, res) => {
    const requestLogger = createContextLogger({ 
      operation: 'get_role_features', 
      requestId: req.requestId,
      userId: req.user?.id,
      tenantId: req.tenant
    });

    try {
      const tenantId = req.tenant!;
      const roleId = parseInt(req.params.roleId);

      if (isNaN(roleId)) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid role ID'
        });
      }

      requestLogger.debug('Getting role features', { tenantId, roleId });

      const features = await featureToggleService.getRoleFeatures(tenantId, roleId);

      requestLogger.info('Role features retrieved', {
        tenantId,
        roleId,
        featureCount: features.length,
        enabledCount: features.filter(f => f.isEnabled).length
      });

      res.json({
        ok: true,
        data: {
          roleId,
          features,
          summary: {
            total: features.length,
            enabled: features.filter(f => f.isEnabled).length,
            disabled: features.filter(f => !f.isEnabled).length,
            core: features.filter(f => f.isCore).length,
            overrides: features.filter(f => f.source !== 'default').length
          }
        }
      });

    } catch (error) {
      requestLogger.error('Failed to get role features', { 
        error: error.message,
        userId: req.user?.id,
        tenantId: req.tenant
      });

      res.status(500).json({
        ok: false,
        error: 'Failed to get role features',
        message: error.message
      });
    }
  })
);

export { router as featureToggleRouter };










