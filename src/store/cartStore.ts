/**
 * Cart state management for POS system
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { roundCurrency } from '@/lib/currency';
import { SETTINGS } from '@/config/settings';
import { pricingService } from '@/services/pricingService';
import { discountEngine } from '@/services/discountEngine';
import { dataService } from '@/services/dataService';

export interface CartItem {
  id: string;
  product_id: number;
  name: string;
  sku: string;
  qty: number;
  retail_price: number;
  wholesale_price: number;
  credit_price: number;
  other_price: number;
  current_price: number;
  line_discount_type?: 'FIXED_AMOUNT' | 'PERCENTAGE';
  line_discount_value?: number;
  line_total: number;
  tax_amount: number;
  unit: string;
  stock_qty?: number;
  category_id?: number;
  product?: any;
}

export interface ManualDiscount {
  type: 'FIXED_AMOUNT' | 'PERCENTAGE';
  value: number;
}

export interface CartTotals {
  gross: number;
  item_discounts_total: number;
  manual_discount_amount: number;
  subtotal_after_discounts: number;
  tax_total: number;
  net_total: number;
}

export type PriceTier = 'Retail' | 'Wholesale' | 'Credit' | 'Other';

interface CartState {
  // Cart items
  items: CartItem[];
  
  // Current settings
  priceTier: PriceTier;
  customerId: number | null;
  customerName: string;
  
  // Manual discount
  manualDiscount: ManualDiscount;
  
  // Totals
  totals: CartTotals;
  
  // Tax rate
  taxRate: number;
  
  // Actions
  addItem: (product: any, qty?: number) => Promise<void> | void;
  updateItemQuantity: (itemId: string, qty: number) => Promise<void> | void;
  removeItem: (itemId: string) => void;
  updateItemDiscount: (itemId: string, type: 'FIXED_AMOUNT' | 'PERCENTAGE', value: number) => void;
  setPriceTier: (tier: PriceTier) => void;
  setCustomer: (customerId: number | null, customerName: string) => void;
  setManualDiscount: (discount: ManualDiscount) => void;
  clearCart: () => void;
  calculateTotals: () => void;
  recomputeAutoDiscounts: () => Promise<void> | void;
  getCurrentPrice: (product: any, tier?: PriceTier) => number;
}

const initialTotals: CartTotals = {
  gross: 0,
  item_discounts_total: 0,
  manual_discount_amount: 0,
  subtotal_after_discounts: 0,
  tax_total: 0,
  net_total: 0
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      // Initial state
      items: [],
      priceTier: 'Retail',
      customerId: null,
      customerName: 'Walk-in Customer (Retail)',
      manualDiscount: { type: 'FIXED_AMOUNT', value: 0 },
      totals: initialTotals,
      taxRate: SETTINGS.TAX_RATE, // FIX: Use centralized tax rate from settings

      // Add item to cart
      addItem: async (product: any, qty: number = 1) => {
        const state = get();
        const existingItem = state.items.find(item => item.product_id === product.id);
        
        if (existingItem) {
          // Update existing item quantity
          const newQty = roundCurrency(existingItem.qty + qty); // allow fractional
          await state.updateItemQuantity(existingItem.id, newQty);
        } else {
          // Add new item
          const itemId = `${product.id}_${Date.now()}`;
          const currentPrice = state.getCurrentPrice(product);
          
          const newItem: CartItem = {
            id: itemId,
            product_id: product.id,
            name: product.name_en,
            sku: product.sku,
            qty: roundCurrency(qty),
            retail_price: product.price_retail,
            wholesale_price: product.price_wholesale,
            credit_price: product.price_credit,
            other_price: product.price_other || product.price_retail,
            current_price: currentPrice,
            line_total: roundCurrency(qty * currentPrice),
            tax_amount: 0,
            unit: product.unit,
            stock_qty: product.stock_qty,
            category_id: Number(product.category_id),
            product
          };

          set(state => ({
            items: [...state.items, newItem]
          }));

          await get().recomputeAutoDiscounts();
        }
      },

      // Update item quantity
      updateItemQuantity: async (itemId: string, qty: number) => {
        if (qty <= 0) {
          get().removeItem(itemId);
          return;
        }

        // Try tiered pricing recompute
        try {
          const state = get();
          const target = state.items.find(i => i.id === itemId);
          if (target) {
            const result = await pricingService.compute({
              product_id: target.product_id,
              qty,
              base_price: target.retail_price,
              customer_type: state.customerName.includes('Wholesale') ? 'Wholesale' : 'Retail'
            });
            set(s => ({
              items: s.items.map(item => {
                if (item.id === itemId) {
                  const unitPrice = result.unit_price || item.current_price;
                  const lineTotal = roundCurrency(qty * unitPrice);
                  const lineDiscount = item.line_discount_value || 0;
                  const finalLineTotal = roundCurrency(lineTotal - lineDiscount);
                  return { ...item, qty, current_price: unitPrice, line_total: finalLineTotal };
                }
                return item;
              })
            }));
          }
        } catch (_) {
          // fallback to simple recompute
          set(state => ({
            items: state.items.map(item => {
              if (item.id === itemId) {
                const lineTotal = roundCurrency(qty * item.current_price);
                const lineDiscount = item.line_discount_value || 0;
                const finalLineTotal = roundCurrency(lineTotal - lineDiscount);
                return { ...item, qty, line_total: finalLineTotal };
              }
              return item;
            })
          }));
        }

        await get().recomputeAutoDiscounts();
      },

      // Remove item from cart
      removeItem: (itemId: string) => {
        set(state => ({
          items: state.items.filter(item => item.id !== itemId)
        }));

        get().calculateTotals();
      },

      // Update item discount
      updateItemDiscount: (itemId: string, type: 'FIXED_AMOUNT' | 'PERCENTAGE', value: number) => {
        set(state => ({
          items: state.items.map(item => {
            if (item.id === itemId) {
              const lineTotal = item.qty * item.current_price;
              let discountAmount = 0;
              
              if (type === 'PERCENTAGE') {
                discountAmount = roundCurrency(lineTotal * (value / 100));
              } else {
                discountAmount = Math.min(value, lineTotal);
              }
              
              const finalLineTotal = roundCurrency(lineTotal - discountAmount);
              
              return {
                ...item,
                line_discount_type: type,
                line_discount_value: discountAmount,
                line_total: finalLineTotal
              };
            }
            return item;
          })
        }));

        get().calculateTotals();
      },

      // Set price tier
      setPriceTier: (tier: PriceTier) => {
        set(state => ({
          priceTier: tier,
          items: state.items.map(item => {
            const newPrice = state.getCurrentPrice({
              price_retail: item.retail_price,
              price_wholesale: item.wholesale_price,
              price_credit: item.credit_price,
              price_other: item.other_price
            }, tier);
            
            const lineTotal = roundCurrency(item.qty * newPrice);
            const lineDiscount = item.line_discount_value || 0;
            const finalLineTotal = roundCurrency(lineTotal - lineDiscount);
            
            return {
              ...item,
              current_price: newPrice,
              line_total: finalLineTotal,
              // Clear line discounts when switching away from Retail
              line_discount_type: tier === 'Retail' ? item.line_discount_type : undefined,
              line_discount_value: tier === 'Retail' ? item.line_discount_value : 0
            };
          })
        }));

        get().calculateTotals();
      },

      // Set customer
      setCustomer: (customerId: number | null, customerName: string) => {
        set({ customerId, customerName });
      },

      // Set manual discount
      setManualDiscount: (discount: ManualDiscount) => {
        set({ manualDiscount: discount });
        get().calculateTotals();
      },

      // Clear cart
      clearCart: () => {
        set({
          items: [],
          manualDiscount: { type: 'FIXED_AMOUNT', value: 0 },
          totals: initialTotals
        });
      },

      // Calculate totals
      calculateTotals: () => {
        const state = get();
        
        // Calculate gross total
        const gross = state.items.reduce((sum, item) => sum + (item.qty * item.current_price), 0);
        
        // Calculate item discounts total
        const item_discounts_total = state.items.reduce((sum, item) => sum + (item.line_discount_value || 0), 0);
        
        // Calculate manual discount
        let manual_discount_amount = 0;
        if (state.manualDiscount.value > 0) {
          const subtotal_after_item_discounts = gross - item_discounts_total;
          if (state.manualDiscount.type === 'PERCENTAGE') {
            manual_discount_amount = roundCurrency(subtotal_after_item_discounts * (state.manualDiscount.value / 100));
          } else {
            manual_discount_amount = Math.min(state.manualDiscount.value, subtotal_after_item_discounts);
          }
        }
        
        // Calculate subtotal after all discounts
        const subtotal_after_discounts = roundCurrency(gross - item_discounts_total - manual_discount_amount);
        
        // Calculate tax
        const tax_total = roundCurrency(subtotal_after_discounts * state.taxRate);
        
        // Calculate net total
        const net_total = roundCurrency(subtotal_after_discounts + tax_total);
        
        set({
          totals: {
            gross: roundCurrency(gross),
            item_discounts_total: roundCurrency(item_discounts_total),
            manual_discount_amount: roundCurrency(manual_discount_amount),
            subtotal_after_discounts: roundCurrency(subtotal_after_discounts),
            tax_total: roundCurrency(tax_total),
            net_total: roundCurrency(net_total)
          }
        });
      },

      // Recompute automatic discounts via discount engine
      recomputeAutoDiscounts: async () => {
        const state = get();
        const items = state.items;
        if (items.length === 0) {
          state.calculateTotals();
          return;
        }

        const productIds = items.map(i => Number(i.product_id));
        const categoryIds = Array.from(new Set(items.map(i => Number(i.category_id || i.product?.category_id)))) as number[];
        let rules = await dataService.getEffectiveDiscountRules(productIds, categoryIds);

        const lines = items.map((it, idx) => ({
          id: idx + 1,
          product_id: Number(it.product_id),
          product: it.product || { sku: it.sku, category_id: it.category_id, price_retail: it.retail_price },
          qty: Number(it.qty),
          unit_price: Number(it.current_price),
          retail_price: Number(it.retail_price),
          line_discount: Number(it.line_discount_value || 0),
          tax: Number(it.tax_amount || 0),
          total: Number(it.line_total || (it.qty * it.current_price))
        }));

        const result = await discountEngine.applyRulesToCart({ lines, rules });

        set(s => ({
          items: s.items.map((it, idx) => {
            const line = result.lines[idx];
            const finalLineTotal = (line.unit_price * line.qty) - line.line_discount + line.tax;
            return { ...it, line_discount_value: line.line_discount, line_total: roundCurrency(finalLineTotal) } as CartItem;
          })
        }));

        set({
          totals: {
            gross: result.totals.gross,
            item_discounts_total: result.totals.itemDiscounts,
            manual_discount_amount: 0,
            subtotal_after_discounts: roundCurrency(result.totals.gross - result.totals.itemDiscounts),
            tax_total: result.totals.tax,
            net_total: result.totals.net
          }
        });
      },

      // Helper function to get current price based on tier (will be enhanced by pricing engine later)
      getCurrentPrice: (product: any, tier?: PriceTier) => {
        const currentTier = tier || get().priceTier;
        switch (currentTier) {
          case 'Wholesale':
            return product.price_wholesale;
          case 'Credit':
            return product.price_credit;
          case 'Other':
            return product.price_other || product.price_retail;
          default:
            return product.price_retail;
        }
      }
    }),
    {
      name: 'pos-cart-storage',
      partialize: (state) => ({
        items: state.items,
        priceTier: state.priceTier,
        customerId: state.customerId,
        customerName: state.customerName,
        manualDiscount: state.manualDiscount
      })
    }
  )
);
