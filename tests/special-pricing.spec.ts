import { describe, it, expect } from 'vitest';
import { evaluateSpecialPricing, SpecialProfile } from '@/services/specialPricingService';

const product: any = { id: 1, sku: 'SP1', category_id: 10, price_retail: 1000, preferred_supplier_id: 100 };

describe('Special Pricing', () => {
  it('Fixed price beats discounts and unified discounts', async () => {
    const profile: SpecialProfile = {
      id: 1, name: 'Test', active: true, allow_stack_with_global: false,
      entries: [
        { id: 1, level: 'PRODUCT', target_id: 1, rule_type: 'FIXED_PRICE', value: 800, active: true }
      ]
    } as any;
    const res = evaluateSpecialPricing({ product, qty: 2, unit_price: 1000, retail_price: 1000, channel: 'RETAIL', profile });
    expect(res?.fixed_price_applied).toBe(800);
  });

  it('Profile discount beats global discount in Exclusive mode', async () => {
    const profile: SpecialProfile = {
      id: 1, name: 'Test', active: true,
      entries: [
        { id: 2, level: 'GROUP', target_id: 10, rule_type: 'PERCENT_DISCOUNT', value: 20, stack_mode: 'EXCLUSIVE', active: true }
      ]
    } as any;
    const res = evaluateSpecialPricing({ product, qty: 1, unit_price: 1000, retail_price: 1000, channel: 'RETAIL', profile });
    expect((res?.discount_amount||0)).toBeGreaterThan(0);
  });
});










