export type CartItem = { product_id: number; category_id?: number; qty: number; unit_price: number };

export type PromoRule =
  | { type: 'BUY_X_GET_Y'; product_id: number; x: number; y: number; unit_price: number; priority?: number; startAt?: string; endAt?: string; daysOfWeek?: number[]; segments?: number[] }
  | { type: 'MIX_AND_MATCH_BUNDLE_PRICE'; category_id: number; bundle_qty: number; bundle_price: number; priority?: number; startAt?: string; endAt?: string; daysOfWeek?: number[]; segments?: number[] }
  | { type: 'CHEAPEST_FREE'; category_id: number; k: number; priority?: number; startAt?: string; endAt?: string; daysOfWeek?: number[]; segments?: number[] };

export type PromoResult = { totalDiscount: number; applied: { type: string; discount: number; explain: string; priority: number }[] };

function withinWindow(now: Date, rule: any, weekday: number, customerTags: number[]): boolean {
  if (rule.startAt && now < new Date(rule.startAt)) return false;
  if (rule.endAt && now > new Date(rule.endAt)) return false;
  if (Array.isArray(rule.daysOfWeek) && rule.daysOfWeek.length > 0 && !rule.daysOfWeek.includes(weekday)) return false;
  if (Array.isArray(rule.segments) && rule.segments.length > 0) {
    const has = rule.segments.some((t: number) => customerTags.includes(t));
    if (!has) return false;
  }
  return true;
}

export function evaluatePromotionsLocal(items: CartItem[], rules: PromoRule[], customerTags: number[] = []): PromoResult {
  const now = new Date();
  const weekday = now.getDay();
  const applied: { type: string; discount: number; explain: string; priority: number }[] = [];
  for (const r of rules) {
    const priority = (r as any).priority ?? 100;
    if (!withinWindow(now, r, weekday, customerTags)) continue;
    if (r.type === 'BUY_X_GET_Y') {
      const qty = items.filter(i => i.product_id === r.product_id).reduce((s, i) => s + i.qty, 0);
      if (r.x > 0 && r.y > 0 && qty >= r.x + r.y) {
        const times = Math.floor(qty / (r.x + r.y));
        const discount = times * r.y * r.unit_price;
        if (discount > 0) applied.push({ type: r.type, discount, explain: `Buy ${r.x} get ${r.y} free on product ${r.product_id}`, priority });
      }
    } else if (r.type === 'MIX_AND_MATCH_BUNDLE_PRICE') {
      const totalQty = items.filter(i => i.category_id === r.category_id).reduce((s, i) => s + i.qty, 0);
      if (r.bundle_qty > 0 && totalQty >= r.bundle_qty && r.bundle_price > 0) {
        // Approx: compute regular sum from unit prices
        const catItems = items.filter(i => i.category_id === r.category_id);
        const regular = catItems.reduce((s, i) => s + (i.qty * i.unit_price), 0);
        const times = Math.floor(totalQty / r.bundle_qty);
        const target = times * r.bundle_price + (totalQty - times * r.bundle_qty) * (regular / Math.max(totalQty, 1));
        const discount = Math.max(0, regular - target);
        if (discount > 0) applied.push({ type: r.type, discount, explain: `Bundle ${r.bundle_qty} for ${r.bundle_price} on category ${r.category_id}`, priority });
      }
    } else if (r.type === 'CHEAPEST_FREE') {
      const catItems = items.filter(i => i.category_id === r.category_id);
      const qty = catItems.reduce((s, i) => s + i.qty, 0);
      if (qty >= r.k) {
        const prices: number[] = [];
        catItems.forEach(it => { for (let j = 0; j < Math.floor(it.qty); j++) prices.push(it.unit_price); });
        prices.sort((a, b) => a - b);
        const discount = prices[0] || 0;
        if (discount > 0) applied.push({ type: r.type, discount, explain: `Cheapest item free (k=${r.k}) in category ${r.category_id}`, priority });
      }
    }
  }
  // Stack by priority: higher priority wins in conflicts (here we simply sum; can refine later)
  const totalDiscount = applied.reduce((s, a) => s + a.discount, 0);
  // Sort by priority for UI stacking
  applied.sort((a, b) => (a.priority - b.priority) || (b.discount - a.discount));
  return { totalDiscount, applied };
}

// Server-evaluated fallback (kept for parity)
export async function evaluatePromotions(items: CartItem[], customerTags: number[] = []) {
  const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8250';
  const res = await fetch(`${apiBaseUrl}/api/promotions/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, customer_tags: customerTags })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Promo failed');
  return data as { totalDiscount: number; applied: { promotion_id: number; type: string; discount: number; why: string }[] };
}



