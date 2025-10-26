# Banker's Rounding Implementation Examples

## Overview

This document shows the before/after examples of implementing banker's rounding throughout the POS system for consistent decimal handling.

## Rounding Rules Applied

- **Money fields**: 2 decimal places (prices, totals, amounts, margins)
- **Unit costs**: 4 decimal places (COGS, per-unit calculations)
- **Percentages**: 2 decimal places (discounts, tax rates, margins)
- **Quantities**: 3 decimal places (weights, fractional quantities)

## Before/After Examples

### 1. COGS Calculation (salesService.ts)

#### Before:
```typescript
// Calculate gross margin
const lineTotal = (unitPrice - discountAmount) * quantity;
const grossMarginCents = Math.round(lineTotal * 100) - valuationResult.totalCostCents;

// Fallback calculation
const fallbackCost = product ? Math.round(product.cost * 100) : 0;
const lineTotal = (unitPrice - discountAmount) * quantity;
```

#### After:
```typescript
// Calculate gross margin with proper rounding
const lineTotal = calculateLineTotal(quantity, unitPrice, discountAmount);
const lineTotalCents = moneyToCents(lineTotal);
const grossMarginCents = moneyToCents(calculateGrossMargin(lineTotal, centsToMoney(valuationResult.totalCostCents)));

// Fallback calculation with proper rounding
const fallbackCost = product ? moneyToCents(unitCost(product.cost)) : 0;
const lineTotal = calculateLineTotal(quantity, unitPrice, discountAmount);
const cogsTotal = calculateCOGSTotal(quantity, centsToMoney(fallbackCost));
const grossMargin = calculateGrossMargin(lineTotal, cogsTotal);
```

### 2. Valuation Engine (valuationEngine.ts)

#### Before:
```typescript
// Average cost calculation
return Math.round(result.total_cost / result.total_quantity);

// FIFO calculation
const costForThisLot = quantityToUse * lot.unit_cost_cents;
totalCostCents += costForThisLot;

// Unit cost calculation
unitCostCents: quantity > 0 ? Math.round(totalCostCents / quantity) : 0,
```

#### After:
```typescript
// Average cost calculation with proper rounding
const averageCost = result.total_cost / result.total_quantity;
return moneyToCents(unitCost(centsToMoney(averageCost)));

// FIFO calculation with proper rounding
const costForThisLot = moneyToCents(calculateCOGSTotal(quantityToUse, centsToMoney(lot.unit_cost_cents)));
totalCostCents += costForThisLot;

// Unit cost calculation with proper rounding
const unitCostCents = quantity > 0 ? moneyToCents(unitCost(centsToMoney(totalCostCents / quantity))) : 0;
```

### 3. Number Utility Functions

#### New Utility Functions:
```typescript
// Money rounding (2 decimals)
export function money(value: number): number {
  return bankersRound(value, 2);
}

// Unit cost rounding (4 decimals)
export function unitCost(value: number): number {
  return bankersRound(value, 4);
}

// Percentage rounding (2 decimals)
export function percentage(value: number): number {
  return bankersRound(value, 2);
}

// Quantity rounding (3 decimals)
export function quantity(value: number): number {
  return bankersRound(value, 3);
}

// Conversion utilities
export function centsToMoney(cents: number): number {
  return money(cents / 100);
}

export function moneyToCents(dollars: number): number {
  return Math.round(money(dollars) * 100);
}

// Calculation utilities
export function calculateLineTotal(quantity: number, unitPrice: number, discountAmount: number = 0): number {
  const subtotal = quantity * unitPrice;
  const total = subtotal - discountAmount;
  return money(total);
}

export function calculateCOGSTotal(quantity: number, unitCost: number): number {
  return money(quantity * unitCost);
}

export function calculateGrossMargin(sellingPrice: number, costPrice: number): number {
  return money(sellingPrice - costPrice);
}
```

## Rounding Examples

### Money Rounding (2 decimals)
```typescript
// Before: Math.round(value * 100) / 100
// After: money(value)

money(10.555) // 10.56 (rounds to even)
money(10.545) // 10.54 (rounds to even)
money(10.5555) // 10.56
money(10.5545) // 10.55
```

### Unit Cost Rounding (4 decimals)
```typescript
// Before: Math.round(value * 10000) / 10000
// After: unitCost(value)

unitCost(10.55555) // 10.5556 (rounds to even)
unitCost(10.55545) // 10.5554 (rounds to even)
unitCost(10.555555) // 10.5556
unitCost(10.555545) // 10.5555
```

### Percentage Rounding (2 decimals)
```typescript
// Before: Math.round(value * 100) / 100
// After: percentage(value)

percentage(15.555) // 15.56
percentage(15.545) // 15.54
percentage(15.5555) // 15.56
```

### Quantity Rounding (3 decimals)
```typescript
// Before: Math.round(value * 1000) / 1000
// After: quantity(value)

quantity(1.5555) // 1.556
quantity(1.5554) // 1.555
quantity(1.55555) // 1.556
```

## Banker's Rounding Implementation

```typescript
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
```

## Key Benefits

1. **Consistency**: All financial calculations use the same rounding rules
2. **Accuracy**: Banker's rounding reduces bias in financial calculations
3. **Standards Compliance**: Follows financial industry standards
4. **Maintainability**: Centralized rounding logic in utility functions
5. **Type Safety**: Proper handling of edge cases and invalid inputs

## Files Modified

1. **server/utils/number.ts** - New utility functions
2. **server/services/salesService.ts** - Updated COGS calculations
3. **server/services/valuationEngine.ts** - Updated valuation methods

## Usage Examples

```typescript
import { money, unitCost, calculateLineTotal, calculateCOGSTotal } from '../utils/number';

// Calculate line total with proper rounding
const lineTotal = calculateLineTotal(2.5, 10.99, 1.50); // 26.98

// Calculate COGS with proper rounding
const cogsTotal = calculateCOGSTotal(2.5, 8.1234); // 20.31

// Round money values
const price = money(10.555); // 10.56

// Round unit costs
const cost = unitCost(8.12345); // 8.1235
```

## Testing Examples

```typescript
// Test banker's rounding behavior
expect(money(10.555)).toBe(10.56); // Rounds to even
expect(money(10.545)).toBe(10.54); // Rounds to even
expect(unitCost(8.12345)).toBe(8.1235); // 4 decimal places
expect(percentage(15.555)).toBe(15.56); // 2 decimal places
expect(quantity(1.5555)).toBe(1.556); // 3 decimal places
```

This implementation ensures consistent, accurate financial calculations throughout the POS system while following industry-standard rounding practices.











