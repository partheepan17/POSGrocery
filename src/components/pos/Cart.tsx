import React, { useEffect, useMemo, useState } from 'react';
import { Trash2, Tag, Lock } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { formatCurrency } from '@/lib/currency';
import { validateQuantity } from '@/lib/validation';

interface CartProps {
  onItemUpdate?: (item: any) => void;
  onItemRemove?: (itemId: string) => void;
}

export function Cart({ onItemUpdate, onItemRemove }: CartProps) {
  const { 
    items, 
    priceTier, 
    updateItemQuantity, 
    removeItem, 
    updateItemDiscount 
  } = useCartStore();
  const isRetailTier = priceTier === 'Retail';

  // Local editable state for debounced qty changes
  const [qtyDraft, setQtyDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    // Initialize drafts from items when cart changes
    const initial: Record<string, string> = {};
    items.forEach(it => { initial[it.id] = it.qty.toFixed(3); });
    setQtyDraft(initial);
  }, [items]);

  // Debounce timer map
  const timers = useMemo(() => new Map<string, any>(), []);

  const onQtyInput = (itemId: string, value: string) => {
    setQtyDraft(prev => ({ ...prev, [itemId]: value }));
    const num = parseFloat(value);
    const v = validateQuantity(num);
    if (!v.isValid) return;
    // debounce 300ms
    if (timers.get(itemId)) clearTimeout(timers.get(itemId));
    const t = setTimeout(async () => {
      await updateItemQuantity(itemId, Number(num.toFixed(3)));
      const item = items.find(i => i.id === itemId);
      if (item) onItemUpdate?.(item);
    }, 300);
    timers.set(itemId, t);
  };

  // Handle discount change
  const handleDiscountChange = (itemId: string, type: 'FIXED_AMOUNT' | 'PERCENTAGE', value: number) => {
    if (!isRetailTier) return;
    
    updateItemDiscount(itemId, type, value);
    onItemUpdate?.(items.find(i => i.id === itemId));
  };

  // Handle item remove
  const handleItemRemove = (itemId: string) => {
    removeItem(itemId);
    const removed = items.find(i => i.id === itemId);
    onItemRemove?.(removed ? removed.id : itemId);
  };

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl text-gray-400 mb-4">🛒</div>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">Cart is Empty</h3>
          <p className="text-gray-400">Scan items or search to add products</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-900 p-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Cart</h2>
        <div className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium">{priceTier}</div>
      </div>

      <div className="flex-1 overflow-auto rounded-lg border border-gray-700">
        <table className="min-w-full text-sm text-gray-100">
          <thead className="bg-gray-800 text-gray-300 uppercase text-xs">
            <tr>
              <th className="px-3 py-2 text-left">Product</th>
              <th className="px-3 py-2 text-right">Qty (3dp)</th>
              <th className="px-3 py-2 text-right">Discount</th>
              <th className="px-3 py-2 text-right">Line Total</th>
              <th className="px-3 py-2"> </th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-t border-gray-700">
                <td className="px-3 py-2">
                  <div className="font-medium text-white">{item.name}</div>
                  <div className="text-xs text-gray-400">{item.sku} • {item.unit} • {formatCurrency(item.current_price)} ea</div>
                </td>
                <td className="px-3 py-2 align-middle text-right">
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={qtyDraft[item.id] ?? item.qty.toFixed(3)}
                    onChange={(e) => onQtyInput(item.id, e.target.value)}
                    className="w-28 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-right"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  {isRetailTier ? (
                    <div className="flex items-center justify-end gap-2">
                      <select
                        value={item.line_discount_type || 'FIXED_AMOUNT'}
                        onChange={(e) => handleDiscountChange(item.id, e.target.value as 'FIXED_AMOUNT' | 'PERCENTAGE', item.line_discount_value || 0)}
                        className="px-2 py-1 bg-gray-800 border border-gray-600 rounded"
                      >
                        <option value="FIXED_AMOUNT">Fixed</option>
                        <option value="PERCENTAGE">%</option>
                      </select>
                      <input
                        type="number"
                        step={item.line_discount_type === 'PERCENTAGE' ? '0.1' : '1'}
                        min="0"
                        max={item.line_discount_type === 'PERCENTAGE' ? '100' : undefined}
                        value={item.line_discount_value || ''}
                        onChange={(e) => handleDiscountChange(item.id, item.line_discount_type || 'FIXED_AMOUNT', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-right"
                        placeholder="0"
                      />
                      <Tag className="w-4 h-4 text-green-400" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-2 text-gray-500"><Lock className="w-4 h-4" /> Disabled</div>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-gray-300">{/* Auto discount placeholder */}0.00</td>
                <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.line_total)}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => handleItemRemove(item.id)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
