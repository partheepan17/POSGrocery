import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { keyboardManager, POS_SHORTCUTS } from '@/lib/keyboard';
import { toast } from 'react-hot-toast';
import { queueOperations } from '@/lib/offlineQueue';
import { QuickSalesProvider, useQuickSales } from '@/contexts/QuickSalesContext';
import { QuickSalesStatusChip } from '@/components/QuickSales/QuickSalesStatusChip';
import { YesterdaySessionBanner } from '@/components/QuickSales/YesterdaySessionBanner';

// Components
import { SearchScan } from '@/components/pos/SearchScan';
import { CustomerSelect } from '@/components/pos/CustomerSelect';
import { PriceTierBar } from '@/components/pos/PriceTierBar';
import { Cart } from '@/components/pos/Cart';
import { CartSummary } from '@/components/pos/CartSummary';
import { QuickActions } from '@/components/pos/QuickActions';
import { PrintPreviewModal } from '@/components/pos/PrintPreviewModal';
import { ReprintModal } from '@/components/pos/ReprintModal';
// Quick tender removed per UX request

// Payment Modal Component
import { PaymentModal } from '@/components/pos/PaymentModal';

function SalesPageContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState<string>('');
  const [showHeldModal, setShowHeldModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showReprintModal, setShowReprintModal] = useState(false);
  const [printData, setPrintData] = useState<any | null>(null);
  const [showYesterdayBanner, setShowYesterdayBanner] = useState(false);
  
  const { showYesterdayBanner: contextShowBanner, setShowYesterdayBanner: setContextShowBanner } = useQuickSales();

  const { 
    items, 
    totals, 
    priceTier, 
    customerId, 
    customerName,
    clearCart 
  } = useCartStore();
  
  const { 
    userRole, 
    userName, 
    terminalId, 
    printLanguage,
    updateTime 
  } = useUIStore();


  // Keyboard shortcuts
  useEffect(() => {
    // Navigation shortcuts
    keyboardManager.register({
      ...POS_SHORTCUTS.SALES,
      action: () => navigate('/pos')
    });

    keyboardManager.register({
      ...POS_SHORTCUTS.PRODUCTS,
      action: () => navigate('/products')
    });

    keyboardManager.register({
      ...POS_SHORTCUTS.PRICE_MANAGEMENT,
      action: () => navigate('/pricing')
    });

    keyboardManager.register({
      ...POS_SHORTCUTS.SUPPLIERS,
      action: () => navigate('/suppliers')
    });

    keyboardManager.register({
      ...POS_SHORTCUTS.CUSTOMERS,
      action: () => navigate('/customers')
    });

    keyboardManager.register({
      ...POS_SHORTCUTS.DISCOUNTS,
      action: () => navigate('/discounts')
    });

    keyboardManager.register({
      ...POS_SHORTCUTS.SHIFTS,
      action: () => navigate('/shifts')
    });

    // Sales shortcuts
    keyboardManager.register({
      ...POS_SHORTCUTS.HELD_SALES,
      action: () => setShowHeldModal(true)
    });

    keyboardManager.register({
      ...POS_SHORTCUTS.HOLD_SALE,
      action: () => handleHoldSale()
    });

    keyboardManager.register({
      ...POS_SHORTCUTS.RESUME_HOLD,
      action: () => handleResumeHold()
    });

    keyboardManager.register({
      ...POS_SHORTCUTS.CASH_PAYMENT,
      action: () => handlePayment('CASH')
    });

    keyboardManager.register({
      ...POS_SHORTCUTS.CARD_PAYMENT,
      action: () => handlePayment('CARD')
    });

    keyboardManager.register({
      ...POS_SHORTCUTS.RETURNS,
      action: () => navigate('/returns')
    });

    keyboardManager.register({
      ...POS_SHORTCUTS.CREDIT_PAYMENT,
      action: () => handlePayment('CREDIT')
    });

    keyboardManager.register({
      ...POS_SHORTCUTS.START_RETURN,
      action: () => navigate('/returns')
    });

    keyboardManager.register({
      ...POS_SHORTCUTS.SHIFT_REPORTS,
      action: () => navigate('/shifts')
    });

    keyboardManager.register({
      ...POS_SHORTCUTS.PRINT_RECEIPT,
      action: () => handlePrintReceipt()
    });

    keyboardManager.register({
      ...POS_SHORTCUTS.LOGOUT,
      action: () => navigate('/login')
    });

    return () => {
      keyboardManager.destroy();
    };
  }, [navigate]);

  // Handle payment
  const handlePayment = (type: string) => {
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (type === 'CREDIT' && (!customerId || customerId === 0)) {
      toast.error('Select a customer for Credit sales');
      return;
    }

    setPaymentType(type);
    setShowPaymentModal(true);
  };

  // Handle hold sale
  const handleHoldSale = () => {
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    // Implementation in QuickActions component
  };

  // Handle resume hold
  const handleResumeHold = () => {
    // Implementation in QuickActions component
  };

  // Handle print receipt
  const handlePrintReceipt = () => {
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    const currentPrintData = {
      receipt_no: `DRAFT-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      lines: items.map(item => ({
        name: item.name,
        qty: item.qty,
        price: item.retail_price,
        total: item.qty * item.retail_price
      })),
      totals: {
        subtotal: totals.gross,
        item_discounts_total: totals.item_discounts_total,
        manual_discount_value: totals.manual_discount_amount,
        tax_total: totals.tax_total,
        grand_total: totals.net_total
      },
      payments: [{
        method: 'DRAFT',
        amount: totals.net_total
      }]
    };

    setPrintData(currentPrintData);
    setShowPrintPreview(true);
  };

  // Handle reprint
  const handleReprint = () => {
    setShowReprintModal(true);
  };

  // Reprint selected invoice
  const handleReprintInvoice = (invoice: any) => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
    
    fetch(`${apiBaseUrl}/api/invoices/${invoice.id}`)
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setPrintData(data.printable);
          setShowPrintPreview(true);
        } else {
          toast.error('Failed to load invoice data');
        }
      })
      .catch(error => {
        console.error('Error fetching invoice:', error);
        toast.error('Failed to load invoice data');
      });
  };

  // Print the receipt
  const handlePrint = async () => {
    if (!printData) return;

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
    const response = await fetch(`${apiBaseUrl}/api/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receipt_no: printData.receipt_no,
        type: 'receipt',
        language: printLanguage,
        payload: printData
      })
    });

    if (!response.ok) {
      throw new Error('Print failed');
    }
  };

  // Handle successful print
  const handlePrintSuccess = () => {
    toast.success('Receipt printed successfully!');
    setShowPrintPreview(false);
    // Clear cart only after successful print
    clearCart();
    // Refocus search input
    setTimeout(() => {
      const searchInput = document.querySelector('input[placeholder*="Search Products"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    }, 100);
  };

  // Handle print error
  const handlePrintError = (error: string) => {
    toast.error(`Print failed: ${error}`);
    // Don't clear cart on print failure
  };

  // Handle new sale
  const handleNewSale = () => {
    clearCart();
    toast.success('New sale started');
  };

  return (
    <div className="h-full bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* Yesterday Session Banner */}
      {contextShowBanner && (
        <YesterdaySessionBanner onClose={() => setContextShowBanner(false)} />
      )}
      
      {/* Main Content */}
      <div className="flex h-full">

        {/* Main Content Area */}
        <div className="flex-1 flex">
          {/* Center: Sales Interface */}
          <div className="flex-1 p-4 lg:p-8 space-y-4 lg:space-y-8 overflow-y-auto">
            {/* Customer Selection and Price Tier - FIRST */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 lg:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('sales.customerSelection')}
                  </h3>
                  <QuickSalesStatusChip />
                </div>
                <CustomerSelect />
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 lg:p-6 shadow-sm">
                <PriceTierBar />
              </div>
            </div>

            {/* Product Search Section - SECOND */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 lg:p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <span className="mr-2">🛒</span>
                  {t('sales.searchProducts')} & {t('sales.addToCart')}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {t('sales.searchProductsDescription')}
                </p>
              </div>
              <SearchScan />
            </div>

            {/* Cart - THIRD */}
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-4 lg:p-6 shadow-sm">
              <Cart />
            </div>

            {/* Footer */}
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              <div>Version 1.0.0 • viRtual POS © Virtual Software Pvt Ltd</div>
            </div>
          </div>

          {/* Right: Cart Summary */}
          <CartSummary
            onPayment={handlePayment}
            onPrintReceipt={handlePrintReceipt}
            onReprint={handleReprint}
            onHoldSale={handleHoldSale}
            onResumeHold={handleResumeHold}
            onStartReturn={() => navigate('/returns')}
            onShiftReports={() => navigate('/shifts')}
          />
        </div>
      </div>

      {/* Print Preview Modal */}
      <PrintPreviewModal
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        onPrint={handlePrint}
        onPrintSuccess={handlePrintSuccess}
        onPrintError={handlePrintError}
        printData={printData}
      />

      {/* Reprint Modal */}
      <ReprintModal
        isOpen={showReprintModal}
        onClose={() => setShowReprintModal(false)}
        onReprint={handleReprintInvoice}
      />

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          paymentType={paymentType}
          total={totals.net_total}
          onClose={() => setShowPaymentModal(false)}
          onConfirm={async (paymentData) => {
            try {
              // Process payment
              const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
              // Check if online
              const isOnline = navigator.onLine;
              
              if (isOnline) {
                // Try to process online first
                const response = await fetch(`${apiBaseUrl}/api/invoices`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    lines: items.map(item => ({
                      item_id: item.product_id,
                      name: item.name,
                      sku: item.sku,
                      qty: item.qty,
                      price_tier: priceTier,
                      retail_price: item.retail_price,
                      line_discount_type: item.line_discount_type,
                      line_discount_value: item.line_discount_value
                    })),
                    customer_id: customerId,
                    price_tier: priceTier,
                    manual_discount: {
                      type: 'FIXED_AMOUNT', // From cart store
                      value: 0 // From cart store
                    },
                    tax_rate: 0.15,
                    payments: (paymentData.payments || []).map(p => ({ method: p.method, amount: p.amount, ref: p.reference })),
                    operator_id: 1, // From auth
                    terminal_id: terminalId,
                    print_language: printLanguage
                  })
                });

                if (response.ok) {
                  const data = await response.json();
                  
                  // Automatic receipt printing
                  if (data.auto_print && data.printable) {
                    try {
                      const printResponse = await fetch(`${apiBaseUrl}/api/print`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          receipt_no: data.receipt_no,
                          type: 'receipt',
                          language: printLanguage,
                          payload: data.printable
                        })
                      });
                      
                      if (printResponse.ok) {
                        toast.success(`Invoice ${data.receipt_no} created and printed successfully!`);
                        // Clear cart only after successful print
                        clearCart();
                        // Refocus search input
                        setTimeout(() => {
                          const searchInput = document.querySelector('input[placeholder*="Search Products"]') as HTMLInputElement;
                          if (searchInput) {
                            searchInput.focus();
                          }
                        }, 100);
                      } else {
                        toast.success(`Invoice ${data.receipt_no} created successfully!`);
                        console.warn('Print failed but invoice created');
                        // Don't clear cart on print failure
                      }
                    } catch (printError) {
                      console.warn('Print failed:', printError);
                      toast.success(`Invoice ${data.receipt_no} created successfully!`);
                      // Don't clear cart on print failure
                    }
                  } else {
                    toast.success(`Invoice ${data.receipt_no} created successfully!`);
                    // Clear cart if no printing required
                    clearCart();
                    // Refocus search input
                    setTimeout(() => {
                      const searchInput = document.querySelector('input[placeholder*="Search Products"]') as HTMLInputElement;
                      if (searchInput) {
                        searchInput.focus();
                      }
                    }, 100);
                  }

                  setShowPaymentModal(false);
                } else {
                  const error = await response.json();
                  toast.error(error.error || 'Payment failed');
                }
              } else {
                // Offline - queue the operation
                const saleData = {
                  lines: items.map(item => ({
                    item_id: item.product_id,
                    name: item.name,
                    sku: item.sku,
                    qty: item.qty,
                    price_tier: priceTier,
                    retail_price: item.retail_price,
                    line_discount_type: item.line_discount_type,
                    line_discount_value: item.line_discount_value
                  })),
                  customer_id: customerId,
                  price_tier: priceTier,
                  manual_discount: {
                    type: 'FIXED_AMOUNT',
                    value: 0
                  },
                  tax_rate: 0.15,
                  payments: (paymentData.payments || []).map(p => ({ method: p.method, amount: p.amount, ref: p.reference })),
                  operator_id: 1,
                  terminal_id: terminalId,
                  print_language: printLanguage
                };

                // Queue the sale for offline processing
                const operationId = await queueOperations.queueSale(saleData, 'high');
                
                toast.success(`Sale queued for processing when online (ID: ${operationId.slice(-8)})`);
                
                // Clear cart and close modal
                clearCart();
                setShowPaymentModal(false);
              }
            } catch (error) {
              console.error('Payment error:', error);
              toast.error('Payment failed');
            }
          }}
        />
      )}

      {/* Offline Warning */}
      {false && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5" />
            <span>Offline - Some features may be limited</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SalesPage() {
  return (
    <QuickSalesProvider>
      <SalesPageContent />
    </QuickSalesProvider>
  );
}
