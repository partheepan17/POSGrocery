import React, { useState, useEffect, useRef } from 'react';
import { X, CreditCard, DollarSign, Smartphone, FileText, Plus, Trash2, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';

type PaymentMethod = 'cash' | 'card' | 'wallet' | 'credit';

interface PaymentRow {
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

interface PaymentData {
  payments: PaymentRow[];
  notes: string;
}

interface PaymentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  paymentType: PaymentMethod;
  total: number;
  onConfirm: (paymentData: PaymentData) => void;
  isProcessing?: boolean;
}

export function PaymentDrawer({ 
  isOpen, 
  onClose, 
  paymentType, 
  total, 
  onConfirm, 
  isProcessing = false 
}: PaymentDrawerProps) {
  const [paymentData, setPaymentData] = useState<PaymentData>({
    payments: [{ method: paymentType, amount: total }],
    notes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorValue, setCalculatorValue] = useState('0');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset when payment type changes
  useEffect(() => {
    setPaymentData({
      payments: [{ method: paymentType, amount: total }],
      notes: ''
    });
    setErrors({});
  }, [paymentType, total]);

  // Focus first input when drawer opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const remaining = Math.max(0, Number((total - (paymentData.payments?.reduce((s, p) => s + (p.amount || 0), 0) || 0)).toFixed(2)));

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!paymentData.payments || paymentData.payments.length === 0) {
      newErrors.payments = 'At least one payment row is required';
    } else {
      paymentData.payments.forEach((p, idx) => {
        if (p.amount <= 0) {
          newErrors[`amount_${idx}`] = 'Amount must be greater than 0';
        }
        if (p.amount > total) {
          newErrors[`amount_${idx}`] = 'Amount cannot exceed total';
        }
        if ((p.method === 'card' || p.method === 'wallet') && !p.reference?.trim()) {
          newErrors[`ref_${idx}`] = 'Reference required for card/wallet payments';
        }
      });

      const sum = Number((paymentData.payments.reduce((s, p) => s + (p.amount || 0), 0)).toFixed(2));
      if (sum !== Number(total.toFixed(2))) {
        newErrors.sum = `Payments must equal ${total.toFixed(2)} (now ${sum.toFixed(2)})`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onConfirm(paymentData);
    } catch (error) {
      console.error('Payment confirmation error:', error);
    }
  };

  const addPayment = () => {
    setPaymentData(prev => ({
      ...prev,
      payments: [...(prev.payments || []), { method: 'cash', amount: remaining }]
    }));
  };

  const removePayment = (idx: number) => {
    if (paymentData.payments.length <= 1) return;
    
    setPaymentData(prev => ({
      ...prev,
      payments: prev.payments.filter((_, i) => i !== idx)
    }));
  };

  const updatePayment = (idx: number, field: keyof PaymentRow, value: any) => {
    setPaymentData(prev => ({
      ...prev,
      payments: prev.payments.map((p, i) => 
        i === idx ? { ...p, [field]: value } : p
      )
    }));
  };

  const getPaymentIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'cash': return <DollarSign className="w-4 h-4" />;
      case 'card': return <CreditCard className="w-4 h-4" />;
      case 'wallet': return <Smartphone className="w-4 h-4" />;
      case 'credit': return <FileText className="w-4 h-4" />;
    }
  };

  const getPaymentColor = (method: PaymentMethod) => {
    switch (method) {
      case 'cash': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'card': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'wallet': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'credit': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const handleCalculatorInput = (value: string) => {
    if (value === 'clear') {
      setCalculatorValue('0');
    } else if (value === 'backspace') {
      setCalculatorValue(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    } else if (value === 'enter') {
      const amount = parseFloat(calculatorValue);
      if (!isNaN(amount) && amount > 0) {
        updatePayment(0, 'amount', amount);
        setShowCalculator(false);
      }
    } else {
      setCalculatorValue(prev => {
        if (prev === '0' && value !== '.') {
          return value;
        }
        return prev + value;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-t-xl sm:rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getPaymentColor(paymentType)}`}>
              {getPaymentIcon(paymentType)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {paymentType.charAt(0).toUpperCase() + paymentType.slice(1)} Payment
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Complete your payment
              </p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Total Amount */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Amount</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              රු {total.toLocaleString()}
            </div>
          </div>

          {/* Payment Rows */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Payments
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => setShowCalculator(true)}
                  variant="outline"
                  size="sm"
                  className="gap-1"
                >
                  <Calculator className="w-4 h-4" />
                  Calc
                </Button>
                <Button
                  type="button"
                  onClick={addPayment}
                  variant="outline"
                  size="sm"
                  className="gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {paymentData.payments.map((payment, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  {/* Payment Method */}
                  <div className="col-span-3">
                    <select
                      value={payment.method}
                      onChange={(e) => updatePayment(idx, 'method', e.target.value as PaymentMethod)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="wallet">Wallet</option>
                      <option value="credit">Credit</option>
                    </select>
                  </div>

                  {/* Amount */}
                  <div className="col-span-4">
                    <Input
                      ref={idx === 0 ? inputRef : undefined}
                      type="number"
                      min="0"
                      step="0.01"
                      value={payment.amount || ''}
                      onChange={(e) => updatePayment(idx, 'amount', parseFloat(e.target.value) || 0)}
                      className={`text-sm ${errors[`amount_${idx}`] ? 'border-red-500' : ''}`}
                      placeholder="0.00"
                    />
                    {errors[`amount_${idx}`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`amount_${idx}`]}</p>
                    )}
                  </div>

                  {/* Reference */}
                  {(payment.method === 'card' || payment.method === 'wallet') && (
                    <div className="col-span-4">
                      <Input
                        type="text"
                        value={payment.reference || ''}
                        onChange={(e) => updatePayment(idx, 'reference', e.target.value)}
                        className={`text-sm ${errors[`ref_${idx}`] ? 'border-red-500' : ''}`}
                        placeholder="Reference"
                      />
                      {errors[`ref_${idx}`] && (
                        <p className="text-red-500 text-xs mt-1">{errors[`ref_${idx}`]}</p>
                      )}
                    </div>
                  )}

                  {/* Remove Button */}
                  <div className="col-span-1">
                    <Button
                      type="button"
                      onClick={() => removePayment(idx)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      disabled={paymentData.payments.length <= 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Remaining Amount */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Remaining: රු {remaining.toFixed(2)}
            </div>
            {errors.sum && (
              <div className="text-red-500 text-sm">{errors.sum}</div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <Input
              type="text"
              value={paymentData.notes}
              onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
              className="text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1 h-12"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isProcessing}
              className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Confirm Payment
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Calculator Modal */}
        {showCalculator && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <Card className="w-80">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Calculator</CardTitle>
                  <Button
                    onClick={() => setShowCalculator(false)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Display */}
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-right">
                  <div className="text-2xl font-mono text-gray-900 dark:text-white">
                    {calculatorValue}
                  </div>
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    '7', '8', '9', '/',
                    '4', '5', '6', '*',
                    '1', '2', '3', '-',
                    '0', '.', '=', '+',
                    'clear', 'backspace', 'enter'
                  ].map((key) => (
                    <Button
                      key={key}
                      onClick={() => handleCalculatorInput(key)}
                      variant="outline"
                      className="h-12 text-lg font-semibold"
                    >
                      {key === 'clear' ? 'C' : 
                       key === 'backspace' ? '⌫' : 
                       key === 'enter' ? '✓' : key}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
