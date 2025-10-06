import React, { useState } from 'react';
import { Trash2, Edit3, Package, Plus, Minus, Calendar, DollarSign, Hash } from 'lucide-react';
import { LabelItem } from '@/types';
import { cn } from '@/utils/cn';
import { validateLabelItemDates } from '@/services/labelService';

interface BatchSelectorProps {
  items: LabelItem[];
  onUpdateItem: (index: number, updates: Partial<LabelItem>) => void;
  onRemoveItem: (index: number) => void;
  onClearBatch: () => void;
  className?: string;
}

export function BatchSelector({
  items,
  onUpdateItem,
  onRemoveItem,
  onClearBatch,
  className
}: BatchSelectorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [dateErrors, setDateErrors] = useState<Record<number, string[]>>({});

  const totalLabels = items.reduce((sum, item) => sum + item.qty, 0);

  const handleQtyChange = (index: number, newQty: number) => {
    const qty = Math.max(0, Math.min(999, newQty));
    onUpdateItem(index, { qty });
  };

  const handleFieldChange = (index: number, field: keyof LabelItem, value: any) => {
    const updates = { [field]: value };
    
    // Validate dates when they change
    if (field === 'packedDate' || field === 'expiryDate') {
      const updatedItem = { ...items[index], ...updates };
      const validation = validateLabelItemDates(updatedItem, 'YYYY-MM-DD');
      
      setDateErrors(prev => ({
        ...prev,
        [index]: validation.valid ? [] : validation.errors
      }));
    }
    
    onUpdateItem(index, updates);
  };

  if (items.length === 0) {
    return (
      <div className={cn("bg-white rounded-lg border border-gray-200 p-8", className)}>
        <div className="text-center text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Items Selected</h3>
          <p className="text-sm">Use the tabs above to add products, GRN items, or import from CSV.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-lg border border-gray-200", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Label Batch
          </h3>
          <div className="text-sm text-gray-500">
            {items.length} unique • {totalLabels} total labels
          </div>
        </div>
        
        <button
          onClick={onClearBatch}
          className="flex items-center px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Clear All
        </button>
      </div>

      {/* Items List */}
      <div className="max-h-96 overflow-y-auto">
        {items.map((item, index) => (
          <div
            key={`${item.sku}-${index}`}
            className="flex items-center p-4 border-b border-gray-100 hover:bg-gray-50"
          >
            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {item.name_en}
                  </h4>
                  <div className="flex items-center mt-1 space-x-3 text-xs text-gray-500">
                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                      {item.sku}
                    </span>
                    {item.barcode && (
                      <span className="font-mono">
                        {item.barcode}
                      </span>
                    )}
                    <span className="capitalize">
                      {item.price_tier}
                    </span>
                    <span>
                      {item.language || 'EN'}
                    </span>
                  </div>
                  
                  {/* Show additional fields if present */}
                  {(item.packedDate || item.expiryDate || item.mrp || item.batchNo) && (
                    <div className="flex items-center mt-1 space-x-3 text-xs text-gray-500">
                      {item.packedDate && (
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          Packed: {item.packedDate}
                        </span>
                      )}
                      {item.expiryDate && (
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          Expires: {item.expiryDate}
                        </span>
                      )}
                      {item.mrp && (
                        <span className="flex items-center">
                          <DollarSign className="w-3 h-3 mr-1" />
                          MRP: {item.mrp}
                        </span>
                      )}
                      {item.batchNo && (
                        <span className="flex items-center">
                          <Hash className="w-3 h-3 mr-1" />
                          Batch: {item.batchNo}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Show date validation errors */}
                  {dateErrors[index] && dateErrors[index].length > 0 && (
                    <div className="mt-1 text-xs text-red-600">
                      {dateErrors[index].map((error, i) => (
                        <div key={i}>{error}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Editable Fields */}
              {editingIndex === index && (
                <div className="mt-3 space-y-4">
                  {/* Basic Fields */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Price Tier
                      </label>
                      <select
                        value={item.price_tier}
                        onChange={(e) => handleFieldChange(index, 'price_tier', e.target.value)}
                        className="w-full text-xs border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="retail">Retail</option>
                        <option value="wholesale">Wholesale</option>
                        <option value="credit">Credit</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Language
                      </label>
                      <select
                        value={item.language || 'EN'}
                        onChange={(e) => handleFieldChange(index, 'language', e.target.value)}
                        className="w-full text-xs border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="EN">English</option>
                        <option value="SI">Sinhala</option>
                        <option value="TA">Tamil</option>
                      </select>
                    </div>
                  </div>

                  {/* Date Fields */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        Packed Date
                      </label>
                      <input
                        type="date"
                        value={item.packedDate || ''}
                        onChange={(e) => handleFieldChange(index, 'packedDate', e.target.value || null)}
                        className={cn(
                          "w-full text-xs border rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                          dateErrors[index]?.some(e => e.includes('packed')) 
                            ? "border-red-300" 
                            : "border-gray-300"
                        )}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        Expiry Date
                      </label>
                      <input
                        type="date"
                        value={item.expiryDate || ''}
                        onChange={(e) => handleFieldChange(index, 'expiryDate', e.target.value || null)}
                        className={cn(
                          "w-full text-xs border rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                          dateErrors[index]?.some(e => e.includes('expiry')) 
                            ? "border-red-300" 
                            : "border-gray-300"
                        )}
                      />
                    </div>
                  </div>

                  {/* MRP and Batch */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        <DollarSign className="w-3 h-3 inline mr-1" />
                        MRP (LKR)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.mrp || ''}
                        onChange={(e) => handleFieldChange(index, 'mrp', e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="0.00"
                        className="w-full text-xs border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        <Hash className="w-3 h-3 inline mr-1" />
                        Batch Number
                      </label>
                      <input
                        type="text"
                        value={item.batchNo || ''}
                        onChange={(e) => handleFieldChange(index, 'batchNo', e.target.value || null)}
                        placeholder="e.g., B001, LOT123"
                        className="w-full text-xs border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Custom Lines */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Custom Line 1
                      </label>
                      <input
                        type="text"
                        value={item.custom_line1 || ''}
                        onChange={(e) => handleFieldChange(index, 'custom_line1', e.target.value || undefined)}
                        placeholder="Optional custom text"
                        className="w-full text-xs border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Custom Line 2
                      </label>
                      <input
                        type="text"
                        value={item.custom_line2 || ''}
                        onChange={(e) => handleFieldChange(index, 'custom_line2', e.target.value || undefined)}
                        placeholder="Optional custom text"
                        className="w-full text-xs border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quantity Controls */}
            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => handleQtyChange(index, item.qty - 1)}
                disabled={item.qty <= 1}
                className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Minus className="w-4 h-4" />
              </button>
              
              <input
                type="number"
                min="1"
                max="999"
                value={item.qty}
                onChange={(e) => handleQtyChange(index, parseInt(e.target.value) || 1)}
                className="w-16 text-center text-sm border border-gray-300 rounded-md py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              
              <button
                onClick={() => handleQtyChange(index, item.qty + 1)}
                disabled={item.qty >= 999}
                className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-1 ml-3">
              <button
                onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  editingIndex === index
                    ? "text-blue-600 bg-blue-100"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                )}
                title="Edit item details"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => onRemoveItem(index)}
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Remove from batch"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Ready to print: <strong>{totalLabels}</strong> labels from <strong>{items.length}</strong> unique items
          </span>
          <div className="text-xs text-gray-500">
            Click qty numbers to edit, use +/- buttons to adjust
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                items.forEach((_, index) => {
                  handleFieldChange(index, 'packedDate', today);
                });
              }}
              className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              Set Packed = Today
            </button>
            <button
              onClick={() => {
                items.forEach((_, index) => {
                  handleFieldChange(index, 'packedDate', null);
                  handleFieldChange(index, 'expiryDate', null);
                });
              }}
              className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              Clear Dates
            </button>
          </div>
          
          <div className="text-xs text-gray-500">
            {items.some(item => item.packedDate || item.expiryDate) && (
              <span>Dates printed in YYYY-MM-DD format</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
