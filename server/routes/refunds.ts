import { Router } from 'express';
import { asyncHandler } from '../middleware/error';
import { createError, ErrorContext, AppError } from '../types/errors';
import { createRequestLogger } from '../utils/logger';
import { writeAuditLog, createAuditContext } from '../utils/audit';
import { AuditAction, EntityType, RefundData } from '../types/audit';
import { getDatabase } from '../db';

export const refundRouter = Router();

// POST /api/refunds/create - Create a refund
refundRouter.post('/api/refunds/create', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  const auditContext = createAuditContext(req);
  
  try {
    const { 
      orderId, 
      items, 
      refundReason, 
      paymentMethod, 
      managerPin,
      refundAmount 
    } = req.body;
    
    requestLogger.debug({ 
      orderId, 
      itemCount: items?.length,
      refundReason,
      paymentMethod,
      refundAmount,
      hasManagerPin: !!managerPin
    }, 'Processing refund creation request');
    
    // Validate required fields
    if (!orderId || !items || !Array.isArray(items) || items.length === 0) {
      throw createError.invalidInput('Order ID and items are required');
    }
    
    if (!refundReason || refundReason.trim().length === 0) {
      throw createError.invalidInput('Refund reason is required');
    }
    
    if (!paymentMethod) {
      throw createError.invalidInput('Payment method is required');
    }
    
    if (!managerPin) {
      throw createError.invalidInput('Manager PIN is required for refunds');
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
    
    // Calculate total refund amount
    let totalRefundAmount = 0;
    const refundItems = [];
    
    for (const item of items) {
      if (!item.productId || !item.quantity || !item.unitPrice) {
        throw createError.invalidInput('Each item must have productId, quantity, and unitPrice');
      }
      
      const itemRefundAmount = item.quantity * item.unitPrice;
      totalRefundAmount += itemRefundAmount;
      
      refundItems.push({
        productId: item.productId,
        productName: item.productName || `Product ${item.productId}`,
        quantity: item.quantity,
        refundAmount: itemRefundAmount
      });
    }
    
    // Validate refund amount if provided
    if (refundAmount && Math.abs(refundAmount - totalRefundAmount) > 0.01) {
      throw createError.invalidInput('Refund amount does not match calculated total');
    }
    
    // Create refund record (in a real system, this would create a refund record in the database)
    const refundId = `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const refundData: RefundData = {
      orderId,
      refundAmount: totalRefundAmount,
      refundReason,
      items: refundItems,
      paymentMethod
    };
    
    // Log refund creation
    await writeAuditLog(
      AuditAction.REFUND_CREATED,
      refundData,
      auditContext,
      EntityType.REFUND,
      refundId
    );
    
    requestLogger.info({
      refundId,
      orderId,
      totalRefundAmount,
      itemCount: refundItems.length,
      refundReason
    }, 'Refund created successfully');
    
    res.json({
      success: true,
      refund: {
        id: refundId,
        orderId,
        amount: totalRefundAmount,
        reason: refundReason,
        items: refundItems,
        paymentMethod,
        status: 'created',
        createdAt: new Date().toISOString(),
        createdBy: auditContext.actorId
      }
    });
    
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    const context: ErrorContext = {
      requestId: req.requestId,
      operation: 'REFUND_CREATE',
      resource: '/api/refunds/create',
      metadata: { orderId: req.body.orderId }
    };
    
    throw createError.internal('Failed to create refund', error, context);
  }
}));

// POST /api/refunds/approve - Approve a refund
refundRouter.post('/api/refunds/approve', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  const auditContext = createAuditContext(req);
  
  try {
    const { refundId, managerPin, approvalReason } = req.body;
    
    requestLogger.debug({ 
      refundId, 
      approvalReason,
      hasManagerPin: !!managerPin
    }, 'Processing refund approval request');
    
    if (!refundId) {
      throw createError.invalidInput('Refund ID is required');
    }
    
    if (!managerPin) {
      throw createError.invalidInput('Manager PIN is required for refund approval');
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
    
    // Log refund approval
    await writeAuditLog(
      AuditAction.REFUND_APPROVED,
      {
        refundId,
        approvalReason: approvalReason || 'Refund approved by manager',
        approvedBy: auditContext.actorId || 'unknown'
      },
      auditContext,
      EntityType.REFUND,
      refundId
    );
    
    requestLogger.info({
      refundId,
      approvalReason,
      approvedBy: auditContext.actorId
    }, 'Refund approved successfully');
    
    res.json({
      success: true,
      refund: {
        id: refundId,
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: auditContext.actorId,
        approvalReason: approvalReason || 'Refund approved by manager'
      }
    });
    
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    const context: ErrorContext = {
      requestId: req.requestId,
      operation: 'REFUND_APPROVE',
      resource: '/api/refunds/approve',
      metadata: { refundId: req.body.refundId }
    };
    
    throw createError.internal('Failed to approve refund', error, context);
  }
}));

// Simulate manager PIN verification
async function verifyManagerPin(pin: string, userId?: string): Promise<boolean> {
  // In a real system, this would use proper authentication
  return /^\d{4}$/.test(pin);
}




