import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, CreditCard, Printer, Plus, Minus, Trash2, Download, Clock, Wifi, WifiOff, Tag, AlertCircle, User, LogOut, FileText, X, Barcode, Scale } from 'lucide-react';
import { posService, POSHeldSale } from '@/services/posService';
import { dataService, Product, Customer } from '@/services/dataService';
import { useAppStore } from '@/store/appStore';
import { useCartStore } from '@/store/cartStore';
import { toast } from 'react-hot-toast';
import { createPrintAdapter } from '@/adapters/PrintAdapter';
import { ReceiptPayload } from '@/types/receipt';
import { discountEngine, AppliedRule } from '@/services/discountEngine';
import { generateReceiptNumber } from '@/utils/receiptNumber';
import { authService } from '@/services/authService';
import { shiftService } from '@/services/shiftService';
import { holdService, HoldSale, HoldInput } from '@/services/holdService';
import HoldCreateModal from '@/components/Hold/HoldCreateModal';
import HoldListDrawer from '@/components/Hold/HoldListDrawer';
import HoldResumeDialog from '@/components/Hold/HoldResumeDialog';
import { PaymentDrawer } from '@/components/pos/PaymentDrawer';
import { WeightInputModal } from '@/components/pos/WeightInputModal';
import { CartLine } from '@/components/pos/CartLine';
import { OfflineBanner } from '@/components/pos/OfflineBanner';
import { scaleService } from '@/services/scaleService';
import { SETTINGS } from '@/config/settings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';

interface CartLine {
  id: number;
  product_id: number;
  product: Product;
  qty: number;
  weight?: number;
  unit_price: number;
  line_discount: number;
  tax: number;
  total: number;
  applied_rules?: AppliedRule[];
  discount_reason?: string;
}

