import { dataService, DiscountRule, Product, Category } from './dataService';
import { useSettingsStore } from '@/store/settingsStore';

export interface CartLine {
  id: number;
  product_id: number;
  product: Product;
  qty: number;
  unit_price: number;
  line_discount: number;
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
  currency: string;
  currencySymbol: string;
  roundingMode: 'NEAREST_1' | 'NEAREST_0_50' | 'NEAREST_0_10';
  kgDecimals: number;
}

export interface DiscountEngineResult {
  lines: CartLine[];
  totals: {
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
  };
  appliedRules: AppliedRule[];
  warnings: string[];
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
      const productIds = validProducts.map(p => p.id);
      const categoryIds = [...new Set(validProducts.map(p => p.category_id))];

      // Get all active discount rules
      const allRules = await dataService.getDiscountRules(true);
      
      // Filter rules that apply to our products/categories and are within date range
      const effectiveRules = allRules.filter(rule => {
        // Check date range
        const fromDate = new Date(rule.active_from);
        const toDate = new Date(rule.active_to);
        if (now < fromDate || now > toDate) {
          return false;
        }

        // Check if rule applies to any of our products/categories
        if (rule.applies_to === 'PRODUCT') {
          return productIds.includes(rule.target_id);
        } else if (rule.applies_to === 'CATEGORY') {
          return categoryIds.includes(rule.target_id);
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
    const rules = params.rules || await this.getEffectiveRules({ skus });
    
    if (rules.length === 0) {
      return this.calculateTotals(lines, currentSettings);
    }

    // Clone lines to avoid mutation
    const updatedLines = lines.map(line => ({ 
      ...line, 
      line_discount: 0, // Reset automatic discounts
      applied_rules: []
    }));

    const appliedRules: AppliedRule[] = [];
    const warnings: string[] = [];
    const ruleCapTracker: RuleCapTracker = {};

    // Initialize cap tracker for rules with max_qty_or_weight
    rules.forEach(rule => {
      if (rule.max_qty_or_weight && rule.max_qty_or_weight > 0) {
        ruleCapTracker[rule.id] = {
          rule,
          usedQuantity: 0,
          remainingQuantity: rule.max_qty_or_weight
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
      totals: this.calculateTotalsFromLines(updatedLines, currentSettings),
      appliedRules,
      warnings
    };
  }

  /**
   * Apply a single rule to matching lines
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
      const applicableQty = Math.min(line.qty, remainingCap);
      
      if (applicableQty <= 0) {
        continue;
      }

      // Calculate discount amount
      let discountPerUnit = 0;
      if (rule.type === 'AMOUNT') {
        discountPerUnit = rule.value;
      } else if (rule.type === 'PERCENT') {
        discountPerUnit = line.unit_price * (rule.value / 100);
      }

      // Calculate total discount for this line (capped by applicable quantity)
      const lineDiscount = Math.min(
        discountPerUnit * applicableQty,
        line.unit_price * applicableQty // Can't discount more than the line total
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
        if (capTracker[rule.id]) {
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
    if (rule.applies_to === 'PRODUCT') {
      return line.product_id === rule.target_id;
    } else if (rule.applies_to === 'CATEGORY') {
      return line.product.category_id === rule.target_id;
    }
    return false;
  }

  /**
   * Calculate totals for lines without applying any rules
   */
  private calculateTotals(lines: CartLine[], settings: DiscountEngineSettings): DiscountEngineResult {
    return {
      lines,
      totals: this.calculateTotalsFromLines(lines, settings),
      appliedRules: [],
      warnings: []
    };
  }

  /**
   * Calculate totals from lines
   */
  private calculateTotalsFromLines(lines: CartLine[], settings: DiscountEngineSettings) {
    const subtotal = lines.reduce((sum, line) => sum + (line.unit_price * line.qty), 0);
    const discount = lines.reduce((sum, line) => sum + line.line_discount, 0);
    const tax = lines.reduce((sum, line) => sum + line.tax, 0);
    const total = subtotal - discount + tax;

    return {
      subtotal: this.roundAmount(subtotal, settings),
      discount: this.roundAmount(discount, settings),
      tax: this.roundAmount(tax, settings),
      total: this.roundAmount(total, settings)
    };
  }

  /**
   * Round amount according to settings
   */
  private roundAmount(amount: number, settings: DiscountEngineSettings): number {
    switch (settings.roundingMode) {
      case 'NEAREST_0_10':
        return Math.round(amount * 10) / 10;
      case 'NEAREST_0_50':
        return Math.round(amount * 2) / 2;
      case 'NEAREST_1':
      default:
        return Math.round(amount);
    }
  }

  /**
   * Get default settings from store
   */
  private getDefaultSettings(): DiscountEngineSettings {
    const settings = useSettingsStore.getState().settings;
    return {
      currency: settings.currency || 'LKR',
      currencySymbol: settings.currencySymbol || 'රු',
      roundingMode: settings.languageFormatting?.roundingMode || 'NEAREST_1',
      kgDecimals: settings.languageFormatting?.kgDecimals || 3
    };
  }

  /**
   * Test a rule against a mock cart (for preview/testing purposes)
   */
  async testRule(params: {
    rule: DiscountRule;
    mockLines: CartLine[];
    settings?: DiscountEngineSettings;
  }): Promise<DiscountEngineResult> {
    const { rule, mockLines, settings } = params;
    
    return this.applyRulesToCart({
      lines: mockLines,
      rules: [rule],
      settings: settings || this.getDefaultSettings()
    });
  }
}

// Singleton instance
export const discountEngine = new DiscountEngine();
