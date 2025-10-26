/**
 * Number utilities for consistent decimal handling
 * Implements banker's rounding for financial calculations
 */

/**
 * Banker's rounding (round half to even) implementation
 * This is the standard rounding method for financial calculations
 */
function bankersRound(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  const rounded = Math.round(value * factor) / factor;
  
  // Handle the special case of .5 - round to even
  const remainder = (value * factor) % 1;
  if (Math.abs(remainder - 0.5) < Number.EPSILON) {
    const integerPart = Math.floor(value * factor);
    return (integerPart % 2 === 0 ? integerPart : integerPart + 1) / factor;
  }
  
  return rounded;
}

/**
 * Round money values to 2 decimal places using banker's rounding
 * Used for: prices, totals, amounts, margins
 */
export function money(value: number): number {
  if (typeof value !== 'number' || isNaN(value)) {
    return 0;
  }
  return bankersRound(value, 2);
}

/**
 * Round unit cost values to 4 decimal places using banker's rounding
 * Used for: unit costs, COGS, per-unit calculations
 */
export function unitCost(value: number): number {
  if (typeof value !== 'number' || isNaN(value)) {
    return 0;
  }
  return bankersRound(value, 4);
}

/**
 * Round percentage values to 2 decimal places using banker's rounding
 * Used for: discount percentages, tax rates, margins
 */
export function percentage(value: number): number {
  if (typeof value !== 'number' || isNaN(value)) {
    return 0;
  }
  return bankersRound(value, 2);
}

/**
 * Round quantity values to 3 decimal places using banker's rounding
 * Used for: weights, quantities with fractional parts
 */
export function quantity(value: number): number {
  if (typeof value !== 'number' || isNaN(value)) {
    return 0;
  }
  return bankersRound(value, 3);
}

/**
 * Convert cents to dollars with proper rounding
 */
export function centsToMoney(cents: number): number {
  return money(cents / 100);
}

/**
 * Convert dollars to cents with proper rounding
 */
export function moneyToCents(dollars: number): number {
  return Math.round(money(dollars) * 100);
}

/**
 * Calculate percentage with proper rounding
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return percentage((part / total) * 100);
}

/**
 * Calculate gross margin with proper rounding
 */
export function calculateGrossMargin(sellingPrice: number, costPrice: number): number {
  return money(sellingPrice - costPrice);
}

/**
 * Calculate gross margin percentage with proper rounding
 */
export function calculateGrossMarginPercentage(sellingPrice: number, costPrice: number): number {
  if (sellingPrice === 0) return 0;
  return percentage(((sellingPrice - costPrice) / sellingPrice) * 100);
}

/**
 * Calculate line total with proper rounding
 */
export function calculateLineTotal(quantity: number, unitPrice: number, discountAmount: number = 0): number {
  const subtotal = quantity * unitPrice;
  const total = subtotal - discountAmount;
  return money(total);
}

/**
 * Calculate COGS total with proper rounding
 */
export function calculateCOGSTotal(quantity: number, unitCost: number): number {
  return money(quantity * unitCost);
}

/**
 * Validate and sanitize number input
 */
export function sanitizeNumber(value: any, defaultValue: number = 0): number {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  return defaultValue;
}

/**
 * Format number for display with proper decimal places
 */
export function formatMoney(value: number): string {
  return money(value).toFixed(2);
}

export function formatUnitCost(value: number): string {
  return unitCost(value).toFixed(4);
}

export function formatPercentage(value: number): string {
  return percentage(value).toFixed(2) + '%';
}

export function formatQuantity(value: number): string {
  return quantity(value).toFixed(3);
}











