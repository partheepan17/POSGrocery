import { dataService, DiscountRule } from './dataService';

export interface UsageFilter {
  dateFrom?: string;
  dateTo?: string;
  channel?: 'RETAIL'|'WHOLESALE'|'BOTH';
  level?: 'PRODUCT'|'GROUP'|'SUPPLIER';
  targetId?: number;
  ruleName?: string;
  active?: boolean;
}

export async function getDiscountUsage(filters: UsageFilter = {}) {
  // Placeholder: in a full implementation, fetch from backend; here, compute from invoices if available
  let invoices = await dataService.listInvoices({ limit: 200 });
  if (!invoices || (invoices as any).length === 0 && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('discountSampleInvoices');
      if (raw) invoices = JSON.parse(raw);
    } catch {}
  }
  const items: any[] = [];
  for (const inv of (invoices as any)) {
    if (filters.dateFrom && new Date(inv.datetime) < new Date(filters.dateFrom)) continue;
    if (filters.dateTo && new Date(inv.datetime) > new Date(filters.dateTo)) continue;
    for (const line of (inv.lines || [])) {
      if (!line.applied_rules || line.applied_rules.length === 0) continue;
      items.push({ invoice: inv, line });
    }
  }

  const byRule: Record<string, { rule: string; level?: string; amount: number; lines: number; bills: Set<number> }> = {};
  for (const { invoice, line } of items) {
    for (const r of (line.applied_rules || [])) {
      const key = String(r.rule_id);
      if (!byRule[key]) byRule[key] = { rule: r.rule_name, level: r.level, amount: 0, lines: 0, bills: new Set() };
      byRule[key].amount += Number(r.discount_amount || 0);
      byRule[key].lines += 1;
      byRule[key].bills.add(invoice.id);
    }
  }
  const rows = Object.entries(byRule).map(([ruleId, v]) => ({
    rule_id: Number(ruleId),
    rule_name: v.rule,
    level: v.level,
    total_discount: v.amount,
    lines_affected: v.lines,
    bills_affected: v.bills.size
  }));
  rows.sort((a, b) => b.total_discount - a.total_discount);
  return rows;
}

export async function getDiscountExceptions(filters: { dateFrom?: string; dateTo?: string } = {}) {
  let invoices = await dataService.listInvoices({ limit: 200 });
  if (!invoices || (invoices as any).length === 0 && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('discountSampleInvoices');
      if (raw) invoices = JSON.parse(raw);
    } catch {}
  }
  const exceptions: Array<{ bill_no: string; date: string; sku: string; qty: number; subtotal: number; intended?: number; applied: number; reason: string }>= [];
  for (const inv of (invoices as any)) {
    if (filters.dateFrom && new Date(inv.datetime) < new Date(filters.dateFrom)) continue;
    if (filters.dateTo && new Date(inv.datetime) > new Date(filters.dateTo)) continue;
    for (const line of (inv.lines || [])) {
      const subtotal = Number(line.unit_price || 0) * Number(line.qty || 0);
      const applied = Number(line.line_discount || 0);
      // Detect capped: if any rule reason is 'stack' and applied equals subtotal
      const capped = applied >= subtotal && applied > 0;
      const qtyOff = (line as any).quantity_rule_applied === false;
      if (capped || qtyOff || (inv.discounts_disabled === true)) {
        exceptions.push({
          bill_no: String(inv.id),
          date: inv.datetime,
          sku: line.sku || '',
          qty: Number(line.qty || 0),
          subtotal,
          applied,
          reason: capped ? 'Capped' : (inv.discounts_disabled ? 'Bill-Disabled' : 'Qty-Rule-Off')
        });
      }
    }
  }
  return exceptions;
}


