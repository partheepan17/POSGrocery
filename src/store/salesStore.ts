import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Sale, SaleItem, Product, Customer } from '@/types';
import { calculateTotal, calculateDiscount } from '@/utils/currency';

interface SalesState {
  // Current sale
  currentSale: Sale | null;
  saleItems: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  customer: Customer | null;
  paymentMethod: 'cash' | 'card' | 'mobile';
  
  // Sale history
  sales: Sale[];
  heldSales: Sale[];
  
  // Actions
  startNewSale: () => void;
  addItem: (product: Product, quantity: number) => void;
  updateItemQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  applyDiscount: (type: 'percentage' | 'fixed', value: number) => void;
  setCustomer: (customer: Customer | null) => void;
  setPaymentMethod: (method: 'cash' | 'card' | 'mobile') => void;
  processPayment: () => Promise<void>;
  voidSale: () => void;
  holdSale: () => void;
  recallSale: (saleId: string) => void;
  clearCurrentSale: () => void;
  recalculateTotals: () => void;
}

export const useSalesStore = create<SalesState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentSale: null,
      saleItems: [],
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0,
      customer: null,
      paymentMethod: 'cash',
      sales: [],
      heldSales: [],

      // Actions
      startNewSale: () => {
        const newSale: Sale = {
          id: `sale_${Date.now()}`,
          items: [],
          subtotal: 0,
          discount: 0,
          tax: 0,
          total: 0,
          paymentMethod: 'cash',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        set({
          currentSale: newSale,
          saleItems: [],
          subtotal: 0,
          discount: 0,
          tax: 0,
          total: 0,
          customer: null,
          paymentMethod: 'cash',
        });
      },

      addItem: (product, quantity) => {
        const { saleItems } = get();
        const existingItem = saleItems.find(item => item.productId === product.id);
        
        if (existingItem) {
          // Update existing item quantity
          const updatedItems = saleItems.map(item =>
            item.productId === product.id
              ? {
                  ...item,
                  quantity: item.quantity + quantity,
                  total: (item.quantity + quantity) * item.unitPrice,
                }
              : item
          );
          set({ saleItems: updatedItems });
        } else {
          // Add new item
          const newItem: SaleItem = {
            productId: product.id,
            product,
            quantity,
            unitPrice: product.price || 0,
            discount: 0,
            total: (product.price || 0) * quantity,
          };
          set({ saleItems: [...saleItems, newItem] });
        }
        
        get().recalculateTotals();
      },

      updateItemQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        const { saleItems } = get();
        const updatedItems = saleItems.map(item =>
          item.productId === productId
            ? {
                ...item,
                quantity,
                total: quantity * item.unitPrice - item.discount,
              }
            : item
        );
        
        set({ saleItems: updatedItems });
        get().recalculateTotals();
      },

      removeItem: (productId) => {
        const { saleItems } = get();
        const updatedItems = saleItems.filter(item => item.productId !== productId);
        set({ saleItems: updatedItems });
        get().recalculateTotals();
      },

      applyDiscount: (type, value) => {
        const { subtotal } = get();
        const discount = calculateDiscount(subtotal, type, value);
        set({ discount });
        get().recalculateTotals();
      },

      setCustomer: (customer) => set({ customer }),

      setPaymentMethod: (method) => set({ paymentMethod: method }),

      processPayment: async () => {
        const { currentSale, saleItems, subtotal, discount, tax, total, customer, paymentMethod } = get();
        
        if (!currentSale || saleItems.length === 0) {
          throw new Error('No items in sale');
        }

        const completedSale: Sale = {
          ...currentSale,
          items: saleItems,
          subtotal,
          discount,
          tax,
          total,
          customerId: customer?.id,
          customer: customer || undefined,
          paymentMethod,
          status: 'completed',
          updatedAt: new Date(),
        };

        // Add to sales history
        set((state) => ({
          sales: [...state.sales, completedSale],
        }));

        // Clear current sale
        get().clearCurrentSale();
      },

      voidSale: () => {
        const { currentSale } = get();
        if (currentSale) {
          const voidedSale: Sale = {
            ...currentSale,
            status: 'cancelled',
            updatedAt: new Date(),
          };
          
          set((state) => ({
            sales: [...state.sales, voidedSale],
          }));
        }
        
        get().clearCurrentSale();
      },

      holdSale: () => {
        const { currentSale, saleItems, subtotal, discount, tax, total, customer, paymentMethod } = get();
        
        if (!currentSale || saleItems.length === 0) {
          throw new Error('No items in sale');
        }

        const heldSale: Sale = {
          ...currentSale,
          items: saleItems,
          subtotal,
          discount,
          tax,
          total,
          customerId: customer?.id,
          customer: customer || undefined,
          paymentMethod,
          status: 'pending',
          updatedAt: new Date(),
        };

        set((state) => ({
          heldSales: [...state.heldSales, heldSale],
        }));

        get().clearCurrentSale();
      },

      recallSale: (saleId) => {
        const { heldSales } = get();
        const sale = heldSales.find(s => s.id === saleId);
        
        if (sale) {
          set({
            currentSale: sale,
            saleItems: sale.items,
            subtotal: sale.subtotal,
            discount: sale.discount,
            tax: sale.tax,
            total: sale.total,
            customer: sale.customer || null,
            paymentMethod: sale.paymentMethod,
          });
        }
      },

      clearCurrentSale: () => {
        set({
          currentSale: null,
          saleItems: [],
          subtotal: 0,
          discount: 0,
          tax: 0,
          total: 0,
          customer: null,
          paymentMethod: 'cash',
        });
      },

      recalculateTotals: () => {
        const { saleItems, discount } = get();
        const subtotal = saleItems.reduce((sum, item) => sum + item.total, 0);
        const tax = subtotal * 0.15; // 15% tax rate
        const total = calculateTotal(subtotal, discount, tax);
        
        set({ subtotal, tax, total });
      },
    }),
    {
      name: 'grocery-pos-sales',
      partialize: (state) => ({
        sales: state.sales,
        heldSales: state.heldSales,
      }),
    }
  )
);
