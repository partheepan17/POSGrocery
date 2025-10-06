/**
 * Currency utilities for LKR (Sri Lankan Rupee)
 */

export const CURRENCY_SYMBOL = 'රු';
export const CURRENCY_CODE = 'LKR';

/**
 * Format amount as LKR currency
 */
export function formatCurrency(amount: number): string {
  return `${CURRENCY_SYMBOL} ${amount.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/**
 * Format amount without symbol
 */
export function formatAmount(amount: number): string {
  return amount.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Parse currency string to number
 */
export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Round to 2 decimal places using half-up rounding
 */
export function roundCurrency(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate tax amount
 */
export function calculateTax(subtotal: number, taxRate: number = 0.15): number {
  return roundCurrency(subtotal * taxRate);
}

/**
 * Calculate change amount
 */
export function calculateChange(tendered: number, total: number): number {
  return Math.max(0, roundCurrency(tendered - total));
}

