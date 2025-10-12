import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/utils/cn';
import { 
  Search, 
  Barcode, 
  ShoppingCart, 
  CreditCard, 
  RotateCcw,
  Printer,
  Scale,
  AlertCircle,
  CheckCircle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { AppLayout } from '../../components/Layout/AppLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { EnhancedCart } from '../../components/pos/EnhancedCart';
import { EnhancedCheckoutModal } from '../../components/pos/EnhancedCheckoutModal';
import { ScalePanel } from '../../components/pos/ScalePanel';
import { OfflineBanner } from '../../components/common/OfflineBanner';

interface CartItem {
  id: string;
  productId: number;
  name: string;
  barcode?: string;
  quantity: number;
  unitPrice: number;
  manualDiscount: number;
  autoDiscount: number;
  unit: string;
  lineTotal: number;
  promoApplied?: string;
  priceReason?: string;
  maxReturnable?: number;
}

export default function EnhancedPOS() {
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [scaleConnected, setScaleConnected] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(true);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [scanBuffer, setScanBuffer] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input on mount and after checkout
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Handle barcode scanning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if it's a barcode scan (rapid key presses ending with Enter)
      if (e.key === 'Enter' && scanBuffer.length > 3) {
        handleBarcodeScan(scanBuffer);
        setScanBuffer('');
        return;
      }

      // Accumulate characters for barcode scanning
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setScanBuffer(prev => prev + e.key);
        
        // Clear buffer after 1 second of inactivity
        setTimeout(() => setScanBuffer(''), 1000);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [scanBuffer]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) return;

      switch (e.key) {
        case 'F10':
          e.preventDefault();
          if (cartItems.length > 0) {
            setIsCheckoutOpen(true);
          }
          break;
        case 'F9':
          e.preventDefault();
          // Clear cart
          setCartItems([]);
          break;
        case 'F8':
          e.preventDefault();
          // Reprint last receipt
          break;
        case 'F7':
          e.preventDefault();
          // Open returns
          window.location.href = '/returns';
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [cartItems]);

  const handleBarcodeScan = (barcode: string) => {
    setLastScanTime(new Date());
    
    // Simulate product lookup
    const existingItem = cartItems.find(item => item.barcode === barcode);
    
    if (existingItem) {
      // Increment quantity
      setCartItems(prev => prev.map(item =>
        item.id === existingItem.id
          ? { ...item, quantity: item.quantity + 1, lineTotal: (item.quantity + 1) * item.unitPrice }
          : item
      ));
    } else {
      // Add new item (mock data)
      const newItem: CartItem = {
        id: `item-${Date.now()}`,
        productId: Math.floor(Math.random() * 1000),
        name: `Product ${barcode.slice(-4)}`,
        barcode,
        quantity: 1,
        unitPrice: Math.random() * 100 + 10,
        manualDiscount: 0,
        autoDiscount: 0,
        unit: 'pcs',
        lineTotal: Math.random() * 100 + 10,
        promoApplied: Math.random() > 0.7 ? 'BOGO' : undefined,
        priceReason: Math.random() > 0.8 ? 'Tier 10+' : undefined
      };
      
      setCartItems(prev => [...prev, newItem]);
    }
  };

  const handleSearch = (query: string) => {
    if (query.trim()) {
      // Simulate product search
      console.log('Searching for:', query);
    }
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    setCartItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, quantity, lineTotal: quantity * item.unitPrice }
        : item
    ));
  };

  const handleUpdateManualDiscount = (id: string, discount: number) => {
    setCartItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, manualDiscount: discount, lineTotal: (item.quantity * item.unitPrice) - discount }
        : item
    ));
  };

  const handleRemoveItem = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const handleEditItem = (id: string) => {
    // Handle item editing
    console.log('Edit item:', id);
  };

  const handleCheckoutSuccess = (result: { id: number; receipt_no: string }) => {
    console.log('Checkout successful:', result);
    // Cart will be cleared by print success handler
    setIsCheckoutOpen(false);
    
    // Show success message
    // In a real app, this would be a toast notification
  };

  const handlePrintSuccess = () => {
    // Clear cart only after successful print
    setCartItems([]);
    // Refocus search input
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handlePrintError = (error: string) => {
    console.error('Print error:', error);
    // Don't clear cart on print failure
  };

  const handleCheckoutError = (error: string) => {
    console.error('Checkout error:', error);
    // Show error message
  };

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const totalDiscount = cartItems.reduce((sum, item) => sum + item.manualDiscount + item.autoDiscount, 0);
  const total = subtotal - totalDiscount;

  const header = {
    customer_id: undefined,
    price_tier: 'Retail' as const,
    cashier_id: 1,
    terminal_name: 'POS-001',
    language: 'EN' as const
  };

  return (
    <AppLayout currentPage="Sales">
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* Offline Banner */}
        {!isOnline && (
          <OfflineBanner />
        )}

        {/* Main POS Interface */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Search and Scale */}
          <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            {/* Search Section */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="space-y-4">
                <div className="relative">
                  <Input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Scan barcode or search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch(searchQuery);
                      }
                    }}
                    leftIcon={<Barcode className="w-4 h-4" />}
                    variant="pos"
                    inputSize="lg"
                    className="text-lg"
                  />
                  {lastScanTime && (
                    <div className="absolute -top-8 right-0">
                      <Badge variant="pos-success" size="sm">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Scanned
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="pos-primary"
                    size="sm"
                    onClick={() => handleSearch(searchQuery)}
                    disabled={!searchQuery.trim()}
                    className="flex-1"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>

            {/* Scale Panel */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <ScalePanel
                connected={scaleConnected}
                onConnect={() => setScaleConnected(true)}
                onDisconnect={() => setScaleConnected(false)}
              />
            </div>

            {/* Quick Actions */}
            <div className="p-4 space-y-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="pos-secondary"
                  size="sm"
                  onClick={() => window.location.href = '/returns'}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Returns
                </Button>
                <Button
                  variant="pos-secondary"
                  size="sm"
                  onClick={() => window.location.href = '/reports/z'}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Z Report
                </Button>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="mt-auto p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Status:</span>
                  <div className="flex items-center gap-2">
                    {isOnline ? (
                      <Badge variant="pos-success" size="sm">
                        <Wifi className="w-3 h-3 mr-1" />
                        Online
                      </Badge>
                    ) : (
                      <Badge variant="pos-danger" size="sm">
                        <WifiOff className="w-3 h-3 mr-1" />
                        Offline
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Printer:</span>
                  <Badge 
                    variant={printerConnected ? "pos-success" : "pos-danger"} 
                    size="sm"
                  >
                    {printerConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Scale:</span>
                  <Badge 
                    variant={scaleConnected ? "pos-success" : "pos-danger"} 
                    size="sm"
                  >
                    {scaleConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Cart */}
          <div className="flex-1 flex flex-col">
            <EnhancedCart
              items={cartItems}
              onUpdateQuantity={handleUpdateQuantity}
              onUpdateManualDiscount={handleUpdateManualDiscount}
              onRemoveItem={handleRemoveItem}
              onEditItem={handleEditItem}
              subtotal={subtotal}
              totalDiscount={totalDiscount}
              total={total}
              className="h-full"
            />
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Items: <span className="font-semibold">{cartItems.length}</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total: <span className="font-semibold text-lg">
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setCartItems([])}
                disabled={cartItems.length === 0}
              >
                Clear Cart
              </Button>
              <Button
                variant="pos-primary"
                size="lg"
                onClick={() => setIsCheckoutOpen(true)}
                disabled={cartItems.length === 0}
                leftIcon={<CreditCard className="w-5 h-5" />}
              >
                Checkout (F10)
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      <EnhancedCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        total={total}
        onSuccess={handleCheckoutSuccess}
        onError={handleCheckoutError}
        onPrintSuccess={handlePrintSuccess}
        onPrintError={handlePrintError}
        header={header}
        lines={cartItems}
      />
    </AppLayout>
  );
}


