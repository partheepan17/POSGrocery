/**
 * Global settings configuration
 * Centralized configuration for tax rate, timezone, and other system settings
 */

export const SETTINGS = {
  TAX_RATE: typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process.env?.VITE_TAX_RATE
    ? Number((globalThis as any).process.env.VITE_TAX_RATE)
    : 0.15, // default 15%
  TIMEZONE: (typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process.env?.VITE_TZ) || 'Asia/Colombo',
  PRICING: {
    requireManagerIfBelowCost: false,
    requireManagerIfBelowMinMarginPercent: null as number | null,
    perBillDisableIncludesFixedPrices: false
  }
};

