import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, CreditCard, Printer, Plus, Minus, Trash2, Download, Clock, Wifi, WifiOff, Tag, AlertCircle, User, LogOut, FileText } from 'lucide-react';
import { posService, POSHeldSale } from '@/services/posService';
import { dataService, Product, Customer } from '@/services/dataService';
import { useAppStore } from '@/store/appStore';
import { toast } from 'react-hot-toast';
import { createPrintAdapter } from '@/adapters/PrintAdapter';
import { ReceiptPayload } from '@/types/receipt';
import { discountEngine, AppliedRule } from '@/services/discountEngine';
import { authService } from '@/services/authService';
import { shiftService } from '@/services/shiftService';
import { holdService, HoldSale, HoldInput } from '@/services/holdService';
import HoldCreateModal from '@/components/Hold/HoldCreateModal';
import HoldListDrawer from '@/components/Hold/HoldListDrawer';
import HoldResumeDialog from '@/components/Hold/HoldResumeDialog';

interface CartLine {
  id: number;
  product_id: number;
  product: Product;
  qty: number;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [priceTier, setPriceTier] = useState<'Retail' | 'Wholesale' | 'Credit' | 'Other'>('Retail');
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [currentSale, setCurrentSale] = useState<any>(null);
  const [heldSales, setHeldSales] = useState<POSHeldSale[]>([]);
  const [showHeldSales, setShowHeldSales] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const discountDialogRef = useRef<HTMLDialogElement>(null);
  const [selectedLineForDiscount, setSelectedLineForDiscount] = useState<CartLine | null>(null);
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [appliedDiscounts, setAppliedDiscounts] = useState<AppliedRule[]>([]);
  const [discountWarnings, setDiscountWarnings] = useState<string[]>([]);

  // Hold states
  const [showHoldCreateModal, setShowHoldCreateModal] = useState(false);
  const [showHoldListDrawer, setShowHoldListDrawer] = useState(false);
  const [showHoldResumeDialog, setShowHoldResumeDialog] = useState(false);
  const [selectedHoldForResume, setSelectedHoldForResume] = useState<HoldSale | null>(null);
  const [holdCount, setHoldCount] = useState(0);

  // Logout function
  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  // Cash drawer function
  const openCashDrawer = () => {
    if (settings?.devices?.cashDrawerOpenOnCash) {
      console.log('💰 Opening cash drawer...');
      window.dispatchEvent(new CustomEvent('drawer-opened'));
      toast.success('Cash drawer opened');
    }
  };

