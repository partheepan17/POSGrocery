import { Router } from 'express';
import { asyncHandler } from '../middleware/error';
import { createError, ErrorContext, AppError } from '../types/errors';
import { createRequestLogger } from '../utils/logger';
import { writeAuditLog, createAuditContext } from '../utils/audit';
import { AuditAction, EntityType, CashMovementData, ShiftData } from '../types/audit';
import { getDatabase } from '../db';

export const cashRouter = Router();

// POST /api/cash/movement - Record cash movement
cashRouter.post('/api/cash/movement', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  const auditContext = createAuditContext(req);
  
  try {
    const { 
      movementType, 
      amount, 
      reason, 
      reference,
      managerPin 
    } = req.body;
    
    requestLogger.debug({ 
      movementType, 
      amount, 
      reason,
      reference,
      hasManagerPin: !!managerPin
    }, 'Processing cash movement request');
    
    // Validate required fields
    if (!movementType || !['deposit', 'withdrawal', 'count', 'adjustment'].includes(movementType)) {
      throw createError.invalidInput('Valid movement type is required (deposit, withdrawal, count, adjustment)');
    }
    
    if (!amount || amount <= 0) {
      throw createError.invalidInput('Valid amount is required');
    }
    
    if (!reason || reason.trim().length === 0) {
      throw createError.invalidInput('Reason for cash movement is required');
    }
    
    if (!managerPin) {
      throw createError.invalidInput('Manager PIN is required for cash movements');
    }
    
    // Verify manager PIN
    const isPinValid = await verifyManagerPin(managerPin, auditContext.actorId);
    if (!isPinValid) {
      await writeAuditLog(
        AuditAction.PIN_VERIFY_FAIL,
        {
          userId: auditContext.actorId || 'unknown',
          userName: 'Manager',
          verificationResult: false,
          attemptCount: 1,
          lockoutTriggered: false
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
        verificationResult: true
      },
      auditContext
    );
    
    // Get current cash balance (in a real system, this would come from the database)
    const currentBalance = await getCurrentCashBalance();
    let newBalance: number;
    
    // Calculate new balance based on movement type
    switch (movementType) {
      case 'deposit':
        newBalance = currentBalance + amount;
        break;
      case 'withdrawal':
        if (amount > currentBalance) {
          throw createError.invalidInput('Insufficient cash balance for withdrawal');
        }
        newBalance = currentBalance - amount;
        break;
      case 'count':
      case 'adjustment':
        newBalance = amount; // For count/adjustment, amount represents the actual count
        break;
      default:
        throw createError.invalidInput('Invalid movement type');
    }
    
    const cashMovementData: CashMovementData = {
      movementType,
      amount,
      previousBalance: currentBalance,
      newBalance,
      reason,
      reference
    };
    
    // Log cash movement
    await writeAuditLog(
      AuditAction.CASH_MOVEMENT,
      cashMovementData,
      auditContext,
      EntityType.CASH_DRAWER,
      'main'
    );
    
    // Update cash balance (in a real system, this would update the database)
    await updateCashBalance(newBalance);
    
    requestLogger.info({
      movementType,
      amount,
      previousBalance: currentBalance,
      newBalance,
      reason
    }, 'Cash movement recorded successfully');
    
    res.json({
      success: true,
      movement: {
        type: movementType,
        amount,
        previousBalance: currentBalance,
        newBalance,
        reason,
        reference,
        timestamp: new Date().toISOString(),
        recordedBy: auditContext.actorId
      }
    });
    
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    const context: ErrorContext = {
      requestId: req.requestId,
      operation: 'CASH_MOVEMENT',
      resource: '/api/cash/movement',
      metadata: { movementType: req.body.movementType }
    };
    
    throw createError.internal('Failed to record cash movement', error, context);
  }
}));

