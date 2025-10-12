import { Router } from 'express';
import { asyncHandler } from '../middleware/error';
import { createError, ErrorContext, AppError } from '../types/errors';
import { createRequestLogger } from '../utils/logger';
import { writeAuditLog, createAuditContext } from '../utils/audit';
import { AuditAction, EntityType, DiscountOverrideData } from '../types/audit';
import { getDatabase } from '../db';

export const discountRouter = Router();

// POST /api/discounts/override - Apply manager discount override
discountRouter.post('/api/discounts/override', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  const auditContext = createAuditContext(req);
  
  try {
    const { productId, discountAmount, discountPercentage, reason, managerPin } = req.body;
    
    requestLogger.debug({ 
      productId, 
      discountAmount, 
      discountPercentage,
      hasReason: !!reason,
      hasManagerPin: !!managerPin
    }, 'Processing discount override request');
    
    // Validate required fields
    if (!productId || (!discountAmount && !discountPercentage)) {
      throw createError.invalidInput('Product ID and discount amount/percentage are required');
    }
    
    if (!reason || reason.trim().length === 0) {
      throw createError.invalidInput('Reason for discount override is required');
    }
    
    if (!managerPin) {
      throw createError.invalidInput('Manager PIN is required for discount override');
    }
    
    // TODO: Verify manager PIN (this would be implemented with proper auth system)
    // For now, we'll simulate PIN verification
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
    
    // Get product details
    const db = getDatabase();
    const product = db.prepare(`
      SELECT id, name_en, price_retail 
      FROM products 
      WHERE id = ? AND is_active = 1
    `).get(productId);
    
    if (!product) {
      throw createError.notFound('Product', {
        requestId: req.requestId,
        operation: 'DISCOUNT_OVERRIDE',
        resource: '/api/discounts/override',
        metadata: { productId }
      });
    }
    
    const originalPrice = (product as any).price_retail;
    let finalPrice: number;
    let actualDiscountAmount: number;
    
    // Calculate final price based on discount type
    if (discountAmount) {
      finalPrice = Math.max(0, originalPrice - discountAmount);
      actualDiscountAmount = discountAmount;
    } else if (discountPercentage) {
      const discountValue = (originalPrice * discountPercentage) / 100;
      finalPrice = Math.max(0, originalPrice - discountValue);
      actualDiscountAmount = discountValue;
    } else {
      throw createError.invalidInput('Either discount amount or percentage must be provided');
    }
    
    // Apply discount (in a real system, this would update the order/cart)
    const discountData: DiscountOverrideData = {
      productId: (product as any).id,
      productName: (product as any).name_en,
      originalPrice,
      discountedPrice: finalPrice,
      discountAmount: actualDiscountAmount,
      discountPercentage: discountPercentage || (actualDiscountAmount / originalPrice) * 100,
      reason,
      managerId: auditContext.actorId || 'unknown'
    };
    
    // Log discount override
    await writeAuditLog(
      AuditAction.DISCOUNT_OVERRIDE,
      discountData,
      auditContext,
      EntityType.PRODUCT,
      productId
    );
    
    requestLogger.info({
      productId,
      originalPrice,
      finalPrice,
      discountAmount: actualDiscountAmount,
      reason
    }, 'Discount override applied successfully');
    
    res.json({
      success: true,
      product: {
        id: (product as any).id,
        name: (product as any).name_en,
        originalPrice,
        discountedPrice: finalPrice,
        discountAmount: actualDiscountAmount,
        discountPercentage: discountPercentage || (actualDiscountAmount / originalPrice) * 100
      },
      reason,
      appliedBy: auditContext.actorId
    });
    
  } catch (error) {
    // Re-throw AppError instances without wrapping
    if (error instanceof AppError) {
      throw error;
    }
    
    const context: ErrorContext = {
      requestId: req.requestId,
      operation: 'DISCOUNT_OVERRIDE',
      resource: '/api/discounts/override',
      metadata: { productId: req.body.productId }
    };
    
    throw createError.internal('Failed to process discount override', error, context);
  }
}));

// POST /api/discounts/remove - Remove applied discount
discountRouter.post('/api/discounts/remove', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  const auditContext = createAuditContext(req);
  
  try {
    const { productId, reason } = req.body;
    
    requestLogger.debug({ productId, reason }, 'Processing discount removal request');
    
    if (!productId) {
      throw createError.invalidInput('Product ID is required');
    }
    
    // Get product details
    const db = getDatabase();
    const product = db.prepare(`
      SELECT id, name_en, price_retail 
      FROM products 
      WHERE id = ? AND is_active = 1
    `).get(productId);
    
    if (!product) {
      throw createError.notFound('Product', {
        requestId: req.requestId,
        operation: 'DISCOUNT_REMOVE',
        resource: '/api/discounts/remove',
        metadata: { productId }
      });
    }
    
    // Log discount removal
    await writeAuditLog(
      AuditAction.DISCOUNT_REMOVED,
      {
        productId: (product as any).id,
        productName: (product as any).name_en,
        originalPrice: (product as any).price_retail,
        reason: reason || 'Discount removed by user'
      },
      auditContext,
      EntityType.PRODUCT,
      productId
    );
    
    requestLogger.info({
      productId,
      reason
    }, 'Discount removed successfully');
    
    res.json({
      success: true,
      product: {
        id: (product as any).id,
        name: (product as any).name_en,
        price: (product as any).price_retail
      },
      reason: reason || 'Discount removed'
    });
    
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    const context: ErrorContext = {
      requestId: req.requestId,
      operation: 'DISCOUNT_REMOVE',
      resource: '/api/discounts/remove',
      metadata: { productId: req.body.productId }
    };
    
    throw createError.internal('Failed to remove discount', error, context);
  }
}));

// Simulate manager PIN verification (in real system, this would use proper auth)
async function verifyManagerPin(pin: string, userId?: string): Promise<boolean> {
  // In a real system, this would:
  // 1. Hash the provided PIN
  // 2. Compare with stored hash in database
  // 3. Check for lockout conditions
  // 4. Update attempt counters
  
  // For demo purposes, accept any 4-digit PIN
  return /^\d{4}$/.test(pin);
}
