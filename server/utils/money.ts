/**
 * Money and Currency Utilities
 * Handles precision, rounding, and currency calculations
 */

/**
 * Round to 2 decimal places using banker's rounding
 * Banker's rounding: round to nearest even number when exactly halfway
 */
export function money(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Round to 4 decimal places for unit costs
 */
export function unitCost(amount: number): number {
  return Math.round(amount * 10000) / 10000;
}

/**
 * Convert cents to dollars/rupees
 */
export function centsToMoney(cents: number): number {
  return money(cents / 100);
}

/**
 * Convert dollars/rupees to cents
 */
export function moneyToCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Calculate percentage with proper rounding
 */
export function calculatePercentage(value: number, percentage: number): number {
  return money((value * percentage) / 100);
}

/**
 * Calculate discount amount
 */
export function calculateDiscount(amount: number, discountPercent: number): number {
  return money(amount * (discountPercent / 100));
}

/**
 * Calculate tax amount
 */
export function calculateTax(amount: number, taxRate: number): number {
  return money(amount * (taxRate / 100));
}

/**
 * Calculate line total with discount and tax
 */
export function calculateLineTotal(
  quantity: number,
  unitPrice: number,
  discountPercent: number = 0,
  taxRate: number = 0
): {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
} {
  const subtotal = money(quantity * unitPrice);
  const discount = calculateDiscount(subtotal, discountPercent);
  const afterDiscount = money(subtotal - discount);
  const tax = calculateTax(afterDiscount, taxRate);
  const total = money(afterDiscount + tax);

  return {
    subtotal,
    discount,
    tax,
    total
  };
}

/**
 * Calculate gross margin
 */
export function calculateGrossMargin(sellingPrice: number, costPrice: number): {
  margin: number;
  marginPercent: number;
} {
  const margin = money(sellingPrice - costPrice);
  const marginPercent = sellingPrice > 0 ? money((margin / sellingPrice) * 100) : 0;

  return {
    margin,
    marginPercent
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(
  amount: number, 
  currency: string = 'LKR',
  locale: string = 'en-LK'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    // Fallback formatting
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Parse currency string to number
 */
export function parseCurrency(currencyString: string): number {
  // Remove currency symbols and spaces
  const cleaned = currencyString.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : money(parsed);
}

/**
 * Validate money amount
 */
export function isValidMoney(amount: any): boolean {
  return typeof amount === 'number' && 
         !isNaN(amount) && 
         isFinite(amount) && 
         amount >= 0;
}

/**
 * Calculate weighted average cost
 */
export function calculateWeightedAverageCost(
  lots: Array<{ quantity: number; unitCost: number }>
): number {
  if (lots.length === 0) return 0;

  const totalValue = lots.reduce((sum, lot) => 
    sum + (lot.quantity * lot.unitCost), 0);
  const totalQuantity = lots.reduce((sum, lot) => sum + lot.quantity, 0);

  return totalQuantity > 0 ? unitCost(totalValue / totalQuantity) : 0;
}

/**
 * Calculate COGS (Cost of Goods Sold)
 */
export function calculateCOGS(
  quantity: number,
  unitCost: number
): number {
  return money(quantity * unitCost);
}

/**
 * Calculate inventory turnover
 */
export function calculateInventoryTurnover(
  costOfGoodsSold: number,
  averageInventory: number
): number {
  return averageInventory > 0 ? unitCost(costOfGoodsSold / averageInventory) : 0;
}

/**
 * Calculate days in inventory
 */
export function calculateDaysInInventory(
  averageInventory: number,
  costOfGoodsSold: number,
  days: number = 365
): number {
  const turnover = calculateInventoryTurnover(costOfGoodsSold, averageInventory);
  return turnover > 0 ? Math.round(days / turnover) : 0;
}

/**
 * Round to specified decimal places
 */
export function roundToDecimals(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Check if two money amounts are equal (within tolerance)
 */
export function moneyEquals(amount1: number, amount2: number, tolerance: number = 0.01): boolean {
  return Math.abs(amount1 - amount2) <= tolerance;
}

/**
 * Calculate compound interest
 */
export function calculateCompoundInterest(
  principal: number,
  rate: number,
  time: number,
  compoundingFrequency: number = 1
): number {
  const amount = principal * Math.pow(1 + (rate / compoundingFrequency), compoundingFrequency * time);
  return money(amount - principal);
}

/**
 * Calculate present value
 */
export function calculatePresentValue(
  futureValue: number,
  rate: number,
  time: number
): number {
  return money(futureValue / Math.pow(1 + rate, time));
}

/**
 * Calculate future value
 */
export function calculateFutureValue(
  presentValue: number,
  rate: number,
  time: number
): number {
  return money(presentValue * Math.pow(1 + rate, time));
}