/**
 * Validation utilities for POS system
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate quantity
 */
export function validateQuantity(qty: number): ValidationResult {
  if (qty <= 0) {
    return { isValid: false, error: 'Quantity must be greater than 0' };
  }
  if (qty > 9999) {
    return { isValid: false, error: 'Quantity too large' };
  }
  return { isValid: true };
}

/**
 * Validate percentage discount
 */
export function validatePercentageDiscount(percent: number): ValidationResult {
  if (percent < 0) {
    return { isValid: false, error: 'Percentage cannot be negative' };
  }
  if (percent > 100) {
    return { isValid: false, error: 'Percentage cannot exceed 100%' };
  }
  return { isValid: true };
}

/**
 * Validate fixed amount discount
 */
export function validateFixedDiscount(amount: number, maxAmount: number): ValidationResult {
  if (amount < 0) {
    return { isValid: false, error: 'Discount amount cannot be negative' };
  }
  if (amount > maxAmount) {
    return { isValid: false, error: `Discount cannot exceed ${maxAmount}` };
  }
  return { isValid: true };
}

/**
 * Validate payment reference
 */
export function validatePaymentReference(ref: string, paymentType: string): ValidationResult {
  if (paymentType === 'CARD' || paymentType === 'WALLET') {
    if (!ref || ref.trim().length === 0) {
      return { isValid: false, error: 'Reference number is required for card/wallet payments' };
    }
    if (ref.trim().length < 3) {
      return { isValid: false, error: 'Reference number too short' };
    }
  }
  return { isValid: true };
}

/**
 * Validate customer selection for credit payments
 */
export function validateCustomerForCredit(customerId: number | null): ValidationResult {
  if (customerId === null || customerId === 0) {
    return { isValid: false, error: 'Customer selection required for credit payments' };
  }
  return { isValid: true };
}

/**
 * Validate tendered amount
 */
export function validateTenderedAmount(tendered: number, total: number): ValidationResult {
  if (tendered < 0) {
    return { isValid: false, error: 'Tendered amount cannot be negative' };
  }
  if (tendered < total) {
    return { isValid: false, error: 'Tendered amount is less than total' };
  }
  return { isValid: true };
}

/**
 * Validate barcode format
 */
export function validateBarcode(barcode: string): ValidationResult {
  if (!barcode || barcode.trim().length === 0) {
    return { isValid: false, error: 'Barcode cannot be empty' };
  }
  if (barcode.length < 3) {
    return { isValid: false, error: 'Barcode too short' };
  }
  if (barcode.length > 50) {
    return { isValid: false, error: 'Barcode too long' };
  }
  return { isValid: true };
}

/**
 * Validate product search query
 */
export function validateSearchQuery(query: string): ValidationResult {
  if (!query || query.trim().length === 0) {
    return { isValid: false, error: 'Search query cannot be empty' };
  }
  if (query.trim().length < 2) {
    return { isValid: false, error: 'Search query too short' };
  }
  return { isValid: true };
}

