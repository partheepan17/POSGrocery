import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Search, CreditCard, Printer, Plus, Minus, Trash2, Download, Clock, Wifi, WifiOff } from 'lucide-react';
import { posService, POSHeldSale } from '@/services/posService';
import { dataService, Product, Customer } from '@/services/dataService';
import { useAppStore } from '@/store/appStore';
import { toast } from 'react-hot-toast';
import { createPrintAdapter } from '@/adapters/PrintAdapter';
import { ReceiptPayload } from '@/types/receipt';

interface CartLine {
  id: number;
  product_id: number;
  product: Product;
  qty: number;
  unit_price: number;
  line_discount: number;
  tax: number;
  total: number;
}

export function Sales() {
  const { theme } = useAppStore();
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

  // Initialize
  useEffect(() => {
    loadCustomers();
    startNewSale();
    updateTime();
    
    const timeInterval = setInterval(updateTime, 1000);
    const onlineInterval = setInterval(() => setIsOnline(navigator.onLine), 5000);
    
    return () => {
      clearInterval(timeInterval);
      clearInterval(onlineInterval);
    };
  }, []);

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
      const customerList = await dataService.getCustomers();
      setCustomers(customerList);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const startNewSale = async () => {
    try {
      const sale = await posService.startSale({
        cashier_id: 1, // Mock cashier
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

  const searchProducts = async (term: string) => {
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    searchProducts(value);
  };

  const handleAddProduct = async (product: Product, qty: number = 1) => {
    try {
      await posService.addLine({
        sale_id: currentSale.id,
        product_id: product.id,
        qty: qty
      });

      // Update cart display
      const currentLines = posService.getCurrentLines();
      const cartLines: CartLine[] = [];
      
      for (const line of currentLines) {
        const product = await dataService.getProductById(line.product_id);
        if (product) {
          cartLines.push({
            ...line,
            product
          });
        }
      }
      
      setCartLines(cartLines);
      setSearchTerm('');
      setSearchResults([]);
      
      toast.success(`Added ${product.name_en} to cart`);
    } catch (error) {
      console.error('Failed to add product:', error);
      toast.error('Failed to add product to cart');
    }
  };

  const handleBarcodeScan = async (barcode: string) => {
    try {
      // Try normal product lookup first
      let product = await dataService.getProductByBarcode(barcode);
      
      if (!product && barcode.length > 13) {
        // Try scale barcode parsing
        const scaleResult = posService.parseScaleBarcode(barcode);
        if (scaleResult) {
          product = await dataService.getProductByBarcode(barcode.substring(0, 13));
          if (product) {
            if (scaleResult.line_total) {
              // Price override
              await posService.addLine({
                sale_id: currentSale.id,
                product_id: product.id,
                qty: scaleResult.qty,
                unit_price: scaleResult.line_total / scaleResult.qty
              });
            } else {
              // Weight
              await posService.addLine({
                sale_id: currentSale.id,
                product_id: product.id,
                qty: scaleResult.qty
              });
            }
            
            updateCartDisplay();
            toast.success(`Added ${product.name_en} (${scaleResult.qty}kg)`);
            return;
          }
        }
      }

      if (product) {
        await handleAddProduct(product, 1);
      } else {
        toast.error('Product not found');
      }
    } catch (error) {
      console.error('Barcode scan failed:', error);
      toast.error('Failed to process barcode');
    }
  };

  const updateCartDisplay = async () => {
    const currentLines = posService.getCurrentLines();
    const cartLines: CartLine[] = [];
    
    for (const line of currentLines) {
      const product = await dataService.getProductById(line.product_id);
      if (product) {
        cartLines.push({
          ...line,
          product
        });
      }
    }
    
    setCartLines(cartLines);
  };

  const handleQuantityChange = (lineId: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveLine(lineId);
      return;
    }

    posService.updateLineQty(lineId, newQty);
    updateCartDisplay();
  };

  const handleRemoveLine = (lineId: number) => {
    posService.removeLine(lineId);
    updateCartDisplay();
    toast.success('Line removed');
  };

  const handleDiscountDialog = (line: CartLine) => {
    setSelectedLineForDiscount(line);
    setDiscountAmount('');
    discountDialogRef.current?.showModal();
  };

  const applyDiscount = async () => {
    if (!selectedLineForDiscount) return;

    try {
      const amount = parseFloat(discountAmount);
      if (isNaN(amount)) {
        toast.error('Invalid discount amount');
        return;
      }

      await posService.applyLineDiscount({
        sale_id: currentSale.id,
        line_id: selectedLineForDiscount.id,
        percent: discountType === 'percent' ? amount : undefined,
        amount: discountType === 'amount' ? amount : undefined
      });

      updateCartDisplay();
      discountDialogRef.current?.close();
      toast.success('Discount applied');
    } catch (error) {
      console.error('Failed to apply discount:', error);
      toast.error('Failed to apply discount');
    }
  };

  const getSaleTotals = () => {
    return posService.getSaleTotals();
  };

  const handlePayment = async (paymentType: 'cash' | 'card' | 'wallet') => {
    const totals = getSaleTotals();
    
    try {
      const payments = {
        cash: paymentType === 'cash' ? totals.net : 0,
        card: paymentType === 'card' ? totals.net : 0,
        wallet: paymentType === 'wallet' ? totals.net : 0
      };

      const finalizedSale = await posService.finalizeSale({
        sale_id: currentSale.id,
        payments
      });

      toast.success('Sale completed successfully');
      
      // Start new sale
      await startNewSale();
    } catch (error) {
      console.error('Payment failed:', error);
      toast.error('Payment failed');
    }
  };

  const handleHoldSale = async () => {
    try {
      await posService.holdSale(currentSale.id);
      toast.success('Sale held');
      await startNewSale();
    } catch (error) {
      console.error('Failed to hold sale:', error);
      toast.error('Failed to hold sale');
    }
  };

  const handleResumeSale = async (sale: POSHeldSale) => {
    try {
      const resumedSale = await posService.resumeSale(sale.id);
      if (resumedSale) {
        setCurrentSale(resumedSale);
        setCartLines(sale.lines.map(line => ({ ...line, product: {} as Product })));
        setShowHeldSales(false);
        toast.success('Sale resumed');
      }
    } catch (error) {
      console.error('Failed to resume sale:', error);
      toast.error('Failed to resume sale');
    }
  };

  const handleExportToday = async () => {
    try {
      const csvContent = await posService.exportTodayCsv();
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Today\'s sales exported');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed');
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
          language: 'EN', // TODO: Get from settings
          priceTier: 'Retail', // TODO: Get from current sale
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
            cash: 0, // TODO: Get from payment data
            card: 0,
            wallet: 0,
            change: 0
          }
        },
        options: {
          paper: '80mm', // TODO: Get from settings
          showQRCode: true, // TODO: Get from settings
          showBarcode: true, // TODO: Get from settings
          openCashDrawerOnCash: false, // TODO: Get from settings
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
          priceTier: 'Retail',
          isReprint: true, // Mark as reprint
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

  const totals = getSaleTotals();

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Grocery POS</h1>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Terminal:</span>
              <span className="font-medium">Counter-1</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {isOnline ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-red-500" />}
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-mono">
                {currentTime.toLocaleTimeString()}
              </span>
            </div>
            
            <div className={`px-2 py-1 rounded text-xs font-medium ${
              priceTier === 'Retail' ? 'bg-blue-100 text-blue-800' :
              priceTier === 'Wholesale' ? 'bg-green-100 text-green-800' :
              priceTier === 'Credit' ? 'bg-yellow-100 text-yellow-800' :
              'bg-purple-100 text-purple-800'
            }`}>
              {priceTier}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Left Column */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4">
          {/* Search/Scan Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search/Scan (Press / to focus)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && searchResults.length > 0) {
                    handleAddProduct(searchResults[0]);
                  }
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Scan barcode or search..."
              />
            </div>
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                {searchResults.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleAddProduct(product)}
                    className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                  >
                    <div className="font-medium text-sm">{product.name_en}</div>
                    <div className="text-xs text-gray-500">SKU: {product.sku}</div>
                    <div className="text-xs text-gray-500">
                      {priceTier}: රු {(product as any)[`price_${priceTier.toLowerCase()}`]}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Customer (Optional)
            </label>
            <select
              value={selectedCustomer?.id || ''}
              onChange={(e) => {
                const customer = customers.find(c => c.id === parseInt(e.target.value));
                setSelectedCustomer(customer || null);
                if (customer) {
                  setPriceTier(customer.customer_type as any);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="">Walk-in Customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.customer_name} ({customer.customer_type})
                </option>
              ))}
            </select>
          </div>

          {/* Price Tier Switch */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Price Tier
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['Retail', 'Wholesale', 'Credit', 'Other'].map((tier) => (
                <button
                  key={tier}
                  onClick={() => setPriceTier(tier as any)}
                  className={`px-3 py-2 text-sm rounded-lg border ${
                    priceTier === tier
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center - Cart */}
        <div className="flex-1 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-full">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Cart</h2>
            </div>
            
            <div className="p-4 h-full overflow-y-auto">
              {cartLines.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Cart is empty</p>
                    <p className="text-sm">Scan items or search to add products</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {cartLines.map((line) => (
                    <div key={line.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {line.product.name_en}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          SKU: {line.product.sku}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleQuantityChange(line.id, line.qty - 1)}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-12 text-center font-medium">{line.qty}</span>
                          <button
                            onClick={() => handleQuantityChange(line.id, line.qty + 1)}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-medium">රු {line.unit_price.toFixed(2)}</div>
                          {line.line_discount > 0 && (
                            <div className="text-sm text-red-500">-රු {line.line_discount.toFixed(2)}</div>
                          )}
                          <div className="font-semibold">රු {line.total.toFixed(2)}</div>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleDiscountDialog(line)}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-blue-600"
                            title="Apply Discount (Ctrl+D)"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveLine(line.id)}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-red-600"
                            title="Remove Line (Del)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Totals & Payments */}
        <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4">
          {/* Totals */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Totals</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Gross:</span>
                <span className="font-medium">රු {totals.gross.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Discount:</span>
                <span className="font-medium text-red-600">-රු {totals.discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                <span className="font-medium">රු {totals.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2">
                <span className="text-lg font-semibold text-gray-900 dark:text-white">Net Total:</span>
                <span className="text-lg font-bold text-green-600">රු {totals.net.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment</h3>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => handlePayment('cash')}
                className="p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
              >
                Cash (F7)
              </button>
              <button
                onClick={() => handlePayment('card')}
                className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
              >
                Card (F8)
              </button>
              <button
                onClick={() => handlePayment('wallet')}
                className="p-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-medium"
              >
                Wallet/QR (F9)
              </button>
              <button className="p-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium">
                Split Payment (F10)
              </button>
            </div>
          </div>

          {/* Quick Tender */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Tender</h3>
            <div className="grid grid-cols-3 gap-2">
              <button className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm">
                Exact (Alt+1)
              </button>
              <button className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm">
                500 (Alt+2)
              </button>
              <button className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm">
                1000 (Alt+3)
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={handleHoldSale}
              className="w-full p-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-medium"
            >
              Hold Sale (F2)
            </button>
            <button
              onClick={() => setShowHeldSales(true)}
              className="w-full p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
            >
              Resume Sale (F3)
            </button>
            <button
              onClick={handleExportToday}
              className="w-full p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export Today's Invoices</span>
            </button>
            <button 
              onClick={handlePrintReceipt}
              className="w-full p-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium flex items-center justify-center space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt (Ctrl+P)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-2">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center space-x-4">
            <span>Hold (F2) / Resume (F3)</span>
            <span>Print (Ctrl+P) / Reprint (F4)</span>
            <span>Help (F12)</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Cashier: Manager User</span>
            <span>Sale ID: {currentSale?.id || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Discount Dialog */}
      <dialog ref={discountDialogRef} className="rounded-lg shadow-lg">
        <div className="p-6 w-96">
          <h3 className="text-lg font-semibold mb-4">Apply Discount</h3>
          
          {selectedLineForDiscount && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Product: {selectedLineForDiscount.product.name_en}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Qty: {selectedLineForDiscount.qty} × රු {selectedLineForDiscount.unit_price.toFixed(2)}
              </p>
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Discount Type</label>
            <div className="flex space-x-2">
              <button
                onClick={() => setDiscountType('percent')}
                className={`px-3 py-1 rounded text-sm ${
                  discountType === 'percent' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Percentage
              </button>
              <button
                onClick={() => setDiscountType('amount')}
                className={`px-3 py-1 rounded text-sm ${
                  discountType === 'amount' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Amount
              </button>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Discount {discountType === 'percent' ? '(%)' : '(රු)'}
            </label>
            <input
              type="number"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder={discountType === 'percent' ? 'Enter percentage' : 'Enter amount'}
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => discountDialogRef.current?.close()}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={applyDiscount}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Apply
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
