import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Trash2, Package, DollarSign } from 'lucide-react';
import { inventoryService, ReceiveLine } from '@/services/inventoryService';
import { dataService } from '@/services/dataService';
import { useAppStore } from '@/store/appStore';

interface ReceiveModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface ReceiveRow extends ReceiveLine {
  id: string;
  productName?: string;
  unit?: 'pc' | 'kg';
  error?: string;
}

export function ReceiveModal({ onClose, onSuccess }: ReceiveModalProps) {
  const { settings } = useAppStore();
  const [rows, setRows] = useState<ReceiveRow[]>([
    { id: Date.now().toString(), sku: '', qty: 0 }
  ]);
  const [loading, setLoading] = useState(false);
  const [updateCost, setUpdateCost] = useState(false);
  const [enforceInteger, setEnforceInteger] = useState(true);
  
  const firstSkuInputRef = useRef<HTMLInputElement>(null);

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

  const updateRow = (id: string, updates: Partial<ReceiveRow>) => {
    setRows(prev => prev.map(row => 
      row.id === id ? { ...row, ...updates } : row
    ));
  };

  const validateAndLookupProduct = async (row: ReceiveRow) => {
    if (!row.sku.trim()) {
      updateRow(row.id, { error: undefined, productName: undefined, unit: undefined });
      return;
    }

    try {
      const product = await dataService.getProductBySku(row.sku.trim());
      
      if (!product) {
        updateRow(row.id, { 
          error: 'Product not found', 
          productName: undefined, 
          unit: undefined,
          product_id: undefined 
        });
        return;
      }

      updateRow(row.id, { 
        error: undefined, 
        productName: product.name_en,
        unit: product.unit,
        product_id: product.id
      });

    } catch (error) {
      updateRow(row.id, { 
        error: 'Failed to lookup product', 
        productName: undefined, 
        unit: undefined,
        product_id: undefined 
      });
    }
  };

  const validateQuantity = (qty: number, unit?: 'pc' | 'kg'): { isValid: boolean; error?: string; correctedQty?: number } => {
    if (isNaN(qty) || !isFinite(qty) || qty <= 0) {
      return { isValid: false, error: 'Quantity must be a positive number' };
    }

    if (unit) {
      const kgDecimals = settings?.languageFormatting?.kgDecimals || 3;
      return inventoryService.validateQuantity(qty, unit, kgDecimals);
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

  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // If this is the last row and it has valid data, add a new row
      if (rowIndex === rows.length - 1 && rows[rowIndex].sku && rows[rowIndex].qty > 0) {
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
      if (row.qty <= 0) return false;
      if (row.error) return false;
      return true;
    });

    if (validRows.length === 0) {
      alert('Please add at least one valid line with SKU and positive quantity');
      return;
    }

    setLoading(true);
    
    try {
      await inventoryService.postReceiveBatch(
        validRows.map(row => ({
          sku: row.sku,
          product_id: row.product_id!,
          qty: row.qty,
          cost: row.cost,
          note: row.note
        })),
        { 
          updateCost,
          terminal: 'WEB-INVENTORY',
          cashier: 'SYSTEM' // In real app, would use current user
        }
      );

      // Show success toast
      const message = `Successfully received ${validRows.length} item(s)`;
      console.log('✅', message);
      
      onSuccess();
      
    } catch (error) {
      console.error('Failed to receive inventory:', error);
      alert(error instanceof Error ? error.message : 'Failed to receive inventory');
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Package className="w-6 h-6 text-green-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Receive Inventory</h2>
              <p className="text-sm text-gray-600">Add inventory items to stock</p>
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
          <div className="flex items-center space-x-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={updateCost}
                onChange={(e) => setUpdateCost(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Update product cost from received cost</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={enforceInteger}
                onChange={(e) => setEnforceInteger(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Enforce integer quantities for pieces</span>
            </label>
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
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Quantity</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Cost (Optional)</th>
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
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-green-500 focus:border-green-500 ${
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
                      <input
                        type="number"
                        value={row.qty || ''}
                        onChange={(e) => handleQtyChange(row.id, e.target.value)}
                        step={row.unit === 'kg' ? '0.001' : '1'}
                        min="0"
                        placeholder="0"
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-green-500 focus:border-green-500"
                      />
                    </td>
                    
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 text-gray-400 mr-1" />
                        <input
                          type="number"
                          value={row.cost || ''}
                          onChange={(e) => updateRow(row.id, { cost: parseFloat(e.target.value) || undefined })}
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                    </td>
                    
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={row.note || ''}
                        onChange={(e) => updateRow(row.id, { note: e.target.value })}
                        placeholder="Optional note"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-green-500 focus:border-green-500"
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
              className="flex items-center px-4 py-2 text-green-600 border border-green-300 rounded-lg hover:bg-green-50 transition-colors"
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
            <p>Valid lines: {rows.filter(r => r.sku && r.qty > 0 && !r.error).length} of {rows.length}</p>
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
              disabled={loading || rows.filter(r => r.sku && r.qty > 0 && !r.error).length === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Posting...' : `Post ${rows.filter(r => r.sku && r.qty > 0 && !r.error).length} Items`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}








