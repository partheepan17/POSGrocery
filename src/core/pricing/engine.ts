export type PriceTier = 'Retail' | 'Wholesale' | 'Credit' | 'Other';

export interface PricingContext {
  basePrice: number;
  tier: PriceTier;
  qty: number;
  customerType?: PriceTier;
  customerSpecial?: number | null; // explicit price override when available
  tierBreaks?: Array<{ minQty: number; price: number; label?: string }>; // e.g., 10+ → 950
}

export interface PriceResult {
  unitPrice: number;
  reason: string;
}

export function computeUnitPrice(ctx: PricingContext): PriceResult {
  // 1) customerSpecial overrides everything
  if (ctx.customerSpecial != null && isFinite(ctx.customerSpecial)) {
    return { unitPrice: Number(ctx.customerSpecial), reason: `Customer special → ${ctx.customerSpecial.toFixed(2)}` };
  }

  // 2) tier-based qty breaks
  const breaks = (ctx.tierBreaks || []).slice().sort((a, b) => b.minQty - a.minQty);
  for (const br of breaks) {
    if (ctx.qty >= br.minQty) {
      const label = br.label || `${br.minQty}+`;
      return { unitPrice: Number(br.price), reason: `Tier ${label} → ${br.price.toFixed(2)}` };
    }
  }

  // 3) customerType default tier mapping, if different from chosen tier
  if (ctx.customerType && ctx.customerType !== 'Retail' && ctx.customerType !== ctx.tier) {
    return { unitPrice: Number(ctx.basePrice), reason: `CustomerType ${ctx.customerType} → ${ctx.basePrice.toFixed(2)}` };
  }

  // 4) base
  return { unitPrice: Number(ctx.basePrice), reason: `Base → ${ctx.basePrice.toFixed(2)}` };
}









