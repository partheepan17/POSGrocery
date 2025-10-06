import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { keyboardManager, POS_SHORTCUTS } from '@/lib/keyboard';
import { toast } from 'react-hot-toast';

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

export default function SalesPage() {
  const navigate = useNavigate();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState<string>('');
  const [showHeldModal, setShowHeldModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showReprintModal, setShowReprintModal] = useState(false);
  const [printData, setPrintData] = useState<any | null>(null);

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
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100';
    
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

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100';
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

      if (response.ok) {
        toast.success('Receipt printed successfully!');
        setShowPrintPreview(false);
      } else {
        toast.error('Print failed');
      }
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Print failed');
    }
  };

  // Handle new sale
  const handleNewSale = () => {
    clearCart();
    toast.success('New sale started');
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Main Content */}
      <div className="flex h-[calc(100vh-64px)]">

        {/* Main Content Area */}
        <div className="flex-1 flex">
          {/* Center: Sales Interface */}
          <div className="flex-1 p-8 space-y-8">
            {/* Customer Selection and Price Tier - FIRST */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <CustomerSelect />
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <PriceTierBar />
              </div>
            </div>

            {/* Product Search Section - SECOND */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <span className="mr-2">🛒</span>
                  Product Search & Add to Cart
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Search for products to add to your current sale transaction
                </p>
              </div>
              <SearchScan />
            </div>

            {/* Cart - THIRD */}
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
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
              const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100';
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
                    } else {
                      toast.success(`Invoice ${data.receipt_no} created successfully!`);
                      console.warn('Print failed but invoice created');
                    }
                  } catch (printError) {
                    console.warn('Print failed:', printError);
                    toast.success(`Invoice ${data.receipt_no} created successfully!`);
                  }
                } else {
                  toast.success(`Invoice ${data.receipt_no} created successfully!`);
                }

                // Clear cart and close modal for next transaction
                clearCart();
                setShowPaymentModal(false);
                
                // Show success message with invoice number
                toast.success(`Transaction completed! Invoice: ${data.receipt_no}`);
              } else {
                const error = await response.json();
                toast.error(error.error || 'Payment failed');
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
