import React, { useState, useMemo } from 'react';
import { cn } from '@/utils/cn';
import { 
  Plus, 
  Minus, 
  Trash2, 
  Edit3, 
  Check, 
  X,
  Percent,
  Tag,
  Package,
  AlertCircle
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table';
import { Card, CardHeader, CardContent } from '../ui/Card';

interface CartItem {
  id: string;
  productId: number;
  name: string;
  barcode?: string;
  quantity: number;
  unitPrice: number;
  manualDiscount: number;
  autoDiscount: number;
  unit: string;
  lineTotal: number;
  promoApplied?: string;
  priceReason?: string;
  maxReturnable?: number;
}

interface EnhancedCartProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onUpdateManualDiscount: (id: string, discount: number) => void;
  onRemoveItem: (id: string) => void;
  onEditItem: (id: string) => void;
  subtotal: number;
  totalDiscount: number;
  total: number;
  className?: string;
}

export function EnhancedCart({
  items,
  onUpdateQuantity,
  onUpdateManualDiscount,
  onRemoveItem,
  onEditItem,
  subtotal,
  totalDiscount,
  total,
  className
}: EnhancedCartProps) {
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<string>('');
  const [editDiscount, setEditDiscount] = useState<string>('');

  const handleEditStart = (item: CartItem) => {
    setEditingItem(item.id);
    setEditQuantity(item.quantity.toString());
    setEditDiscount(item.manualDiscount.toString());
  };

  const handleEditSave = () => {
    if (editingItem) {
      const quantity = parseFloat(editQuantity) || 0;
      const discount = parseFloat(editDiscount) || 0;
      
      if (quantity > 0) {
        onUpdateQuantity(editingItem, quantity);
      }
      if (discount >= 0) {
        onUpdateManualDiscount(editingItem, discount);
      }
      
      setEditingItem(null);
      setEditQuantity('');
      setEditDiscount('');
    }
  };

  const handleEditCancel = () => {
    setEditingItem(null);
    setEditQuantity('');
    setEditDiscount('');
  };

  const handleQuantityChange = (id: string, delta: number) => {
    const item = items.find(i => i.id === id);
    if (item) {
      const newQuantity = Math.max(0, item.quantity + delta);
      onUpdateQuantity(id, newQuantity);
    }
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(amount);

  const formatQuantity = (qty: number) => 
    new Intl.NumberFormat('en-US', { 
      minimumFractionDigits: 3,
      maximumFractionDigits: 3 
    }).format(qty);

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader title="Cart" className="pb-3">
        <div className="flex items-center justify-between">
          <Badge variant="pos-info" size="sm">
            {items.length} item{items.length !== 1 ? 's' : ''}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {/* Clear cart */}}
            disabled={items.length === 0}
          >
            Clear All
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <Package className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Cart is empty</p>
            <p className="text-sm">Scan or search for products to add items</p>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* Cart Table */}
            <div className="flex-1 overflow-hidden">
              <Table variant="pos" size="sm" density="compact" stickyHeader>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead className="min-w-0 flex-1">Product</TableHead>
                    <TableHead className="w-20 text-right">Qty</TableHead>
                    <TableHead className="w-16 text-right">Unit</TableHead>
                    <TableHead className="w-20 text-right">Price</TableHead>
                    <TableHead className="w-16 text-right">Disc</TableHead>
                    <TableHead className="w-20 text-right">Total</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={item.id} hover>
                      <TableCell className="text-xs text-gray-500">
                        {index + 1}
                      </TableCell>
                      
                      <TableCell className="min-w-0">
                        <div className="flex flex-col min-w-0">
                          <div className="font-medium text-sm truncate">
                            {item.name}
                          </div>
                          {item.barcode && (
                            <div className="text-xs text-gray-500 truncate">
                              {item.barcode}
                            </div>
                          )}
                          <div className="flex items-center gap-1 mt-1">
                            {item.promoApplied && (
                              <Badge variant="pos-success" size="sm" className="text-xs">
                                <Tag className="w-3 h-3 mr-1" />
                                {item.promoApplied}
                              </Badge>
                            )}
                            {item.priceReason && (
                              <Badge variant="pos-info" size="sm" className="text-xs">
                                {item.priceReason}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        {editingItem === item.id ? (
                          <Input
                            type="number"
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(e.target.value)}
                            inputSize="sm"
                            className="w-16 text-right"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditSave();
                              if (e.key === 'Escape') handleEditCancel();
                            }}
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => handleQuantityChange(item.id, -0.001)}
                              disabled={item.quantity <= 0.001}
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="font-mono text-sm min-w-0">
                              {formatQuantity(item.quantity)}
                            </span>
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => handleQuantityChange(item.id, 0.001)}
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-right text-xs text-gray-500">
                        {item.unit}
                      </TableCell>

                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(item.unitPrice)}
                      </TableCell>

                      <TableCell className="text-right">
                        {editingItem === item.id ? (
                          <Input
                            type="number"
                            value={editDiscount}
                            onChange={(e) => setEditDiscount(e.target.value)}
                            inputSize="sm"
                            className="w-14 text-right"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditSave();
                              if (e.key === 'Escape') handleEditCancel();
                            }}
                          />
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            {item.manualDiscount > 0 && (
                              <Badge variant="pos-warning" size="sm" className="text-xs">
                                <Percent className="w-3 h-3 mr-1" />
                                {formatCurrency(item.manualDiscount)}
                              </Badge>
                            )}
                            {item.autoDiscount > 0 && (
                              <Badge variant="pos-info" size="sm" className="text-xs">
                                Auto
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-right font-mono font-semibold">
                        {formatCurrency(item.lineTotal)}
                      </TableCell>

                      <TableCell>
                        {editingItem === item.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={handleEditSave}
                              aria-label="Save changes"
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={handleEditCancel}
                              aria-label="Cancel editing"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => handleEditStart(item)}
                              aria-label="Edit item"
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => onRemoveItem(item.id)}
                              aria-label="Remove item"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Cart Summary */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                  <span className="font-mono">{formatCurrency(subtotal)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Discount:</span>
                    <span className="font-mono">-{formatCurrency(totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold border-t border-gray-200 dark:border-gray-700 pt-2">
                  <span>Total:</span>
                  <span className="font-mono">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


