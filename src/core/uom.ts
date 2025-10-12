export type Uom = { code: string; name: string; conv_to_base: number; price_override?: number | null };

export function convertToBase(quantity: number, uom: Uom): number {
  const factor = Number(uom.conv_to_base || 1);
  return Number(quantity) * factor;
}

export function deriveUnitPrice(baseUnitPrice: number, uom: Uom): number {
  if (uom.price_override != null && !isNaN(Number(uom.price_override))) {
    return Number(uom.price_override);
  }
  const factor = Number(uom.conv_to_base || 1);
  return Number(baseUnitPrice) * factor;
}










