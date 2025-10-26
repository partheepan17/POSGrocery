# Special Pricing Profiles — Admin Guide

## Overview
Customer-Aware Pricing lets you assign Special Pricing Profiles to customers to apply fixed prices or discounts before global promotions.

## Creating Profiles
- Go to Special Pricing Profiles
- Create profile (name, active, optional “Allow stack with global”)
- Add entries in tabs: Products, Groups, Suppliers
  - Fields: Target, Rule Type (Fixed Price | % Discount | Fixed Discount), Value, Date Range, Active, Stack Mode (Exclusive|Additive), Quantity Rule (On/Off), Channel (Retail|Wholesale|Both)
- CSV Import/Export supported
  - Template: `profiles_entries.csv` (see examples)

## Conflict Rules
- Fixed Price wins inside profile; optionally stack with global if profile allows
- Discounts obey priority Product > Group > Supplier
- Exclusive vs Additive: Exclusive picks highest priority; Additive sums with cap at subtotal
- Overlapping Exclusive entries for same target are disallowed

## Quantity Rule
- Applies only if all contributing rules allow and per-bill is not disabled
- Global Quantity Rule toggle applies system-wide

## Channel Advisory
- Customer Type may differ from bill channel; show an advisory badge

## Safety Guard
- Optional manager approval if result < cost or below min margin (Settings: PRICING.requireManagerIfBelowCost / requireManagerIfBelowMinMarginPercent)
- Per-bill disable discounts doesn’t remove Fixed Prices by default (Settings: PRICING.perBillDisableIncludesFixedPrices)

## Reports
- Customer Price Exceptions: where special prices beat global by amount/%
- Profile Coverage: % of purchased SKUs covered
- CSV exports available; audits written as `discounts.report_exported`

## Audits
- Lifecycle: `discounts.profile_created`, `discounts.profile_updated`, `discounts.profile_deleted_soft`
- POS applications: `discounts.special_price_applied`, `discounts.special_discount_applied`
- Other audits under `discounts.*` and `pricing.*`








