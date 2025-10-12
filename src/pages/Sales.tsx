import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, CreditCard, Printer, Plus, Minus, Trash2, Download, Clock, Wifi, WifiOff, Tag, AlertCircle, User, LogOut, FileText, X } from 'lucide-react';
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
import { PaymentModal } from '@/components/pos/PaymentModal';
import { SETTINGS } from '@/config/settings';

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
    totals
  } = useCartStore();
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

  // Payment states
  const [paymentData, setPaymentData] = useState({
    cash: 0,
    card: 0,
    wallet: 0,
    change: 0
  });

  // Payment details states
  const [paymentDetails, setPaymentDetails] = useState({
    type: 'cash' as 'cash' | 'card' | 'wallet' | 'credit',
    reference: '',
    cardNumber: '',
    cardType: '',
    notes: ''
  });

  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Manual discount states

  // Shift states
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showCashMovementModal, setShowCashMovementModal] = useState(false);
  const [movementType, setMovementType] = useState<'CASH_IN' | 'CASH_OUT' | 'DROP' | 'PICKUP' | 'PETTY'>('CASH_IN');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');

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
  const handlePayment = (paymentType: 'cash' | 'card' | 'wallet' | 'credit') => {
    if (cartLines.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setPaymentDetails(prev => ({ ...prev, type: paymentType }));
    setShowPaymentModal(true);
  };

  const processPayment = async (paymentData: any) => {
    if (cartLines.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setIsProcessingPayment(true);
    try {
      // Complete sale with payment details
      const saleData = {
        customer_id: selectedCustomer?.id || null,
        cashier_id: currentUser?.id,
        session_id: currentSession?.id,
        terminal_name: currentSession?.terminal,
        payment_method: paymentDetails.type.toUpperCase(),
        payment_reference: paymentData.reference,
        payment_notes: paymentData.notes,
        total_amount: totals.net_total,
        tax_amount: totals.tax_total,
        discount_amount: totals.item_discounts_total,
        manual_discount: totals.manual_discount_amount,
        items: cartLines.map(line => ({
          product_id: line.product_id,
          quantity: line.qty,
          unit_price: line.current_price,
          discount_amount: line.line_discount_value || 0,
          tax_amount: line.tax_amount,
          total_amount: line.line_total
        }))
      };

      // Save to database (would need to implement this in dataService)
      console.log('Processing payment:', saleData);
      
      // Generate unique receipt number and bind sale to active shift
      const receiptNumber = generateReceiptNumber();
      const saleId = parseInt(receiptNumber); // Use receipt number as sale ID
      await bindSaleToShift(saleId);
      
      // Open cash drawer for cash payments
      if (paymentDetails.type === 'cash') {
        openCashDrawer();
      }
      
      // Update payment data
      setPaymentData(prev => ({
        ...prev,
        [paymentDetails.type]: totals.net_total,
        change: paymentData.change || 0
      }));
      
      // Clear cart and start new sale
      clearCart();
      setPaymentData({ cash: 0, card: 0, wallet: 0, change: 0 });
      setPaymentDetails({ type: 'cash', reference: '', cardNumber: '', cardType: '', notes: '' });
      setShowPaymentModal(false);
      startNewSale();
      
      toast.success(`${paymentDetails.type.toUpperCase()} payment processed successfully`);
    } catch (error) {
      console.error('Payment failed:', error);
      toast.error('Payment failed');
    } finally {
      setIsProcessingPayment(false);
    }
  };


  // Authentication check
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    if (!currentSession) {
      // Do not force-redirect; inform the user instead. They can open a shift from Shifts.
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
    
    // Set up time update interval
    const timeInterval = setInterval(updateTime, 1000);
    const onlineInterval = setInterval(() => setIsOnline(navigator.onLine), 5000);
    
    return () => {
      clearInterval(timeInterval);
      clearInterval(onlineInterval);
    };
  }, [currentUser, currentSession]);

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

  // Hold functions
  const handleHoldSale = () => {
    if (cartLines.length === 0) {
      toast.error('Cart is empty - nothing to hold');
      return;
    }
    setShowHoldCreateModal(true);
  };

  const handleCreateHold = async (holdData: any) => {
    try {
      const holdInput: HoldInput = {
        hold_name: holdData.name,
        customer_id: selectedCustomer?.id,
        note: holdData.note,
        terminal_name: currentSession?.terminal || 'POS-001',
        cashier_id: currentUser?.id || 1,
        price_tier: priceTier,
        lines: cartLines.map(line => ({
          product_id: line.product_id,
          quantity: line.qty,
          unit_price: line.current_price,
          discount_amount: line.line_discount_value || 0,
          tax_amount: line.tax_amount,
          total_amount: line.line_total
        }))
      };

      await holdService.createHold(holdInput);
      
      // Clear cart after successful hold
      clearCart();
      setShowHoldCreateModal(false);
      
      // Reload hold count
      await loadHoldCount();
      
      toast.success('Sale held successfully');
      startNewSale();
    } catch (error) {
      console.error('Failed to create hold:', error);
      toast.error('Failed to hold sale');
    }
  };

  const handleResumeHold = (hold: HoldSale) => {
    setSelectedHoldForResume(hold);
    setShowHoldResumeDialog(true);
  };

  const handleConfirmResumeHold = async () => {
    if (!selectedHoldForResume) return;

    try {
      const resumedHold = await holdService.resumeHold(selectedHoldForResume.id, {
        mode: 'replace',
        lock_prices: false
      });

      // Replace current cart with held items
      if (resumedHold.lines) {
        const resumedLines: CartLine[] = resumedHold.lines.map(line => ({
          id: Date.now() + Math.random(),
          product_id: line.product_id,
          product: {
            id: line.product_id,
            name_en: line.product_name,
            sku: line.product_sku,
            price_retail: line.unit_price,
            price_wholesale: line.unit_price,
            price_credit: line.unit_price,
            price_other: line.unit_price,
            unit: 'pc'
          } as Product,
          qty: line.quantity,
          unit_price: line.unit_price,
          line_discount: line.discount_amount,
          tax: line.tax_amount,
          total: line.total_amount
        }));

        // Cart lines are now managed by the cart store
        setPriceTier(resumedHold.price_tier as any);
        
        if (resumedHold.customer_id) {
          const customer = customers.find(c => c.id === resumedHold.customer_id);
          setSelectedCustomer(customer || null);
        }
      }

      setShowHoldResumeDialog(false);
      setSelectedHoldForResume(null);
      
      // Reload hold count
      await loadHoldCount();
      
      toast.success('Hold resumed successfully');
    } catch (error) {
      console.error('Failed to resume hold:', error);
      toast.error('Failed to resume hold');
    }
  };

  // Keyboard shortcuts for reports and returns
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // F7 for Cash Payment
      if (event.key === 'F7') {
        event.preventDefault();
        handlePayment('cash'); // FIX
      }
      
      // F8 for Card Payment
      if (event.key === 'F8') {
        event.preventDefault();
        handlePayment('card'); // FIX
      }
      
      // F9 for Wallet Payment
      if (event.key === 'F9') {
        event.preventDefault();
        handlePayment('wallet'); // FIX
      }
      
      // F10 for Cash Movement
      if (event.key === 'F10') {
        event.preventDefault();
        handleCashMovement();
      }
      
      // F11 for Returns
      if (event.key === 'F11') {
        event.preventDefault();
        navigate('/returns');
      }
      
      // F12 for Z Report
      if (event.key === 'F12') {
        event.preventDefault();
        navigate('/shifts');
      }

      // F2 for Held Sales List
      if (event.key === 'F2') {
        event.preventDefault();
        setShowHeldSales(true);
      }

      // F5 for Hold
      if (event.key === 'F5') {
        event.preventDefault();
        handleHoldSale();
      }

      // F6 for Resume
      if (event.key === 'F6') {
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

      // Print shortcuts (Ctrl+P / Cmd+P)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
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

  // Ensure time updates every second
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  const loadCustomers = async () => {
    try {
      const customerList = await dataService.getCustomers(false); // Get all customers including inactive ones
      setCustomers(customerList);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  // Shift management functions
  const loadCurrentShift = async () => {
    try {
      setShiftLoading(true);
      const terminal = currentSession?.terminal || 'Terminal 1';
      const cashierId = currentUser?.id || 1;
      
      const activeShift = await shiftService.getActiveShift(terminal, cashierId);
      setCurrentShift(activeShift);
      
      // Check if shift is required for sales
      if (settings?.shiftSettings?.requireShiftForSales && !activeShift) {
        setShowShiftModal(true);
      }
    } catch (error) {
      console.error('Failed to load current shift:', error);
    } finally {
      setShiftLoading(false);
    }
  };

  const handleOpenShift = () => {
    navigate('/shifts/new');
  };

  const handleCashMovement = () => {
    setShowCashMovementModal(true);
  };

  const handleAddMovement = async () => {
    if (!currentShift || !movementAmount || parseFloat(movementAmount) <= 0) {
      return;
    }

    try {
      await shiftService.addMovement({
        shift_id: currentShift.id,
        type: movementType,
        amount: parseFloat(movementAmount),
        reason: movementReason || null
      });
      
      // Reset form
      setMovementAmount('');
      setMovementReason('');
      setShowCashMovementModal(false);
      
      // Reload shift data
      await loadCurrentShift();
      
      toast.success('Cash movement added successfully');
    } catch (error) {
      console.error('Failed to add cash movement:', error);
      toast.error('Failed to add cash movement');
    }
  };

  const bindSaleToShift = async (saleId: number) => {
    if (!currentShift) return;
    
    try {
      const terminal = currentSession?.terminal || 'Terminal 1';
      const cashierId = currentUser?.id || 1;
      await shiftService.bindSaleToActiveShift(saleId, terminal, cashierId);
    } catch (error) {
      console.error('Failed to bind sale to shift:', error);
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
      // If numeric and long enough, treat as barcode scan first
      const numericOnly = /^\d{7,}$/;
      if (numericOnly.test(term)) {
        console.log('🔍 Barcode scan detected for:', term);
        
        // Use centralized barcode service
        const { barcodeService } = await import('@/services/barcodeService');
        const barcodeResult = await barcodeService.searchBarcode(term, {
          debounceMs: 0,
          retryAttempts: 2,
          timeout: 5000
        });
        
        console.log('📦 Product found by barcode:', barcodeResult.found ? barcodeResult.product?.name_en : 'None');
        if (barcodeResult.found && barcodeResult.product) {
          // Clear search immediately to prevent race conditions
          setSearchTerm('');
          setSearchResults([]);
          if (searchInputRef.current) {
            searchInputRef.current.value = '';
          }
          await handleAddToCart(barcodeResult.product);
          return;
        }
      }

      const results = await dataService.searchProducts(term);
      console.log('🔍 Search results for term "' + term + '":', results.map(r => r.name_en));
      console.log('🔍 First result details:', results[0] ? { name: results[0].name_en, id: results[0].id } : 'No results');
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
      console.log('⌨️ Enter pressed, current search term:', currentSearchTerm);
      console.log('⌨️ Current searchResults length:', searchResults.length);
      
      if (currentSearchTerm.length >= 2) {
        // Search again to ensure we have fresh results
        try {
      const results = await dataService.searchProducts(currentSearchTerm);
      console.log('🔍 Fresh search results for "' + currentSearchTerm + '":', results.map(r => r.name_en));
      console.log('🔍 First result details:', results[0] ? { name: results[0].name_en, id: results[0].id } : 'No results');
          
          if (results.length > 0) {
            console.log('🛒 Adding first search result to cart:', results[0].name_en);
            await handleAddToCart(results[0]);
            
            // Clear search
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
      console.log('🛒 handleAddToCart called with product:', product.name_en, 'ID:', product.id);
      
      // Auto-start a sale on first add
      if (!currentSale) {
        await startNewSale();
      }

      // Use cart store's addItem method
      await addItem(product, 1);
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
      if (priceTier === 'Retail') {
        // Get SKUs from cart lines
        const skus = lines.map(line => line.product.sku);
        
        // Fetch effective rules explicitly to avoid any lookup edge cases
        const rules = await dataService.getDiscountRulesForSKUs(skus);
        console.log('🧾 Effective rules for cart:', rules);
        
        // Apply discounts using the engine with explicit rules
        const result = await discountEngine.applyRulesToCart({ lines: lines.map(l => ({ ...l, retail_price: l.product.price_retail })), rules });
        // Ensure qty values are preserved after discount application
        result.lines = result.lines.map(l => ({ ...l, qty: l.qty }));
        
        // Update state with applied discounts and warnings
        setAppliedDiscounts(result.appliedRules);
        setDiscountWarnings(result.warnings);
        
        // Show warnings as toasts
        result.warnings.forEach(warning => {
          toast(warning, { icon: '⚠️', duration: 3000 });
        });
        
        return result.lines;
      } else {
        // FIX: Retail-only rule — zero out any rule-driven line discounts for safety
        const clearedLines = lines.map(l => ({ ...l, line_discount_type: null, line_discount_value: 0, retail_price: l.product.price_retail }));
        setAppliedDiscounts([]);
        setDiscountWarnings([]);
        return clearedLines;
      }
    } catch (error) {
      console.error('Error applying discounts:', error);
      return lines;
    }
  };

  const handleQuantityChange = async (lineId: number, change: number) => {
    const line = cartLines.find(l => l.id === lineId.toString());
    if (!line) return;

    // Allow decimal quantities for weight-based items
    const step = line.product.unit === 'kg' ? 0.1 : 1;
    const rawQty = line.qty + change * step;
    const newQty = Math.max(0, line.product.unit === 'kg' ? parseFloat(rawQty.toFixed(3)) : Math.round(rawQty));
    if (newQty === 0) {
      handleRemoveLine(lineId);
      return;
    }

    try {
      // Use cart store's updateItemQuantity method
      await updateItemQuantity(lineId.toString(), newQty);
    } catch (error) {
      console.error('Failed to update quantity:', error);
      toast.error('Failed to update quantity');
    }
  };

  const handleQuantityInput = async (lineId: number, value: string) => {
    const line = cartLines.find(l => l.id === lineId.toString());
    if (!line) return;

    const parsed = line.product.unit === 'kg' ? parseFloat(value || '0') : parseInt(value || '0', 10);
    const newQtyRaw = isNaN(parsed) ? 0 : parsed;
    const newQty = Math.max(0, line.product.unit === 'kg' ? parseFloat(newQtyRaw.toFixed(3)) : Math.round(newQtyRaw));

    try {
      // Use cart store's updateItemQuantity method
      await updateItemQuantity(lineId.toString(), newQty);
    } catch (error) {
      console.error('Failed to set quantity:', error);
      toast.error('Failed to set quantity');
    }
  };

  const handleRemoveLine = async (lineId: number) => {
    try {
      // Use cart store's removeItem method
      removeItem(lineId.toString());
      toast.success('Item removed from cart');
    } catch (error) {
      console.error('Failed to remove line:', error);
      toast.error('Failed to remove item');
    }
  };

  const handlePrintReceipt = async () => {
    // Check if there are items in cart to print
    if (cartLines.length === 0) {
      toast.error('No items in cart to print');
      return;
    }

    setIsPrinting(true);
    try {
      const printAdapter = createPrintAdapter();
      const receiptNumber = generateReceiptNumber();
      const sourceLines = cartLines;
      // Ensure each line has product populated
      const detailedLines = await Promise.all(sourceLines.map(async (l) => {
        const product = (l as any).product || await dataService.getProductById(l.product_id);
        return { ...l, product } as typeof l & { product: Product };
      }));
      const calcTotals = detailedLines.reduce((acc, item) => {
        acc.gross += item.qty * item.current_price;
        acc.discount += item.line_discount_value || 0;
        acc.tax += item.tax_amount || 0;
        return acc;
      }, { gross: 0, discount: 0, tax: 0 });
      const netTotal = calcTotals.gross - calcTotals.discount + calcTotals.tax;
      // Aggregate same product lines (by product_id and unit_price)
      const aggregated = new Map<string, typeof detailedLines[number]>();
      for (const l of detailedLines) {
        const key = `${l.product_id}@${l.current_price}`;
        const existing = aggregated.get(key);
        if (existing) {
          existing.qty += l.qty;
          existing.line_discount_value = (existing.line_discount_value || 0) + (l.line_discount_value || 0);
          existing.tax_amount = (existing.tax_amount || 0) + (l.tax_amount || 0);
          existing.line_total = (existing.line_total || 0) + (l.line_total || 0);
        } else {
          aggregated.set(key, { ...l });
        }
      }

      const printableLines = Array.from(aggregated.values());

      const receiptPayload: ReceiptPayload = {
        store: {
          name: 'Grocery POS Store',
          address: '123 Main Street, Colombo 01',
          taxId: '123456789V'
        },
        terminalName: 'Counter-1',
        invoice: {
          id: receiptNumber, // Use receipt number as invoice ID
          datetime: new Date().toISOString(),
          language: printLanguage,
          priceTier: priceTier,
          isReprint: false,
          items: printableLines.map(item => {
            const computedQty = item.qty && item.qty > 0 
              ? item.qty 
              : Math.max(1, Math.round(((item.line_total + (item.line_discount_value || 0) - (item.tax_amount || 0)) / (item.current_price || 1))));
            return ({
            sku: (item as any).product?.sku || 'Unknown',
            name_en: (item as any).product?.name_en || 'Unknown Product',
            name_si: (item as any).product?.name_si,
            name_ta: (item as any).product?.name_ta,
            unit: (item as any).product?.unit || 'pc',
            qty: computedQty,
            unitPrice: item.current_price,
            lineDiscount: item.line_discount_value || 0,
            tax: item.tax_amount,
            total: item.line_total
            });
          }),
          totals: {
            gross: totals.gross,
            discount: totals.item_discounts_total,
            tax: totals.tax_total,
            net: totals.net_total
          },
          payments: {
            cash: paymentData.cash,
            card: paymentData.card,
            wallet: paymentData.wallet,
            change: paymentData.change
          }
        },
        options: {
          paper: '80mm',
          showQRCode: false,
          showBarcode: showBarcodeOnReceipt,
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
      toast.success(`Receipt printed successfully - Receipt #${receiptNumber}`);
      
      // Clear cart after successful print
      clearCart();
      setPaymentData({ cash: 0, card: 0, wallet: 0, change: 0 });
      setPaymentDetails({ type: 'cash', reference: '', cardNumber: '', cardType: '', notes: '' });
      startNewSale();
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to print receipt: ' + (error as Error).message);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleReprintLast = async () => {
    const activeSale = posService.getCurrentSale() || currentSale;
    if (!activeSale) {
      toast.error('No last sale to reprint');
      return;
    }

    try {
      const printAdapter = createPrintAdapter();
      const sourceLines = cartLines.length > 0 ? cartLines : posService.getCurrentLines();
      const calcTotals = sourceLines.reduce((acc, item) => {
        const unitPrice = 'current_price' in item ? item.current_price : (item as any).unit_price;
        const discount = 'line_discount_value' in item ? (item.line_discount_value || 0) : ((item as any).line_discount || 0);
        const tax = 'tax_amount' in item ? (item.tax_amount || 0) : ((item as any).tax || 0);
        
        acc.gross += item.qty * unitPrice;
        acc.discount += discount;
        acc.tax += tax;
        return acc;
      }, { gross: 0, discount: 0, tax: 0 });
      const netTotal = calcTotals.gross - calcTotals.discount + calcTotals.tax;
      const receiptPayload: ReceiptPayload = {
        store: {
          name: 'Grocery POS Store',
          address: '123 Main Street, Colombo 01',
          taxId: '123456789V'
        },
        terminalName: 'Counter-1',
        invoice: {
          id: activeSale.id,
          datetime: new Date().toISOString(),
          language: printLanguage,
          priceTier: priceTier,
          isReprint: true,
          items: sourceLines.map(item => ({
            sku: (item as any).product?.sku || 'Unknown',
            name_en: (item as any).product?.name_en || 'Unknown Product',
            name_si: (item as any).product?.name_si,
            name_ta: (item as any).product?.name_ta,
            unit: (item as any).product?.unit || 'pc',
            qty: item.qty,
            unitPrice: 'current_price' in item ? item.current_price : (item as any).unit_price,
            lineDiscount: 'line_discount_value' in item ? (item.line_discount_value || 0) : ((item as any).line_discount || 0),
            tax: 'tax_amount' in item ? item.tax_amount : ((item as any).tax || 0),
            total: 'line_total' in item ? item.line_total : ((item as any).total || 0)
          })),
          totals: {
            gross: calcTotals.gross,
            discount: calcTotals.discount,
            tax: calcTotals.tax,
            net: netTotal
          },
          payments: {
            cash: paymentData.cash,
            card: paymentData.card,
            wallet: paymentData.wallet,
            change: paymentData.change
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

  // FIX: Centralized totals math — line discounts -> manual discount -> tax
  const getSaleTotals = () => {
    const taxRate = SETTINGS.TAX_RATE;

    // line subtotal is qty * unit_price minus any line discount ALREADY applied per line (if any UI field exists)
    const gross = cartLines.reduce((acc, l) => acc + (l.current_price * l.qty), 0);

    const lineDiscounts = cartLines.reduce((acc, l) => {
      // assume we store l.line_discount_value (absolute) or derive from type; normalize to absolute
      const v = l.line_discount_value ? Number(l.line_discount_value) : 0;
      return acc + v;
    }, 0);

    const baseForManual = Math.max(0, gross - lineDiscounts); // FIX: manual discount must apply AFTER line discounts

    let manualDiscountValue = 0;
    if (manualDiscount?.type === 'PERCENTAGE') {
      manualDiscountValue = Math.min(baseForManual, baseForManual * (Number(manualDiscount.value || 0) / 100));
    } else if (manualDiscount?.type === 'FIXED_AMOUNT') {
      manualDiscountValue = Math.min(baseForManual, Number(manualDiscount.value || 0));
    }

    const discountedSubtotal = Math.max(0, baseForManual - manualDiscountValue);

    // FIX: tax AFTER all discounts (no per-line tax sum)
    const tax = +(discountedSubtotal * taxRate).toFixed(2);
    const net = +(discountedSubtotal + tax).toFixed(2);

    return {
      gross: +gross.toFixed(2),
      discount: +(lineDiscounts + manualDiscountValue).toFixed(2),
      lineDiscounts: +lineDiscounts.toFixed(2),
      manualDiscount: +manualDiscountValue.toFixed(2),
      tax_total: tax,
      net: net
    };
  };

  const calculatedTotals = getSaleTotals();

  return (
    <div className="h-full flex flex-col lg:flex-row bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100">
      {/* Left Panel - Search & Controls */}
      <div className="w-full lg:w-1/3 bg-gradient-to-b from-gray-800 to-gray-900 border-r-0 lg:border-r-2 border-gray-700 p-4 lg:p-6 flex flex-col shadow-2xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
                <ShoppingCart className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Point of Sale</h1>
                <p className="text-sm text-gray-400">Terminal System</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/shifts')}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                title="Shift Management"
              >
                <FileText className="w-4 h-4" />
                Shift
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
          
          {/* Shift Status Indicator */}
          {!shiftLoading && (
            <div className="mb-4 p-3 rounded-lg border">
              {currentShift ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">Shift Open</span>
                    <span className="text-xs text-gray-400">ID: {currentShift.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCashMovement}
                      className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
                      title="Cash In/Out (F10)"
                    >
                      Cash In/Out
                    </button>
                    <button
                      onClick={() => navigate(`/shifts/${currentShift.id}`)}
                      className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded"
                    >
                      View
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm font-medium text-red-400">No Active Shift</span>
                  </div>
                  <button
                    onClick={handleOpenShift}
                    className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded"
                  >
                    Open Shift
                  </button>
                </div>
              )}
            </div>
          )}
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4 text-gray-400">
              <div className="flex items-center space-x-1">
                {isOnline ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-red-500" />}
                <span>{isOnline ? 'Online' : 'Offline'}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span className="font-mono text-sm">{currentTime.toLocaleTimeString()}</span>
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
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Scan barcode or search products... (Press / to focus)"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-12 pr-4 py-4 bg-gray-700 border-2 border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-4 focus:ring-blue-500/50 focus:border-blue-500 text-lg font-medium shadow-lg transition-all duration-200 hover:border-gray-500"
              aria-label="Search products by name or scan barcode"
              aria-describedby="search-help"
              autoComplete="off"
            />
          </div>
          <div id="search-help" className="mt-2 text-xs text-gray-400 flex items-center gap-2">
            <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
            <span>Use barcode scanner or type product name/SKU</span>
          </div>
          
          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 max-h-64 overflow-y-auto bg-gray-700 rounded-xl border border-gray-600 shadow-lg">
              <div className="p-3 border-b border-gray-600 bg-gray-800 rounded-t-xl">
                <div className="text-sm font-semibold text-gray-300">Search Results ({searchResults.length})</div>
              </div>
              {searchResults.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleAddToCart(product)}
                  className="p-4 hover:bg-gray-600 cursor-pointer border-b border-gray-600 last:border-b-0 transition-colors duration-200 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-white text-lg">{product.name_en}</div>
                      <div className="text-sm text-gray-400 mt-1">
                        SKU: <span className="font-mono text-blue-300">{product.sku}</span>
                      </div>
                      <div className="text-sm text-gray-400">
                        Price: <span className="font-bold text-green-400">රු {getPriceForTier(product, priceTier).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Click to add</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Customer Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-300 mb-3">
            Customer Selection
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
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
              className="w-full pl-10 pr-4 py-3 bg-gray-700 border-2 border-gray-600 rounded-xl text-white focus:ring-4 focus:ring-blue-500/50 focus:border-blue-500 text-lg font-medium shadow-lg transition-all duration-200 hover:border-gray-500"
            >
              <option value="">Walk-in Customer (Retail)</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.customer_name} ({customer.customer_type}){!customer.active ? ' (inactive)' : ''}
                </option>
              ))}
            </select>
          </div>
          {selectedCustomer && (
            <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <div className="text-sm text-blue-300">
                <span className="font-semibold">Selected:</span> {selectedCustomer.customer_name}
              </div>
              <div className="text-xs text-blue-400 mt-1">
                Price tier automatically set to: <span className="font-bold">{selectedCustomer.customer_type}</span>
              </div>
            </div>
          )}
        </div>

        {/* Price Tier */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-300 mb-3">
            Price Tier
          </label>
          <div className="grid grid-cols-2 gap-3">
            {([
              { key: 'Retail', label: 'Retail', color: 'blue' },
              { key: 'Wholesale', label: 'Wholesale', color: 'green' },
              { key: 'Credit', label: 'Credit', color: 'purple' },
              { key: 'Other', label: 'Other', color: 'orange' }
            ] as const).map((tier) => (
              <button
                key={tier.key}
                onClick={() => setPriceTier(tier.key)}
                className={`px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg ${
                  priceTier === tier.key
                    ? `bg-${tier.color}-600 text-white shadow-${tier.color}-500/50`
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:shadow-md'
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-400 flex items-center gap-2">
            <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
            <span>Current tier: <span className="font-bold text-blue-300">{priceTier}</span></span>
          </div>
        </div>

        {/* Print Language */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Print Language
          </label>
          <div className="grid grid-cols-3 gap-2" data-testid="print-language">
            {(['EN', 'SI', 'TA'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setPrintLanguage(lang)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  printLanguage === lang
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Receipt Options */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Receipt Options
          </label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showBarcodeOnReceipt}
                onChange={(e) => setShowBarcodeOnReceipt(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-1"
              />
              <span className="text-sm text-gray-300">Include barcode on receipt</span>
            </label>
          </div>
        </div>
      </div>

      {/* Center Panel - Cart */}
      <div className="flex-1 bg-gray-900 p-4 lg:p-6 flex flex-col min-h-0">
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
          <div className="flex-1 flex items-center justify-center" data-testid="cart-empty">
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
                      <div className="font-medium text-white">{line.name}</div>
                      <div className="text-sm text-gray-400">
                        SKU: {line.sku} | රු {line.current_price.toLocaleString()} each
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleQuantityChange(parseInt(line.id), -1)}
                          className="p-1 bg-gray-700 text-white rounded hover:bg-gray-600"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          inputMode="decimal"
                          step={line.unit === 'kg' ? 0.1 : 1}
                          min={0}
                          value={line.qty}
                          onChange={(e) => handleQuantityInput(parseInt(line.id), e.target.value)}
                          className="w-16 text-center bg-gray-700 text-white rounded px-2 py-1 border border-gray-600 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          onClick={() => handleQuantityChange(parseInt(line.id), 1)}
                          className="p-1 bg-gray-700 text-white rounded hover:bg-gray-600"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-white">
                          රු {line.line_total.toLocaleString()}
                        </div>
                        {line.line_discount_value && line.line_discount_value > 0 && (
                          <div className="text-xs text-green-400">
                            Savings: රු {line.line_discount_value.toLocaleString()}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveLine(parseInt(line.id))}
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
      <div className="w-full lg:w-1/3 bg-gray-800 border-l-0 lg:border-l border-gray-700 p-4 lg:p-6 flex flex-col">
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

        {/* Manual Discount */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white mb-4">Manual Discount</h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => setManualDiscount({ value: manualDiscount.value, type: 'FIXED_AMOUNT' })}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  manualDiscount.type === 'FIXED_AMOUNT'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                data-testid="manual-discount-type"
              >
                Fixed Amount
              </button>
              <button
                onClick={() => setManualDiscount({ value: manualDiscount.value, type: 'PERCENTAGE' })}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  manualDiscount.type === 'PERCENTAGE'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                data-testid="manual-discount-type"
              >
                Percentage (%)
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step={manualDiscount.type === 'PERCENTAGE' ? '0.1' : '1'}
                max={manualDiscount.type === 'PERCENTAGE' ? '100' : undefined}
                value={manualDiscount.value || 0}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  const maxValue = manualDiscount.type === 'PERCENTAGE' ? 100 : totals.gross;
                  const clampedValue = Math.min(value, maxValue);
                  setManualDiscount({ 
                    type: manualDiscount.type,
                    value: clampedValue 
                  });
                }}
                placeholder={manualDiscount.type === 'PERCENTAGE' ? '0.0' : '0'}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                data-testid="manual-discount-value"
                aria-label={`Manual discount ${manualDiscount.type === 'PERCENTAGE' ? 'percentage' : 'amount'}`}
                aria-describedby="manual-discount-help"
              />
              <button
                onClick={() => setManualDiscount({ value: 0, type: 'FIXED_AMOUNT' })}
                className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 text-sm"
              >
                Clear
              </button>
            </div>
            {manualDiscount.value > 0 && (
              <div className="text-sm text-blue-400" id="manual-discount-help">
                Manual Discount: රු {totals.manual_discount_amount.toLocaleString()}
                {manualDiscount.type === 'PERCENTAGE' && (
                  <span className="text-xs text-gray-400 ml-2">
                    (Max: 100%)
                  </span>
                )}
                {manualDiscount.type === 'FIXED_AMOUNT' && (
                  <span className="text-xs text-gray-400 ml-2">
                    (Max: රු {totals.gross.toLocaleString()})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Totals */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white mb-4">Totals</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-gray-300">
              <span>Gross:</span>
              <span>රු {totals.gross.toLocaleString()}</span>
            </div>
            {totals.item_discounts_total > 0 && (
              <div className="flex justify-between text-green-400">
                <span>Item Savings:</span>
                <span>රු {totals.item_discounts_total.toLocaleString()}</span>
              </div>
            )}
            {totals.manual_discount_amount > 0 && (
              <div className="flex justify-between text-blue-400">
                <span>Manual Discount:</span>
                <span>රු {totals.manual_discount_amount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-300">
              <span>Tax:</span>
              <span>රු {totals.tax_total.toLocaleString()}</span>
            </div>
            <div className="border-t border-gray-600 pt-2">
              <div className="flex justify-between text-green-400 font-bold text-lg" data-testid="net-total">
                <span>Net Total:</span>
                <span>රු {totals.net_total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white mb-4">Payment</h3>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handlePayment('cash')}
              disabled={cartLines.length === 0 || isProcessingPayment}
              className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessingPayment && paymentDetails.type === 'cash' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                'Cash (F7)'
              )}
            </button>
            <button 
              onClick={() => handlePayment('card')}
              disabled={cartLines.length === 0 || isProcessingPayment}
              className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessingPayment && paymentDetails.type === 'card' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                'Card (F8)'
              )}
            </button>
            <button 
              onClick={() => handlePayment('wallet')}
              disabled={cartLines.length === 0 || isProcessingPayment}
              className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessingPayment && paymentDetails.type === 'wallet' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                'Wallet/QR (F9)'
              )}
            </button>
            <button 
              onClick={() => handlePayment('credit')}
              disabled={cartLines.length === 0 || isProcessingPayment}
              className="p-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessingPayment && paymentDetails.type === 'credit' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                'Credit (F10)'
              )}
            </button>
          </div>
          <div className="mt-3">
            <button 
              onClick={() => navigate('/returns')}
              className="w-full p-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
            >
              Returns (F11)
            </button>
          </div>
        </div>

        {/* Print Button */}
        <div className="mb-6">
          <button
            onClick={handlePrintReceipt}
            disabled={cartLines.length === 0 || isPrinting}
            className="w-full p-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPrinting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Printing...</span>
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                <span>Print Receipt (Ctrl+P)</span>
              </>
            )}
          </button>
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
              Hold Sale (F5)
            </button>
            <button 
              onClick={() => setShowHoldListDrawer(true)}
              className="w-full p-2 bg-purple-700 text-white rounded hover:bg-purple-600 flex items-center justify-between"
            >
              <span>Resume Hold (F6)</span>
              {holdCount > 0 && (
                <span className="bg-purple-900 text-purple-200 px-2 py-1 rounded-full text-xs">
                  {holdCount}
                </span>
              )}
            </button>
            <button 
              onClick={() => navigate('/shifts')}
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
            <button 
              onClick={() => handlePayment('cash')}
              disabled={cartLines.length === 0}
              className="w-full p-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Set exact amount and process cash payment"
            >
              Exact (Alt+1)
            </button>
            <button 
              onClick={() => {
                // Set a quick amount for cash payment
                if (cartLines.length > 0) {
                  handlePayment('cash');
                }
              }}
              disabled={cartLines.length === 0}
              className="w-full p-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Quick cash payment"
            >
              500 (Alt+2)
            </button>
            <button 
              onClick={() => {
                // Set a quick amount for cash payment
                if (cartLines.length > 0) {
                  handlePayment('cash');
                }
              }}
              disabled={cartLines.length === 0}
              className="w-full p-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Quick cash payment"
            >
              1000 (Alt+3)
            </button>
          </div>
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
        onConfirm={handleCreateHold}
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
        onConfirm={handleConfirmResumeHold}
        hold={selectedHoldForResume}
        hasCurrentCart={cartLines.length > 0}
      />

      {/* Shift Required Modal */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-orange-500" />
              <h2 className="text-xl font-semibold text-gray-900">Shift Required</h2>
            </div>
            <p className="text-gray-600 mb-6">
              A shift must be opened before processing sales. Please open a shift to continue.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleOpenShift}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Open Shift
              </button>
              <button
                onClick={() => setShowShiftModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cash Movement Modal */}
      {showCashMovementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Cash Movement</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value as any)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="CASH_IN">Cash In</option>
                  <option value="CASH_OUT">Cash Out</option>
                  <option value="DROP">Drop</option>
                  <option value="PICKUP">Pickup</option>
                  <option value="PETTY">Petty Cash</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Optional)</label>
                <input
                  type="text"
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  placeholder="Enter reason..."
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddMovement}
                disabled={!movementAmount || parseFloat(movementAmount) <= 0}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add Movement
              </button>
              <button
                onClick={() => setShowCashMovementModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          paymentType={paymentDetails.type.toUpperCase()}
          total={totals.net_total}
          onClose={() => setShowPaymentModal(false)}
          onConfirm={processPayment}
        />
      )}
    </div>
  );
}
