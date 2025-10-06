/**
 * Global settings configuration
 * Centralized configuration for tax rate, timezone, and other system settings
 */

export const SETTINGS = {
  TAX_RATE: typeof process !== 'undefined' && process.env?.VITE_TAX_RATE
    ? Number(process.env.VITE_TAX_RATE)
    : 0.15, // default 15%
  TIMEZONE: (typeof process !== 'undefined' && process.env?.VITE_TZ) || 'Asia/Colombo'
};

