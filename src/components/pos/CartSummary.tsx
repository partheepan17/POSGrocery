/**
 * Cart Summary Component
 * Displays cart totals and payment options
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, Banknote, Smartphone, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useCartStore } from '@/store/cartStore';

interface CartSummaryProps {
  onPayment: (method: 'cash' | 'card' | 'wallet' | 'credit') => void;
  onSplitPayment?: () => void;
  onDiscount?: () => void;
  onHold?: () => void;
  onClear?: () => void;
  disabled?: boolean;
}

export function CartSummary({ 
  onPayment, 
  onSplitPayment, 
  onDiscount, 
  onHold, 
  onClear,
  disabled = false 
}: CartSummaryProps) {
  const { t } = useTranslation();
  const { totals, items } = useCartStore();

  const formatPrice = (price: number) => {
    return `LKR ${price.toLocaleString()}`;
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash': return <Banknote className="w-5 h-5" />;
      case 'card': return <CreditCard className="w-5 h-5" />;
      case 'wallet': return <Smartphone className="w-5 h-5" />;
      case 'credit': return <Calculator className="w-5 h-5" />;
      default: return <CreditCard className="w-5 h-5" />;
    }
  };

  if (items.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{t('pos.summary')}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-gray-500">
            <div className="text-lg font-medium mb-2">{t('pos.noItems')}</div>
            <div className="text-sm">{t('pos.addItemsToProceed')}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t('pos.summary')}</span>
          <Badge variant="secondary">{items.length} {t('pos.items')}</Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        {/* Totals */}
        <div className="space-y-2 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{t('pos.subtotal')}</span>
            <span className="font-medium">{formatPrice(totals.gross)}</span>
          </div>
          
          {(totals.item_discounts_total + totals.manual_discount_amount) > 0 && (
            <div className="flex justify-between text-sm text-orange-600">
              <span>{t('pos.discount')}</span>
              <span className="font-medium">-{formatPrice(totals.item_discounts_total + totals.manual_discount_amount)}</span>
            </div>
          )}
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{t('pos.tax')}</span>
            <span className="font-medium">{formatPrice(totals.tax_total)}</span>
          </div>
          
          <div className="border-t border-gray-200 pt-2">
            <div className="flex justify-between text-lg font-bold">
              <span>{t('pos.total')}</span>
              <span className="text-blue-600">{formatPrice(totals.net_total)}</span>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="space-y-3 mb-6">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="pos-primary"
              onClick={() => onPayment('cash')}
              disabled={disabled}
              leftIcon={getPaymentIcon('cash')}
              className="h-12"
            >
              {t('pos.cash')}
            </Button>
            
            <Button
              variant="pos-primary"
              onClick={() => onPayment('card')}
              disabled={disabled}
              leftIcon={getPaymentIcon('card')}
              className="h-12"
            >
              {t('pos.card')}
            </Button>
            
            <Button
              variant="pos-primary"
              onClick={() => onPayment('wallet')}
              disabled={disabled}
              leftIcon={getPaymentIcon('wallet')}
              className="h-12"
            >
              {t('pos.wallet')}
            </Button>
            
            <Button
              variant="pos-primary"
              onClick={() => onPayment('credit')}
              disabled={disabled}
              leftIcon={getPaymentIcon('credit')}
              className="h-12"
            >
              {t('pos.credit')}
            </Button>
          </div>
          
          {onSplitPayment && (
            <Button
              variant="outline"
              onClick={onSplitPayment}
              disabled={disabled}
              className="w-full h-10"
            >
              {t('pos.splitPayment')}
            </Button>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2 mt-auto">
          {onDiscount && (
            <Button
              variant="outline"
              onClick={onDiscount}
              disabled={disabled}
              className="w-full"
            >
              {t('pos.applyDiscount')}
            </Button>
          )}
          
          {onHold && (
            <Button
              variant="outline"
              onClick={onHold}
              disabled={disabled}
              className="w-full"
            >
              {t('pos.holdSale')}
            </Button>
          )}
          
          {onClear && (
            <Button
              variant="outline"
              onClick={onClear}
              disabled={disabled}
              className="w-full text-red-600 hover:text-red-800"
            >
              {t('pos.clearCart')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}