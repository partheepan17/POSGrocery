import React, { useState, useEffect } from 'react';
import { X, CreditCard, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { formatCurrency, calculateChange } from '@/lib/currency';
import { validateTenderedAmount, validatePaymentReference, validateCustomerForCredit } from '@/lib/validation';
import { useCartStore } from '@/store/cartStore';
import { toast } from 'react-hot-toast';

type PaymentMethod = 'CASH' | 'CARD' | 'WALLET' | 'CREDIT';

interface PaymentRow {
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

interface PaymentData {
  payments: PaymentRow[];
  notes: string;
}

interface PaymentModalProps {
  paymentType: string;
  total: number;
  onClose: () => void;
  onConfirm: (paymentData: PaymentData) => void;
}

export function PaymentModal({ paymentType, total, onClose, onConfirm }: PaymentModalProps) {
  const { customerId } = useCartStore();
  const [paymentData, setPaymentData] = useState<PaymentData>({
    payments: [
      { method: (paymentType as PaymentMethod) || 'CASH', amount: total }
    ],
    notes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const remaining = Math.max(0, Number((total - (paymentData.payments?.reduce((s, p) => s + (p.amount || 0), 0) || 0)).toFixed(2)));

  // Adjust first row amount when total changes (keep simple UX)
  useEffect(() => {
    if (!paymentData.payments || paymentData.payments.length === 0) return;
    const sumOthers = paymentData.payments.slice(1).reduce((s, p) => s + (p.amount || 0), 0);
    const firstAmount = Math.max(0, Number((total - sumOthers).toFixed(2)));
    setPaymentData(prev => ({ ...prev, payments: [{ ...prev.payments[0], amount: firstAmount }, ...prev.payments.slice(1) ] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate each row
    if (!paymentData.payments || paymentData.payments.length === 0) {
      newErrors.payments = 'At least one payment row is required';
    } else {
      paymentData.payments.forEach((p, idx) => {
        if (p.method === 'CASH' || p.method === 'WALLET') {
          const v = validateTenderedAmount(p.amount || 0, total);
          if (!v.isValid) newErrors[`amount_${idx}`] = v.error || 'Invalid amount';
        }
        if (p.method === 'CARD' || p.method === 'WALLET') {
          const r = validatePaymentReference(p.reference || '', p.method);
          if (!r.isValid) newErrors[`ref_${idx}`] = r.error || 'Reference required';
        }
      });
      // Sum must match
      const sum = Number((paymentData.payments.reduce((s, p) => s + (p.amount || 0), 0)).toFixed(2));
      if (sum !== Number(total.toFixed(2))) newErrors.sum = `Payments must equal ${formatCurrency(total)} (now ${formatCurrency(sum)})`;
    }

    // Validate customer for credit
    if (paymentType === 'CREDIT') {
      const customerValidation = validateCustomerForCredit(customerId);
      if (!customerValidation.isValid) {
        newErrors.customer = customerValidation.error || 'Customer required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsProcessing(true);
    try {
      await onConfirm(paymentData);
    } catch (error) {
      console.error('Payment confirmation error:', error);
      toast.error('Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const addRow = () => {
    setPaymentData(prev => ({
      ...prev,
      payments: [...(prev.payments || []), { method: 'CASH', amount: remaining }]
    }));
  };

  const removeRow = (idx: number) => {
    setPaymentData(prev => ({
      ...prev,
      payments: prev.payments.filter((_, i) => i !== idx)
    }));
  };

  // Get payment type display info
  const getPaymentTypeInfo = () => {
    switch (paymentType) {
      case 'CASH':
        return { color: 'green', icon: '💵', label: 'Cash Payment' };
      case 'CARD':
        return { color: 'blue', icon: '💳', label: 'Card Payment' };
      case 'WALLET':
        return { color: 'purple', icon: '📱', label: 'Wallet/QR Payment' };
      case 'CREDIT':
        return { color: 'yellow', icon: '📋', label: 'Credit Payment' };
      default:
        return { color: 'gray', icon: '💰', label: 'Payment' };
    }
  };

  const paymentInfo = getPaymentTypeInfo();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 bg-${paymentInfo.color}-600 rounded-lg flex items-center justify-center`}>
              <span className="text-2xl">{paymentInfo.icon}</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {paymentInfo.label}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Complete your payment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Total Amount */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Amount</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(total)}
            </div>
          </div>

          {/* Customer Validation for Credit */}
          {paymentType === 'CREDIT' && (!customerId || customerId === 0) && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-700 dark:text-red-300">
                  Please select a customer for credit payments
                </span>
              </div>
            </div>
          )}

          {/* Split Payments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Payments</label>
              <button type="button" onClick={addRow} className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm">
                <Plus className="w-4 h-4" /> Add payment
              </button>
            </div>
            <div className="space-y-2">
              {(paymentData.payments || []).map((p, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <select
                    value={p.method}
                    onChange={(e) => {
                      const method = e.target.value as PaymentMethod;
                      setPaymentData(prev => {
                        const next = [...prev.payments];
                        next[idx] = { ...next[idx], method };
                        return { ...prev, payments: next };
                      });
                    }}
                    className="col-span-4 px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="WALLET">Wallet/QR</option>
                    <option value="CREDIT">Credit</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={p.amount || ''}
                    onChange={(e) => {
                      const amount = parseFloat(e.target.value) || 0;
                      setPaymentData(prev => {
                        const next = [...prev.payments];
                        next[idx] = { ...next[idx], amount };
                        return { ...prev, payments: next };
                      });
                    }}
                    className={`col-span-4 w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors[`amount_${idx}`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder="0.00"
                  />
                  {(p.method === 'CARD' || p.method === 'WALLET') && (
                    <input
                      type="text"
                      value={p.reference || ''}
                      onChange={(e) => {
                        const reference = e.target.value;
                        setPaymentData(prev => {
                          const next = [...prev.payments];
                          next[idx] = { ...next[idx], reference };
                          return { ...prev, payments: next };
                        });
                      }}
                      className={`col-span-3 w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors[`ref_${idx}`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                      placeholder="Reference"
                    />
                  )}
                  <button type="button" onClick={() => removeRow(idx)} className="col-span-1 p-2 text-red-600 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {errors[`amount_${idx}`] && <p className="col-span-12 text-red-500 text-xs">{errors[`amount_${idx}`]}</p>}
                  {errors[`ref_${idx}`] && <p className="col-span-12 text-red-500 text-xs">{errors[`ref_${idx}`]}</p>}
                </div>
              ))}
            </div>
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">Remaining: {formatCurrency(remaining)}</div>
            {errors.sum && <div className="mt-1 text-red-500 text-xs">{errors.sum}</div>}
          </div>

          {/* Reference fields embedded per payment row above */}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={paymentData.notes}
              onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              rows={3}
              placeholder="Additional notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 font-medium focus:outline-none focus:ring-1 focus:ring-gray-500/50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className={`flex-1 px-4 py-3 bg-${paymentInfo.color}-600 hover:bg-${paymentInfo.color}-700 text-white rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-lg hover:shadow-xl focus:outline-none focus:ring-1 focus:ring-${paymentInfo.color}-500/50 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Confirm Payment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
