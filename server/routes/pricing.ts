// Pricing Compute API Routes
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error';
import { createRequestLogger } from '../utils/logger';
import { getDatabase } from '../db';
import { createStandardError, ERROR_CODES } from '../utils/errorCodes';
import { auditPerformance } from '../middleware/auditLogger';

const router = Router();

// POST /api/pricing/compute - Compute unit price for product with quantity and UOM
router.post('/api/pricing/compute', 
  auditPerformance('PRICING_COMPUTE'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createRequestLogger(req);
    
    try {
      const { 
        product_id, 
        qty = 1, 
        base_price, 
        customer_type = 'Retail',
        uom = 'BASE'
      } = req.body;
      
      if (!product_id || !base_price) {
        throw createStandardError(
          'Product ID and base price are required',
          ERROR_CODES.INVALID_INPUT,
          { product_id, base_price },
          req.requestId
        );
      }
      
      if (qty <= 0) {
        throw createStandardError(
          'Quantity must be greater than 0',
          ERROR_CODES.INVALID_INPUT,
          { qty },
          req.requestId
        );
      }
      
      const db = getDatabase();
      
      // Get product details
      const product = db.prepare(`
        SELECT id, sku, name_en, price_retail, price_wholesale, price_credit, price_other,
               category_id, is_scale_item
        FROM products 
        WHERE id = ? AND is_active = 1
      `).get(product_id) as any;
      
      if (!product) {
        throw createStandardError(
          'Product not found or inactive',
          ERROR_CODES.PRODUCT_NOT_FOUND,
          { product_id },
          req.requestId
        );
      }
      
      // Get pricing tiers for this product
      const tiers = db.prepare(`
        SELECT min_qty, price, label
        FROM pricing_tiers 
        WHERE product_id = ? 
        ORDER BY min_qty DESC
      `).all(product_id) as any[];
      
      // Get customer special pricing if any
      const customerSpecial = db.prepare(`
        SELECT special_price
        FROM customer_special_pricing 
        WHERE product_id = ? AND customer_id = ? AND is_active = 1
      `).get(product_id, 1) as any; // Using customer ID 1 for now
      
      // Compute unit price using the same logic as frontend
      let unitPrice = base_price;
      let reason = 'Base price';
      
      // 1) Customer special overrides everything
      if (customerSpecial?.special_price != null && !isNaN(Number(customerSpecial.special_price))) {
        unitPrice = Number(customerSpecial.special_price);
        reason = `Customer special → ${unitPrice.toFixed(2)}`;
      }
      // 2) Tier-based quantity breaks
      else if (tiers.length > 0) {
        for (const tier of tiers) {
          if (qty >= tier.min_qty) {
            unitPrice = Number(tier.price);
            const label = tier.label || `${tier.min_qty}+`;
            reason = `Tier ${label} → ${unitPrice.toFixed(2)}`;
            break;
          }
        }
      }
      // 3) Customer type pricing
      else if (customer_type !== 'Retail') {
        switch (customer_type) {
          case 'Wholesale':
            unitPrice = product.price_wholesale || base_price;
            reason = `Wholesale → ${unitPrice.toFixed(2)}`;
            break;
          case 'Credit':
            unitPrice = product.price_credit || base_price;
            reason = `Credit → ${unitPrice.toFixed(2)}`;
            break;
          case 'Other':
            unitPrice = product.price_other || base_price;
            reason = `Other → ${unitPrice.toFixed(2)}`;
            break;
        }
      }
      
      // Apply UOM conversion if not BASE
      if (uom !== 'BASE') {
        const uomData = db.prepare(`
          SELECT conv_to_base, price_override
          FROM product_uoms 
          WHERE product_id = ? AND code = ?
        `).get(product_id, uom) as any;
        
        if (uomData) {
          if (uomData.price_override != null && !isNaN(Number(uomData.price_override))) {
            unitPrice = Number(uomData.price_override);
            reason += ` (UOM ${uom} override)`;
          } else {
            const factor = Number(uomData.conv_to_base || 1);
            unitPrice = unitPrice * factor;
            reason += ` (UOM ${uom} ×${factor})`;
          }
        }
      }
      
      // Calculate line total
      const lineTotal = unitPrice * qty;
      
      // Calculate auto discount (if any)
      let autoDiscount = 0;
      let autoDiscountReason = null;
      
      // Check for bulk discounts
      if (qty >= 10) {
        autoDiscount = lineTotal * 0.05; // 5% bulk discount
        autoDiscountReason = 'Bulk discount (10+ items)';
      } else if (qty >= 5) {
        autoDiscount = lineTotal * 0.02; // 2% bulk discount
        autoDiscountReason = 'Bulk discount (5+ items)';
      }
      
      const finalLineTotal = lineTotal - autoDiscount;
      
      const result = {
        unit_price: Number(unitPrice.toFixed(2)),
        line_total: Number(finalLineTotal.toFixed(2)),
        auto_discount: Number(autoDiscount.toFixed(2)),
        auto_discount_reason: autoDiscountReason,
        reason,
        product: {
          id: product.id,
          sku: product.sku,
          name: product.name_en
        }
      };
      
      requestLogger.info('Pricing computed', { 
        product_id, 
        qty, 
        uom,
        customer_type,
        unit_price: result.unit_price,
        reason: result.reason 
      });
      
      res.json(result);
    } catch (error) {
      requestLogger.error('Failed to compute pricing', { error });
      throw createStandardError(
        'Failed to compute pricing',
        ERROR_CODES.DATABASE_ERROR,
        { error: error instanceof Error ? error.message : 'Unknown error' },
        req.requestId
      );
    }
  })
);

export default router;


