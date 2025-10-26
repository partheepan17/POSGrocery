import { dataService, Product, DiscountRule } from './dataService';

export interface CartLine {
  id: number;
  product_id: number;
  product: Product;
  qty: number;
  unit_price: number; // Current selling price (retail/wholesale/etc)
  retail_price: number; // Always the retail price for discount calculations
  line_discount: number;
  line_discount_type?: 'FIXED_AMOUNT' | 'PERCENTAGE';
  tax: number;
  total: number;
  applied_rules?: AppliedRule[];
  discount_reason?: string;
}

export interface AppliedRule {
  rule_id: number;
  rule_name: string;
  discount_amount: number;
  remaining_cap?: number;
  level?: 'PRODUCT' | 'GROUP' | 'SUPPLIER';
  type?: 'PERCENT' | 'AMOUNT';
  value?: number;
  reason?: 'priority' | 'stack' | 'capped';
}

export interface DiscountEngineSettings {
  maxDiscountPercent: number;
  allowNegativeTotals: boolean;
  roundingMode: 'NEAREST_1' | 'NEAREST_5' | 'NEAREST_10' | 'FLOOR' | 'CEIL';
}

export interface DiscountEngineResult {
  lines: CartLine[];
  appliedRules: AppliedRule[];
  warnings: string[];
  totals: {
    gross: number;
    itemDiscounts: number;
    manualDiscount: number;
    tax: number;
    net: number;
  };
}

export interface RuleCapTracker {
  [ruleId: number]: {
    rule: DiscountRule;
    usedQuantity: number;
    remainingQuantity: number;
  };
}

export class DiscountEngine {
  /**
   * Get all effective discount rules for the given SKUs at the current time
   */
  async getEffectiveRules(params: { 
    skus: string[]; 
    now?: Date;
  }): Promise<DiscountRule[]> {
    const { skus, now = new Date() } = params;
    
    if (skus.length === 0) {
      return [];
    }

    try {
      // Get all products for the SKUs
      const products = await Promise.all(
        skus.map(sku => dataService.getProductBySku(sku))
      );
      
      const validProducts = products.filter(p => p !== null) as Product[];
      const productIds = validProducts.map(p => parseInt((p as any).id));
      const categoryIds = [...new Set(validProducts.map(p => Number(p.category_id)))] as number[];

      // Get all active discount rules
      const allRules = await dataService.getDiscountRules(true);
      
      // Filter rules that apply to our products/categories and are within date range
      const effectiveRules = allRules.filter(rule => {
        // Check date range (be tolerant of invalid/locale dates)
        let fromDate = new Date(rule.active_from as any);
        let toDate = new Date(rule.active_to as any);
        if (isNaN(fromDate.getTime())) {
          fromDate = new Date(0); // treat as always active from start
        }
        if (isNaN(toDate.getTime())) {
          toDate = new Date(8640000000000000); // far future
        }
        if (now < fromDate || now > toDate) {
          return false;
        }

        // Check if rule applies to any of our products/categories
        if (rule.applies_to === 'PRODUCT') {
          return productIds.includes(Number(rule.target_id));
        } else if (rule.applies_to === 'CATEGORY') {
          return categoryIds.includes(Number(rule.target_id));
        }

        return false;
      });

      // Sort by priority (lower number = higher priority)
      return effectiveRules.sort((a, b) => a.priority - b.priority);
    } catch (error) {
      console.error('Error getting effective rules:', error);
      return [];
    }
  }

