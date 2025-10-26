export function renderReceiptExample() {
  // Simple static example block for acceptance output
  const lines = [
    { sku: 'MILK1L', qty: 2, unit: 'pc', unit_price: 800, tag: 'Special Price', discount: 0, total: 1600 },
    { sku: 'BREAD', qty: 1, unit: 'pc', unit_price: 1000, tag: 'Global: 50%+600 (Capped)', discount: 1000, total: 0 }
  ];
  const subtotal = 2600 - 1000;
  const tax = Math.round(subtotal * 0.15);
  const net = subtotal + tax;
  return { lines, subtotal, tax, net };
}










