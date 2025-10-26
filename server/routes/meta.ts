import express from 'express';
import { PolicyService } from '../services/policyService';
import { requireAuth } from '../middleware/requireAuth';
import { checkPolicy } from '../middleware/checkPolicy';

export function createMetaRoutes(policyService: PolicyService, authService: any) {
  const router = express.Router();

  // GET /api/meta/features
  router.get('/features', requireAuth(authService), async (req, res) => {
    try {
      const userId = req.user!.id;
      const tenantId = req.headers['x-tenant-id'] as string || 'default';

      const features = await policyService.getEffectiveFeatures(userId, tenantId);
      const permissions = await policyService.getEffectivePermissions(userId);

      res.json({
        success: true,
        data: {
          features: features.map(f => ({
            name: f.name,
            description: f.description,
            category: f.category,
            is_core: f.is_core,
            is_enabled: f.is_enabled
          })),
          permissions: permissions.map(p => ({
            name: p.name,
            resource: p.resource,
            action: p.action
          }))
        }
      });
    } catch (error) {
      console.error('Get features error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // POST /api/meta/features/toggle
  router.post('/features/toggle', 
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'settings.update' }),
    async (req, res) => {
      try {
        const { feature, enabled } = req.body;
        const userId = req.user!.id;
        const tenantId = req.headers['x-tenant-id'] as string || 'default';

        if (!feature || typeof enabled !== 'boolean') {
          return res.status(400).json({
            success: false,
            message: 'Feature name and enabled status required'
          });
        }

        const success = await policyService.toggleFeature(feature, enabled, userId, tenantId);

        if (success) {
          res.json({
            success: true,
            message: `Feature ${feature} ${enabled ? 'enabled' : 'disabled'} successfully`
          });
        } else {
          res.status(400).json({
            success: false,
            message: 'Failed to toggle feature'
          });
        }
      } catch (error) {
        console.error('Toggle feature error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  );

  // POST /api/meta/features/override
  router.post('/features/override',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'settings.update' }),
    async (req, res) => {
      try {
        const { feature, roleId, enabled } = req.body;
        const userId = req.user!.id;

        if (!feature || !roleId || typeof enabled !== 'boolean') {
          return res.status(400).json({
            success: false,
            message: 'Feature name, role ID, and enabled status required'
          });
        }

        const success = await policyService.overrideFeatureForRole(feature, roleId, enabled, userId);

        if (success) {
          res.json({
            success: true,
            message: `Feature ${feature} ${enabled ? 'enabled' : 'disabled'} for role successfully`
          });
        } else {
          res.status(400).json({
            success: false,
            message: 'Failed to override feature for role'
          });
        }
      } catch (error) {
        console.error('Override feature error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  );

  // GET /api/meta/permissions
  router.get('/permissions', requireAuth(authService), async (req, res) => {
    try {
      const userId = req.user!.id;
      const permissions = await policyService.getEffectivePermissions(userId);

      res.json({
        success: true,
        data: {
          permissions: permissions.map(p => ({
            name: p.name,
            description: p.description,
            resource: p.resource,
            action: p.action
          }))
        }
      });
    } catch (error) {
      console.error('Get permissions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // GET /api/meta/health
  router.get('/health', (req, res) => {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
      }
    });
  });

  return router;
}