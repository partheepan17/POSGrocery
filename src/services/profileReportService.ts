import { dataService } from './dataService';

export async function getCustomerPriceExceptions(_filters: { profileId?: number } = {}) {
  let invoices = await dataService.listInvoices({ limit: 200 });
  if ((!invoices || !invoices.sales || invoices.sales.length === 0) && typeof window !== 'undefined') {
    try { const raw = localStorage.getItem('discountSampleInvoices'); if (raw) invoices = JSON.parse(raw); } catch {}
  }
  const rows: Array<{ bill_no: string; date: string; sku: string; base_price: number; special_price?: number; discount_applied?: number; advantage: number }>= [];
  const salesList = invoices?.sales || [];
  for (const inv of salesList) {
    for (const line of (inv.lines || [])) {
      const base = Number(line.unit_price || 0);
      const sp = (line as any).special_applied ? Number(line.unit_price||0) : undefined;
      const disc = Number(line.line_discount || 0);
      const advantage = sp != null ? (base - sp) * Number(line.qty||1) : disc;
      if (advantage > 0) {
        rows.push({ bill_no: String(inv.id), date: inv.datetime || '', sku: (line as any).sku||'', base_price: base, special_price: sp, discount_applied: disc, advantage });
      }
    }
  }
  rows.sort((a,b)=>b.advantage-a.advantage);
  return rows;
}

export async function getProfileCoverage(_profileId: number) {
  let invoices = await dataService.listInvoices({ limit: 200 });
  if ((!invoices || !invoices.sales || invoices.sales.length === 0) && typeof window !== 'undefined') {
    try { const raw = localStorage.getItem('discountSampleInvoices'); if (raw) invoices = JSON.parse(raw); } catch {}
  }
  let covered = 0, total = 0;
  const salesList = invoices?.sales || [];
  for (const inv of salesList) {
    for (const line of (inv.lines || [])) {
      total++;
      if ((line as any).special_applied) covered++;
    }
  }
  const pct = total ? (covered/total*100) : 0;
  return { covered, total, percent: pct };
}



