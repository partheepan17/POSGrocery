import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error';
import { createRequestLogger } from '../utils/logger';
import { createAuditContext, writeAuditLog } from '../utils/audit';
import { createError } from '../types/errors';
import { AuditAction } from '../types/audit';
import { purgeService } from '../services/purgeService';

export const adminRouter = Router();

// POST /api/admin/purge-demo-data - Purge all demo data
adminRouter.post('/api/admin/purge-demo-data', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  const auditContext = createAuditContext(req);
  
  try {
    const { managerPin } = req.body;
    
    requestLogger.info('Demo data purge request received', {
      hasManagerPin: !!managerPin,
      actorId: auditContext.actorId
    });
    
    // Validate required fields
    if (!managerPin) {
      throw createError.invalidInput('Manager PIN is required for this operation');
    }
    
    // Verify manager PIN
    const isPinValid = await verifyManagerPin(managerPin, auditContext.actorId);
    if (!isPinValid) {
      // Log failed PIN verification
      await writeAuditLog(
        AuditAction.PIN_VERIFY_FAIL,
        {
          userId: auditContext.actorId || 'unknown',
          userName: 'Manager',
          verificationResult: false,
          attemptCount: 1,
          lockoutTriggered: false,
          operation: 'PURGE_DEMO_DATA'
        },
        auditContext
      );
      
      throw createError.unauthorized('Invalid manager PIN');
    }
    
    // Log successful PIN verification
    await writeAuditLog(
      AuditAction.PIN_VERIFY_SUCCESS,
      {
        userId: auditContext.actorId || 'unknown',
        userName: 'Manager',
        verificationResult: true,
        operation: 'PURGE_DEMO_DATA'
      },
      auditContext
    );
    
    // Get demo data statistics before purging
    const statsBefore = await purgeService.getDemoDataStats();
    requestLogger.info('Demo data statistics before purge', statsBefore);
    
    // Perform the purge operation
    const purgeResult = await purgeService.purgeDemoData(req.requestId);
    
    if (purgeResult.success) {
      // Log successful purge operation
      await writeAuditLog(
        AuditAction.ADMIN_ACTION,
        {
          action: 'PURGE_DEMO_DATA',
          purgedCounts: purgeResult.purgedCounts,
          statsBefore,
          success: true
        },
        auditContext
      );
      
      requestLogger.info('Demo data purge completed successfully', {
        purgedCounts: purgeResult.purgedCounts
      });
      
      res.json({
        success: true,
        message: 'Demo data purged successfully',
        purgedCounts: purgeResult.purgedCounts,
        statsBefore
      });
    } else {
      // Log failed purge operation
      await writeAuditLog(
        AuditAction.ADMIN_ACTION,
        {
          action: 'PURGE_DEMO_DATA',
          success: false,
          errors: purgeResult.errors
        },
        auditContext
      );
      
      requestLogger.error('Demo data purge failed', {
        errors: purgeResult.errors
      });
      
      res.status(500).json({
        success: false,
        message: 'Demo data purge failed',
        errors: purgeResult.errors,
        purgedCounts: purgeResult.purgedCounts
      });
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    requestLogger.error('Demo data purge request failed', {
      error: errorMessage,
      actorId: auditContext.actorId
    });
    
    // Log failed operation
    await writeAuditLog(
      AuditAction.ADMIN_ACTION,
      {
        action: 'PURGE_DEMO_DATA',
        success: false,
        error: errorMessage
      },
      auditContext
    );
    
    if (error instanceof Error && error.message.includes('PIN')) {
      res.status(401).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Demo data purge operation failed',
        error: errorMessage
      });
    }
  }
}));

// GET /api/admin/demo-stats - Get demo data statistics
adminRouter.get('/api/admin/demo-stats', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const stats = await purgeService.getDemoDataStats();
    
    requestLogger.info('Demo data statistics requested', stats);
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    requestLogger.error('Failed to get demo data statistics', {
      error: errorMessage
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to get demo data statistics',
      error: errorMessage
    });
  }
}));

// Simulate manager PIN verification
async function verifyManagerPin(pin: string, userId?: string): Promise<boolean> {
  // In a real system, this would verify against the database
  // For now, accept any 4-digit PIN
  return /^\d{4}$/.test(pin);
}
