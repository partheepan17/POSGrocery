/**
 * Money Math Utilities - Safe Totals, Rounding & Taxes
 * All monetary values are stored as integers (cents) to avoid floating point errors
 */

export interface MoneyAmount {
  cents: number;
  dollars: number;
}

export interface TaxCalculation {
  subtotal: number;
  taxAmount: number;
  total: number;
  taxRate: number;
}

export interface LineItem {
  productId: number;
  quantity: number;
  unitPrice: number; // in cents
  discountAmount?: number; // in cents
  taxInclusive?: boolean;
}

export interface BillDiscount {
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  value: number; // percentage (0-100) or amount in cents
}

/**
 * Convert dollars to cents (integer)
 */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Convert cents to dollars (float)
 */
export function fromCents(cents: number): number {
  return cents / 100;
}

/**
 * Round to nearest cent (for display)
 */
export function roundToCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Calculate line total with discount
 */
export function calculateLineTotal(item: LineItem): number {
  const subtotal = item.quantity * item.unitPrice;
  const discount = item.discountAmount || 0;
  return Math.max(0, subtotal - discount);
}

/**
 * Calculate tax for a line item
 */
export function calculateLineTax(item: LineItem, taxRate: number): number {
  const lineTotal = calculateLineTotal(item);
  
  if (item.taxInclusive) {
    // Tax is included in the price, calculate backwards
    // total = subtotal + tax, so tax = total - subtotal
    // where total = lineTotal and subtotal = lineTotal / (1 + taxRate)
    const subtotal = Math.round(lineTotal / (1 + taxRate));
    return lineTotal - subtotal;
  } else {
    // Tax is added to the subtotal
    return Math.round(lineTotal * taxRate);
  }
}

/**
 * Calculate bill-level discount
 */
export function calculateBillDiscount(subtotal: number, discount: BillDiscount): number {
  if (discount.type === 'PERCENTAGE') {
    return Math.round(subtotal * (discount.value / 100));
  } else {
    return Math.min(discount.value, subtotal);
  }
}

/**
 * Calculate total with tax and discounts
 */
export function calculateTotal(
  items: LineItem[],
  billDiscount?: BillDiscount,
  taxRate: number = 0.15
): {
  lineTotals: number[];
  subtotal: number;
  billDiscountAmount: number;
  taxAmount: number;
  total: number;
} {
  // Calculate line totals
  const lineTotals = items.map(calculateLineTotal);
  const subtotal = lineTotals.reduce((sum, total) => sum + total, 0);
  
  // Apply bill discount
  const billDiscountAmount = billDiscount ? calculateBillDiscount(subtotal, billDiscount) : 0;
  const subtotalAfterDiscount = subtotal - billDiscountAmount;
  
  // Calculate tax on discounted subtotal
  const taxAmount = Math.round(subtotalAfterDiscount * taxRate);
  
  // Final total
  const total = subtotalAfterDiscount + taxAmount;
  
  return {
    lineTotals,
    subtotal,
    billDiscountAmount,
    taxAmount,
    total
  };
}

/**
 * Format money for display
 */
export function formatMoney(cents: number, currency: string = 'LKR'): string {
  const dollars = fromCents(cents);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(dollars);
}

/**
 * Parse money input (handles various formats)
 */
export function parseMoneyInput(input: string | number): number {
  if (typeof input === 'number') {
    return toCents(input);
  }
  
  // Remove currency symbols and whitespace
  const cleaned = input.toString().replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  
  if (isNaN(parsed)) {
    throw new Error(`Invalid money format: ${input}`);
  }
  
  return toCents(parsed);
}

/**
 * Validate money amount
 */
export function validateMoney(amount: number): boolean {
  return Number.isInteger(amount) && amount >= 0;
}

/**
 * Test rounding edge cases
 */
export function testRounding(): void {
  console.log('Testing money rounding...');
  
  // Test .005 rounding
  console.log('0.005 ->', toCents(0.005), 'cents');
  console.log('0.004 ->', toCents(0.004), 'cents');
  console.log('0.006 ->', toCents(0.006), 'cents');
  
  // Test 3-line sums
  const items: LineItem[] = [
    { productId: 1, quantity: 1, unitPrice: toCents(1.00) },
    { productId: 2, quantity: 1, unitPrice: toCents(1.00) },
    { productId: 3, quantity: 1, unitPrice: toCents(1.00) }
  ];
  
  const result = calculateTotal(items);
  console.log('3 x $1.00 =', fromCents(result.total), 'dollars');
  
  // Test mixed tax
  const mixedItems: LineItem[] = [
    { productId: 1, quantity: 1, unitPrice: toCents(10.00), taxInclusive: false },
    { productId: 2, quantity: 1, unitPrice: toCents(10.00), taxInclusive: true }
  ];
  
  const mixedResult = calculateTotal(mixedItems, undefined, 0.15);
  console.log('Mixed tax calculation:', fromCents(mixedResult.total), 'dollars');
}
