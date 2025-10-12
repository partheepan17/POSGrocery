import React, { useState, useMemo, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  Smartphone,
  AlertCircle,
  CheckCircle,
  Calculator
} from 'lucide-react';
import { Dialog, DialogHeader, DialogContent, DialogFooter, DialogTitle } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select, SelectOption } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { Card, CardContent } from '../ui/Card';

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  type: 'cash' | 'card' | 'wallet' | 'custom';
  enabled: boolean;
}

interface PaymentRow {
  id: string;
  method: string;
  amount: number;
  type: 'cash' | 'card' | 'wallet' | 'custom';
}

interface EnhancedCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onSuccess: (result: { id: number; receipt_no: string }) => void;
  onError: (error: string) => void;
  onPrintSuccess?: () => void;
  onPrintError?: (error: string) => void;
  header: {
    customer_id?: number;
    price_tier: 'Retail' | 'Wholesale' | 'Credit' | 'Other';
    cashier_id: number;
    terminal_name?: string;
    language?: 'EN' | 'SI' | 'TA';
  };
  lines: any[];
}

const paymentMethods: PaymentMethod[] = [
  { id: 'cash', name: 'Cash', icon: Banknote, type: 'cash', enabled: true },
  { id: 'card', name: 'Card', icon: CreditCard, type: 'card', enabled: true },
  { id: 'wallet', name: 'Wallet', icon: Smartphone, type: 'wallet', enabled: true },
  { id: 'custom', name: 'Custom', icon: Calculator, type: 'custom', enabled: true },
];