  /**
   * Apply discount rules to a cart and return updated lines and totals
   * IMPORTANT: All discounts are calculated based on RETAIL PRICE only
   */
  async applyRulesToCart(params: {
    lines: CartLine[];
    rules?: DiscountRule[];
    settings?: DiscountEngineSettings;
  }): Promise<DiscountEngineResult> {
    const { lines, settings } = params;
    
    // Get current settings if not provided
    const currentSettings = settings || this.getDefaultSettings();
    
    // Get SKUs from cart lines
    const skus = lines.map(line => line.product.sku);
    
    // Get effective rules if not provided
    let rules = params.rules || await this.getEffectiveRules({ skus });
    // Fallback: if none resolved (due to ID/format mismatches), try service helper
    if (rules.length === 0) {
      try {
        rules = await dataService.getDiscountRulesForSKUs(skus);
      } catch (e) {
        console.warn('Fallback rule lookup failed', e);
      }
    }
    
    if (rules.length === 0) {
      return this.calculateTotals(lines, currentSettings);
    }

    // Prepare lines
    const updatedLines = lines.map(line => ({
      ...line,
      qty: Number(line.qty),
      line_discount: 0,
      applied_rules: [],
      retail_price: line.retail_price || line.product.price_retail
    }));

    const appliedRules: AppliedRule[] = [];
    const warnings: string[] = [];

    const globalQuantityRule = dataService.getGlobalQuantityRuleEnabled();

    // Compute per-line matches and apply according to stack mode and priority
    for (const line of updatedLines) {
      // Gather matches by level
      const matches = this.findMatchingRulesForLine(rules, line);
      if (matches.length === 0) continue;

      // Determine if additive or exclusive applies
      // If any matched rule has ADDITIVE, stack; else exclusive by default
      const anyAdditive = matches.some(r => (r.stack_mode || 'EXCLUSIVE') === 'ADDITIVE');

      let selected: DiscountRule[] = [];
      if (anyAdditive) {
        selected = matches.slice();
      } else {
        // Exclusive: pick highest priority by level then by rule.priority asc
        const levelRank = (r: DiscountRule) => {
          const lvl = (r.level || (r.applies_to === 'CATEGORY' ? 'GROUP' : 'PRODUCT')) as any;
          if (lvl === 'PRODUCT') return 1;
          if (lvl === 'GROUP' || lvl === 'CATEGORY') return 2;
          if (lvl === 'SUPPLIER') return 3;
          return 99;
        };
        const best = matches
          .sort((a, b) => levelRank(a) - levelRank(b) || (a.priority - b.priority))[0];
        if (best) selected = [best];
      }

      // Quantity rule toggle: if additive and any contributing rule has it Off, disable legacy behavior for the line
      const allQtyRuleOn = selected.every(r => r.apply_quantity_rule !== false);
      const quantityRuleOn = globalQuantityRule && allQtyRuleOn;

      // Compute discount amounts, cap to line subtotal
      const lineSubtotal = line.unit_price * line.qty;
      let sumDiscount = 0;
      for (const r of selected) {
        let amount = 0;
        try {
          amount = this.computeRuleDiscountForLine(r, line, quantityRuleOn, currentSettings);
        } catch (err) {
          try {
            const auditModule = await import('@/services/auditService');
            await auditModule.auditService.log({
              action: 'discounts.calc_failed',
              entity: 'discount_rule',
              entityId: r.id,
              payload: {
                lineId: line.id,
                productId: line.product_id,
                reason: 'compute_error',
                error: err instanceof Error ? err.message : 'unknown',
                channel: undefined,
                ts: new Date().toISOString()
              }
            } as any);
          } catch {}
          continue;
        }
        if (amount <= 0) continue;
        const remainingCap = Math.max(0, lineSubtotal - sumDiscount);
        const appliedAmount = Math.min(amount, remainingCap);
        if (appliedAmount > 0) {
          sumDiscount += appliedAmount;
          const applied: AppliedRule = {
            rule_id: r.id,
            rule_name: r.name,
            discount_amount: this.roundAmount(appliedAmount, currentSettings),
            level: (r.level || (r.applies_to === 'CATEGORY' ? 'GROUP' : 'PRODUCT')) as any,
            type: r.type,
            value: r.value,
            reason: appliedAmount < amount ? 'capped' : (anyAdditive ? 'stack' : 'priority')
          };
          (line.applied_rules as AppliedRule[]).push(applied);
          appliedRules.push(applied);
          if (appliedAmount < amount) {
            // Log capped event
            try {
              const auditModule = await import('@/services/auditService');
              await auditModule.auditService.log({
                action: 'discounts.calc_capped',
                entity: 'discount_line',
                entityId: String(line.id),
                payload: {
                  lineId: line.id,
                  productId: line.product_id,
                  subtotal: lineSubtotal,
                  intended: amount,
                  applied: appliedAmount,
                  channel: undefined,
                  ts: new Date().toISOString()
                }
              } as any);
            } catch {}
            warnings.push(`Capped at subtotal on ${line.product.sku}`);
          }
        }
        if (sumDiscount >= lineSubtotal) {
          warnings.push(`Discount capped at line total for product ${line.product.sku}`);
          break;
        }
      }

      line.line_discount = this.roundAmount(sumDiscount, currentSettings);
      line.total = this.roundAmount(line.unit_price * line.qty - line.line_discount + line.tax, currentSettings);
    }

    return {
      lines: updatedLines,
      appliedRules,
      warnings,
      totals: this.calculateTotals(updatedLines, currentSettings).totals
    };
  }

  /**
   * Apply a single rule to cart lines
   */
  private findMatchingRulesForLine(rules: DiscountRule[], line: CartLine): DiscountRule[] {
    const productId = Number(line.product_id);
    const groupId = Number((line.product as any).category_id);
    const supplierId = Number((line.product as any).preferred_supplier_id);
    return rules.filter(r => {
      const level = (r.level || (r.applies_to === 'CATEGORY' ? 'GROUP' : 'PRODUCT')) as any;
      if (level === 'PRODUCT') return Number(r.target_id) === productId;
      if (level === 'GROUP' || r.applies_to === 'CATEGORY') return Number(r.target_id) === groupId;
      if (level === 'SUPPLIER') return supplierId && Number(r.target_id) === supplierId;
      return false;
    });
  }

