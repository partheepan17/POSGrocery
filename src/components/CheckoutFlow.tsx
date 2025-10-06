import React, { useState } from 'react';
import { CreditCard, X, AlertCircle, CheckCircle } from 'lucide-react';
import { CartLine } from '@/services/discountEngine';

interface CheckoutFlowProps {
  cartLines: CartLine[];
  totals: {
    gross: number;
    itemDiscounts: number;
    manualDiscount: number;
    tax: number;
    net: number;
  };
  manualDiscount: { type: 'FIXED_AMOUNT' | 'PERCENTAGE'; value: number };
  onCheckout: (paymentDetails: PaymentDetails) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

interface PaymentDetails {
  type: 'CASH' | 'CARD' | 'CREDIT' | 'OTHER';
  reference: string;
  cardNumber?: string;
  cardType?: string;
  notes: string;
}

export function CheckoutFlow({
  cartLines,
  totals,
  manualDiscount,
  onCheckout,
  onCancel,
  isLoading
}: CheckoutFlowProps) {
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    type: 'CASH',
    reference: '',
    cardNumber: '',
    cardType: '',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!paymentDetails.reference.trim()) {
      newErrors.reference = 'Reference number is required';
    }

    if (paymentDetails.type === 'CARD') {
      if (!paymentDetails.cardNumber?.trim()) {
        newErrors.cardNumber = 'Card number is required';
      }
      if (!paymentDetails.cardType?.trim()) {
        newErrors.cardType = 'Card type is required';
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
      await onCheckout(paymentDetails);
    } catch (error) {
      console.error('Checkout failed:', error);
    }
  };

  const paymentTypes = [
    { value: 'CASH', label: 'Cash', color: 'green' },
    { value: 'CARD', label: 'Card', color: 'blue' },
    { value: 'CREDIT', label: 'Credit', color: 'yellow' },
    { value: 'OTHER', label: 'Other', color: 'gray' }
  ] as const;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Checkout - Confirm & Print
          </h3>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Order Summary */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Order Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Items ({cartLines.length}):</span>
                <span className="text-gray-900 dark:text-white">රු {totals.gross.toLocaleString()}</span>
              </div>
              {totals.itemDiscounts > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Item Discounts:</span>
                  <span>-රු {totals.itemDiscounts.toLocaleString()}</span>
                </div>
              )}
              {totals.manualDiscount > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>Manual Discount:</span>
                  <span>-රු {totals.manualDiscount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Tax:</span>
                <span className="text-gray-900 dark:text-white">රු {totals.tax.toLocaleString()}</span>
              </div>
              <div className="border-t border-gray-300 dark:border-gray-600 pt-2">
                <div className="flex justify-between font-semibold text-lg">
                  <span className="text-gray-900 dark:text-white">Total:</span>
                  <span className="text-green-600">රු {totals.net.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Payment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Payment Type *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {paymentTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setPaymentDetails(prev => ({ ...prev, type: type.value }))}
                    className={`px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      paymentDetails.type === type.value
                        ? `bg-${type.color}-600 text-white`
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Card Details (if card payment) */}
            {paymentDetails.type === 'CARD' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Card Number (Last 4 digits) *
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={paymentDetails.cardNumber || ''}
                    onChange={(e) => setPaymentDetails(prev => ({ ...prev, cardNumber: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 ${
                      errors.cardNumber ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="1234"
                  />
                  {errors.cardNumber && (
                    <p className="text-red-500 text-xs mt-1">{errors.cardNumber}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Card Type *
                  </label>
                  <select
                    value={paymentDetails.cardType || ''}
                    onChange={(e) => setPaymentDetails(prev => ({ ...prev, cardType: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 ${
                      errors.cardType ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <option value="">Select Card Type</option>
                    <option value="VISA">Visa</option>
                    <option value="MASTERCARD">Mastercard</option>
                    <option value="AMEX">American Express</option>
                    <option value="OTHER">Other</option>
                  </select>
                  {errors.cardType && (
                    <p className="text-red-500 text-xs mt-1">{errors.cardType}</p>
                  )}
                </div>
              </div>
            )}

            {/* Reference Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reference Number *
              </label>
              <input
                type="text"
                value={paymentDetails.reference}
                onChange={(e) => setPaymentDetails(prev => ({ ...prev, reference: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 ${
                  errors.reference ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Enter reference number"
              />
              {errors.reference && (
                <p className="text-red-500 text-xs mt-1">{errors.reference}</p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={paymentDetails.notes}
                onChange={(e) => setPaymentDetails(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500"
                rows={3}
                placeholder="Additional notes..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-gray-500/50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Confirm & Print
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

