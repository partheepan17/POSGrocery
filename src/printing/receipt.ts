export type ReceiptLine = {
  name: string;
  qty: number;
  unit_price: number;
  uom_code?: string;
};

export function formatReceipt(lines: ReceiptLine[], totals: { subtotal: number; tax?: number; total: number }) {
  const head = 'RECEIPT';
  const body = lines.map(l => {
    const uom = l.uom_code ? ` ${l.uom_code}` : '';
    return `${l.name}${uom}\n  ${l.qty} x ${l.unit_price.toFixed(2)}`;
  }).join('\n');
  const taxLine = totals.tax ? `\nTAX: ${totals.tax.toFixed(2)}` : '';
  return `${head}\n${body}\nSUBTOTAL: ${totals.subtotal.toFixed(2)}${taxLine}\nTOTAL: ${totals.total.toFixed(2)}`;
}










