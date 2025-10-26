/**
 * Cashier Interface Component
 * Optimized for cashier workflow with large buttons and clear visual hierarchy
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  User,
  Search,
  Barcode,
  X,
  Plus,
  Minus,
  Trash2,
  Receipt,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useNotify } from '@/hooks/useNotify';
import { formatCurrency } from '@/utils/currency';

interface CashierInterfaceProps {
  onPayment: (type: 'cash' | 'card' | 'wallet' | 'credit') => void;
  onSearch: (query: string) => void;
  onBarcodeScan: (barcode: string) => void;
  onQuantityChange: (productId: number, quantity: number) => void;
  onRemoveItem: (productId: number) => void;
  onClearCart: () => void;
  onHoldSale: () => void;
  onResumeSale: () => void;
  searchResults?: any[];
  onAddToCart?: (product: any) => void;
  loading?: boolean;
}

export function CashierInterface({
  onPayment,
  onSearch,
  onBarcodeScan,
  onQuantityChange,
  onRemoveItem,
  onClearCart,
  onHoldSale,
  onResumeSale,
  searchResults = [],
  onAddToCart,
  loading = false
}: CashierInterfaceProps) {
  const { t } = useTranslation();
  const notify = useNotify();
  const navigate = useNavigate();
  const { items, totals, customerName } = useCartStore();
  const { userRole, terminalId } = useUIStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    enableGlobalShortcuts: true,
    enableSalesShortcuts: true,
    enablePaymentShortcuts: true,
    enableAdminShortcuts: userRole === 'manager'
  });

  // Focus management
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2: Focus search
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // F4: Focus barcode
      if (e.key === 'F4') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      }
      // Enter: Add first search result
      if (e.key === 'Enter' && searchResults.length > 0 && onAddToCart) {
        e.preventDefault();
        onAddToCart(searchResults[0]);
        setSearchQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchResults, onAddToCart]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
  };

  const handleBarcodeSubmit = (barcode: string) => {
    if (barcode.trim()) {
      onBarcodeScan(barcode.trim());
      setBarcodeInput('');
    }
  };

  const handleQuantityChange = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      onRemoveItem(productId);
    } else {
      onQuantityChange(productId, newQuantity);
    }
  };

  const getPaymentButtonColor = (type: string) => {
    switch (type) {
      case 'cash': return 'bg-green-600 hover:bg-green-700';
      case 'card': return 'bg-blue-600 hover:bg-blue-700';
      case 'wallet': return 'bg-purple-600 hover:bg-purple-700';
      case 'credit': return 'bg-orange-600 hover:bg-orange-700';
      default: return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case 'cash': return <Banknote className="w-6 h-6" />;
      case 'card': return <CreditCard className="w-6 h-6" />;
      case 'wallet': return <Smartphone className="w-6 h-6" />;
      case 'credit': return <User className="w-6 h-6" />;
      default: return <CreditCard className="w-6 h-6" />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Panel - Product Search & Cart */}
      <div className="flex-1 flex flex-col">
        {/* Search Section */}
        <div className="bg-white p-4 border-b border-gray-200">
          <div className="flex gap-4 mb-4">
            {/* Search Input */}
            <div className="flex-1">
              <Input
                placeholder={t('pos.searchProducts')}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="text-lg h-12"
              />
            </div>
            
            {/* Barcode Input */}
            <div className="w-64">
              <Input
                placeholder={t('pos.scanBarcode')}
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleBarcodeSubmit(barcodeInput)}
                className="text-lg h-12"
              />
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-2 max-h-32 overflow-y-auto">
              {searchResults.slice(0, 5).map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-2 hover:bg-gray-100 rounded cursor-pointer"
                  onClick={() => onAddToCart?.(product)}
                >
                  <div className="flex-1">
                    <div className="font-medium">{product.name_en}</div>
                    <div className="text-sm text-gray-600">SKU: {product.sku}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      {formatCurrency(product.price_retail)}
                    </div>
                    {product.current_stock !== undefined && (
                      <div className="text-xs text-gray-500">
                        Stock: {product.current_stock}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Section */}
        <div className="flex-1 bg-white m-4 rounded-lg border border-gray-200 flex flex-col">
          {/* Cart Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold">{t('pos.cart')}</h2>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                {items.length} {t('pos.items')}
              </span>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onHoldSale}
                disabled={items.length === 0}
                className="flex items-center gap-2"
              >
                <Clock className="w-4 h-4" />
                {t('pos.hold')}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={onClearCart}
                disabled={items.length === 0}
                className="flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
                {t('pos.clear')}
              </Button>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <ShoppingCart className="w-16 h-16 mb-4" />
                <p className="text-lg">{t('pos.emptyCart')}</p>
                <p className="text-sm">{t('pos.startShopping')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.product_id}
                    className={`p-4 border rounded-lg ${
                      selectedItemId === item.product_id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 bg-white'
                    }`}
                    onClick={() => setSelectedItemId(item.product_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-lg">{item.name}</h3>
                        <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                        <p className="text-sm text-gray-600">
                          {formatCurrency(item.current_price)} × {item.qty}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuantityChange(item.product_id, item.qty - 1);
                            }}
                            className="w-8 h-8 p-0"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          
                          <span className="w-12 text-center font-medium">
                            {item.qty}
                          </span>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuantityChange(item.product_id, item.qty + 1);
                            }}
                            className="w-8 h-8 p-0"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        {/* Total Price */}
                        <div className="text-right">
                          <div className="font-bold text-lg">
                            {formatCurrency(item.line_total)}
                          </div>
                        </div>
                        
                        {/* Remove Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveItem(item.product_id);
                          }}
                          className="w-8 h-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Totals & Payment */}
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
        {/* Customer Info */}
        {customerName && (
          <div className="p-4 border-b border-gray-200 bg-blue-50">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              <span className="font-medium">{t('pos.customer')}:</span>
              <span className="text-blue-700">{customerName}</span>
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="p-6 flex-1">
          <h3 className="text-xl font-bold mb-4">{t('pos.totals')}</h3>
          
          <div className="space-y-3 mb-6">
            <div className="flex justify-between">
              <span>{t('pos.subtotal')}:</span>
              <span className="font-medium">{formatCurrency(totals.gross)}</span>
            </div>
            
            {(totals.item_discounts_total + totals.manual_discount_amount) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>{t('pos.discount')}:</span>
                <span className="font-medium">-{formatCurrency(totals.item_discounts_total + totals.manual_discount_amount)}</span>
              </div>
            )}
            
            {totals.tax_total > 0 && (
              <div className="flex justify-between">
                <span>{t('pos.tax')}:</span>
                <span className="font-medium">{formatCurrency(totals.tax_total)}</span>
              </div>
            )}
            
            <div className="border-t border-gray-200 pt-3">
              <div className="flex justify-between text-xl font-bold">
                <span>{t('pos.total')}:</span>
                <span className="text-green-600">{formatCurrency(totals.net_total)}</span>
              </div>
            </div>
          </div>

          {/* Payment Buttons */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">{t('pos.payment')}</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => onPayment('cash')}
                disabled={items.length === 0 || loading}
                className={`h-16 text-white ${getPaymentButtonColor('cash')} flex flex-col items-center gap-2`}
              >
                {getPaymentIcon('cash')}
                <span className="text-sm font-medium">{t('pos.cash')}</span>
              </Button>
              
              <Button
                onClick={() => onPayment('card')}
                disabled={items.length === 0 || loading}
                className={`h-16 text-white ${getPaymentButtonColor('card')} flex flex-col items-center gap-2`}
              >
                {getPaymentIcon('card')}
                <span className="text-sm font-medium">{t('pos.card')}</span>
              </Button>
              
              <Button
                onClick={() => onPayment('wallet')}
                disabled={items.length === 0 || loading}
                className={`h-16 text-white ${getPaymentButtonColor('wallet')} flex flex-col items-center gap-2`}
              >
                {getPaymentIcon('wallet')}
                <span className="text-sm font-medium">{t('pos.wallet')}</span>
              </Button>
              
              <Button
                onClick={() => onPayment('credit')}
                disabled={items.length === 0 || loading}
                className={`h-16 text-white ${getPaymentButtonColor('credit')} flex flex-col items-center gap-2`}
              >
                {getPaymentIcon('credit')}
                <span className="text-sm font-medium">{t('pos.credit')}</span>
              </Button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-medium text-gray-700 mb-3">{t('pos.quickActions')}</h4>
            
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={onResumeSale}
                className="w-full justify-start"
              >
                <Clock className="w-4 h-4 mr-2" />
                {t('pos.resumeSale')}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => navigate('/returns')}
                className="w-full justify-start"
              >
                <Receipt className="w-4 h-4 mr-2" />
                {t('pos.returns')}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            <div>Terminal: {terminalId}</div>
            <div>User: {userRole}</div>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-4">
            <LoadingSpinner size="lg" />
            <span className="text-lg">{t('pos.processing')}</span>
          </div>
        </div>
      )}
    </div>
  );
}




