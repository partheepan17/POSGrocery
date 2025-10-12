import React from 'react';
import { X, Printer, Download } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => Promise<void>;
  onPrintSuccess?: () => void;
  onPrintError?: (error: string) => void;
  printData: {
    receipt_no: string;
    date: string;
    lines: Array<{
      name: string;
      qty: number;
      price: number;
      total: number;
    }>;
    totals: {
      subtotal: number;
      item_discounts_total: number;
      manual_discount_value: number;
      tax_total: number;
      grand_total: number;
    };
    payments: Array<{
      method: string;
      amount: number;
    }>;
  } | null;
}

export function PrintPreviewModal({ isOpen, onClose, onPrint, onPrintSuccess, onPrintError, printData }: PrintPreviewModalProps) {
  const [isPrinting, setIsPrinting] = React.useState(false);

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await onPrint();
      onPrintSuccess?.();
    } catch (error) {
      onPrintError?.(error instanceof Error ? error.message : 'Print failed');
    } finally {
      setIsPrinting(false);
    }
  };

  if (!isOpen || !printData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Print Preview</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Receipt Preview */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="bg-white border-2 border-gray-300 rounded-lg p-4 font-mono text-sm">
            {/* Receipt Header */}
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold">viRtual POS</h3>
              <p className="text-sm text-gray-600">Point of Sale System</p>
              <p className="text-xs text-gray-500">Invoice: {printData.receipt_no}</p>
              <p className="text-xs text-gray-500">
                Date: {new Date(printData.date).toLocaleString()}
              </p>
            </div>

            {/* Receipt Items */}
            <div className="border-t border-gray-300 pt-2 mb-4">
              <div className="flex justify-between text-xs font-bold mb-2">
                <span>Item</span>
                <span>Qty</span>
                <span>Price</span>
                <span>Total</span>
              </div>
              
              {printData.lines.map((line, index) => (
                <div key={index} className="flex justify-between text-xs py-1">
                  <span className="flex-1 truncate">{line.name}</span>
                  <span className="w-12 text-right">{line.qty}</span>
                  <span className="w-16 text-right">{formatCurrency(line.price)}</span>
                  <span className="w-16 text-right">{formatCurrency(line.total)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-gray-300 pt-2 mb-4">
              <div className="flex justify-between text-xs">
                <span>Subtotal:</span>
                <span>{formatCurrency(printData.totals.subtotal)}</span>
              </div>
              {printData.totals.item_discounts_total > 0 && (
                <div className="flex justify-between text-xs">
                  <span>Item Discounts:</span>
                  <span>-{formatCurrency(printData.totals.item_discounts_total)}</span>
                </div>
              )}
              {printData.totals.manual_discount_value > 0 && (
                <div className="flex justify-between text-xs">
                  <span>Manual Discount:</span>
                  <span>-{formatCurrency(printData.totals.manual_discount_value)}</span>
                </div>
              )}
              {printData.totals.tax_total > 0 && (
                <div className="flex justify-between text-xs">
                  <span>Tax:</span>
                  <span>{formatCurrency(printData.totals.tax_total)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold border-t border-gray-300 pt-1 mt-2">
                <span>Total:</span>
                <span>{formatCurrency(printData.totals.grand_total)}</span>
              </div>
            </div>

            {/* Payments */}
            <div className="border-t border-gray-300 pt-2 mb-4">
              <div className="text-xs font-bold mb-2">Payment Methods:</div>
              {printData.payments.map((payment, index) => (
                <div key={index} className="flex justify-between text-xs">
                  <span>{payment.method}:</span>
                  <span>{formatCurrency(payment.amount)}</span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-500 border-t border-gray-300 pt-2">
              <p>Thank you for your business!</p>
              <p>viRtual POS © Virtual Software Pvt Ltd</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="w-4 h-4" />
            {isPrinting ? 'Printing...' : 'Print Receipt'}
          </button>
        </div>
      </div>
    </div>
  );
}











