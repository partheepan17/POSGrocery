export type GrnPrintLine = {
  product_id: number;
  quantity_received: number;
  unit_cost: number;
};

export type GrnPrintPayload = {
  grn_id: number;
  po_id?: number;
  lines: GrnPrintLine[];
  totals?: { qty: number; value: number };
};

export function formatGrnForPrint(payload: GrnPrintPayload): string {
  const header = `GRN #${payload.grn_id}${payload.po_id ? ` (PO ${payload.po_id})` : ''}`;
  const body = payload.lines.map(l => `#${l.product_id}  x${l.quantity_received}  @${l.unit_cost.toFixed(2)}`).join('\n');
  const totals = payload.totals ? `\nTotal Qty: ${payload.totals.qty}\nTotal Value: ${payload.totals.value.toFixed(2)}` : '';
  return `${header}\n${body}${totals}`;
}