  private computeRuleDiscountForLine(
    rule: DiscountRule,
    line: CartLine,
    quantityRuleOn: boolean,
    settings: DiscountEngineSettings
  ): number {
    const qty = Number(line.qty);
    if (qty <= 0) return 0;
    const retailPrice = Number(line.retail_price);
    const perUnit = rule.type === 'AMOUNT' ? Number(rule.value) : (retailPrice * (Number(rule.value) / 100));
    const grossMax = retailPrice * qty;

    // If rule defines a min threshold using max_qty_or_weight, treat as threshold to unlock full-qty discount
    const threshold = Number(rule.max_qty_or_weight || 0);
    const eligibleQty = threshold > 0 ? (qty >= threshold ? qty : 0) : qty;

    let amount = perUnit * eligibleQty;
    amount = Math.min(amount, grossMax);
    return this.roundAmount(amount, settings);
  }

  /**
   * Check if a rule applies to a specific line
   */
  private doesRuleApplyToLine(rule: DiscountRule, line: CartLine): boolean {
    const targetId = Number((rule as any).target_id);
    if (rule.applies_to === 'PRODUCT') {
      return Number(line.product_id) === targetId;
    } else if (rule.applies_to === 'CATEGORY') {
      return Number(line.product.category_id) === targetId;
    }
    return false;
  }

  /**
   * Calculate totals for cart lines
   */
  private calculateTotals(lines: CartLine[], settings: DiscountEngineSettings): DiscountEngineResult {
    const gross = lines.reduce((sum, line) => sum + (line.qty * line.unit_price), 0);
    const itemDiscounts = lines.reduce((sum, line) => sum + line.line_discount, 0);
    const tax = lines.reduce((sum, line) => sum + line.tax, 0);
    const net = gross - itemDiscounts + tax;

    return {
      lines,
      appliedRules: [],
      warnings: [],
      totals: {
        gross: this.roundAmount(gross, settings),
        itemDiscounts: this.roundAmount(itemDiscounts, settings),
        manualDiscount: 0, // Will be set by caller
        tax: this.roundAmount(tax, settings),
        net: this.roundAmount(net, settings)
      }
    };
  }

  /**
   * Round amount based on settings
   */
  private roundAmount(amount: number, settings: DiscountEngineSettings): number {
    switch (settings.roundingMode) {
      case 'NEAREST_1':
        return Math.round(amount);
      case 'NEAREST_5':
        return Math.round(amount / 5) * 5;
      case 'NEAREST_10':
        return Math.round(amount / 10) * 10;
      case 'FLOOR':
        return Math.floor(amount);
      case 'CEIL':
        return Math.ceil(amount);
      default:
        return Math.round(amount);
    }
  }

  /**
   * Get default settings
   */
  private getDefaultSettings(): DiscountEngineSettings {
    return {
      maxDiscountPercent: 100,
      allowNegativeTotals: false,
      roundingMode: 'NEAREST_1'
    };
  }

  /**
   * Apply manual discount to cart totals
   * This is called after item-level discounts are applied
   */
  applyManualDiscount(
    totals: DiscountEngineResult['totals'],
    manualDiscount: { type: 'FIXED_AMOUNT' | 'PERCENTAGE'; value: number },
    settings?: DiscountEngineSettings
  ): DiscountEngineResult['totals'] {
    const currentSettings = settings || this.getDefaultSettings();
    
    let manualDiscountAmount = 0;
    if (manualDiscount.value > 0) {
      if (manualDiscount.type === 'PERCENTAGE') {
        // Apply percentage to gross amount (before any discounts)
        manualDiscountAmount = totals.gross * (manualDiscount.value / 100);
      } else {
        // Fixed amount discount
        manualDiscountAmount = manualDiscount.value;
      }
    }

    // Cap manual discount to prevent negative totals
    const maxAllowedDiscount = totals.gross - totals.itemDiscounts;
    if (!currentSettings.allowNegativeTotals) {
      manualDiscountAmount = Math.min(manualDiscountAmount, maxAllowedDiscount);
    }

    const finalNet = totals.gross - totals.itemDiscounts - manualDiscountAmount + totals.tax;

    return {
      gross: totals.gross,
      itemDiscounts: totals.itemDiscounts,
      manualDiscount: this.roundAmount(manualDiscountAmount, currentSettings),
      tax: totals.tax,
      net: this.roundAmount(finalNet, currentSettings)
    };
  }
}

// Singleton instance
export const discountEngine = new DiscountEngine();
