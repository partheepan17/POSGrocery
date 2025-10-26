/**
 * Payment Modal Component
 * Handles payment processing and validation
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, CreditCard, Banknote, Smartphone, Calculator, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useCartStore } from '@/store/cartStore';
import { PaymentData, PaymentMethod } from '@/types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentData: PaymentData) => void;
  paymentMethod: 'cash' | 'card' | 'wallet' | 'credit';
  total: number;
}

export function PaymentModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  paymentMethod, 
  total 
}: PaymentModalProps) {
  const { t } = useTranslation();
  const { customerName } = useCartStore();
  
  const [amount, setAmount] = useState(total.toString());
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAmount(total.toString());
      setReference('');
      setNotes('');
      setError('');
    }
  }, [isOpen, total]);

  const formatPrice = (price: number) => {
    return `LKR ${price.toLocaleString()}`;
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash': return <Banknote className="w-6 h-6" />;
      case 'card': return <CreditCard className="w-6 h-6" />;
      case 'wallet': return <Smartphone className="w-6 h-6" />;
      case 'credit': return <Calculator className="w-6 h-6" />;
      default: return <CreditCard className="w-6 h-6" />;
    }
  };

  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case 'cash': return t('pos.cash');
      case 'card': return t('pos.card');
      case 'wallet': return t('pos.wallet');
      case 'credit': return t('pos.credit');
      default: return method;
    }
  };

  const handleAmountChange = (value: string) => {
    // Allow only numbers and decimal point
    const sanitized = value.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Limit decimal places to 2
    if (parts[1] && parts[1].length > 2) {
      return;
    }
    
    setAmount(sanitized);
    setError('');
  };

  const handleConfirm = async () => {
    const paymentAmount = parseFloat(amount);
    
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      setError(t('pos.invalidAmount'));
      return;
    }

    if (paymentAmount > 999999.99) {
      setError('Amount too large');
      return;
    }

    if (paymentMethod === 'cash' && paymentAmount < total) {
      setError(t('pos.insufficientAmount'));
      return;
    }

    setIsProcessing(true);
    
    try {
      const paymentData: PaymentData = {
        payments: [{
          method: paymentMethod.toUpperCase() as PaymentMethod,
          amount: paymentAmount,
          reference: reference.trim() || undefined,
        }],
        notes: notes.trim() || undefined,
      };

      await onConfirm(paymentData);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : t('pos.paymentFailed'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              {getPaymentIcon(paymentMethod)}
              <span>{t('pos.processPayment')}</span>
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Payment Method */}
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              {getPaymentIcon(paymentMethod)}
              <span className="font-medium">{getPaymentMethodName(paymentMethod)}</span>
            </div>
            <Badge variant="outline" className="bg-blue-100 text-blue-800">
              {formatPrice(total)}
            </Badge>
          </div>

          {/* Customer Info */}
          {customerName && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-sm text-gray-600">{t('pos.customer')}</div>
              <div className="font-medium">{customerName}</div>
            </div>
          )}

          {/* Amount Input */}
            <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              {t('pos.amount')} *
            </label>
            <Input
              type="text"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              onKeyDown={handleKeyDown}
                    placeholder="0.00"
              className="text-lg font-mono"
              autoFocus
            />
            {paymentMethod === 'cash' && (
              <div className="text-sm text-gray-500">
                {t('pos.change')}: {formatPrice(Math.max(0, parseFloat(amount) - total))}
              </div>
            )}
          </div>

          {/* Reference Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              {t('pos.reference')}
            </label>
            <Input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('pos.referencePlaceholder')}
            />
          </div>

          {/* Notes Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              {t('pos.notes')}
            </label>
            <Input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('pos.notesPlaceholder')}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-600">{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isProcessing}
            >
              {t('pos.cancel')}
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1"
              disabled={isProcessing}
              loading={isProcessing}
            >
              {t('pos.confirmPayment')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}