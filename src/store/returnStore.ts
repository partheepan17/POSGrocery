/**
 * Return store for managing return/refund state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { roundCurrency } from '@/lib/currency';

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  item_id: number;
  name: string;
  sku: string;
  qty: number;
  retail_price: number;
  line_discount_type?: 'FIXED_AMOUNT' | 'PERCENTAGE';
  line_discount_value?: number;
  line_total: number;
  tax_amount: number;
}

export interface OriginalInvoice {
  id: number;
  receipt_no: string;
  created_at: string;
  price_tier: string;
  subtotal: number;
  item_discounts_total: number;
  manual_discount_value: number;
  manual_discount_type: string;
  tax_total: number;
  grand_total: number;
  payment_type: string;
  payment_ref: string;
  customer_id?: number;
  customer_name?: string;
  language: string;
  items: InvoiceItem[];
}

export interface AlreadyReturnedSummary {
  [invoice_item_id: number]: {
    qty: number;
    amount: number;
  };
}

export interface ReturnLine {
  invoice_item_id: number;
  item_id: number;
  name: string;
  sku: string;
  sold_qty: number;
  already_returned_qty: number;
  eligible_qty: number;
  return_qty: number;
  restock_flag: boolean;
  reason: string;
  refund_unit_estimate: number;
  refund_line_estimate: number;
}

export interface ReturnTotals {
  subtotal: number;
  tax: number;
  total: number;
}

export interface PrintablePayload {
  html?: string;
  escpos?: any;
}

export type RefundMethod = 'CASH' | 'CARD_REVERSAL' | 'WALLET_REVERSAL' | 'STORE_CREDIT';
export type PrintLanguage = 'en' | 'si' | 'ta';

interface ReturnState {
  // Lookup
  lookupValue: string;
  originalInvoice: OriginalInvoice | null;
  alreadyReturned: AlreadyReturnedSummary;
  
  // Return lines
  lines: ReturnLine[];
  
  // Refund details
  refundMethod: RefundMethod;
  refundRef: string;
  
  // Language
  language: PrintLanguage;
  
  // Totals
  totals: ReturnTotals;
  
  // Last return
  lastReturnReceiptNo?: string;
  printable?: PrintablePayload;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setLookupValue: (value: string) => void;
  setOriginalInvoice: (invoice: OriginalInvoice | null) => void;
  setAlreadyReturned: (summary: AlreadyReturnedSummary) => void;
  setLines: (lines: ReturnLine[]) => void;
  updateLine: (invoice_item_id: number, updates: Partial<ReturnLine>) => void;
  setRefundMethod: (method: RefundMethod) => void;
  setRefundRef: (ref: string) => void;
  setLanguage: (language: PrintLanguage) => void;
  calculateTotals: () => void;
  setLastReturn: (receiptNo: string, printable: PrintablePayload) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearReturn: () => void;
}

const initialTotals: ReturnTotals = {
  subtotal: 0,
  tax: 0,
  total: 0
};

export const useReturnStore = create<ReturnState>()(
  persist(
    (set, get) => ({
      // Initial state
      lookupValue: '',
      originalInvoice: null,
      alreadyReturned: {},
      lines: [],
      refundMethod: 'CASH',
      refundRef: '',
      language: 'en',
      totals: initialTotals,
      lastReturnReceiptNo: undefined,
      printable: undefined,
      isLoading: false,
      error: null,

      // Set lookup value
      setLookupValue: (value: string) => {
        set({ lookupValue: value });
      },

      // Set original invoice
      setOriginalInvoice: (invoice: OriginalInvoice | null) => {
        set({ originalInvoice: invoice });
      },

      // Set already returned summary
      setAlreadyReturned: (summary: AlreadyReturnedSummary) => {
        set({ alreadyReturned: summary });
      },

      // Set lines
      setLines: (lines: ReturnLine[]) => {
        set({ lines });
        get().calculateTotals();
      },

      // Update line
      updateLine: (invoice_item_id: number, updates: Partial<ReturnLine>) => {
        set(state => ({
          lines: state.lines.map(line => 
            line.invoice_item_id === invoice_item_id 
              ? { ...line, ...updates }
              : line
          )
        }));
        get().calculateTotals();
      },

      // Set refund method
      setRefundMethod: (method: RefundMethod) => {
        set({ refundMethod: method });
      },

      // Set refund reference
      setRefundRef: (ref: string) => {
        set({ refundRef: ref });
      },

      // Set language
      setLanguage: (language: PrintLanguage) => {
        set({ language });
        localStorage.setItem('printLanguage', language);
      },

      // Calculate totals
      calculateTotals: () => {
        const state = get();
        const lines = state.lines;
        
        // Calculate subtotal
        const subtotal = lines.reduce((sum, line) => {
          return sum + line.refund_line_estimate;
        }, 0);

        // Calculate tax proportionally
        let tax = 0;
        if (state.originalInvoice && state.originalInvoice.tax_total > 0) {
          const originalSubtotalAfterManual = state.originalInvoice.subtotal - 
            state.originalInvoice.item_discounts_total - 
            state.originalInvoice.manual_discount_value;
          
          if (originalSubtotalAfterManual > 0) {
            const taxRatio = state.originalInvoice.tax_total / originalSubtotalAfterManual;
            tax = roundCurrency(subtotal * taxRatio);
          }
        }

        const total = roundCurrency(subtotal + tax);

        set({
          totals: {
            subtotal: roundCurrency(subtotal),
            tax: roundCurrency(tax),
            total: roundCurrency(total)
          }
        });
      },

      // Set last return
      setLastReturn: (receiptNo: string, printable: PrintablePayload) => {
        set({ 
          lastReturnReceiptNo: receiptNo,
          printable 
        });
      },

      // Set loading
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      // Set error
      setError: (error: string | null) => {
        set({ error });
      },

      // Clear return
      clearReturn: () => {
        set({
          lookupValue: '',
          originalInvoice: null,
          alreadyReturned: {},
          lines: [],
          refundMethod: 'CASH',
          refundRef: '',
          totals: initialTotals,
          lastReturnReceiptNo: undefined,
          printable: undefined,
          isLoading: false,
          error: null
        });
      }
    }),
    {
      name: 'pos-return-storage',
      partialize: (state) => ({
        language: state.language
      })
    }
  )
);

