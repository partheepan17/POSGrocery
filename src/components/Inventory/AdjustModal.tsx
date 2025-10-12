import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Minus, Trash2, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { inventoryService, AdjustLine } from '@/services/inventoryService';
import { dataService } from '@/services/dataService';
import { useAppStore } from '@/store/appStore';

interface AdjustModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface AdjustRow extends AdjustLine {
  id: string;
  productName?: string;
  unit?: 'pc' | 'kg';
  currentStock?: number;
  error?: string;
  targetQty?: number; // For "set to exact value" mode
}

type AdjustMode = 'ADJUST' | 'WASTE';

export function AdjustModal({ onClose, onSuccess }: AdjustModalProps) {
  const { settings } = useAppStore();
  const [mode, setMode] = useState<AdjustMode>('ADJUST');
  const [reason, setReason] = useState('Stocktake');
  const [rows, setRows] = useState<AdjustRow[]>([
    { id: Date.now().toString(), sku: '', qty: 0 }
  ]);
  const [loading, setLoading] = useState(false);
  const [enforceInteger, setEnforceInteger] = useState(true);
  const [exactValueMode, setExactValueMode] = useState(false);
  
  const firstSkuInputRef = useRef<HTMLInputElement>(null);
  const reasonOptions = inventoryService.getAdjustmentReasons();

  useEffect(() => {
    // Focus first SKU input on mount
    setTimeout(() => firstSkuInputRef.current?.focus(), 100);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const addRow = () => {
    setRows(prev => [...prev, { id: Date.now().toString(), sku: '', qty: 0 }]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(prev => prev.filter(row => row.id !== id));
    }
  };

  const updateRow = (id: string, updates: Partial<AdjustRow>) => {
    setRows(prev => prev.map(row => 
      row.id === id ? { ...row, ...updates } : row
    ));
  };

  const validateAndLookupProduct = async (row: AdjustRow) => {
    if (!row.sku.trim()) {
      updateRow(row.id, { 
        error: undefined, 
        productName: undefined, 
        unit: undefined,
        currentStock: undefined
      });
      return;
    }

    try {
      const product = await dataService.getProductBySku(row.sku.trim());
      
      if (!product) {
        updateRow(row.id, { 
          error: 'Product not found', 
          productName: undefined, 
          unit: undefined,
          currentStock: undefined,
          product_id: undefined 
        });
        return;
      }

      // Get current stock
      const stockMap = await inventoryService.getCurrentStockMap({ productIds: [product.id] });
      const currentStock = stockMap[product.id] || 0;

      updateRow(row.id, { 
        error: undefined, 
        productName: product.name_en,
        unit: product.unit,
        currentStock,
        product_id: product.id
      });

    } catch (error) {
      updateRow(row.id, { 
        error: 'Failed to lookup product', 
        productName: undefined, 
        unit: undefined,
        currentStock: undefined,
        product_id: undefined 
      });
    }
  };

  const validateQuantity = (qty: number, unit?: 'pc' | 'kg'): { isValid: boolean; error?: string; correctedQty?: number } => {
    if (isNaN(qty) || !isFinite(qty)) {
      return { isValid: false, error: 'Quantity must be a valid number' };
    }

    if (mode === 'WASTE' && qty <= 0) {
      return { isValid: false, error: 'Waste quantity must be positive' };
    }

    if (mode === 'ADJUST' && qty === 0) {
      return { isValid: false, error: 'Adjustment quantity cannot be zero' };
    }

    if (unit) {
      const kgDecimals = settings?.languageFormatting?.kgDecimals || 3;
      return inventoryService.validateQuantity(Math.abs(qty), unit, kgDecimals);
    }

    return { isValid: true };
  };

  const handleSkuChange = (id: string, sku: string) => {
    updateRow(id, { sku, error: undefined });
    
    // Debounce product lookup
    setTimeout(() => {
      const currentRow = rows.find(r => r.id === id);
      if (currentRow && currentRow.sku === sku) {
        validateAndLookupProduct(currentRow);
      }
    }, 300);
  };

  const handleQtyChange = (id: string, qtyStr: string) => {
    const qty = parseFloat(qtyStr) || 0;
    const row = rows.find(r => r.id === id);
    
    if (row?.unit) {
      const validation = validateQuantity(qty, row.unit);
      
      if (!validation.isValid && validation.correctedQty !== undefined && enforceInteger && row.unit === 'pc') {
        // Auto-correct for pieces if enforce integer is on
        updateRow(id, { qty: validation.correctedQty, error: undefined });
      } else {
        updateRow(id, { 
          qty, 
          error: validation.isValid ? undefined : validation.error 
        });
      }
    } else {
      updateRow(id, { qty });
    }
  };

  const handleTargetQtyChange = (id: string, targetQtyStr: string) => {
    const targetQty = parseFloat(targetQtyStr) || 0;
    const row = rows.find(r => r.id === id);
    
    if (row?.currentStock !== undefined) {
      const delta = targetQty - row.currentStock;
      updateRow(id, { 
        targetQty, 
        qty: delta,
        error: delta === 0 ? 'No change needed' : undefined
      });
    } else {
      updateRow(id, { targetQty });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // If this is the last row and it has valid data, add a new row
      if (rowIndex === rows.length - 1 && rows[rowIndex].sku && rows[rowIndex].qty !== 0) {
        addRow();
        // Focus the new row's SKU input after a brief delay
        setTimeout(() => {
          const newRowInput = document.querySelector(`input[data-row-index="${rows.length}"]`) as HTMLInputElement;
          newRowInput?.focus();
        }, 50);
      } else {
        // Move to next row
        const nextInput = document.querySelector(`input[data-row-index="${rowIndex + 1}"]`) as HTMLInputElement;
        nextInput?.focus();
      }
    }
  };

  const handleSubmit = async () => {
    // Validate all rows
    const validRows = rows.filter(row => {
      if (!row.sku.trim()) return false;
      if (!row.product_id) return false;
      if (mode === 'WASTE' && row.qty <= 0) return false;
      if (mode === 'ADJUST' && row.qty === 0) return false;
      if (row.error) return false;
      return true;
    });

    if (validRows.length === 0) {
      alert(`Please add at least one valid line with SKU and ${mode === 'WASTE' ? 'positive' : 'non-zero'} quantity`);
      return;
    }

    if (!reason.trim()) {
      alert('Please select a reason for the adjustment');
      return;
    }

    setLoading(true);
    
    try {
      await inventoryService.postAdjustBatch(
        validRows.map(row => ({
          sku: row.sku,
          product_id: row.product_id!,
          qty: row.qty,
          note: row.note
        })),
        { 
          mode,
          reason,
          terminal: 'WEB-INVENTORY',
          cashier: 'SYSTEM' // In real app, would use current user
        }
      );

      // Show success toast
      const message = `Successfully ${mode === 'WASTE' ? 'wasted' : 'adjusted'} ${validRows.length} item(s)`;
      console.log('✅', message);
      
      onSuccess();
      
    } catch (error) {
      console.error(`Failed to ${mode.toLowerCase()} inventory:`, error);
      alert(error instanceof Error ? error.message : `Failed to ${mode.toLowerCase()} inventory`);
    } finally {
      setLoading(false);
    }
  };

  const formatQuantity = (qty: number, unit?: 'pc' | 'kg'): string => {
    if (!unit) return qty.toString();
    
    if (unit === 'pc') {
      return Math.floor(qty).toString();
    } else {
      const decimals = settings?.languageFormatting?.kgDecimals || 3;
      return qty.toFixed(decimals);
    }
  };

  const getQuantityDisplay = (row: AdjustRow): React.ReactNode => {
    if (mode === 'WASTE') {
      return (
        <div className="flex items-center">
          <input
            type="number"
            value={Math.abs(row.qty) || ''}
            onChange={(e) => handleQtyChange(row.id, e.target.value)}
            step={row.unit === 'kg' ? '0.001' : '1'}
            min="0"
            placeholder="0"
            className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500"
          />
          <span className="ml-2 text-red-600 text-sm">(-{formatQuantity(Math.abs(row.qty), row.unit)})</span>
        </div>
      );
    }

    if (exactValueMode && row.currentStock !== undefined) {
      return (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">Set to:</span>
            <input
              type="number"
              value={row.targetQty || ''}
              onChange={(e) => handleTargetQtyChange(row.id, e.target.value)}
              step={row.unit === 'kg' ? '0.001' : '1'}
              min="0"
              placeholder="0"
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-gray-500">Delta:</span>
            <span className={`flex items-center ${row.qty > 0 ? 'text-green-600' : row.qty < 0 ? 'text-red-600' : 'text-gray-400'}`}>
              {row.qty > 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : row.qty < 0 ? <TrendingDown className="w-4 h-4 mr-1" /> : null}
              {row.qty > 0 ? '+' : ''}{formatQuantity(row.qty, row.unit)}
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center">
        <input
          type="number"
          value={row.qty || ''}
          onChange={(e) => handleQtyChange(row.id, e.target.value)}
          step={row.unit === 'kg' ? '0.001' : '1'}
          placeholder="±0"
          className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        {row.qty !== 0 && (
          <span className={`ml-2 text-sm ${row.qty > 0 ? 'text-green-600' : 'text-red-600'}`}>
            ({row.qty > 0 ? '+' : ''}{formatQuantity(row.qty, row.unit)})
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${mode === 'WASTE' ? 'bg-red-100' : 'bg-blue-100'}`}>
              {mode === 'WASTE' ? (
                <AlertTriangle className="w-6 h-6 text-red-600" />
              ) : (
                <TrendingUp className="w-6 h-6 text-blue-600" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {mode === 'WASTE' ? 'Waste Inventory' : 'Adjust Inventory'}
              </h2>
              <p className="text-sm text-gray-600">
                {mode === 'WASTE' ? 'Record inventory waste/loss' : 'Adjust inventory quantities'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Settings */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mode</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="ADJUST"
                    checked={mode === 'ADJUST'}
                    onChange={(e) => setMode(e.target.value as AdjustMode)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Adjust (±)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="WASTE"
                    checked={mode === 'WASTE'}
                    onChange={(e) => setMode(e.target.value as AdjustMode)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Waste (-)</span>
                </label>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason *</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {reasonOptions.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center space-x-6 mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={enforceInteger}
                onChange={(e) => setEnforceInteger(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Enforce integer quantities for pieces</span>
            </label>
            
            {mode === 'ADJUST' && (
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={exactValueMode}
                  onChange={(e) => setExactValueMode(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Set to exact value (calculates delta)</span>
              </label>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">SKU/Barcode</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Product</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Unit</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Current Stock</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    {mode === 'WASTE' ? 'Waste Quantity' : exactValueMode ? 'New Quantity' : 'Adjustment (±)'}
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Note</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id} className="border-b border-gray-100">
                    <td className="py-3 px-4">
                      <input
                        ref={index === 0 ? firstSkuInputRef : undefined}
                        type="text"
                        value={row.sku}
                        onChange={(e) => handleSkuChange(row.id, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        data-row-index={index}
                        placeholder="Enter SKU or scan barcode"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                          row.error ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                      />
                      {row.error && (
                        <p className="text-xs text-red-600 mt-1">{row.error}</p>
                      )}
                    </td>
                    
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-900">
                        {row.productName || (row.sku ? 'Looking up...' : 'Enter SKU first')}
                      </div>
                    </td>
                    
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-500">
                        {row.unit || '-'}
                      </div>
                    </td>
                    
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-900">
                        {row.currentStock !== undefined ? formatQuantity(row.currentStock, row.unit) : '-'}
                      </div>
                    </td>
                    
                    <td className="py-3 px-4">
                      {getQuantityDisplay(row)}
                    </td>
                    
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={row.note || ''}
                        onChange={(e) => updateRow(row.id, { note: e.target.value })}
                        placeholder="Optional note"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length === 1}
                        className="text-red-600 hover:text-red-800 disabled:text-gray-300 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4">
            <button
              onClick={addRow}
              className={`flex items-center px-4 py-2 border rounded-lg hover:bg-opacity-10 transition-colors ${
                mode === 'WASTE' 
                  ? 'text-red-600 border-red-300 hover:bg-red-50' 
                  : 'text-blue-600 border-blue-300 hover:bg-blue-50'
              }`}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Line
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 bg-gray-50 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            <p><strong>Keyboard shortcuts:</strong> Enter = Next row, Ctrl+Enter = Post</p>
            <p>Valid lines: {rows.filter(r => r.sku && r.qty !== 0 && !r.error).length} of {rows.length}</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || rows.filter(r => r.sku && r.qty !== 0 && !r.error).length === 0 || !reason.trim()}
              className={`px-6 py-2 text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                mode === 'WASTE' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'Posting...' : `${mode === 'WASTE' ? 'Waste' : 'Adjust'} ${rows.filter(r => r.sku && r.qty !== 0 && !r.error).length} Items`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}








