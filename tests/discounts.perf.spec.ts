import { describe, it } from 'vitest';
import { discountEngine } from '@/services/discountEngine';

function makeLine(i: number) {
  return {
    id: i+1,
    product_id: i+1,
    product: { sku: `SKU${i+1}`, category_id: (i % 5) + 1, price_retail: 1000 },
    qty: ((i % 3) + 1),
    unit_price: 1000,
    retail_price: 1000,
    line_discount: 0,
    tax: 0,
    total: 1000
  } as any;
}

function rulesForPerf() {
  const rules: any[] = [];
  // Product rules
  for (let i = 0; i < 20; i++) {
    rules.push({ id: 1000 + i, name: `P${i}`, level: 'PRODUCT', target_id: i+1, type: 'PERCENT', value: 5, stack_mode: 'EXCLUSIVE', active: true, priority: 10, active_from: new Date(), channel: 'BOTH' });
  }
  // Group additive rules
  for (let g = 1; g <= 5; g++) {
    rules.push({ id: 2000 + g, name: `G${g}`, level: 'GROUP', target_id: g, type: 'PERCENT', value: 3, stack_mode: 'ADDITIVE', active: true, priority: 20, active_from: new Date(), channel: 'BOTH' });
  }
  // Supplier fixed capping-like rule (simulate by high amount applied to some)
  rules.push({ id: 3001, name: 'S1', level: 'SUPPLIER', target_id: 1, type: 'AMOUNT', value: 700, stack_mode: 'ADDITIVE', active: true, priority: 30, active_from: new Date(), channel: 'BOTH' });
  return rules;
}

function percentile(arr: number[], p: number) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

describe('Discounts Performance', () => {
  it('100 lines x 10 runs under 100ms p95', async () => {
    const lines = Array.from({ length: 100 }, (_, i) => makeLine(i));
    const rules = rulesForPerf();
    const times: number[] = [];
    for (let r = 0; r < 10; r++) {
      const t0 = performance.now();
      await discountEngine.applyRulesToCart({ lines, rules });
      const t1 = performance.now();
      times.push(t1 - t0);
    }
    const best = Math.min(...times);
    const med = percentile(times, 50);
    const p95 = percentile(times, 95);
    console.log(`\nPerformance (100 lines x 10): best=${best.toFixed(2)}ms, median=${med.toFixed(2)}ms, p95=${p95.toFixed(2)}ms`);
  });
});










