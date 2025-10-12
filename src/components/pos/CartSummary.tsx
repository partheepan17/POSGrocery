import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, AlertCircle } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { useAppStore } from '@/store/appStore';
import { formatCurrency } from '@/lib/currency';
import { validatePercentageDiscount, validateFixedDiscount } from '@/lib/validation';
import { toast } from 'react-hot-toast';

interface CartSummaryProps {
  onPayment?: (paymentType: string) => void;
  onPrintReceipt?: () => void;
  onReprint?: () => void;
  onHoldSale?: () => void;
  onResumeHold?: () => void;
  onStartReturn?: () => void;
  onShiftReports?: () => void;
}

export function CartSummary({
  onPayment,
  onPrintReceipt,
  onReprint,
  onHoldSale,
  onResumeHold,
  onStartReturn,
  onShiftReports
}: CartSummaryProps) {
  const { t } = useTranslation();
  const { 
    items, 
    totals, 
    manualDiscount, 
    setManualDiscount, 
    priceTier, 
    clearCart 
  } = useCartStore();
  
  const { printLanguage, setPrintLanguage } = useUIStore();
  const { settings } = useAppStore();
  
  // Initialize print language from settings if not set
  useEffect(() => {
    if (!printLanguage) {
      const defaultLang = settings.storeInfo?.defaultReceiptLanguage?.toLowerCase() as 'en' | 'si' | 'ta' || 'si';
      setPrintLanguage(defaultLang);
    }
  }, [printLanguage, settings.storeInfo?.defaultReceiptLanguage, setPrintLanguage]);
  
  const [isProcessing, setIsProcessing] = useState(false);

  const isRetailTier = priceTier === 'Retail';
  const hasItems = items.length > 0;

  // Handle manual discount type change
  const handleDiscountTypeChange = (type: 'FIXED_AMOUNT' | 'PERCENTAGE') => {
    setManualDiscount({ type, value: 0 });
  };

  // Handle manual discount value change
  const handleDiscountValueChange = (value: number) => {
    let validation;
    
    if (manualDiscount.type === 'PERCENTAGE') {
      validation = validatePercentageDiscount(value);
    } else {
      const maxAmount = totals.gross - totals.item_discounts_total;
      validation = validateFixedDiscount(value, maxAmount);
    }
    
    if (validation.isValid) {
      setManualDiscount({ type: manualDiscount.type, value });
    } else {
      toast.error(validation.error || 'Invalid discount value');
    }
  };

  // Handle payment
  const handlePayment = (paymentType: string) => {
    if (!hasItems) {
      toast.error(t('cart.empty'));
      return;
    }
    onPayment?.(paymentType);
  };

  // Handle print language change
  const handleLanguageChange = (language: 'en' | 'si' | 'ta') => {
    setPrintLanguage(language);
  };

  // Handle new sale
  const handleNewSale = () => {
    clearCart();
    toast.success(t('sales.newSaleStarted'));
  };

  return (
    <div className="w-80 bg-gray-900 p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">{t('cart.title')}</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={onHoldSale}
            className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
          >
            {t('cart.held')} (F2)
          </button>
          <button
            onClick={handleNewSale}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
          >
            {t('sales.newSale')}
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between mb-4 text-sm">
        <span className="text-green-400">{t('common.online')} • {new Date().toLocaleTimeString()}</span>
        <span className="px-2 py-1 bg-blue-600 text-white rounded text-xs">
          {priceTier}
        </span>
      </div>

      {/* Discount */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white mb-4">{t('cart.discount')}</h3>
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => handleDiscountTypeChange('FIXED_AMOUNT')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                manualDiscount.type === 'FIXED_AMOUNT'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {t('cart.fixedAmount')}
            </button>
            <button
              onClick={() => handleDiscountTypeChange('PERCENTAGE')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                manualDiscount.type === 'PERCENTAGE'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {t('cart.percentage')} (%)
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step={manualDiscount.type === 'PERCENTAGE' ? '0.1' : '1'}
              max={manualDiscount.type === 'PERCENTAGE' ? '100' : undefined}
              value={manualDiscount.value || ''}
              onChange={(e) => handleDiscountValueChange(parseFloat(e.target.value) || 0)}
              placeholder={manualDiscount.type === 'PERCENTAGE' ? '0.0' : '0'}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
            />
            <button
              onClick={() => setManualDiscount({ type: 'FIXED_AMOUNT', value: 0 })}
              className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 text-sm"
            >
              {t('common.clear')}
            </button>
          </div>
          {manualDiscount.value > 0 && (
            <div className="text-sm text-blue-400">{t('cart.discount')}: {formatCurrency(totals.manual_discount_amount)}</div>
          )}
          {!isRetailTier && (
            <div className="text-xs text-amber-400">{t('cart.discountAppliesToTotal')}</div>
          )}
        </div>
      </div>

      {/* Totals */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
        <h3 className="text-lg font-bold text-white mb-4">{t('cart.totals')}</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-gray-300">
            <span>{t('cart.gross')}:</span>
            <span>{formatCurrency(totals.gross)}</span>
          </div>
          {totals.item_discounts_total > 0 && (
            <div className="flex justify-between text-green-400">
              <span>{t('cart.itemDiscounts')}:</span>
              <span>-{formatCurrency(totals.item_discounts_total)}</span>
            </div>
          )}
          {totals.manual_discount_amount > 0 && (
            <div className="flex justify-between text-blue-400">
              <span>{t('cart.discount')}:</span>
              <span>-{formatCurrency(totals.manual_discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-300">
            <span>{t('cart.tax')}:</span>
            <span>{formatCurrency(totals.tax_total)}</span>
          </div>
          <div className="border-t border-gray-600 pt-2">
            <div className="flex justify-between text-green-400 font-bold text-lg">
              <span>{t('cart.netTotal')}:</span>
              <span>{formatCurrency(totals.net_total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Buttons */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white mb-4">{t('cart.completeSale')}</h3>
        <p className="text-sm text-gray-300 mb-4">{t('cart.selectPaymentMethod')}</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handlePayment('CASH')}
            disabled={!hasItems || isProcessing}
            className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {t('payment.cash')} (F7)
          </button>
          <button
            onClick={() => handlePayment('CARD')}
            disabled={!hasItems || isProcessing}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {t('payment.card')} (F8)
          </button>
          <button
            onClick={() => handlePayment('WALLET')}
            disabled={!hasItems || isProcessing}
            className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {t('payment.wallet')} (F9)
          </button>
          <button
            onClick={() => handlePayment('CREDIT')}
            disabled={!hasItems || isProcessing}
            className="px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {t('payment.credit')} (F10)
          </button>
        </div>
        <button
          onClick={onStartReturn}
          className="w-full mt-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
        >
          {t('navigation.returns')} (F11)
        </button>
      </div>

      {/* Print & Reprint Buttons */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white mb-4">Print & Reprint</h3>
        <div className="space-y-2">
          <button
            onClick={onPrintReceipt}
            disabled={!hasItems || isProcessing}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Print Receipt (F12)
          </button>
          <button
            onClick={onReprint}
            className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
          >
            Reprint Invoice (Ctrl+R)
          </button>
        </div>
      </div>

      {/* Print Language */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white mb-4">Print Language</h3>
        <div className="flex gap-2">
          {(['en', 'si', 'ta'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                printLanguage === lang
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
        <div className="space-y-2">
          <button
            onClick={onHoldSale}
            disabled={!hasItems}
            className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hold Sale (F5)
          </button>
          <button
            onClick={onResumeHold}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Resume Hold (F6)
          </button>
          <button
            onClick={onShiftReports}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Shift Reports (F12)
          </button>
          <button
            onClick={onStartReturn}
            className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            Start Return (F11)
          </button>
        </div>
      </div>

      {/* Quick Tender removed */}

      {/* Print Receipt */}
      <div className="mb-6">
        <button
          onClick={onPrintReceipt}
          disabled={!hasItems}
          className="w-full px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <CreditCard className="w-4 h-4" />
          <span>Print Receipt (Ctrl+P)</span>
        </button>
      </div>

      {/* Footer */}
      <div className="mt-auto text-center text-xs text-gray-500">
        <div>Print (Ctrl+P) / Reprint (F4)</div>
      </div>
    </div>
  );
}