export function EnhancedCheckoutModal({
  isOpen,
  onClose,
  total,
  onSuccess,
  onError,
  onPrintSuccess,
  onPrintError,
  header,
  lines
}: EnhancedCheckoutModalProps) {
  const [paymentRows, setPaymentRows] = useState<PaymentRow[]>([
    { id: '1', method: 'cash', amount: total, type: 'cash' }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [managerPin, setManagerPin] = useState<string>('');
  const [showManagerPin, setShowManagerPin] = useState(false);

  // Calculate totals
  const totals = useMemo(() => {
    const sum = paymentRows.reduce((s, row) => s + (Number(row.amount) || 0), 0);
    const remaining = total - sum;
    const change = sum > total ? sum - total : 0;
    
    return { sum, remaining, change };
  }, [paymentRows, total]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPaymentRows([{ id: '1', method: 'cash', amount: total, type: 'cash' }]);
      setError(null);
      setManagerPin('');
      setShowManagerPin(false);
    }
  }, [isOpen, total]);

  const addPaymentRow = () => {
    const newId = (paymentRows.length + 1).toString();
    setPaymentRows(prev => [...prev, { 
      id: newId, 
      method: 'card', 
      amount: 0, 
      type: 'card' 
    }]);
  };

  const removePaymentRow = (id: string) => {
    if (paymentRows.length > 1) {
      setPaymentRows(prev => prev.filter(row => row.id !== id));
    }
  };

  const updatePaymentRow = (id: string, updates: Partial<PaymentRow>) => {
    setPaymentRows(prev => prev.map(row => 
      row.id === id ? { ...row, ...updates } : row
    ));
  };

  const handleMethodChange = (id: string, method: string) => {
    const paymentMethod = paymentMethods.find(m => m.id === method);
    updatePaymentRow(id, { 
      method, 
      type: paymentMethod?.type || 'custom',
      amount: method === 'cash' ? totals.remaining : 0
    });
  };

  const handleAmountChange = (id: string, amount: string) => {
    const numAmount = parseFloat(amount) || 0;
    updatePaymentRow(id, { amount: numAmount });
  };

  const handleQuickAmount = (amount: number) => {
    const cashRow = paymentRows.find(row => row.type === 'cash');
    if (cashRow) {
      updatePaymentRow(cashRow.id, { amount: cashRow.amount + amount });
    }
  };

  const handleConfirm = async () => {
    if (totals.remaining !== 0) {
      setError('Payments must equal total amount');
      return;
    }

    // Check if manager PIN is required for certain payment methods
    const requiresManagerPin = paymentRows.some(row => 
      row.type === 'custom' || (row.type === 'card' && row.amount > 100)
    );

    if (requiresManagerPin && !showManagerPin) {
      setShowManagerPin(true);
      return;
    }

    if (showManagerPin && !managerPin) {
      setError('Manager PIN is required');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result = {
        id: Math.floor(Math.random() * 10000),
        receipt_no: `R${Date.now().toString().slice(-6)}`
      };
      
      // Simulate printing
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Simulate successful print
        onPrintSuccess?.();
      } catch (printErr) {
        onPrintError?.(printErr instanceof Error ? printErr.message : 'Print failed');
        throw printErr; // Re-throw to prevent cart clearing
      }
      
      onSuccess(result);
      onClose();
    } catch (err: any) {
      onError(err?.message || 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(amount);

  const getPaymentIcon = (type: string) => {
    const method = paymentMethods.find(m => m.type === type);
    return method?.icon || Calculator;
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      persistent={isProcessing}
      aria-labelledby="checkout-title"
      aria-describedby="checkout-description"
    >
      <DialogHeader>
        <DialogTitle id="checkout-title">Checkout</DialogTitle>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Terminal: {header.terminal_name || 'POS-001'} | Cashier: {header.cashier_id}
        </div>
      </DialogHeader>

      <DialogContent className="space-y-6">
        {/* Total Display */}
        <Card variant="pos" className="text-center">
          <CardContent className="py-6">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(total)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Total Amount
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Payment Methods
          </h3>
          
          <div className="space-y-3">
            {paymentRows.map((row, index) => (
              <div key={row.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <Select
                    value={row.method}
                    onChange={(e) => handleMethodChange(row.id, e.target.value)}
                    options={paymentMethods.map(method => ({
                      value: method.id,
                      label: method.name,
                      disabled: !method.enabled
                    }))}
                    size="sm"
                  />
                </div>
                
                <div className="w-32">
                  <Input
                    type="number"
                    value={row.amount.toString()}
                    onChange={(e) => handleAmountChange(row.id, e.target.value)}
                    placeholder="0.00"
                    inputSize="sm"
                    rightIcon={React.createElement(getPaymentIcon(row.type), { className: "w-4 h-4" })}
                  />
                </div>
                
                {paymentRows.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePaymentRow(row.id)}
                    aria-label="Remove payment method"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={addPaymentRow}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Payment Method
          </Button>
        </div>

        {/* Quick Amount Buttons */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Quick Amounts
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {[10, 20, 50, 100].map(amount => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(amount)}
                disabled={isProcessing}
              >
                +{formatCurrency(amount)}
              </Button>
            ))}
          </div>
        </div>

        {/* Manager PIN */}
        {showManagerPin && (
          <div className="space-y-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <span className="font-medium text-yellow-800 dark:text-yellow-200">
                Manager PIN Required
              </span>
            </div>
            <Input
              type="password"
              placeholder="Enter manager PIN"
              value={managerPin}
              onChange={(e) => setManagerPin(e.target.value)}
              inputSize="sm"
              className="max-w-xs"
            />
          </div>
        )}

        {/* Payment Summary */}
        <Card variant="outlined">
          <CardContent className="py-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total:</span>
                <span className="font-mono">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Paid:</span>
                <span className="font-mono">{formatCurrency(totals.sum)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-gray-200 dark:border-gray-700 pt-2">
                <span className={totals.remaining === 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                  {totals.remaining === 0 ? 'Complete' : 'Remaining'}
                </span>
                <span className="font-mono">
                  {totals.remaining === 0 ? '✓' : formatCurrency(totals.remaining)}
                </span>
              </div>
              {totals.change > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Change:</span>
                  <span className="font-mono">{formatCurrency(totals.change)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-red-800 dark:text-red-200">{error}</span>
          </div>
        )}
      </DialogContent>

      <DialogFooter align="right">
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          variant="pos-primary"
          size="sm"
          onClick={handleConfirm}
          disabled={totals.remaining !== 0 || isProcessing}
          loading={isProcessing}
          leftIcon={totals.remaining === 0 ? <CheckCircle className="w-4 h-4" /> : undefined}
        >
          {totals.remaining === 0 ? 'Confirm Payment' : `Pay ${formatCurrency(totals.remaining)}`}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}


