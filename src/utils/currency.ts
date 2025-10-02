import { RoundingMode } from '@/types';

export const LKR_SYMBOL = 'රු';
export const LKR_CODE = 'LKR';

export const ROUNDING_OPTIONS = {
  nearest: {
    1.00: 1,
    0.50: 0.5,
    0.10: 0.1,
    0.05: 0.05,
    0.01: 0.01,
  },
  up: {
    1.00: 1,
    0.50: 0.5,
    0.10: 0.1,
    0.05: 0.05,
    0.01: 0.01,
  },
  down: {
    1.00: 1,
    0.50: 0.5,
    0.10: 0.1,
    0.05: 0.05,
    0.01: 0.01,
  },
} as const;

export function formatCurrency(
  amount: number,
  options: {
    symbol?: string;
    showSymbol?: boolean;
    roundingMode?: RoundingMode;
    roundingValue?: number;
    locale?: string;
  } = {}
): string {
  const {
    symbol = LKR_SYMBOL,
    showSymbol = true,
    roundingMode = 'nearest',
    roundingValue = 0.01,
    locale = 'si-LK'
  } = options;

  let roundedAmount = amount;

  if (roundingMode === 'nearest') {
    roundedAmount = Math.round(amount / roundingValue) * roundingValue;
  } else if (roundingMode === 'up') {
    roundedAmount = Math.ceil(amount / roundingValue) * roundingValue;
  } else if (roundingMode === 'down') {
    roundedAmount = Math.floor(amount / roundingValue) * roundingValue;
  }

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: roundingValue < 1 ? 2 : 0,
    maximumFractionDigits: roundingValue < 1 ? 2 : 0,
  }).format(roundedAmount);

  return showSymbol ? `${symbol} ${formatted}` : formatted;
}

export function parseCurrency(value: string): number {
  // Remove currency symbols and spaces
  const cleaned = value.replace(/[රු\s,]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function calculateDiscount(
  amount: number,
  discountType: 'percentage' | 'fixed',
  discountValue: number
): number {
  if (discountType === 'percentage') {
    return (amount * discountValue) / 100;
  }
  return Math.min(discountValue, amount);
}

export function calculateTax(amount: number, taxRate: number): number {
  return (amount * taxRate) / 100;
}

export function calculateTotal(
  subtotal: number,
  discount: number,
  tax: number
): number {
  return subtotal - discount + tax;
}

export function roundToNearest(value: number, nearest: number): number {
  return Math.round(value / nearest) * nearest;
}

export function roundUp(value: number, nearest: number): number {
  return Math.ceil(value / nearest) * nearest;
}

export function roundDown(value: number, nearest: number): number {
  return Math.floor(value / nearest) * nearest;
}

export const CURRENCY_FORMATTERS = {
  en: (amount: number) => formatCurrency(amount, { locale: 'en-LK' }),
  si: (amount: number) => formatCurrency(amount, { locale: 'si-LK' }),
  ta: (amount: number) => formatCurrency(amount, { locale: 'ta-LK' }),
} as const;

