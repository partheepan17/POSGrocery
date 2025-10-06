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

    // Clone lines to avoid mutation
    // IMPORTANT: Ensure retail_price is set for discount calculations
    const updatedLines = lines.map(line => ({ 
      ...line, 
      qty: Number(line.qty),
      line_discount: 0,
      applied_rules: [],
      // Ensure we have retail price for discount calculations
      retail_price: line.retail_price || line.product.price_retail
    }));

    const appliedRules: AppliedRule[] = [];
    const warnings: string[] = [];
    const ruleCapTracker: RuleCapTracker = {};

    // Initialize cap tracker only for legacy-cap mode (threshold = 0)
    rules.forEach(rule => {
      if (!rule.max_qty_or_weight || rule.max_qty_or_weight <= 0) {
        ruleCapTracker[rule.id] = {
          rule,
          usedQuantity: 0,
          remainingQuantity: Infinity
        };
      }
    });

    // Apply rules in priority order
    for (const rule of rules) {
      const ruleResult = this.applyRuleToLines({
        rule,
        lines: updatedLines,
        capTracker: ruleCapTracker,
        settings: currentSettings
      });

      appliedRules.push(...ruleResult.appliedRules);
      warnings.push(...ruleResult.warnings);
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
  private applyRuleToLines(params: {
    rule: DiscountRule;
    lines: CartLine[];
    capTracker: RuleCapTracker;
    settings: DiscountEngineSettings;
  }): { appliedRules: AppliedRule[]; warnings: string[] } {
    const { rule, lines, capTracker, settings } = params;
    const appliedRules: AppliedRule[] = [];
    const warnings: string[] = [];

    // Find matching lines
    const matchingLines = lines.filter(line => this.doesRuleApplyToLine(rule, line));
    
    if (matchingLines.length === 0) {
      return { appliedRules, warnings };
    }

    let totalDiscountApplied = 0;
    let remainingCap = capTracker[rule.id]?.remainingQuantity ?? Infinity;

    // Apply discount to each matching line
    for (const line of matchingLines) {
      if (remainingCap <= 0) {
        warnings.push(`Cap reached for rule "${rule.name}"`);
        break;
      }

      // Calculate how much quantity we can discount for this line
      const minQtyThreshold = Number(rule.max_qty_or_weight || 0);
      let applicableQty = 0;
      if (minQtyThreshold > 0) {
        // New behavior: apply discount to ALL quantity only if threshold reached
        if (line.qty >= minQtyThreshold) {
          applicableQty = line.qty;
        } else {
          applicableQty = 0;
        }
      } else {
        // Legacy/cap behavior (no threshold configured)
        applicableQty = Math.min(Number(line.qty), remainingCap);
      }
      
      if (applicableQty <= 0) {
        continue;
      }

      // Calculate discount amount based on RETAIL PRICE only
      let discountPerUnit = 0;
      const retailPrice = line.retail_price;
      
      if (rule.type === 'AMOUNT') {
        discountPerUnit = rule.value;
      } else if (rule.type === 'PERCENT') {
        // IMPORTANT: Discount percentage is calculated on retail price, not current unit price
        discountPerUnit = retailPrice * (rule.value / 100);
      }

      // Calculate total discount for this line (capped by applicable quantity)
      // Use retail price for discount calculation, but preserve current unit price for display
      const lineDiscount = Math.min(
        discountPerUnit * applicableQty,
        retailPrice * applicableQty // Can't discount more than the retail price total
      );

      // Round the discount
      const roundedDiscount = this.roundAmount(lineDiscount, settings);

      // Apply the discount
      if (roundedDiscount > 0) {
        line.line_discount += roundedDiscount;
        line.applied_rules = line.applied_rules || [];
        
        const appliedRule: AppliedRule = {
          rule_id: rule.id,
          rule_name: rule.name,
          discount_amount: roundedDiscount,
          remaining_cap: capTracker[rule.id] ? remainingCap - applicableQty : undefined
        };
        
        line.applied_rules.push(appliedRule);
        appliedRules.push(appliedRule);
        totalDiscountApplied += roundedDiscount;

        // Update cap tracker
        if (capTracker[rule.id] && minQtyThreshold === 0) {
          capTracker[rule.id].usedQuantity += applicableQty;
          capTracker[rule.id].remainingQuantity -= applicableQty;
          remainingCap = capTracker[rule.id].remainingQuantity;
        }

        // Recalculate line total
        line.total = this.roundAmount(
          (line.unit_price * line.qty) - line.line_discount + line.tax,
          settings
        );
      }
    }

    return { appliedRules, warnings };
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