export function Sales() {
  const navigate = useNavigate();
  const { theme, currentUser, currentSession, settings, holdsSettings } = useAppStore();
  const { 
    items: cartLines, 
    addItem, 
    updateItemQuantity, 
    removeItem, 
    clearCart, 
    priceTier, 
    setPriceTier, 
    setCustomer,
    manualDiscount,
    setManualDiscount,
    totals,
    disableDiscountsForBill,
    setDisableDiscountsForBill
  } = useCartStore();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [printLanguage, setPrintLanguage] = useState<'EN' | 'SI' | 'TA'>('SI');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [currentSale, setCurrentSale] = useState<any>(null);
  const [heldSales, setHeldSales] = useState<POSHeldSale[]>([]);
  const [showHeldSales, setShowHeldSales] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showBarcodeOnReceipt, setShowBarcodeOnReceipt] = useState(false);
  
  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  
  // Hold states
  const [showHoldCreateModal, setShowHoldCreateModal] = useState(false);
  const [showHoldListDrawer, setShowHoldListDrawer] = useState(false);
  const [showHoldResumeDialog, setShowHoldResumeDialog] = useState(false);
  const [selectedHoldForResume, setSelectedHoldForResume] = useState<HoldSale | null>(null);
  const [holdCount, setHoldCount] = useState(0);

  // Payment states
  const [showPaymentDrawer, setShowPaymentDrawer] = useState(false);
  const [paymentType, setPaymentType] = useState<'cash' | 'card' | 'wallet' | 'credit'>('cash');

  // Weight input modal states
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);

  // Shift states
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [showShiftModal, setShowShiftModal] = useState(false);

  // Discount states
  const [appliedDiscounts, setAppliedDiscounts] = useState<AppliedRule[]>([]);
  const [discountWarnings, setDiscountWarnings] = useState<string[]>([]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Enter: add/confirm
      if (event.key === 'Enter' && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        if (searchResults.length > 0) {
          handleAddToCart(searchResults[0]);
        }
      }
      
      // Ctrl+P: pay
      if (event.ctrlKey && event.key === 'p') {
        event.preventDefault();
        if (cartLines.length > 0) {
          setPaymentType('cash');
          setShowPaymentDrawer(true);
        }
      }
      
      // F2: search bar focus
      if (event.key === 'F2') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      
      // F4: barcode field focus
      if (event.key === 'F4') {
        event.preventDefault();
        barcodeInputRef.current?.focus();
      }
      
      // Esc: clear modal
      if (event.key === 'Escape') {
        if (showPaymentDrawer) {
          setShowPaymentDrawer(false);
        } else if (showWeightModal) {
          setShowWeightModal(false);
          setPendingProduct(null);
        }
      }
      
      // F7: Cash Payment
      if (event.key === 'F7') {
        event.preventDefault();
        if (cartLines.length > 0) {
          setPaymentType('cash');
          setShowPaymentDrawer(true);
        }
      }
      
      // F8: Card Payment
      if (event.key === 'F8') {
        event.preventDefault();
        if (cartLines.length > 0) {
          setPaymentType('card');
          setShowPaymentDrawer(true);
        }
      }
      
      // F9: Wallet Payment
      if (event.key === 'F9') {
        event.preventDefault();
        if (cartLines.length > 0) {
          setPaymentType('wallet');
          setShowPaymentDrawer(true);
        }
      }
      
      // F10: Cash Movement
      if (event.key === 'F10') {
        event.preventDefault();
        navigate('/shifts');
      }
      
      // F11: Returns
      if (event.key === 'F11') {
        event.preventDefault();
        navigate('/returns');
      }
      
      // F12: Z Report
      if (event.key === 'F12') {
        event.preventDefault();
        navigate('/shifts');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [cartLines, searchResults, showPaymentDrawer, showWeightModal, navigate]);

  // Focus search on global "/" key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Authentication check
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    if (!currentSession) {
      toast.remove();
      toast.error('No open shift. Go to Shifts > New to start a session.');
    }
  }, [currentUser, currentSession, navigate]);

  // Initialize
  useEffect(() => {
    if (!currentUser || !currentSession) return;
    
    loadCustomers();
    startNewSale();
    updateTime();
    loadHoldCount();
    loadCurrentShift();
    
    // Set up time update interval (less frequent)
    const timeInterval = setInterval(updateTime, 10000); // 10 seconds instead of 1 second
    const onlineInterval = setInterval(() => setIsOnline(navigator.onLine), 300000); // 5 minutes instead of 30 seconds
    
    return () => {
      clearInterval(timeInterval);
      clearInterval(onlineInterval);
    };
  }, [currentUser, currentSession]);

  const updateTime = () => {
    setCurrentTime(new Date());
  };

  const loadCustomers = async () => {
    try {
      const customerList = await dataService.getCustomers(false);
      setCustomers(customerList || []);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const loadCurrentShift = async () => {
    try {
      setShiftLoading(true);
      const terminal = (currentSession as any)?.terminal || 'Terminal 1';
      const cashierId = (currentUser as any)?.id || 1;
      
      const activeShift = await shiftService.getActiveShift(terminal, cashierId);
      setCurrentShift(activeShift);
      
      if ((settings as any)?.shiftSettings?.requireShiftForSales && !activeShift) {
        setShowShiftModal(true);
      }
    } catch (error) {
      console.error('Failed to load current shift:', error);
    } finally {
      setShiftLoading(false);
    }
  };

  const loadHoldCount = async () => {
    if ((currentSession as any)?.terminal) {
      try {
        const count = await holdService.getHoldCount((currentSession as any).terminal);
        setHoldCount(count);
      } catch (error) {
        console.error('Failed to load hold count:', error);
      }
    }
  };

  const startNewSale = async () => {
    try {
      const sale = await posService.startSale({
        cashier_id: 1,
        terminal_name: 'Counter-1',
        customer_id: selectedCustomer?.id,
        price_tier: priceTier,
        language: printLanguage
      });
      setCurrentSale(sale);
      clearCart();
    } catch (error) {
      console.error('Failed to start sale:', error);
      toast.error('Failed to start new sale');
    }
  };

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const numericOnly = /^\d{7,}$/;
      if (numericOnly.test(term)) {
        console.log('🔍 Barcode scan detected for:', term);
        
        const { barcodeService } = await import('@/services/barcodeService');
        const barcodeResult = await barcodeService.searchBarcode(term, {
          debounceMs: 0,
          retryAttempts: 2,
          timeout: 5000
        });
        
        if (barcodeResult.found && barcodeResult.product) {
          setSearchTerm('');
          setSearchResults([]);
          if (searchInputRef.current) {
            searchInputRef.current.value = '';
          }
          const convertedProduct = {
            ...barcodeResult.product,
            id: typeof barcodeResult.product.id === 'string' ? Number(barcodeResult.product.id) : barcodeResult.product.id,
            unit: (barcodeResult.product.unit === 'pc' || barcodeResult.product.unit === 'kg') ? barcodeResult.product.unit : 'pc' as 'pc' | 'kg',
            category_id: barcodeResult.product.category_id ? (typeof barcodeResult.product.category_id === 'string' ? Number(barcodeResult.product.category_id) : barcodeResult.product.category_id) : 1,
            preferred_supplier_id: barcodeResult.product.preferred_supplier_id ? (typeof barcodeResult.product.preferred_supplier_id === 'string' ? Number(barcodeResult.product.preferred_supplier_id) : barcodeResult.product.preferred_supplier_id) : undefined
          };
          await handleAddToCart(convertedProduct);
          return;
        }
      }

      const results = await (dataService as any).searchProducts(term);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    }
  };

  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentSearchTerm = e.currentTarget.value;
      
      if (currentSearchTerm.length >= 2) {
        try {
          const results = await (dataService as any).searchProducts(currentSearchTerm);
          if (results.length > 0) {
            await handleAddToCart(results[0]);
            setSearchTerm('');
            setSearchResults([]);
            if (searchInputRef.current) {
              searchInputRef.current.value = '';
            }
          } else {
            toast.error('No products found for: ' + currentSearchTerm);
          }
        } catch (error) {
          console.error('Search failed:', error);
          toast.error('Search failed');
        }
      }
    }
  };

  const handleAddToCart = async (product: Product) => {
    try {
      if (!currentSale) {
        await startNewSale();
      }

      if (product.is_scale_item && product.unit === 'kg') {
        setPendingProduct(product);
        setShowWeightModal(true);
        return;
      }

      await addItem(product, 1);
      toast.success(`${product.name_en} added to cart`);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      toast.error('Failed to add item to cart');
    }
  };

  const getPriceForTier = (product: Product, tier: string): number => {
    switch (tier) {
      case 'Wholesale': return product.price_wholesale || 0;
      case 'Credit': return product.price_credit || 0;
      case 'Other': return product.price_other || 0;
      default: return product.price_retail || 0;
    }
  };

  const handleWeightConfirm = async (weight: number) => {
    if (!pendingProduct) return;

    try {
      await addItem(pendingProduct, weight, weight);
      toast.success(`${pendingProduct.name_en} (${weight.toFixed(3)} kg) added to cart`);
      setShowWeightModal(false);
      setPendingProduct(null);
    } catch (error) {
      console.error('Failed to add scale item to cart:', error);
      toast.error('Failed to add scale item to cart');
    }
  };

  const handleScaleRead = async (): Promise<number | null> => {
    try {
      if (!scaleService.isScaleConnected()) {
        await scaleService.connect();
      }
      const weight = await scaleService.getStableWeight();
      return weight;
    } catch (error) {
      console.error('Scale reading failed:', error);
      return null;
    }
  };

  const handlePayment = (type: 'cash' | 'card' | 'wallet' | 'credit') => {
    if (cartLines.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setPaymentType(type);
    setShowPaymentDrawer(true);
  };

  const processPayment = async (paymentData: any) => {
    if (cartLines.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setIsProcessingPayment(true);
    try {
      const saleData = {
        customer_id: selectedCustomer?.id || null,
        cashier_id: (currentUser as any)?.id,
        session_id: currentSession?.id,
        terminal_name: (currentSession as any)?.terminal,
        payment_method: paymentType.toUpperCase(),
        payment_reference: paymentData.reference,
        payment_notes: paymentData.notes,
        total_amount: totals.net_total,
        tax_amount: totals.tax_total,
        discount_amount: totals.item_discounts_total,
        manual_discount: totals.manual_discount_amount,
        items: cartLines.map(line => ({
          product_id: line.product_id,
          quantity: line.qty,
          weight: line.weight,
          unit_price: (line as any).unit_price || line.product.price_retail,
          discount_amount: (line as any).line_discount || 0,
          tax_amount: (line as any).tax || 0,
          total_amount: (line as any).total || (line.qty * line.product.price_retail)
        }))
      };

      console.log('Processing payment:', saleData);
      
      const receiptNumber = generateReceiptNumber();
      const saleId = Number(receiptNumber);
      
      clearCart();
      setShowPaymentDrawer(false);
      startNewSale();
      
      toast.success(`${paymentType.toUpperCase()} payment processed successfully`);
    } catch (error) {
      console.error('Payment failed:', error);
      toast.error('Payment failed');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Offline Banner */}
      {!isOnline && <OfflineBanner />}
      {/* Per-bill disable ribbon */}
      {useCartStore.getState().disableDiscountsForBill && (
        <div className="bg-yellow-100 text-yellow-900 text-center py-1 text-sm">Discounts disabled for this bill (Admin)</div>
      )}
      
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Point of Sale</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedCustomer ? (
                    <>Customer: <span className="font-medium">{selectedCustomer.customer_name}</span> • Type: <span className="font-medium">{selectedCustomer.customer_type}</span> • Special Pricing: <span className="font-medium">{selectedCustomer.special_pricing_on ? 'Profile #' + (selectedCustomer.special_pricing_profile_id||'') : 'None'}</span></>
                  ) : 'Terminal System'}
                </p>
              </div>
            </div>
            
            {/* Status Indicators */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                {isOnline ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-red-500" />}
                <span className="text-gray-600 dark:text-gray-400">{isOnline ? 'Online' : 'Offline'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="font-mono text-gray-600 dark:text-gray-400">{currentTime.toLocaleTimeString()}</span>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {priceTier}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate('/shifts')}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              Shift
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="gap-2 text-red-600 hover:text-red-700"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column - Product Search & Cart */}
        <div className="w-1/2 flex flex-col border-r border-gray-200 dark:border-gray-700">
          {/* Search Section */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search products or scan barcode... (F2)"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="pl-10 text-lg"
                />
              </div>
              
              {/* Barcode Input */}
              <div className="relative">
                <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Barcode scanner input... (F4)"
                  className="pl-10"
                />
              </div>
              
              {/* Customer Selection */}
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={selectedCustomer?.id || ''}
                  onChange={(e) => {
                    const customer = customers.find(c => c.id === Number(e.target.value));
                    setSelectedCustomer(customer || null);
                    if (customer) {
                      setPriceTier(customer.customer_type);
                    } else {
                      setPriceTier('Retail');
                    }
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Walk-in Customer (Retail)</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.customer_name} ({customer.customer_type}){!customer.active ? ' (inactive)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-4 max-h-64 overflow-y-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
                <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-t-lg">
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">Search Results ({searchResults.length})</div>
                </div>
                {searchResults.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleAddToCart(product)}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-b-0 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 dark:text-white">{product.name_en}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          SKU: <span className="font-mono text-blue-600 dark:text-blue-400">{product.sku}</span>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Price: <span className="font-bold text-green-600 dark:text-green-400">රු {getPriceForTier(product, priceTier).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-400">Click to add</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Section */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Cart</h2>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setShowHeldSales(true)}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    Held (F2)
                  </Button>
                  <Button
                    onClick={startNewSale}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    New Sale
                  </Button>
                </div>
              </div>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6">
              {cartLines.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 text-lg">Cart is empty</p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm">Scan items or search to add products</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {cartLines.map((line) => (
                    <CartLine
                      key={line.id}
                      line={line as any}
                      onQuantityChange={updateItemQuantity}
                      onRemove={removeItem}
                      onDiscountChange={() => {}} // TODO: Implement discount editing
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Totals & Payment (Sticky) */}
        <div className="w-1/2 flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {/* Totals Card */}
            <div className="p-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">Totals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Per-bill discounts toggle (admin only placeholder) */}
                  <div className="flex items-center justify-between p-3 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Disable all discounts (this bill)</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Temporarily ignore automatic discounts for this bill only.</div>
                    </div>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={disableDiscountsForBill}
                        onChange={async (e) => {
                          const reason = e.target.checked ? prompt('Reason (optional):') || undefined : undefined;
                          await setDisableDiscountsForBill(e.target.checked, reason);
                          toast.success(e.target.checked ? 'Discounts disabled for this bill' : 'Discounts enabled for this bill');
                        }}
                        aria-label="Disable all discounts for this bill"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-green-600 relative transition-colors">
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${disableDiscountsForBill ? 'translate-x-5' : ''}`}></span>
                      </div>
                    </label>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Gross:</span>
                      <span>රු {totals.gross.toLocaleString()}</span>
                    </div>
                    {totals.item_discounts_total > 0 && (
                      <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span>Item Savings:</span>
                        <span>රු {totals.item_discounts_total.toLocaleString()}</span>
                      </div>
                    )}
                    {totals.manual_discount_amount > 0 && (
                      <div className="flex justify-between text-blue-600 dark:text-blue-400">
                        <span>Manual Discount:</span>
                        <span>රු {totals.manual_discount_amount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Tax:</span>
                      <span>රු {totals.tax_total.toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-green-600 dark:text-green-400 font-bold text-xl">
                      <span>Net Total:</span>
                      <span>රු {totals.net_total.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Section */}
            <div className="p-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">Payment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => handlePayment('cash')}
                      disabled={cartLines.length === 0 || isProcessingPayment}
                      className="h-12 text-lg font-semibold bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isProcessingPayment && paymentType === 'cash' ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        'Cash (F7)'
                      )}
                    </Button>
                    <Button
                      onClick={() => handlePayment('card')}
                      disabled={cartLines.length === 0 || isProcessingPayment}
                      className="h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isProcessingPayment && paymentType === 'card' ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        'Card (F8)'
                      )}
                    </Button>
                    <Button
                      onClick={() => handlePayment('wallet')}
                      disabled={cartLines.length === 0 || isProcessingPayment}
                      className="h-12 text-lg font-semibold bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {isProcessingPayment && paymentType === 'wallet' ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        'Wallet (F9)'
                      )}
                    </Button>
                    <Button
                      onClick={() => handlePayment('credit')}
                      disabled={cartLines.length === 0 || isProcessingPayment}
                      className="h-12 text-lg font-semibold bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                      {isProcessingPayment && paymentType === 'credit' ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        'Credit (F10)'
                      )}
                    </Button>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Button
                      onClick={() => navigate('/returns')}
                      className="w-full h-10 bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      Returns (F11)
                    </Button>
                    <Button
                      onClick={() => navigate('/shifts')}
                      className="w-full h-10 bg-gray-600 hover:bg-gray-700 text-white"
                    >
                      Shift Reports (F12)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="p-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    onClick={() => setShowHoldCreateModal(true)}
                    disabled={cartLines.length === 0}
                    className="w-full h-10 bg-yellow-600 hover:bg-yellow-700 text-white disabled:opacity-50"
                  >
                    Hold Sale (F5)
                  </Button>
                  <Button
                    onClick={() => setShowHoldListDrawer(true)}
                    className="w-full h-10 bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-between"
                  >
                    <span>Resume Hold (F6)</span>
                    {holdCount > 0 && (
                      <Badge variant="secondary" className="bg-purple-900 text-purple-200">
                        {holdCount}
                      </Badge>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Modals and Drawers */}
      <PaymentDrawer
        isOpen={showPaymentDrawer}
        onClose={() => setShowPaymentDrawer(false)}
        paymentType={paymentType}
        total={totals.net_total}
        onConfirm={processPayment}
        isProcessing={isProcessingPayment}
      />

      <WeightInputModal
        isOpen={showWeightModal}
        onClose={() => {
          setShowWeightModal(false);
          setPendingProduct(null);
        }}
        onConfirm={handleWeightConfirm}
        productName={pendingProduct?.name_en || ''}
        unitPrice={pendingProduct ? getPriceForTier(pendingProduct, priceTier) : 0}
        unit={pendingProduct?.unit || 'kg'}
        onScaleRead={handleScaleRead}
      />

      <HoldCreateModal
        isOpen={showHoldCreateModal}
        onClose={() => setShowHoldCreateModal(false)}
        onConfirm={() => {}} // TODO: Implement hold creation
        suggestedName=""
        customers={customers}
      />

      <HoldListDrawer
        isOpen={showHoldListDrawer}
        onClose={() => setShowHoldListDrawer(false)}
        onResume={() => {}} // TODO: Implement hold resume
        terminal={(currentSession as any)?.terminal || 'POS-001'}
        currentUserId={(currentUser as any)?.id || 0}
      />

      <HoldResumeDialog
        isOpen={showHoldResumeDialog}
        onClose={() => {
          setShowHoldResumeDialog(false);
          setSelectedHoldForResume(null);
        }}
        onConfirm={() => {}} // TODO: Implement hold resume confirmation
        hold={selectedHoldForResume}
        hasCurrentCart={cartLines.length > 0}
      />
    </div>
  );
}