// POST /api/cash/shift/open - Open cash shift
cashRouter.post('/api/cash/shift/open', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  const auditContext = createAuditContext(req);
  
  try {
    const { 
      openingBalance, 
      cashierId, 
      cashierName,
      managerPin 
    } = req.body;
    
    requestLogger.debug({ 
      openingBalance, 
      cashierId, 
      cashierName,
      hasManagerPin: !!managerPin
    }, 'Processing shift open request');
    
    if (!cashierId || !cashierName) {
      throw createError.invalidInput('Cashier ID and name are required');
    }
    
    if (!managerPin) {
      throw createError.invalidInput('Manager PIN is required for shift operations');
    }
    
    // Verify manager PIN
    const isPinValid = await verifyManagerPin(managerPin, auditContext.actorId);
    if (!isPinValid) {
      await writeAuditLog(
        AuditAction.PIN_VERIFY_FAIL,
        {
          userId: auditContext.actorId || 'unknown',
          userName: 'Manager',
          verificationResult: false,
          attemptCount: 1,
          lockoutTriggered: false
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
        verificationResult: true
      },
      auditContext
    );
    
    const shiftId = `SHIFT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const shiftData: ShiftData = {
      shiftId,
      cashierId,
      cashierName,
      openingBalance: openingBalance || 0
    };
    
    // Log shift open
    await writeAuditLog(
      AuditAction.SHIFT_OPEN,
      shiftData,
      auditContext,
      EntityType.SHIFT,
      shiftId
    );
    
    requestLogger.info({
      shiftId,
      cashierId,
      cashierName,
      openingBalance
    }, 'Shift opened successfully');
    
    res.json({
      success: true,
      shift: {
        id: shiftId,
        cashierId,
        cashierName,
        openingBalance: openingBalance || 0,
        openedAt: new Date().toISOString(),
        openedBy: auditContext.actorId
      }
    });
    
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    const context: ErrorContext = {
      requestId: req.requestId,
      operation: 'SHIFT_OPEN',
      resource: '/api/cash/shift/open',
      metadata: { cashierId: req.body.cashierId }
    };
    
    throw createError.internal('Failed to open shift', error, context);
  }
}));

// POST /api/cash/shift/close - Close cash shift
cashRouter.post('/api/cash/shift/close', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  const auditContext = createAuditContext(req);
  
  try {
    const { 
      shiftId, 
      closingBalance, 
      totalSales, 
      totalTransactions,
      managerPin 
    } = req.body;
    
    requestLogger.debug({ 
      shiftId, 
      closingBalance, 
      totalSales,
      totalTransactions,
      hasManagerPin: !!managerPin
    }, 'Processing shift close request');
    
    if (!shiftId) {
      throw createError.invalidInput('Shift ID is required');
    }
    
    if (!managerPin) {
      throw createError.invalidInput('Manager PIN is required for shift operations');
    }
    
    // Verify manager PIN
    const isPinValid = await verifyManagerPin(managerPin, auditContext.actorId);
    if (!isPinValid) {
      await writeAuditLog(
        AuditAction.PIN_VERIFY_FAIL,
        {
          userId: auditContext.actorId || 'unknown',
          userName: 'Manager',
          verificationResult: false,
          attemptCount: 1,
          lockoutTriggered: false
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
        verificationResult: true
      },
      auditContext
    );
    
    const shiftData: ShiftData = {
      shiftId,
      cashierId: auditContext.actorId || 'unknown',
      cashierName: 'Cashier',
      closingBalance: closingBalance || 0,
      totalSales: totalSales || 0,
      totalTransactions: totalTransactions || 0
    };
    
    // Log shift close
    await writeAuditLog(
      AuditAction.SHIFT_CLOSE,
      shiftData,
      auditContext,
      EntityType.SHIFT,
      shiftId
    );
    
    requestLogger.info({
      shiftId,
      closingBalance,
      totalSales,
      totalTransactions
    }, 'Shift closed successfully');
    
    res.json({
      success: true,
      shift: {
        id: shiftId,
        closingBalance: closingBalance || 0,
        totalSales: totalSales || 0,
        totalTransactions: totalTransactions || 0,
        closedAt: new Date().toISOString(),
        closedBy: auditContext.actorId
      }
    });
    
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    const context: ErrorContext = {
      requestId: req.requestId,
      operation: 'SHIFT_CLOSE',
      resource: '/api/cash/shift/close',
      metadata: { shiftId: req.body.shiftId }
    };
    
    throw createError.internal('Failed to close shift', error, context);
  }
}));

// Simulate manager PIN verification
async function verifyManagerPin(pin: string, userId?: string): Promise<boolean> {
  return /^\d{4}$/.test(pin);
}

// Simulate cash balance management
async function getCurrentCashBalance(): Promise<number> {
  // In a real system, this would query the database
  return 1000.00; // Mock balance
}

async function updateCashBalance(newBalance: number): Promise<void> {
  // In a real system, this would update the database
  console.log(`Cash balance updated to: $${newBalance.toFixed(2)}`);
}




