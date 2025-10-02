import React, { useState, useEffect } from 'react';
import { X, Copy, Calculator, TrendingUp, ArrowRight, Check, AlertTriangle } from 'lucide-react';
import { Product } from '@/services/dataService';

interface BulkAction {
  type: 'copy' | 'adjust' | 'uniform' | 'round';
  source?: 'price_retail' | 'price_wholesale' | 'price_credit' | 'price_other';
  targets?: ('price_wholesale' | 'price_credit' | 'price_other')[];
  adjustment?: {
    type: 'percent' | 'amount';
    value: number;
    operation: '+' | '-';
  };
  uniform?: {
    field: 'price_retail' | 'price_wholesale' | 'price_credit' | 'price_other';
    value: number;
  };
  rounding?: {
    mode: 'nearest_1' | 'nearest_0_50' | 'nearest_0_10';
  };
}

interface BulkActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProducts: Product[];
  allProducts: Product[];
  onApplyBulkAction: (action: BulkAction, preview: BulkPreviewItem[]) => void;
}

interface BulkPreviewItem {
  product: Product;
  oldValues: Record<string, number>;
  newValues: Record<string, number>;
  changes: Record<string, number>;
}

export function BulkActionsModal({
  isOpen,
  onClose,
  selectedProducts,
  allProducts,
  onApplyBulkAction
}: BulkActionsModalProps) {
  const [currentStep, setCurrentStep] = useState<'select' | 'configure' | 'preview'>('select');
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const [preview, setPreview] = useState<BulkPreviewItem[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('select');
      setBulkAction(null);
      setPreview([]);
    }
  }, [isOpen]);

  const handleActionSelect = (action: BulkAction) => {
    setBulkAction(action);
    setCurrentStep('configure');
  };

  const handleConfigure = () => {
    if (!bulkAction) return;
    
    setIsCalculating(true);
    
    // Simulate calculation delay
    setTimeout(() => {
      const preview = calculatePreview(bulkAction);
      setPreview(preview);
      setIsCalculating(false);
      setCurrentStep('preview');
    }, 500);
  };

  const calculatePreview = (action: BulkAction): BulkPreviewItem[] => {
    const productsToUpdate = selectedProducts.length > 0 ? selectedProducts : allProducts;
    
    return productsToUpdate.map(product => {
      const oldValues = {
        price_retail: product.price_retail || 0,
        price_wholesale: product.price_wholesale || 0,
        price_credit: product.price_credit || 0,
        price_other: product.price_other || 0
      };
      
      const newValues = { ...oldValues };
      const changes: Record<string, number> = {};
      
      switch (action.type) {
        case 'copy':
          if (action.source && action.targets) {
            const sourceValue = oldValues[action.source];
            action.targets.forEach(target => {
              if (oldValues[target] !== sourceValue) {
                newValues[target] = sourceValue;
                changes[target] = sourceValue - oldValues[target];
              }
            });
          }
          break;
          
        case 'adjust':
          if (action.source && action.targets && action.adjustment) {
            const sourceValue = oldValues[action.source];
            action.targets.forEach(target => {
              let adjustedValue = sourceValue;
              
              if (action.adjustment!.type === 'percent') {
                const percentage = action.adjustment!.value / 100;
                if (action.adjustment!.operation === '+') {
                  adjustedValue = sourceValue * (1 + percentage);
                } else {
                  adjustedValue = sourceValue * (1 - percentage);
                }
              } else {
                if (action.adjustment!.operation === '+') {
                  adjustedValue = sourceValue + action.adjustment!.value;
                } else {
                  adjustedValue = sourceValue - action.adjustment!.value;
                }
              }
              
              newValues[target] = Math.max(0, adjustedValue);
              changes[target] = newValues[target] - oldValues[target];
            });
          }
          break;
          
        case 'uniform':
          if (action.uniform) {
            const newValue = action.uniform.value;
            newValues[action.uniform.field] = newValue;
            changes[action.uniform.field] = newValue - oldValues[action.uniform.field];
          }
          break;
          
        case 'round':
          if (action.rounding) {
            Object.keys(newValues).forEach(field => {
              const value = newValues[field as keyof typeof newValues];
              if (value > 0) {
                let roundedValue = value;
                
                switch (action.rounding!.mode) {
                  case 'nearest_1':
                    roundedValue = Math.round(value);
                    break;
                  case 'nearest_0_50':
                    roundedValue = Math.round(value * 2) / 2;
                    break;
                  case 'nearest_0_10':
                    roundedValue = Math.round(value * 10) / 10;
                    break;
                }
                
                newValues[field as keyof typeof newValues] = roundedValue;
                changes[field] = roundedValue - value;
              }
            });
          }
          break;
      }
      
      return {
        product,
        oldValues,
        newValues,
        changes
      };
    }).filter(item => Object.keys(item.changes).length > 0);
  };

  const handleApply = () => {
    if (bulkAction && preview.length > 0) {
      onApplyBulkAction(bulkAction, preview);
      onClose();
    }
  };

  const getActionTitle = (type: string) => {
    switch (type) {
      case 'copy': return 'Copy Prices';
      case 'adjust': return 'Adjust Prices';
      case 'uniform': return 'Set Uniform Price';
      case 'round': return 'Round Prices';
      default: return 'Bulk Action';
    }
  };

  const getTotalChanges = () => {
    return preview.reduce((total, item) => {
      return total + Object.keys(item.changes).length;
    }, 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {currentStep === 'select' ? 'Bulk Actions' : getActionTitle(bulkAction?.type || '')}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {selectedProducts.length > 0 
                ? `Apply to ${selectedProducts.length} selected products`
                : `Apply to all ${allProducts.length} products`
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {currentStep === 'select' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Copy Prices */}
              <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer"
                   onClick={() => handleActionSelect({ type: 'copy' })}>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Copy className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Copy Prices</h3>
                    <p className="text-sm text-gray-600">Copy prices from one tier to another</p>
                  </div>
                </div>
              </div>

              {/* Adjust Prices */}
              <div className="border border-gray-200 rounded-lg p-4 hover:border-green-300 transition-colors cursor-pointer"
                   onClick={() => handleActionSelect({ type: 'adjust' })}>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Adjust Prices</h3>
                    <p className="text-sm text-gray-600">Apply percentage or amount adjustments</p>
                  </div>
                </div>
              </div>

              {/* Uniform Set */}
              <div className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors cursor-pointer"
                   onClick={() => handleActionSelect({ type: 'uniform' })}>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Calculator className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Set Uniform Price</h3>
                    <p className="text-sm text-gray-600">Set a specific tier to a fixed value</p>
                  </div>
                </div>
              </div>

              {/* Round Prices */}
              <div className="border border-gray-200 rounded-lg p-4 hover:border-orange-300 transition-colors cursor-pointer"
                   onClick={() => handleActionSelect({ type: 'round' })}>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <ArrowRight className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Round Prices</h3>
                    <p className="text-sm text-gray-600">Round prices to nearest 1.00, 0.50, or 0.10</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'configure' && bulkAction && (
            <div className="space-y-6">
              {bulkAction.type === 'copy' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Copy From:</label>
                    <select
                      value={bulkAction.source || ''}
                      onChange={(e) => setBulkAction({
                        ...bulkAction,
                        source: e.target.value as any
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select source tier</option>
                      <option value="price_retail">Retail</option>
                      <option value="price_wholesale">Wholesale</option>
                      <option value="price_credit">Credit</option>
                      <option value="price_other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Copy To:</label>
                    <div className="space-y-2">
                      {['price_wholesale', 'price_credit', 'price_other'].map(tier => (
                        <label key={tier} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={bulkAction.targets?.includes(tier as any) || false}
                            onChange={(e) => {
                              const targets = bulkAction.targets || [];
                              if (e.target.checked) {
                                setBulkAction({
                                  ...bulkAction,
                                  targets: [...targets, tier as any]
                                });
                              } else {
                                setBulkAction({
                                  ...bulkAction,
                                  targets: targets.filter(t => t !== tier)
                                });
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 capitalize">
                            {tier.replace('price_', '')}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {bulkAction.type === 'adjust' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Base Tier:</label>
                    <select
                      value={bulkAction.source || ''}
                      onChange={(e) => setBulkAction({
                        ...bulkAction,
                        source: e.target.value as any
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select base tier</option>
                      <option value="price_retail">Retail</option>
                      <option value="price_wholesale">Wholesale</option>
                      <option value="price_credit">Credit</option>
                      <option value="price_other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Adjust:</label>
                    <div className="space-y-2">
                      {['price_wholesale', 'price_credit', 'price_other'].map(tier => (
                        <label key={tier} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={bulkAction.targets?.includes(tier as any) || false}
                            onChange={(e) => {
                              const targets = bulkAction.targets || [];
                              if (e.target.checked) {
                                setBulkAction({
                                  ...bulkAction,
                                  targets: [...targets, tier as any]
                                });
                              } else {
                                setBulkAction({
                                  ...bulkAction,
                                  targets: targets.filter(t => t !== tier)
                                });
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 capitalize">
                            {tier.replace('price_', '')}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Adjustment Type:</label>
                      <select
                        value={bulkAction.adjustment?.type || 'percent'}
                        onChange={(e) => setBulkAction({
                          ...bulkAction,
                          adjustment: {
                            ...bulkAction.adjustment!,
                            type: e.target.value as 'percent' | 'amount'
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="percent">Percentage (%)</option>
                        <option value="amount">Fixed Amount (රු)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Operation:</label>
                      <select
                        value={bulkAction.adjustment?.operation || '+'}
                        onChange={(e) => setBulkAction({
                          ...bulkAction,
                          adjustment: {
                            ...bulkAction.adjustment!,
                            operation: e.target.value as '+' | '-'
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="+">Increase (+)</option>
                        <option value="-">Decrease (-)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Value ({bulkAction.adjustment?.type === 'percent' ? '%' : 'රු'}):
                    </label>
                    <input
                      type="number"
                      step={bulkAction.adjustment?.type === 'percent' ? '0.1' : '0.01'}
                      min="0"
                      value={bulkAction.adjustment?.value || 0}
                      onChange={(e) => setBulkAction({
                        ...bulkAction,
                        adjustment: {
                          ...bulkAction.adjustment!,
                          value: parseFloat(e.target.value) || 0
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={bulkAction.adjustment?.type === 'percent' ? '5.0' : '10.00'}
                    />
                  </div>
                </div>
              )}

              {bulkAction.type === 'uniform' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Price Tier:</label>
                    <select
                      value={bulkAction.uniform?.field || ''}
                      onChange={(e) => setBulkAction({
                        ...bulkAction,
                        uniform: {
                          ...bulkAction.uniform!,
                          field: e.target.value as any
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select tier</option>
                      <option value="price_retail">Retail</option>
                      <option value="price_wholesale">Wholesale</option>
                      <option value="price_credit">Credit</option>
                      <option value="price_other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fixed Value (රු):</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={bulkAction.uniform?.value || 0}
                      onChange={(e) => setBulkAction({
                        ...bulkAction,
                        uniform: {
                          ...bulkAction.uniform!,
                          value: parseFloat(e.target.value) || 0
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="100.00"
                    />
                  </div>
                </div>
              )}

              {bulkAction.type === 'round' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rounding Mode:</label>
                    <select
                      value={bulkAction.rounding?.mode || 'nearest_1'}
                      onChange={(e) => setBulkAction({
                        ...bulkAction,
                        rounding: {
                          mode: e.target.value as any
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="nearest_1">To nearest 1.00</option>
                      <option value="nearest_0_50">To nearest 0.50</option>
                      <option value="nearest_0_10">To nearest 0.10</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Presets */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Presets:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {bulkAction.type === 'adjust' && bulkAction.source === 'price_retail' && (
                    <>
                      <button
                        onClick={() => setBulkAction({
                          ...bulkAction,
                          targets: ['price_wholesale'],
                          adjustment: { type: 'percent', value: 5, operation: '-' }
                        })}
                        className="text-left p-2 bg-gray-50 hover:bg-gray-100 rounded text-sm"
                      >
                        Wholesale = Retail - 5%
                      </button>
                      <button
                        onClick={() => setBulkAction({
                          ...bulkAction,
                          targets: ['price_credit'],
                          adjustment: { type: 'percent', value: 2, operation: '+' }
                        })}
                        className="text-left p-2 bg-gray-50 hover:bg-gray-100 rounded text-sm"
                      >
                        Credit = Retail + 2%
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStep === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Preview Changes</h3>
                  <p className="text-sm text-gray-600">
                    {preview.length} products will be updated with {getTotalChanges()} total changes
                  </p>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Ready to apply</span>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Old</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">New</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {preview.slice(0, 20).map((item, index) => (
                        <tr key={`${item.product.id}-${index}`}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.product.sku}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{item.product.name_en}</td>
                          <td className="px-4 py-3 text-sm">
                            {Object.keys(item.changes).map(field => (
                              <div key={field} className="text-xs text-gray-600 capitalize">
                                {field.replace('price_', '')}
                              </div>
                            ))}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {Object.keys(item.changes).map(field => (
                              <div key={field} className="text-xs">
                                රු {item.oldValues[field].toFixed(2)}
                              </div>
                            ))}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {Object.keys(item.changes).map(field => (
                              <div key={field} className="text-xs">
                                රු {item.newValues[field].toFixed(2)}
                              </div>
                            ))}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {Object.keys(item.changes).map(field => (
                              <div key={field} className={`text-xs ${item.changes[field] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {item.changes[field] >= 0 ? '+' : ''}රු {item.changes[field].toFixed(2)}
                              </div>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.length > 20 && (
                  <div className="px-4 py-3 bg-gray-50 text-sm text-gray-600 text-center">
                    ... and {preview.length - 20} more products
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            {currentStep === 'configure' && (
              <button
                onClick={() => setCurrentStep('select')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Back
              </button>
            )}
            {currentStep === 'preview' && (
              <button
                onClick={() => setCurrentStep('configure')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Back
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            
            {currentStep === 'configure' && (
              <button
                onClick={handleConfigure}
                disabled={!bulkAction || isCalculating}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {isCalculating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Calculating...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    <span>Preview Changes</span>
                  </>
                )}
              </button>
            )}
            
            {currentStep === 'preview' && (
              <button
                onClick={handleApply}
                disabled={preview.length === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>Apply Changes ({preview.length} products)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}