  // Payment handlers
  const handleCashPayment = async () => {
    if (cartLines.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    try {
      // Complete sale with cash payment
      const saleData = {
        customer_id: selectedCustomer?.id || null,
        cashier_id: currentUser?.id,
        session_id: currentSession?.id,
        terminal_name: currentSession?.terminal,
        payment_method: 'CASH',
        total_amount: totals.net,
        tax_amount: totals.tax,
        discount_amount: totals.discount,
        items: cartLines.map(line => ({
          product_id: line.product_id,
          quantity: line.qty,
          unit_price: line.unit_price,
          discount_amount: line.line_discount,
          tax_amount: line.tax,
          total_amount: line.total
        }))
      };

      // Save to database (would need to implement this in dataService)
      console.log('Processing cash sale:', saleData);
      
      // Open cash drawer for cash payments
      openCashDrawer();
      
      // Clear cart and start new sale
      setCartLines([]);
      startNewSale();
      
      toast.success('Cash payment processed successfully');
    } catch (error) {
      console.error('Cash payment failed:', error);
      toast.error('Cash payment failed');
    }
  };

  const handleCardPayment = async () => {
    if (cartLines.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    try {
      // Complete sale with card payment
      const saleData = {
        customer_id: selectedCustomer?.id || null,
        cashier_id: currentUser?.id,
        session_id: currentSession?.id,
        terminal_name: currentSession?.terminal,
        payment_method: 'CARD',
        total_amount: totals.net,
        tax_amount: totals.tax,
        discount_amount: totals.discount,
        items: cartLines.map(line => ({
          product_id: line.product_id,
          quantity: line.qty,
          unit_price: line.unit_price,
          discount_amount: line.line_discount,
          tax_amount: line.tax,
          total_amount: line.total
        }))
      };

      console.log('Processing card sale:', saleData);
      
      // Clear cart and start new sale
      setCartLines([]);
      startNewSale();
      
      toast.success('Card payment processed successfully');
    } catch (error) {
      console.error('Card payment failed:', error);
      toast.error('Card payment failed');
    }
  };

  const handleWalletPayment = async () => {
    if (cartLines.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    try {
      // Complete sale with wallet payment
      const saleData = {
        customer_id: selectedCustomer?.id || null,
        cashier_id: currentUser?.id,
        session_id: currentSession?.id,
        terminal_name: currentSession?.terminal,
        payment_method: 'WALLET',
        total_amount: totals.net,
        tax_amount: totals.tax,
        discount_amount: totals.discount,
        items: cartLines.map(line => ({
          product_id: line.product_id,
          quantity: line.qty,
          unit_price: line.unit_price,
          discount_amount: line.line_discount,
          tax_amount: line.tax,
          total_amount: line.total
        }))
      };

      console.log('Processing wallet sale:', saleData);
      
      // Clear cart and start new sale
      setCartLines([]);
      startNewSale();
      
      toast.success('Wallet payment processed successfully');
    } catch (error) {
      console.error('Wallet payment failed:', error);
      toast.error('Wallet payment failed');
    }
  };

  // Authentication check
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    if (!currentSession) {
      navigate('/shift?action=start');
      return;
    }
  }, [currentUser, currentSession, navigate]);

  // Initialize
  useEffect(() => {
    if (!currentUser || !currentSession) return;
    
    loadCustomers();
    startNewSale();
    updateTime();
    loadHoldCount();
    
    const timeInterval = setInterval(updateTime, 1000);
    const onlineInterval = setInterval(() => setIsOnline(navigator.onLine), 5000);
    
    return () => {
      clearInterval(timeInterval);
      clearInterval(onlineInterval);
    };
  }, []);

  // Load hold count
  const loadHoldCount = async () => {
    if (currentSession?.terminal) {
      try {
        const count = await holdService.getHoldCount(currentSession.terminal);
        setHoldCount(count);
      } catch (error) {
        console.error('Failed to load hold count:', error);
      }
    }
  };

  // Hold functions (stubs for now)
  const handleHoldSale = () => {
    if (cartLines.length === 0) {
      toast.error('Cart is empty - nothing to hold');
      return;
    }
    setShowHoldCreateModal(true);
  };

  const handleResumeHold = (hold: HoldSale) => {
    setSelectedHoldForResume(hold);
    setShowHoldResumeDialog(true);
  };

  // Keyboard shortcuts for reports and returns
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // F10 for X Report
      if (event.key === 'F10') {
        event.preventDefault();
        navigate('/shift?tab=xreport');
      }
      
      // F11 for Returns
      if (event.key === 'F11') {
        event.preventDefault();
        navigate('/returns');
      }
      
      // F12 for Z Report
      if (event.key === 'F12') {
        event.preventDefault();
        navigate('/shift?tab=zreport');
      }

      // F7 for Hold
      if (event.key === 'F7') {
        event.preventDefault();
        handleHoldSale();
      }

      // F8 for Resume
      if (event.key === 'F8') {
        event.preventDefault();
        setShowHoldListDrawer(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Focus search on global "/" key and handle print shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // Print shortcuts
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        handlePrintReceipt();
      }

      // Reprint shortcut
      if (e.key === 'F4') {
        e.preventDefault();
        handleReprintLast();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const updateTime = () => {
    setCurrentTime(new Date());
  };

  const loadCustomers = async () => {
    try {
      const customerList = await dataService.getCustomers(false); // Get all customers including inactive ones
      setCustomers(customerList);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const startNewSale = async () => {
    try {
      const sale = await posService.startSale({
        cashier_id: 1,
        terminal_name: 'Counter-1',
        customer_id: selectedCustomer?.id,
        price_tier: priceTier,
        language: 'EN'
      });
      setCurrentSale(sale);
      setCartLines([]);
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
      const results = await dataService.searchProducts(term);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleAddToCart = async (product: Product) => {
    if (!currentSale) return;

    try {
      await posService.addLine({
        sale_id: currentSale.id,
        product_id: product.id,
        qty: 1,
        unit_price: getPriceForTier(product, priceTier)
      });

      // Create new cart line
      const newLine: CartLine = {
        id: Date.now(),
        product_id: product.id,
        product: product,
        qty: 1,
        unit_price: getPriceForTier(product, priceTier),
        line_discount: 0,
        tax: 0,
        total: getPriceForTier(product, priceTier)
      };

      // Add to cart and apply discounts
      const updatedLines = [...cartLines, newLine];
      const linesWithDiscounts = await applyDiscountsToCart(updatedLines);
      setCartLines(linesWithDiscounts);

      setSearchTerm('');
      setSearchResults([]);
      toast.success(`${product.name_en} added to cart`);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      toast.error('Failed to add item to cart');
    }
  };

  const getPriceForTier = (product: Product, tier: string): number => {
    switch (tier) {
      case 'Wholesale': return product.price_wholesale;
      case 'Credit': return product.price_credit;
      case 'Other': return product.price_other;
      default: return product.price_retail;
    }
  };

  // Apply discount engine to cart
  const applyDiscountsToCart = async (lines: CartLine[]) => {
    if (lines.length === 0) {
      setAppliedDiscounts([]);
      setDiscountWarnings([]);
      return lines;
    }

    try {
      // Get SKUs from cart lines
      const skus = lines.map(line => line.product.sku);
      
      // Apply discounts using the engine
      const result = await discountEngine.applyRulesToCart({ lines });
      
      // Update state with applied discounts and warnings
      setAppliedDiscounts(result.appliedRules);
      setDiscountWarnings(result.warnings);
      
      // Show warnings as toasts
      result.warnings.forEach(warning => {
        toast(warning, { icon: '⚠️', duration: 3000 });
      });
      
      return result.lines;
    } catch (error) {
      console.error('Error applying discounts:', error);
      return lines;
    }
  };

  const handleQuantityChange = async (lineId: number, change: number) => {
    const line = cartLines.find(l => l.id === lineId);
    if (!line) return;

    const newQty = Math.max(0, line.qty + change);
    if (newQty === 0) {
      handleRemoveLine(lineId);
      return;
    }

    try {
      posService.updateLineQty(lineId, newQty);
      
      // Update quantity and reapply discounts
      const updatedLines = cartLines.map(l => 
        l.id === lineId ? { ...l, qty: newQty, line_discount: 0, applied_rules: [] } : l
      );
      const linesWithDiscounts = await applyDiscountsToCart(updatedLines);
      setCartLines(linesWithDiscounts);
    } catch (error) {
      console.error('Failed to update quantity:', error);
      toast.error('Failed to update quantity');
    }
  };

  const handleRemoveLine = async (lineId: number) => {
    try {
      await posService.removeLine(lineId);
      
      // Remove line and reapply discounts to remaining items
      const updatedLines = cartLines.filter(l => l.id !== lineId);
      const linesWithDiscounts = await applyDiscountsToCart(updatedLines);
      setCartLines(linesWithDiscounts);
      
      toast.success('Item removed from cart');
    } catch (error) {
      console.error('Failed to remove line:', error);
      toast.error('Failed to remove item');
    }
  };

  const handlePrintReceipt = async () => {
    if (!currentSale || cartLines.length === 0) {
      toast.error('No sale to print');
      return;
    }

    try {
      const printAdapter = createPrintAdapter();
      const receiptPayload: ReceiptPayload = {
        store: {
          name: 'Grocery POS Store',
          address: '123 Main Street, Colombo 01',
          taxId: '123456789V'
        },
        terminalName: 'Counter-1',
        invoice: {
          id: currentSale.id,
          datetime: new Date().toISOString(),
          language: 'EN',
          priceTier: priceTier,
          isReprint: false,
          items: cartLines.map(item => ({
            sku: item.product.sku,
            name_en: item.product.name_en,
            name_si: item.product.name_si,
            name_ta: item.product.name_ta,
            unit: item.product.unit,
            qty: item.qty,
            unitPrice: item.unit_price,
            lineDiscount: item.line_discount,
            tax: item.tax,
            total: item.total
          })),
          totals: {
            gross: totals.gross,
            discount: totals.discount,
            tax: totals.tax,
            net: totals.net
          },
          payments: {
            cash: 0,
            card: 0,
            wallet: 0,
            change: 0
          }
        },
        options: {
          paper: '80mm',
          showQRCode: true,
          showBarcode: true,
          openCashDrawerOnCash: false,
          roundingMode: 'NEAREST_1',
          footerText: {
            EN: 'Warranty: 7 days | Hotline: 011-1234567',
            SI: 'වගකීම: දින 7 | දුරකථන: 011-1234567',
            TA: 'உத்தரவாதம்: 7 நாட்கள் | தொலைபேசி: 011-1234567'
          }
        }
      };

      await printAdapter.printReceipt(receiptPayload);
      toast.success('Receipt printed successfully');
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to print receipt: ' + (error as Error).message);
    }
  };

  const handleReprintLast = async () => {
    if (!currentSale) {
      toast.error('No last sale to reprint');
      return;
    }

    try {
      const printAdapter = createPrintAdapter();
      const receiptPayload: ReceiptPayload = {
        store: {
          name: 'Grocery POS Store',
          address: '123 Main Street, Colombo 01',
          taxId: '123456789V'
        },
        terminalName: 'Counter-1',
        invoice: {
          id: currentSale.id,
          datetime: new Date().toISOString(),
          language: 'EN',
          priceTier: priceTier,
          isReprint: true,
          items: cartLines.map(item => ({
            sku: item.product.sku,
            name_en: item.product.name_en,
            name_si: item.product.name_si,
            name_ta: item.product.name_ta,
            unit: item.product.unit,
            qty: item.qty,
            unitPrice: item.unit_price,
            lineDiscount: item.line_discount,
            tax: item.tax,
            total: item.total
          })),
          totals: {
            gross: totals.gross,
            discount: totals.discount,
            tax: totals.tax,
            net: totals.net
          },
          payments: {
            cash: 0,
            card: 0,
            wallet: 0,
            change: 0
          }
        },
        options: {
          paper: '80mm',
          showQRCode: true,
          showBarcode: true,
          openCashDrawerOnCash: false,
          roundingMode: 'NEAREST_1',
          footerText: {
            EN: 'Warranty: 7 days | Hotline: 011-1234567',
            SI: 'වගකීම: දින 7 | දුරකථන: 011-1234567',
            TA: 'உத்தரவாதம்: 7 நாட்கள் | தொலைபேசி: 011-1234567'
          }
        }
      };

      await printAdapter.printReceipt(receiptPayload);
      toast.success('Last receipt reprinted successfully');
    } catch (error) {
      console.error('Reprint error:', error);
      toast.error('Failed to reprint: ' + (error as Error).message);
    }
  };

  const getSaleTotals = () => {
    const gross = cartLines.reduce((sum, line) => sum + (line.qty * line.unit_price), 0);
    const discount = cartLines.reduce((sum, line) => sum + line.line_discount, 0);
    const tax = cartLines.reduce((sum, line) => sum + line.tax, 0);
    const net = gross - discount + tax;

    return { gross, discount, tax, net };
  };

  const totals = getSaleTotals();

  return (
    <div className="h-full flex bg-gray-900 text-gray-100">
      {/* Left Panel - Search & Controls */}
      <div className="w-1/3 bg-gray-800 border-r border-gray-700 p-6 flex flex-col">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold">Grocery POS Terminal</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/shift')}
                className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
                title="Shift Management"
              >
                <FileText className="w-4 h-4" />
                Shift
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4 text-gray-400">
              <div className="flex items-center space-x-1">
                {isOnline ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-red-500" />}
                <span>{isOnline ? 'Online' : 'Offline'}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{currentTime.toLocaleTimeString()}</span>
              </div>
              <div className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium">
                {priceTier}
              </div>
            </div>
            
            {/* Cashier & Session Info */}
            <div className="flex items-center gap-4 text-gray-300">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4 text-blue-400" />
                <span className="font-medium">{currentUser?.name}</span>
                <span className="text-xs px-2 py-1 bg-blue-900/50 rounded">
                  {currentUser?.role}
                </span>
              </div>
              {currentSession && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs">Session #{currentSession.id}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search/Scan */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Search/Scan
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Scan barcode or search... (/)"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-48 overflow-y-auto bg-gray-700 rounded-lg">
              {searchResults.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleAddToCart(product)}
                  className="p-3 hover:bg-gray-600 cursor-pointer border-b border-gray-600 last:border-b-0"
                >
                  <div className="font-medium text-white">{product.name_en}</div>
                  <div className="text-sm text-gray-400">
                    SKU: {product.sku} | රු {getPriceForTier(product, priceTier).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Customer Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Customer (Optional)
          </label>
          <select
            value={selectedCustomer?.id || ''}
            onChange={(e) => {
              const customer = customers.find(c => c.id === parseInt(e.target.value));
              setSelectedCustomer(customer || null);
              
              // Auto-set price tier based on customer type
              if (customer) {
                setPriceTier(customer.customer_type);
              } else {
                // Reset to Retail when no customer selected
                setPriceTier('Retail');
              }
            }}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Walk-in Customer (Retail)</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.customer_name} ({customer.customer_type}){!customer.active ? ' (inactive)' : ''}
              </option>
            ))}
          </select>
          {selectedCustomer && (
            <p className="text-xs text-gray-400 mt-1">
              Price tier automatically set to: {selectedCustomer.customer_type}
            </p>
          )}
        </div>

        {/* Price Tier */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Price Tier
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['Retail', 'Wholesale', 'Credit', 'Other'] as const).map((tier) => (
              <button
                key={tier}
                onClick={() => setPriceTier(tier)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  priceTier === tier
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Center Panel - Cart */}
      <div className="flex-1 bg-gray-900 p-6 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Cart</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowHeldSales(true)}
              className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
            >
              Held (F2)
            </button>
            <button
              onClick={startNewSale}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              New Sale
            </button>
          </div>
        </div>

        {cartLines.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">Cart is empty</p>
              <p className="text-gray-500 text-sm">Scan items or search to add products</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-2">
              {cartLines.map((line) => (
                <div key={line.id} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-white">{line.product.name_en}</div>
                      <div className="text-sm text-gray-400">
                        SKU: {line.product.sku} | රු {line.unit_price.toLocaleString()} each
                      </div>
                      {line.applied_rules && line.applied_rules.length > 0 && (
                        <div className="flex items-center mt-1">
                          <Tag className="w-3 h-3 text-green-400 mr-1" />
                          <span className="text-xs text-green-400">
                            Promo applied: {line.applied_rules.map(r => r.rule_name).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleQuantityChange(line.id, -1)}
                          className="p-1 bg-gray-700 text-white rounded hover:bg-gray-600"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-white font-medium w-8 text-center">{line.qty}</span>
                        <button
                          onClick={() => handleQuantityChange(line.id, 1)}
                          className="p-1 bg-gray-700 text-white rounded hover:bg-gray-600"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-white">
                          රු {line.total.toLocaleString()}
                        </div>
                        {line.line_discount > 0 && (
                          <div className="text-sm text-green-400">
                            -රු {line.line_discount.toLocaleString()}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveLine(line.id)}
                        className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Totals & Payment */}
      <div className="w-1/3 bg-gray-800 border-l border-gray-700 p-6 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-gray-400">
            {isOnline ? 'Online' : 'Offline'} • {currentTime.toLocaleTimeString()}
          </div>
          <div className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium">
            {priceTier}
          </div>
        </div>

        {/* Active Discount Warnings */}
        {discountWarnings.length > 0 && (
          <div className="mb-4">
            <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-3">
              <div className="flex items-center mb-2">
                <AlertCircle className="w-4 h-4 text-yellow-400 mr-2" />
                <span className="text-sm font-medium text-yellow-400">Discount Notices</span>
              </div>
              <ul className="text-xs text-yellow-300 space-y-1">
                {discountWarnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Applied Discounts Summary */}
        {appliedDiscounts.length > 0 && (
          <div className="mb-4">
            <div className="bg-green-900 border border-green-700 rounded-lg p-3">
              <div className="flex items-center mb-2">
                <Tag className="w-4 h-4 text-green-400 mr-2" />
                <span className="text-sm font-medium text-green-400">Active Promotions</span>
              </div>
              <ul className="text-xs text-green-300 space-y-1">
                {appliedDiscounts.map((discount, index) => (
                  <li key={index} className="flex justify-between">
                    <span>{discount.rule_name}</span>
                    <span>-රු {discount.discount_amount.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white mb-4">Totals</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-gray-300">
              <span>Gross:</span>
              <span>රු {totals.gross.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-red-400">
              <span>Discount:</span>
              <span>-රු {totals.discount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Tax:</span>
              <span>රු {totals.tax.toLocaleString()}</span>
            </div>
            <div className="border-t border-gray-600 pt-2">
              <div className="flex justify-between text-green-400 font-bold text-lg">
                <span>Net Total:</span>
                <span>රු {totals.net.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white mb-4">Payment</h3>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handleCashPayment}
              disabled={cartLines.length === 0}
              className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cash (F7)
            </button>
            <button 
              onClick={handleCardPayment}
              disabled={cartLines.length === 0}
              className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Card (F8)
            </button>
            <button 
              onClick={handleWalletPayment}
              disabled={cartLines.length === 0}
              className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Wallet/QR (F9)
            </button>
            <button 
              onClick={() => navigate('/returns')}
              className="p-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
            >
              Returns (F9)
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <button 
              onClick={handleHoldSale}
              disabled={cartLines.length === 0}
              className="w-full p-2 bg-yellow-700 text-white rounded hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Hold Sale (F7)
            </button>
            <button 
              onClick={() => setShowHoldListDrawer(true)}
              className="w-full p-2 bg-purple-700 text-white rounded hover:bg-purple-600 flex items-center justify-between"
            >
              <span>Resume Hold (F8)</span>
              {holdCount > 0 && (
                <span className="bg-purple-900 text-purple-200 px-2 py-1 rounded-full text-xs">
                  {holdCount}
                </span>
              )}
            </button>
            <button 
              onClick={() => navigate('/shift')}
              className="w-full p-2 bg-gray-700 text-white rounded hover:bg-gray-600"
            >
              Shift Reports (F10)
            </button>
            <button 
              onClick={() => navigate('/returns')}
              className="w-full p-2 bg-orange-700 text-white rounded hover:bg-orange-600"
            >
              Start Return (F11)
            </button>
          </div>
        </div>

        {/* Quick Tender */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white mb-4">Quick Tender</h3>
          <div className="space-y-2">
            <button className="w-full p-2 bg-gray-700 text-white rounded hover:bg-gray-600">
              Exact (Alt+1)
            </button>
            <button className="w-full p-2 bg-gray-700 text-white rounded hover:bg-gray-600">
              500 (Alt+2)
            </button>
            <button className="w-full p-2 bg-gray-700 text-white rounded hover:bg-gray-600">
              1000 (Alt+3)
            </button>
          </div>
        </div>

        {/* Print Button */}
        <div className="mt-auto">
          <button
            onClick={handlePrintReceipt}
            className="w-full p-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium flex items-center justify-center space-x-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt (Ctrl+P)</span>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-xs text-gray-500">
          <span>Print (Ctrl+P) / Reprint (F4)</span>
        </div>
      </div>

      {/* Hold Create Modal */}
      <HoldCreateModal
        isOpen={showHoldCreateModal}
        onClose={() => setShowHoldCreateModal(false)}
        onConfirm={() => {/* handleCreateHold */}}
        suggestedName={holdService.generateHoldName(
          selectedCustomer?.customer_name,
          cartLines[0]?.product.name_en
        )}
        customers={customers}
      />

      {/* Hold List Drawer */}
      <HoldListDrawer
        isOpen={showHoldListDrawer}
        onClose={() => setShowHoldListDrawer(false)}
        onResume={handleResumeHold}
        terminal={currentSession?.terminal || 'POS-001'}
        currentUserId={currentUser?.id || 0}
      />

      {/* Hold Resume Dialog */}
      <HoldResumeDialog
        isOpen={showHoldResumeDialog}
        onClose={() => {
          setShowHoldResumeDialog(false);
          setSelectedHoldForResume(null);
        }}
        onConfirm={() => {/* handleConfirmResumeHold */}}
        hold={selectedHoldForResume}
        hasCurrentCart={cartLines.length > 0}
      />
    </div>
  );
}
