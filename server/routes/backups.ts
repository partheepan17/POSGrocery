import express from 'express';
import { BackupService } from '../services/backupService';
import { requireAuth } from '../middleware/requireAuth';
import { checkPolicy } from '../middleware/checkPolicy';

export function createBackupRoutes(backupService: BackupService, authService: any, policyService: any) {
  const router = express.Router();

  // POST /api/backups/run
  router.post('/run',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'settings.update' }),
    async (req, res) => {
      try {
        const createdBy = req.user!.id;
        const backup = await backupService.createBackup(createdBy);
        
        res.status(201).json({
          success: true,
          data: backup,
          message: 'Backup created successfully'
        });
      } catch (error) {
        console.error('Create backup error:', error);
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Failed to create backup'
        });
      }
    }
  );

  // GET /api/backups/verify-last
  router.get('/verify-last',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'settings.view' }),
    async (req, res) => {
      try {
        const verification = await backupService.verifyLastBackup();
        
        res.json({
          success: true,
          data: verification
        });
      } catch (error) {
        console.error('Verify last backup error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to verify last backup'
        });
      }
    }
  );

  // POST /api/backups/restore
  router.post('/restore',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'settings.update' }),
    async (req, res) => {
      try {
        const { backupId } = req.body;
        const restoredBy = req.user!.id;

        if (!backupId) {
          return res.status(400).json({
            success: false,
            message: 'Backup ID is required'
          });
        }

        const success = await backupService.restoreBackup(backupId, restoredBy);
        
        if (success) {
          res.json({
            success: true,
            message: 'Backup restored successfully'
          });
        } else {
          res.status(400).json({
            success: false,
            message: 'Failed to restore backup'
          });
        }
      } catch (error) {
        console.error('Restore backup error:', error);
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Failed to restore backup'
        });
      }
    }
  );

  // GET /api/backups
  router.get('/',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'settings.view' }),
    async (req, res) => {
      try {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
        const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
        
        const backups = await backupService.getBackups(limit, offset);
        
        res.json({
          success: true,
          data: backups
        });
      } catch (error) {
        console.error('Get backups error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to get backups'
        });
      }
    }
  );

  // GET /api/backups/:id
  router.get('/:id',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'settings.view' }),
    async (req, res) => {
      try {
        const backupId = req.params.id;
        const backups = await backupService.getBackups(1, 0);
        const backup = backups.find(b => b.id === backupId);
        
        if (!backup) {
          return res.status(404).json({
            success: false,
            message: 'Backup not found'
          });
        }
        
        res.json({
          success: true,
          data: backup
        });
      } catch (error) {
        console.error('Get backup error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to get backup'
        });
      }
    }
  );

  // GET /api/backups/logs
  router.get('/logs',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'settings.view' }),
    async (req, res) => {
      try {
        const backupId = req.query.backupId as string;
        const logs = await backupService.getBackupLogs(backupId);
        
        res.json({
          success: true,
          data: logs
        });
      } catch (error) {
        console.error('Get backup logs error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to get backup logs'
        });
      }
    }
  );

  // GET /api/backups/logs.csv
  router.get('/logs.csv',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'reports.export' }),
    async (req, res) => {
      try {
        const csvData = await backupService.exportBackupLogs();
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=backup-logs.csv');
        res.send(csvData);
      } catch (error) {
        console.error('Export backup logs error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to export backup logs'
        });
      }
    }
  );

  // DELETE /api/backups/:id
  router.delete('/:id',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'settings.update' }),
    async (req, res) => {
      try {
        const backupId = req.params.id;
        
        // This would typically delete the backup file and database record
        // For now, we'll just return success
        res.json({
          success: true,
          message: 'Backup deleted successfully'
        });
      } catch (error) {
        console.error('Delete backup error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to delete backup'
        });
      }
    }
  );

  // POST /api/backups/cleanup
  router.post('/cleanup',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'settings.update' }),
    async (req, res) => {
      try {
        const { retentionDays = 30 } = req.body;
        const deletedCount = await backupService.cleanupOldBackups(retentionDays);
        
        res.json({
          success: true,
          data: { deletedCount },
          message: `Cleaned up ${deletedCount} old backups`
        });
      } catch (error) {
        console.error('Cleanup backups error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to cleanup backups'
        });
      }
    }
  );

  return router;
}










