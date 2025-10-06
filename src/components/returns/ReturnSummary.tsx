import React, { useState } from 'react';
import { CreditCard, AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { useReturnStore } from '@/store/returnStore';
import { formatCurrency } from '@/lib/currency';
import { toast } from 'react-hot-toast';
import { SETTINGS } from '@/config/settings';

interface ReturnSummaryProps {
  onReturnProcessed?: (receiptNo: string) => void;
}

export function ReturnSummary({ onReturnProcessed }: ReturnSummaryProps) {
  const [showManagerPin, setShowManagerPin] = useState(false);
  const [managerPin, setManagerPin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const { 
    lines, 
    totals, 
    refundMethod, 
    refundRef, 
    setRefundMethod, 
    setRefundRef,
    originalInvoice,
    language,
    setLastReturn,
    setError
  } = useReturnStore();

  const MANAGER_APPROVAL_THRESHOLD = 50000; // LKR 50,000
  const requiresManagerApproval = totals.total > MANAGER_APPROVAL_THRESHOLD;

  // FIX: Returns — refund proration from original effective unit + proportional tax
  const computeReturnRefund = (originalLine: any) => {
    // originalLine must include the original line_total AFTER line discounts AND share of manual discount if you stored it that way; if not, we approximate by allocating manual discount proportionally.
    // Assume available fields: { sold_qty, original_line_total_after_line_discounts, manual_discount_share (optional), tax_on_sale (invoice-level) }
    
    // Simple, safe model for now (works with current data):
    // • effectiveUnit = original_line_total_after_line_discounts / sold_qty
    // • lineRefund = effectiveUnit * return_qty
    // • baseForTaxOnSale = (invoice_subtotal_after_line_discounts - manual_discount_value)
    // • taxRefund = (invoice_tax_total) * (lineRefund / baseForTaxOnSale)
    // • totalRefund = lineRefund + taxRefund
    
    const effectiveUnit = originalLine.original_line_total_after_line_discounts / originalLine.sold_qty;
    const lineRefund = effectiveUnit * originalLine.return_qty;
    const baseForTaxOnSale = ((originalInvoice as any)?.subtotal_after_discounts || 0) - ((originalInvoice as any)?.manual_discount_amount || 0);
    const taxRefund = (originalInvoice?.tax_total || 0) * (lineRefund / Math.max(baseForTaxOnSale, 1));
    const totalRefund = lineRefund + taxRefund;
    
    return {
      lineRefund,
      taxRefund,
      totalRefund
    };
  };

  // Validate form
  const validateForm = (): { isValid: boolean; error?: string } => {
    // Check if at least one line has return quantity > 0
    const hasReturns = lines.some(line => line.return_qty > 0);
    if (!hasReturns) {
      return { isValid: false, error: 'Please select at least one item to return' };
    }

    // Check if all lines with return qty have reasons
    const missingReasons = lines.some(line => 
      line.return_qty > 0 && !line.reason.trim()
    );
    if (missingReasons) {
      return { isValid: false, error: 'Please provide a reason for all returned items' };
    }

    // Check refund method validation
    if (refundMethod === 'CARD_REVERSAL' || refundMethod === 'WALLET_REVERSAL') {
      if (!refundRef.trim()) {
        return { isValid: false, error: 'Reference number is required for card/wallet reversals' };
      }
    }

    // Check manager approval
    if (requiresManagerApproval && !managerPin) {
      return { isValid: false, error: 'Manager approval required for high-value returns' };
    }

    return { isValid: true };
  };

  // Handle manager PIN verification
  const handleManagerPinVerify = async (pin: string): Promise<boolean> => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100';
      const response = await fetch(`${apiBaseUrl}/api/auth/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });

      const data = await response.json();
      return response.ok && data.valid;
    } catch (error) {
      console.error('Manager PIN verification error:', error);
      return false;
    }
  };

  // Process return
  const handleProcessReturn = async () => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100';
    const validation = validateForm();
    if (!validation.isValid) {
      setError(validation.error || 'Validation failed');
      return;
    }

    // Verify manager PIN if required
    if (requiresManagerApproval) {
      const isValidPin = await handleManagerPinVerify(managerPin);
      if (!isValidPin) {
        setError('Invalid manager PIN');
        return;
      }
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Build payload
      const payload = {
        original_receipt_no: originalInvoice?.receipt_no,
        items: lines
          .filter(line => line.return_qty > 0)
          .map(line => ({
            invoice_item_id: line.invoice_item_id,
            item_id: line.item_id,
            return_qty: line.return_qty,
            restock_flag: line.restock_flag,
            reason: line.reason
          })),
        refund_method: refundMethod,
        refund_ref: refundRef || undefined,
        operator_id: 1, // From auth context
        language: language
      };

      // Submit return
      const response = await fetch(`${apiBaseUrl}/api/returns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to process return');
        return;
      }

      // Set return data
      setLastReturn(data.receipt_no, data.printable);

      // Show success message
      const message = `Return processed successfully! Receipt: ${data.receipt_no}`;
      if (data.credit_note_id) {
        toast.success(`${message} Credit Note: ${data.credit_note_id}`);
      } else {
        toast.success(message);
      }

      // Notify parent
      onReturnProcessed?.(data.receipt_no);

      // Close manager PIN modal if open
      setShowManagerPin(false);
      setManagerPin('');

    } catch (error) {
      console.error('Return processing error:', error);
      setError('Network error while processing return');
    } finally {
      setIsProcessing(false);
    }
  };

  // Get refund method display info
  const getRefundMethodInfo = () => {
    switch (refundMethod) {
      case 'CASH':
        return { color: 'green', icon: '💵', label: 'Cash Refund' };
      case 'CARD_REVERSAL':
        return { color: 'blue', icon: '💳', label: 'Card Reversal' };
      case 'WALLET_REVERSAL':
        return { color: 'purple', icon: '📱', label: 'Wallet/QR Reversal' };
      case 'STORE_CREDIT':
        return { color: 'yellow', icon: '📋', label: 'Store Credit' };
      default:
        return { color: 'gray', icon: '💰', label: 'Refund' };
    }
  };

  const refundInfo = getRefundMethodInfo();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Return Summary
      </h2>

      <div className="space-y-4">
        {/* Totals */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-gray-700 dark:text-gray-300">
              <span>Items Subtotal To Refund:</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            {totals.tax > 0 && (
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>Tax Adjustment:</span>
                <span>{formatCurrency(totals.tax)}</span>
              </div>
            )}
            <div className="border-t border-gray-300 dark:border-gray-600 pt-2">
              <div className="flex justify-between font-bold text-lg text-gray-900 dark:text-white">
                <span>Total Refund:</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Refund Method */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Refund Method
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['CASH', 'CARD_REVERSAL', 'WALLET_REVERSAL', 'STORE_CREDIT'] as const).map((method) => (
              <button
                key={method}
                onClick={() => setRefundMethod(method)}
                className={`p-3 text-left rounded-lg border transition-colors ${
                  refundMethod === method
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">
                    {method === 'CASH' && '💵'}
                    {method === 'CARD_REVERSAL' && '💳'}
                    {method === 'WALLET_REVERSAL' && '📱'}
                    {method === 'STORE_CREDIT' && '📋'}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {method === 'CARD_REVERSAL' && 'Card Reversal'}
                    {method === 'WALLET_REVERSAL' && 'Wallet/QR Reversal'}
                    {method === 'STORE_CREDIT' && 'Store Credit'}
                    {method === 'CASH' && 'Cash'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Reference Number */}
        {(refundMethod === 'CARD_REVERSAL' || refundMethod === 'WALLET_REVERSAL') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reference Number *
            </label>
            <input
              type="text"
              value={refundRef}
              onChange={(e) => setRefundRef(e.target.value)}
              placeholder="Enter reference number"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        )}

        {/* Manager Approval Warning */}
        {requiresManagerApproval && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center">
              <Lock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" />
              <div>
                <div className="font-medium text-yellow-800 dark:text-yellow-200">
                  Manager Approval Required
                </div>
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  Returns over {formatCurrency(MANAGER_APPROVAL_THRESHOLD)} require manager PIN
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Process Return Button */}
        <button
          onClick={handleProcessReturn}
          disabled={isProcessing || totals.total === 0}
          className={`w-full px-4 py-3 bg-${refundInfo.color}-600 hover:bg-${refundInfo.color}-700 text-white rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 font-medium shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-${refundInfo.color}-500/50 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Processing Return...</span>
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4" />
              <span>Process Return</span>
            </>
          )}
        </button>
      </div>

      {/* Manager PIN Modal */}
      {showManagerPin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Manager Approval Required
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Enter manager PIN to approve this return
              </p>
              <input
                type="password"
                value={managerPin}
                onChange={(e) => setManagerPin(e.target.value)}
                placeholder="Enter manager PIN"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 mb-4"
                autoFocus
              />
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowManagerPin(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProcessReturn}
                  disabled={!managerPin.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
