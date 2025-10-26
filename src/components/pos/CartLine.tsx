import React, { useState, useRef, useEffect } from 'react';
import { Minus, Plus, Trash2, Tag, Edit3, Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { Product } from '@/services/dataService';

interface CartLine {
  id: number;
  product_id: number;
  product: Product;
  qty: number;
  weight?: number;
  unit_price: number;
  line_discount: number;
  tax: number;
  total: number;
  applied_rules?: any[];
  discount_reason?: string;
}

interface CartLineProps {
  line: CartLine;
  onQuantityChange: (lineId: string, newQuantity: number) => void;
  onRemove: (lineId: string) => void;
  onDiscountChange: (lineId: string, discount: number) => void;
}

export function CartLine({ line, onQuantityChange, onRemove, onDiscountChange }: CartLineProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(line.qty.toString());
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountValue, setDiscountValue] = useState(line.line_discount.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleQuantityChange = (change: number) => {
    const step = line.product.unit === 'kg' ? 0.1 : 1;
    const rawQty = line.qty + change * step;
    const newQty = Math.max(0, line.product.unit === 'kg' ? parseFloat(rawQty.toFixed(3)) : Math.round(rawQty));
    
    if (newQty === 0) {
      onRemove(line.id.toString());
      return;
    }

    onQuantityChange(line.id.toString(), newQty);
  };

  const handleQuantityInput = (value: string) => {
    setEditValue(value);
  };

  const handleQuantitySubmit = () => {
    const parsed = line.product.unit === 'kg' ? parseFloat(editValue || '0') : Number(editValue || '0');
    const newQtyRaw = isNaN(parsed) ? 0 : parsed;
    const newQty = Math.max(0, line.product.unit === 'kg' ? parseFloat(newQtyRaw.toFixed(3)) : Math.round(newQtyRaw));
    
    onQuantityChange(line.id.toString(), newQty);
    setIsEditing(false);
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleQuantitySubmit();
    } else if (e.key === 'Escape') {
      setEditValue(line.qty.toString());
      setIsEditing(false);
    }
  };

  const handleDiscountSubmit = () => {
    const discount = parseFloat(discountValue) || 0;
    onDiscountChange(line.id.toString(), discount);
    setShowDiscountModal(false);
  };

  const formatQuantity = (qty: number) => {
    return line.product.unit === 'kg' ? qty.toFixed(3) : qty.toString();
  };

  const hasDiscount = line.line_discount > 0;
  const hasAppliedRules = !!(line.applied_rules && line.applied_rules.length > 0);
  const [showPopover, setShowPopover] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowPopover(false);
    }
    document.addEventListener('keydown', onDocKey);
    return () => document.removeEventListener('keydown', onDocKey);
  }, []);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {line.product.name_en}
              </h3>
              {(hasAppliedRules || (line as any).special_applied) && (
                <button
                  aria-label="View applied discounts"
                  className="inline-flex items-center px-2 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  onClick={() => setShowPopover(v => !v)}
                  onMouseEnter={() => setShowPopover(true)}
                  onMouseLeave={() => setShowPopover(false)}
                >
                  <Tag className="w-3 h-3 mr-1" />
                  {(() => {
                    if ((line as any).special_applied) {
                      return (line as any).special_reason || 'Special Price';
                    }
                    const rules = line.applied_rules || [];
                    if (rules.length === 1) {
                      const r = rules[0];
                      if (r.type === 'PERCENT') return `${r.value}% ${r.level || 'Product'}`;
                      return `LKR ${Number(r.value || 0).toLocaleString()} ${r.level || 'Rule'}`;
                    }
                    return `Stacked (${rules.length})`;
                  })()}
                </button>
              )}
            </div>
            
            <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
              <div>SKU: <span className="font-mono text-blue-600 dark:text-blue-400">{line.product.sku}</span></div>
              <div>
                රු {line.unit_price.toLocaleString()} per {line.product.unit}
                {line.weight && (
                  <span className="ml-2 text-blue-600 dark:text-blue-400">
                    (Weight: {line.weight.toFixed(3)} kg)
                  </span>
                )}
              </div>
              {hasDiscount && (
                <div className="text-green-600 dark:text-green-400">
                  Discount: රු {line.line_discount.toLocaleString()}
                  {line.discount_reason && (
                    <span className="ml-1 text-xs">({line.discount_reason})</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quantity Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Button
                onClick={() => handleQuantityChange(-1)}
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
              >
                <Minus className="w-4 h-4" />
              </Button>
              
              {isEditing ? (
                <Input
                  ref={inputRef}
                  type="number"
                  value={editValue}
                  onChange={(e) => handleQuantityInput(e.target.value)}
                  onKeyDown={handleQuantityKeyDown}
                  onBlur={handleQuantitySubmit}
                  className="w-20 text-center h-8"
                  step={line.product.unit === 'kg' ? 0.001 : 1}
                  min={0}
                />
              ) : (
                <div
                  onClick={() => setIsEditing(true)}
                  className="w-20 h-8 flex items-center justify-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  {formatQuantity(line.qty)}
                </div>
              )}
              
              <Button
                onClick={() => handleQuantityChange(1)}
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Discount Button */}
            <Button
              onClick={() => setShowDiscountModal(true)}
              size="sm"
              variant="outline"
              className={`h-8 px-2 ${hasDiscount ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-300' : ''}`}
            >
              <Tag className="w-4 h-4" />
            </Button>

            {/* Remove Button */}
            <Button
              onClick={() => onRemove(line.id.toString())}
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Total */}
          <div className="text-right ml-4">
            <div className="font-bold text-lg text-gray-900 dark:text-white">
              රු {line.total.toLocaleString()}
            </div>
            {hasDiscount && (
              <div className="text-xs text-green-600 dark:text-green-400">
                Save: රු {line.line_discount.toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* Popover with applied rules */}
        {(hasAppliedRules || (line as any).special_applied || (line as any).special_profile_no_match) && showPopover && (
          <div
            ref={popRef}
            role="dialog"
            aria-label="Applied discounts"
            className="mt-3 p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 shadow-lg"
          >
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Pricing & Discounts</div>
            {(line as any).special_applied && (
              <div className="mb-2">
                <div className="text-xs font-semibold text-purple-700 dark:text-purple-300">Special Pricing</div>
                {(line as any).special_entries?.map((e:any, idx:number) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex-1 pr-2">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {e.level} • {e.rule_type.replace('_',' ')} • {e.rule_type==='PERCENT_DISCOUNT'? `${e.value}%` : `LKR ${Number(e.value||0).toLocaleString()}`}
                      </div>
                    </div>
                  </div>
                ))}
                {(line as any).special_reason === 'Special Price' && (
                  <div className="text-xs text-gray-600">Special Price applied</div>
                )}
                {(line as any).special_reason === 'Customer Discount' && (
                  <div className="text-xs text-gray-600">Customer Discount applied</div>
                )}
              </div>
            )}
            {(line as any).special_profile_no_match && (
              <div className="mb-2 text-xs text-gray-500">No special price matched; applied standard discounts</div>
            )}
            <div className="space-y-2">
              {(line.applied_rules || []).map((r: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex-1 pr-2">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{r.rule_name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {r.level || 'Rule'} • {r.type === 'PERCENT' ? `${r.value}%` : `LKR ${Number(r.value || 0).toLocaleString()}`} • {r.reason === 'stack' ? 'Stack' : r.reason === 'capped' ? 'Capped' : 'Priority'}
                    </div>
                  </div>
                  <div className="text-green-700 dark:text-green-300 text-sm">- LKR {Number(r.discount_amount || 0).toLocaleString()}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm">
              <div className="text-gray-600 dark:text-gray-300">Line discount</div>
              <div className="font-semibold text-green-700 dark:text-green-300">LKR {line.line_discount.toLocaleString()}</div>
            </div>
            {Array.isArray(line.applied_rules) && line.applied_rules.some((r: any) => r.reason === 'capped') && (
              <div className="mt-1 text-xs text-gray-500">Capped at line subtotal</div>
            )}
          </div>
        )}
      </CardContent>

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Apply Discount
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Discount Amount (රු)
                </label>
                <Input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  max={line.unit_price * line.qty}
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Max: රු {(line.unit_price * line.qty).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowDiscountModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDiscountSubmit}
                  className="flex-1"
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
