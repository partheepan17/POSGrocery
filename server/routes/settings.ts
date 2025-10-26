import express from 'express';
import { SettingsService, CashDrawerService } from '../services/settingsService';
import { requireAuth } from '../middleware/requireAuth';
import { checkPolicy } from '../middleware/checkPolicy';

export function createSettingsRoutes(settingsService: SettingsService, cashDrawerService: CashDrawerService, authService: any, policyService: any) {
  const router = express.Router();

  // GET /api/settings
  router.get('/',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'settings.view' }),
    async (req, res) => {
      try {
        const category = req.query.category as string;
        const settings = await settingsService.getSettings(category);
        
        res.json({
          success: true,
          data: settings
        });
      } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to get settings'
        });
      }
    }
  );

  // GET /api/settings/categories
  router.get('/categories',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'settings.view' }),
    async (req, res) => {
      try {
        const categories = await settingsService.getSettingsByCategory();
        
        res.json({
          success: true,
          data: categories
        });
      } catch (error) {
        console.error('Get settings categories error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to get settings categories'
        });
      }
    }
  );

  // GET /api/settings/:key
  router.get('/:key',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'settings.view' }),
    async (req, res) => {
      try {
        const setting = await settingsService.getSetting(req.params.key);
        
        if (!setting) {
          return res.status(404).json({
            success: false,
            message: 'Setting not found'
          });
        }
        
        res.json({
          success: true,
          data: setting
        });
      } catch (error) {
        console.error('Get setting error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to get setting'
        });
      }
    }
  );

  // PUT /api/settings/:key
  router.put('/:key',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'settings.update' }),
    async (req, res) => {
      try {
        const { value } = req.body;
        const updatedBy = req.user!.id;

        if (value === undefined) {
          return res.status(400).json({
            success: false,
            message: 'Value is required'
          });
        }

        const success = await settingsService.updateSetting(req.params.key, value, updatedBy);
        
        if (success) {
          res.json({
            success: true,
            message: 'Setting updated successfully'
          });
        } else {
          res.status(400).json({
            success: false,
            message: 'Failed to update setting'
          });
        }
      } catch (error) {
        console.error('Update setting error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to update setting'
        });
      }
    }
  );

  // PUT /api/settings
  router.put('/',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'settings.update' }),
    async (req, res) => {
      try {
        const { settings } = req.body;
        const updatedBy = req.user!.id;

        if (!settings || typeof settings !== 'object') {
          return res.status(400).json({
            success: false,
            message: 'Settings object is required'
          });
        }

        const success = await settingsService.updateSettings(settings, updatedBy);
        
        if (success) {
          res.json({
            success: true,
            message: 'Settings updated successfully'
          });
        } else {
          res.status(400).json({
            success: false,
            message: 'Failed to update settings'
          });
        }
      } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to update settings'
        });
      }
    }
  );

  // POST /api/devices/cashdrawer/pulse
  router.post('/devices/cashdrawer/pulse',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'sales.create' }),
    async (req, res) => {
      try {
        const { terminalId } = req.body;
        const openedBy = req.user!.id;

        if (!terminalId) {
          return res.status(400).json({
            success: false,
            message: 'Terminal ID is required'
          });
        }

        const success = await cashDrawerService.openDrawer(terminalId, openedBy);
        
        if (success) {
          res.json({
            success: true,
            message: 'Cash drawer opened successfully'
          });
        } else {
          res.status(400).json({
            success: false,
            message: 'Failed to open cash drawer'
          });
        }
      } catch (error) {
        console.error('Open cash drawer error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to open cash drawer'
        });
      }
    }
  );

  // GET /api/devices/cashdrawer/status/:terminalId
  router.get('/devices/cashdrawer/status/:terminalId',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'sales.view' }),
    async (req, res) => {
      try {
        const terminalId = req.params.terminalId;
        const status = await cashDrawerService.getDrawerStatus(terminalId);
        
        res.json({
          success: true,
          data: status
        });
      } catch (error) {
        console.error('Get cash drawer status error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to get cash drawer status'
        });
      }
    }
  );

  return router;
}










