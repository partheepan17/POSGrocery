import { Product } from './dataService';

export type SpecialRuleType = 'FIXED_PRICE' | 'PERCENT_DISCOUNT' | 'FIXED_DISCOUNT';

export interface SpecialProfileEntry {
  id: number;
  level: 'PRODUCT'|'GROUP'|'SUPPLIER';
  target_id: number;
  rule_type: SpecialRuleType;
  value: number;
  stack_mode?: 'EXCLUSIVE'|'ADDITIVE';
  apply_quantity_rule?: boolean;
  channel?: 'RETAIL'|'WHOLESALE'|'BOTH';
  active_from?: string;
  active_to?: string | null;
  active?: boolean;
}

export interface SpecialProfile {
  id: number;
  name: string;
  active: boolean;
  allow_stack_with_global?: boolean;
  entries: SpecialProfileEntry[];
}

export interface EvaluateParams {
  product: Product;
  qty: number;
  unit_price: number;
  retail_price: number;
  channel: 'RETAIL'|'WHOLESALE';
  profile: SpecialProfile | null;
}

export interface EvaluateResult {
  fixed_price_applied?: number;
  discount_amount?: number;
  applied_entries?: SpecialProfileEntry[];
  allow_stack_with_global?: boolean;
  quantity_rule_on?: boolean;
}

export function evaluateSpecialPricing(params: EvaluateParams): EvaluateResult | null {
  const { product, qty, unit_price, retail_price, channel, profile } = params;
  if (!profile || !profile.active) return null;
  const now = new Date();
  const matches = (entry: SpecialProfileEntry) => {
    if (entry.active === false) return false;
    const ch = (entry.channel || 'BOTH');
    if (ch !== 'BOTH' && ch !== channel) return false;
    const from = entry.active_from ? new Date(entry.active_from) : new Date(0);
    const to = entry.active_to ? new Date(entry.active_to) : new Date(8640000000000000);
    if (now < from || now > to) return false;
    if (entry.level === 'PRODUCT') return Number(entry.target_id) === Number(product.id);
    if (entry.level === 'GROUP') return Number(entry.target_id) === Number(product.category_id);
    if (entry.level === 'SUPPLIER') return Number(entry.target_id) === Number((product as any).preferred_supplier_id);
    return false;
  };

  const applicable = (profile.entries || []).filter(matches);
  if (applicable.length === 0) return { applied_entries: [], allow_stack_with_global: profile.allow_stack_with_global !== false, quantity_rule_on: true };

  // Priority inside profile: Product > Group > Supplier
  const rank = (e: SpecialProfileEntry) => e.level === 'PRODUCT' ? 1 : (e.level === 'GROUP' ? 2 : 3);
  const fixedPrice = applicable
    .filter(e => e.rule_type === 'FIXED_PRICE')
    .sort((a, b) => rank(a) - rank(b))[0];
  if (fixedPrice) {
    return {
      fixed_price_applied: Number(fixedPrice.value),
      applied_entries: [fixedPrice],
      allow_stack_with_global: profile.allow_stack_with_global === true,
      quantity_rule_on: fixedPrice.apply_quantity_rule !== false
    };
  }

  // Discount entries
  const discs = applicable.filter(e => e.rule_type !== 'FIXED_PRICE');
  if (discs.length === 0) return null;
  const anyAdd = discs.some(e => (e.stack_mode || 'EXCLUSIVE') === 'ADDITIVE');
  let selected: SpecialProfileEntry[];
  if (anyAdd) selected = discs;
  else selected = [discs.sort((a, b) => rank(a) - rank(b))[0]];

  // Compute discount on retail price
  let discount = 0;
  for (const e of selected) {
    let perUnit = 0;
    if (e.rule_type === 'PERCENT_DISCOUNT') perUnit = retail_price * (e.value / 100);
    else if (e.rule_type === 'FIXED_DISCOUNT') perUnit = e.value;
    const amount = perUnit * qty;
    const remaining = (unit_price * qty) - discount;
    const applied = Math.max(0, Math.min(amount, remaining));
    discount += applied;
    if (!anyAdd) break;
    if (discount >= unit_price * qty) break;
  }

  return {
    discount_amount: discount,
    applied_entries: selected,
    allow_stack_with_global: profile.allow_stack_with_global !== false,
    quantity_rule_on: selected.every(e => e.apply_quantity_rule !== false)
  };
}










