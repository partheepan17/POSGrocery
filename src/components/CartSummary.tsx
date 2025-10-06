import React, { useState, useEffect } from 'react';
import { Minus, Plus, Trash2, Tag, AlertCircle, CreditCard } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { formatCurrency } from '@/lib/currency';
import { validatePercentageDiscount, validateFixedDiscount } from '@/lib/validation';
import { toast } from 'react-hot-toast';

type ManualDiscountType = { type: 'FIXED_AMOUNT' | 'PERCENTAGE'; value: number };
type AppliedRule = { rule_name: string; discount_amount: number };
type Line = {
  id: string | number;
  product: { name_en: string; sku: string; unit: string };
  qty: number;
  unit_price: number;
  line_discount: number;
  tax: number;
  total: number;
  applied_rules?: AppliedRule[];
};

interface CartSummaryProps {
  cartLines: Line[];
  onQuantityChange: (id: string | number, delta: number) => void;
  onQuantitySet: (id: string | number, value: number) => void;
  onRemoveLine: (id: string | number) => void;
  onManualDiscountChange: (d: ManualDiscountType) => void;
  manualDiscount: ManualDiscountType;
  appliedDiscounts: AppliedRule[];
  discountWarnings: string[];
  priceTier: string;
}

export function CartSummary({
  cartLines,
  onQuantityChange,
  onQuantitySet,
  onRemoveLine,
  onManualDiscountChange,
  manualDiscount,
  appliedDiscounts,
  discountWarnings,
  priceTier
}: CartSummaryProps) {
  const [totals, setTotals] = useState({
    gross: 0,
    itemDiscounts: 0,
    manualDiscount: 0,
    tax: 0,
    net: 0
  });

  // Calculate totals whenever cart lines or manual discount changes
  useEffect(() => {
    if (cartLines.length === 0) {
      setTotals({
        gross: 0,
        itemDiscounts: 0,
        manualDiscount: 0,
        tax: 0,
        net: 0
      });
      return;
    }

    // Calculate gross total
    const gross = cartLines.reduce((sum, line) => sum + (line.qty * line.unit_price), 0);
    
    // Calculate item-level discounts
    const itemDiscounts = cartLines.reduce((sum, line) => sum + line.line_discount, 0);
    
    // Calculate tax
    const tax = cartLines.reduce((sum, line) => sum + line.tax, 0);
    
    // Calculate manual discount
    let manualDiscountAmount = 0;
    if (manualDiscount.value > 0) {
      if (manualDiscount.type === 'PERCENTAGE') {
        manualDiscountAmount = gross * (manualDiscount.value / 100);
      } else {
        manualDiscountAmount = manualDiscount.value;
      }
    }

    // Cap manual discount to prevent negative totals
    const maxAllowedDiscount = gross - itemDiscounts;
    manualDiscountAmount = Math.min(manualDiscountAmount, maxAllowedDiscount);

    // Calculate net total
    const net = gross - itemDiscounts - manualDiscountAmount + tax;

    setTotals({
      gross,
      itemDiscounts,
      manualDiscount: manualDiscountAmount,
      tax,
      net
    });
  }, [cartLines, manualDiscount]);

  const handleManualDiscountTypeChange = (type: 'FIXED_AMOUNT' | 'PERCENTAGE') => {
    onManualDiscountChange({ type, value: 0 });
  };

  const handleManualDiscountValueChange = (value: number) => {
    // Validate percentage (0-100)
    if (manualDiscount.type === 'PERCENTAGE' && (value < 0 || value > 100)) {
      return;
    }
    
    // Validate fixed amount (not negative)
    if (manualDiscount.type === 'FIXED_AMOUNT' && value < 0) {
      return;
    }

    onManualDiscountChange({ type: manualDiscount.type, value });
  };

  const clearManualDiscount = () => {
    onManualDiscountChange({ type: 'FIXED_AMOUNT', value: 0 });
  };

  if (cartLines.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl text-gray-400 mb-4">🛒</div>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">Cart is Empty</h3>
          <p className="text-gray-400">Add items to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 bg-gray-900 p-6 flex flex-col">
      {/* Cart Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Cart</h2>
        <div className="flex items-center space-x-2">
          <div className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium">
            {priceTier}
          </div>
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto mb-6">
        <div className="space-y-3">
          {cartLines.map((line) => (
            <div key={line.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-white text-lg">
                    {line.product.name_en}
                  </h4>
                  <div className="text-sm text-gray-400 mt-1">
                    {line.product.sku} • {line.product.unit}
                  </div>
                  <div className="text-sm text-gray-300 mt-1">
                    රු {line.unit_price.toLocaleString()} each
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Quantity Controls */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onQuantityChange(line.id, -1)}
                      className="p-1 bg-gray-700 text-white rounded hover:bg-gray-600"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={line.qty}
                      onChange={(e) => onQuantitySet(line.id, parseInt(e.target.value) || 1)}
                      className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-center"
                    />
                    <button
                      onClick={() => onQuantityChange(line.id, 1)}
                      className="p-1 bg-gray-700 text-white rounded hover:bg-gray-600"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="text-right">
                    <div className="font-medium text-white">
                      රු {line.total.toLocaleString()}
                    </div>
                    {line.line_discount > 0 && (
                      <div className="text-xs text-green-400">
                        Save: රු {line.line_discount.toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => onRemoveLine(line.id)}
                    className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Applied Discounts */}
              {line.applied_rules && line.applied_rules.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-700">
                  <div className="flex items-center text-xs text-green-400">
                    <Tag className="w-3 h-3 mr-1" />
                    <span>Promo applied: {line.applied_rules.map(rule => rule.rule_name).join(', ')}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Active Discount Warnings */}
      {discountWarnings.length > 0 && (
        <div className="mb-4">
          <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-3">
            <div className="flex items-center mb-2">
              <AlertCircle className="w-4 h-4 text-yellow-400 mr-2" />
              <span className="text-sm font-medium text-yellow-400">Discount Notices</span>
            </div>
            <ul className="text-xs text-yellow-300 space-y-1">
              {discountWarnings.map((warning, index) => (
                <li key={index}>• {warning}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Applied Discounts Summary */}
      {appliedDiscounts.length > 0 && (
        <div className="mb-4">
          <div className="bg-green-900 border border-green-700 rounded-lg p-3">
            <div className="flex items-center mb-2">
              <Tag className="w-4 h-4 text-green-400 mr-2" />
              <span className="text-sm font-medium text-green-400">Active Promotions</span>
            </div>
            <ul className="text-xs text-green-300 space-y-1">
              {appliedDiscounts.map((discount, index) => (
                <li key={index} className="flex justify-between">
                  <span>{discount.rule_name}</span>
                  <span>-රු {discount.discount_amount.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Manual Discount Section */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white mb-4">Manual Discount</h3>
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => handleManualDiscountTypeChange('FIXED_AMOUNT')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                manualDiscount.type === 'FIXED_AMOUNT'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Fixed Amount
            </button>
            <button
              onClick={() => handleManualDiscountTypeChange('PERCENTAGE')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                manualDiscount.type === 'PERCENTAGE'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Percentage (%)
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step={manualDiscount.type === 'PERCENTAGE' ? '0.1' : '1'}
              max={manualDiscount.type === 'PERCENTAGE' ? '100' : undefined}
              value={manualDiscount.value || ''}
              onChange={(e) => handleManualDiscountValueChange(parseFloat(e.target.value) || 0)}
              placeholder={manualDiscount.type === 'PERCENTAGE' ? '0.0' : '0'}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              onClick={clearManualDiscount}
              className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 text-sm"
            >
              Clear
            </button>
          </div>
          {manualDiscount.value > 0 && (
            <div className="text-sm text-blue-400">
              Manual Discount: රු {totals.manualDiscount.toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Totals Summary */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-4">Totals</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-gray-300">
            <span>Subtotal:</span>
            <span>රු {totals.gross.toLocaleString()}</span>
          </div>
          {totals.itemDiscounts > 0 && (
            <div className="flex justify-between text-green-400">
              <span>Item Discounts:</span>
              <span>-රු {totals.itemDiscounts.toLocaleString()}</span>
            </div>
          )}
          {totals.manualDiscount > 0 && (
            <div className="flex justify-between text-blue-400">
              <span>Manual Discount:</span>
              <span>-රු {totals.manualDiscount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-300">
            <span>Tax:</span>
            <span>රු {totals.tax.toLocaleString()}</span>
          </div>
          <div className="border-t border-gray-600 pt-2">
            <div className="flex justify-between text-green-400 font-bold text-lg">
              <span>Grand Total:</span>
              <span>රු {totals.net.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
