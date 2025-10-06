import React from 'react';
import { Package, AlertTriangle } from 'lucide-react';
import { useReturnStore } from '@/store/returnStore';
import { formatCurrency } from '@/lib/currency';

interface ReturnLinesTableProps {
  onLineUpdate?: (line: any) => void;
}

export function ReturnLinesTable({ onLineUpdate }: ReturnLinesTableProps) {
  const { lines, updateLine, originalInvoice } = useReturnStore();

  const reasonOptions = [
    { value: '', label: 'Select reason...' },
    { value: 'Damaged', label: 'Damaged' },
    { value: 'Defective', label: 'Defective' },
    { value: 'Wrong Item', label: 'Wrong Item' },
    { value: 'Customer Dissatisfied', label: 'Customer Dissatisfied' },
    { value: 'Expired', label: 'Expired' },
    { value: 'Other', label: 'Other' }
  ];

  // Handle return quantity change
  const handleReturnQtyChange = (invoice_item_id: number, value: string) => {
    const qty = Math.max(0, parseFloat(value) || 0);
    const line = lines.find(l => l.invoice_item_id === invoice_item_id);
    
    if (!line) return;

    // Clamp to eligible quantity
    const clampedQty = Math.min(qty, line.eligible_qty);
    
    // Calculate refund line estimate
    const refund_line_estimate = roundCurrency(clampedQty * line.refund_unit_estimate);

    updateLine(invoice_item_id, {
      return_qty: clampedQty,
      refund_line_estimate
    });

    onLineUpdate?.(line);
  };

  // Handle restock flag change
  const handleRestockChange = (invoice_item_id: number, checked: boolean) => {
    updateLine(invoice_item_id, { restock_flag: checked });
  };

  // Handle reason change
  const handleReasonChange = (invoice_item_id: number, reason: string) => {
    updateLine(invoice_item_id, { reason });
  };

  // Round currency helper
  const roundCurrency = (amount: number): number => {
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  };

  if (!originalInvoice) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Invoice Selected
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Look up a sale to view returnable items
          </p>
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Returnable Items
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            All items in this sale have already been returned
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Return Items
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Select items to return and specify quantities
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                Item
              </th>
              <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
                Sold Qty
              </th>
              <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
                Already Returned
              </th>
              <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
                Eligible Qty
              </th>
              <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
                Return Qty
              </th>
              <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">
                Refund/Unit
              </th>
              <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">
                Line Refund
              </th>
              <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-white">
                Restock?
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                Reason
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {lines.map((line) => (
              <tr 
                key={line.invoice_item_id}
                className={`${
                  line.eligible_qty === 0 
                    ? 'bg-gray-50 dark:bg-gray-800 opacity-60' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {/* Item */}
                <td className="py-4 px-4">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {line.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      SKU: {line.sku}
                    </div>
                  </div>
                </td>

                {/* Sold Qty */}
                <td className="py-4 px-4 text-center text-gray-900 dark:text-white">
                  {line.sold_qty}
                </td>

                {/* Already Returned */}
                <td className="py-4 px-4 text-center text-gray-900 dark:text-white">
                  {line.already_returned_qty}
                </td>

                {/* Eligible Qty */}
                <td className="py-4 px-4 text-center">
                  <span className={`font-medium ${
                    line.eligible_qty === 0 
                      ? 'text-gray-400' 
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    {line.eligible_qty}
                  </span>
                </td>

                {/* Return Qty */}
                <td className="py-4 px-4 text-center">
                  <input
                    type="number"
                    min="0"
                    max={line.eligible_qty}
                    step="1"
                    value={line.return_qty || ''}
                    onChange={(e) => handleReturnQtyChange(line.invoice_item_id, e.target.value)}
                    disabled={line.eligible_qty === 0}
                    className={`w-20 px-2 py-1 border rounded text-center text-sm ${
                      line.eligible_qty === 0
                        ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-400'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  />
                </td>

                {/* Refund/Unit */}
                <td className="py-4 px-4 text-right text-gray-900 dark:text-white">
                  {formatCurrency(line.refund_unit_estimate)}
                </td>

                {/* Line Refund */}
                <td className="py-4 px-4 text-right">
                  <span className={`font-medium ${
                    line.refund_line_estimate > 0 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-gray-400'
                  }`}>
                    {formatCurrency(line.refund_line_estimate)}
                  </span>
                </td>

                {/* Restock */}
                <td className="py-4 px-4 text-center">
                  <input
                    type="checkbox"
                    checked={line.restock_flag}
                    onChange={(e) => handleRestockChange(line.invoice_item_id, e.target.checked)}
                    disabled={line.eligible_qty === 0 || line.return_qty === 0}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                </td>

                {/* Reason */}
                <td className="py-4 px-4">
                  <select
                    value={line.reason}
                    onChange={(e) => handleReasonChange(line.invoice_item_id, e.target.value)}
                    disabled={line.eligible_qty === 0}
                    className={`px-2 py-1 border rounded text-sm ${
                      line.eligible_qty === 0
                        ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-400'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  >
                    {reasonOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Validation Messages */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Eligible for return</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span>Fully returned</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
