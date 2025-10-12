import React, { useState, useEffect } from 'react';
import { X, Printer, FileText, AlertTriangle } from 'lucide-react';
import { shiftService } from '@/services/shiftService';
import { ShiftSummary } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { printService } from '@/services/printService';

interface DayEndSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenZReport: () => void;
  shiftId: number;
  terminal: string;
}

export const DayEndSummaryModal: React.FC<DayEndSummaryModalProps> = ({
  isOpen,
  onClose,
  onOpenZReport,
  shiftId,
  terminal
}) => {
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && shiftId) {
      loadShiftSummary();
    }
  }, [isOpen, shiftId]);

  const loadShiftSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await shiftService.getShiftSummary(shiftId);
      setSummary(data);
    } catch (err) {
      console.error('Failed to load shift summary:', err);
      setError('Failed to load shift summary');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintCashBalance = async () => {
    if (!summary) return;

    try {
      const cashBalanceData = {
        terminal: terminal,
        shiftId: shiftId,
        openedAt: summary.shift.opened_at,
        cashierId: summary.shift.cashier_id,
        cashBalance: {
          opening: summary.cashDrawer.opening,
          cashSales: summary.payments.cash,
          refunds: 0, // TODO: Calculate refunds from returns
          movements: {
            cashIn: summary.cashDrawer.cashIn,
            cashOut: summary.cashDrawer.cashOut,
            drops: summary.cashDrawer.drops,
            pickups: summary.cashDrawer.pickups,
            petty: summary.cashDrawer.petty
          },
          expectedCash: summary.cashDrawer.expectedCash
        }
      };

      await printService.printCashBalance(cashBalanceData);
    } catch (err) {
      console.error('Failed to print cash balance:', err);
      // Show error toast or notification
    }
  };

  const handleOpenZReport = () => {
    onOpenZReport();
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Day-End Summary
            </h2>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading shift summary...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Error loading shift summary
                  </h3>
                  <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}

          {summary && (
            <div className="space-y-6">
              {/* Shift Info */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  Shift Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Terminal:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">{terminal}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Shift ID:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">#{shiftId}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Opened:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {summary.shift.opened_at ? new Date(summary.shift.opened_at).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Cashier ID:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">{summary.shift.cashier_id}</span>
                  </div>
                </div>
              </div>

              {/* Cash Balance Calculation */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Cash Balance Calculation
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Opening Cash:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(summary.cashDrawer.opening)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Cash Sales:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      +{formatCurrency(summary.payments.cash)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Refunds:</span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      -{formatCurrency(0)} {/* TODO: Calculate actual refunds */}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Cash In:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      +{formatCurrency(summary.cashDrawer.cashIn)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Cash Out:</span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      -{formatCurrency(summary.cashDrawer.cashOut)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Safe Drops:</span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      -{formatCurrency(summary.cashDrawer.drops)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Petty Cash:</span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      -{formatCurrency(summary.cashDrawer.petty)}
                    </span>
                  </div>
                  <div className="border-t border-gray-300 dark:border-gray-600 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        Expected Cash:
                      </span>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(summary.cashDrawer.expectedCash)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sales Summary */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  Sales Summary
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Invoices:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">{summary.sales.invoices}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Net Sales:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {formatCurrency(summary.sales.net)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Cash Payments:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {formatCurrency(summary.payments.cash)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Card Payments:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {formatCurrency(summary.payments.card)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Please print the cash balance before closing the shift.
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handlePrintCashBalance}
              disabled={!summary || loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Printer className="h-4 w-4" />
              <span>Print Cash Balance</span>
            </button>
            <button
              onClick={handleOpenZReport}
              disabled={!summary || loading}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>Open Z Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

