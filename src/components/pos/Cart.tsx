/**
 * Cart Component
 * Displays cart items and handles cart operations
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, Plus, Trash2, Tag, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useCartStore } from '@/store/cartStore';
import { CartItem } from '@/types';
import { formatCurrency } from '@/utils/currency';

export function Cart() {
  const { t } = useTranslation();
  const { items, updateItemQuantity, removeItem } = useCartStore();
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleQuantityChange = (itemId: string, change: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const step = item.unit === 'kg' ? 0.1 : 1;
    const newQty = Math.max(0, item.qty + change * step);
    
    if (newQty === 0) {
      removeItem(itemId);
      return;
    }

    updateItemQuantity(itemId, newQty);
  };

  const handleQuantityEdit = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    setEditingItem(itemId);
    setEditValue(item.qty.toString());
  };

  const handleQuantitySubmit = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const parsed = item.unit === 'kg' ? parseFloat(editValue || '0') : Number(editValue || '0');
    
    if (isNaN(parsed) || parsed < 0) {
      setEditingItem(null);
      setEditValue('');
      return;
    }

    const newQty = Math.max(0, parsed);
    
    if (newQty === 0) {
      removeItem(itemId);
    } else {
      updateItemQuantity(itemId, newQty);
    }
    
    setEditingItem(null);
    setEditValue('');
  };

  const handleQuantityCancel = () => {
    setEditingItem(null);
    setEditValue('');
  };

  const handleDiscountEdit = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    setEditingItem(itemId);
    setEditValue(item.line_discount_value?.toString() || '0');
  };

  const handleDiscountSubmit = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const discountValue = parseFloat(editValue || '0');
    if (isNaN(discountValue) || discountValue < 0) {
      setEditingItem(null);
      setEditValue('');
      return;
    }

    // TODO: Implement line discount functionality
    console.log('Line discount not implemented yet', { itemId, discountValue });
    setEditingItem(null);
    setEditValue('');
  };

  const formatQuantity = (qty: number, unit: string) => {
    if (unit === 'kg') {
      return `${qty.toFixed(3)} kg`;
    }
    return `${qty} pc`;
  };

  const formatPrice = (price: number) => {
    return `LKR ${price.toLocaleString()}`;
  };

  if (items.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{t('pos.cart')}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-gray-500">
            <div className="text-lg font-medium mb-2">{t('pos.emptyCart')}</div>
            <div className="text-sm">{t('pos.addItemsToCart')}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t('pos.cart')}</span>
          <Badge variant="secondary">{items.length} {t('pos.items')}</Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden">
        <div className="space-y-3 overflow-y-auto max-h-96">
          {items.map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{item.name}</div>
                  <div className="text-sm text-gray-500">SKU: {item.sku}</div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeItem(item.id)}
                  className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuantityChange(item.id, -1)}
                    className="h-8 w-8 p-0"
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  
                  {editingItem === item.id ? (
                    <div className="flex items-center space-x-1">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleQuantitySubmit(item.id);
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            handleQuantityCancel();
                          }
                        }}
                        className="w-16 h-8 text-sm"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleQuantitySubmit(item.id)}
                        className="h-8 w-8 p-0"
                      >
                        ✓
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuantityEdit(item.id)}
                      className="h-8 px-2 text-sm"
                    >
                      {formatQuantity(item.qty, item.unit)}
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuantityChange(item.id, 1)}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>

                <div className="text-right">
                  <div className="font-medium text-gray-900">
                    {formatCurrency(item.line_total)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatCurrency(item.current_price || 0)} each
                  </div>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Tag className="w-3 h-3 text-orange-500" />
                  {editingItem === item.id ? (
                    <div className="flex items-center space-x-1">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleDiscountSubmit(item.id);
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            handleQuantityCancel();
                          }
                        }}
                        className="w-20 h-6 text-xs"
                        autoFocus
                        placeholder="0"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDiscountSubmit(item.id)}
                        className="h-6 w-6 p-0"
                      >
                        ✓
                      </Button>
                    </div>
                  ) : (
                    <span className="text-sm text-orange-600">
                      {item.line_discount_type && item.line_discount_value && item.line_discount_value > 0
                        ? (item.line_discount_type === 'PERCENTAGE' 
                            ? `${item.line_discount_value}% off`
                            : `${formatPrice(item.line_discount_value)} off`)
                        : 'No discount'
                      }
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDiscountEdit(item.id)}
                  className="h-6 w-6 p-0 text-orange-600 hover:text-orange-800"
                >
                  <Edit3 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}