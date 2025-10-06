import { describe, it, expect, vi } from 'vitest';
import { pricingService } from '@/services/pricingService';

describe('pricingService.compute', () => {
  it('returns base price when no tiers hit', async () => {
    // Mock fetch
    const mock = vi.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      json: async () => ({ unit_price: 100, reason: 'base' })
    } as any);
    const res = await pricingService.compute({ product_id: 1, qty: 1, base_price: 100 });
    expect(res.unit_price).toBe(100);
    mock.mockRestore();
  });
});





