import React, { useState, useEffect } from 'react';
import { X, Save, Copy, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { LabelPreset, BarcodeSymbology } from '@/types';
import { labelService } from '@/services/labelService';
import { cn } from '@/utils/cn';

interface TemplateEditorProps {
  preset: LabelPreset | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (preset: LabelPreset) => void;
  isNew?: boolean;
}

export function TemplateEditor({ preset, isOpen, onClose, onSave, isNew = false }: TemplateEditorProps) {
  const [editedPreset, setEditedPreset] = useState<LabelPreset | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (preset) {
      setEditedPreset({ ...preset });
    } else if (isNew) {
      // Create new preset with defaults
      setEditedPreset({
        id: `preset-${Date.now()}`,
        name: 'New Label Preset',
        type: 'product',
        paper: 'THERMAL',
        size: { width_mm: 50, height_mm: 30 },
        barcode: {
          symbology: 'EAN13',
          source: 'barcode',
          show_text: true
        },
        fields: {
          line1: 'name_en',
          line2: 'sku',
          price: {
            enabled: true,
            source: 'retail',
            currency: 'LKR',
            show_label: true
          },
          // New fields for extended functionality
          languageMode: 'preset',
          showPackedDate: false,
          showExpiryDate: false,
          showMRP: false,
          showBatch: false,
          dateFormat: 'YYYY-MM-DD',
          mrpLabel: 'MRP',
          batchLabel: 'Batch',
          packedLabel: 'Packed',
          expiryLabel: 'Expiry'
        },
        style: {
          font_scale: 1.0,
          bold_name: true,
          align: 'center',
          show_store_logo: false,
          sectionOrder: ['store', 'barcode', 'name_en', 'name_si', 'name_ta', 'price', 'mrp', 'batch', 'dates', 'desc']
        },
        defaults: {
          qty: 1,
          language: 'EN'
        }
      });
    }
  }, [preset, isNew]);

  if (!isOpen || !editedPreset) return null;

  const handleSave = async () => {
    try {
      setSaving(true);
      await labelService.savePreset(editedPreset);
      onSave(editedPreset);
      onClose();
    } catch (error) {
      console.error('Failed to save preset:', error);
      alert('Failed to save preset');
    } finally {
      setSaving(false);
    }
  };

  const updatePreset = (updates: Partial<LabelPreset>) => {
    setEditedPreset(prev => prev ? { ...prev, ...updates } : null);
  };

  const updateFields = (fieldUpdates: Partial<LabelPreset['fields']>) => {
    setEditedPreset(prev => prev ? {
      ...prev,
      fields: { ...prev.fields, ...fieldUpdates }
    } : null);
  };

  const updateStyle = (styleUpdates: Partial<LabelPreset['style']>) => {
    setEditedPreset(prev => prev ? {
      ...prev,
      style: { ...prev.style, ...styleUpdates }
    } : null);
  };

  const updateBarcode = (barcodeUpdates: Partial<LabelPreset['barcode']>) => {
    setEditedPreset(prev => prev ? {
      ...prev,
      barcode: { ...prev.barcode, ...barcodeUpdates }
    } : null);
  };

  const updatePrice = (priceUpdates: Partial<LabelPreset['fields']['price']>) => {
    setEditedPreset(prev => prev ? {
      ...prev,
      fields: {
        ...prev.fields,
        price: { ...prev.fields.price, ...priceUpdates }
      }
    } : null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isNew ? 'Create New Preset' : 'Edit Label Preset'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preset Name
                </label>
                <input
                  type="text"
                  value={editedPreset.name}
                  onChange={(e) => updatePreset({ name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Label Type
                </label>
                <select
                  value={editedPreset.type}
                  onChange={(e) => updatePreset({ type: e.target.value as 'product' | 'shelf' })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="product">Product Label</option>
                  <option value="shelf">Shelf Label</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Paper Type
                </label>
                <select
                  value={editedPreset.paper}
                  onChange={(e) => updatePreset({ paper: e.target.value as 'THERMAL' | 'A4' })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="THERMAL">Thermal Roll</option>
                  <option value="A4">A4 Sheet</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Width (mm)
                </label>
                <input
                  type="number"
                  min="10"
                  max="210"
                  value={editedPreset.size.width_mm}
                  onChange={(e) => updatePreset({
                    size: { ...editedPreset.size, width_mm: parseInt(e.target.value) || 50 }
                  })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Height (mm)
                </label>
                <input
                  type="number"
                  min="10"
                  max="297"
                  value={editedPreset.size.height_mm}
                  onChange={(e) => updatePreset({
                    size: { ...editedPreset.size, height_mm: parseInt(e.target.value) || 30 }
                  })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Barcode Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Barcode</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Symbology
                </label>
                <select
                  value={editedPreset.barcode.symbology}
                  onChange={(e) => updateBarcode({ symbology: e.target.value as BarcodeSymbology })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="EAN13">EAN-13</option>
                  <option value="CODE128">Code 128</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Source
                </label>
                <select
                  value={editedPreset.barcode.source}
                  onChange={(e) => updateBarcode({ source: e.target.value as 'barcode' | 'sku' })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="barcode">Product Barcode</option>
                  <option value="sku">Product SKU</option>
                </select>
              </div>
              
              <div className="flex items-center pt-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editedPreset.barcode.show_text}
                    onChange={(e) => updateBarcode({ show_text: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Show text below barcode</span>
                </label>
              </div>
            </div>
          </div>

          {/* Field Configuration */}
          <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Label Fields</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Line 1 (Main Text)
                </label>
                <select
                  value={editedPreset.fields.line1}
                  onChange={(e) => updateFields({ line1: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="name_en">Product Name (English)</option>
                  <option value="name_si">Product Name (Sinhala)</option>
                  <option value="name_ta">Product Name (Tamil)</option>
                  <option value="custom">Custom Text</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Line 2 (Optional)
                </label>
                <select
                  value={editedPreset.fields.line2 || ''}
                  onChange={(e) => updateFields({ line2: (e.target.value as 'sku' | 'category' | 'custom') || undefined })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">None</option>
                  <option value="sku">Product SKU</option>
                  <option value="category">Category</option>
                  <option value="custom">Custom Text</option>
                </select>
              </div>
            </div>

            {/* Price Configuration */}
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={editedPreset.fields.price.enabled}
                  onChange={(e) => updatePrice({ enabled: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label className="ml-2 text-sm font-medium text-gray-700">
                  Show Price
                </label>
              </div>
              
              {editedPreset.fields.price.enabled && (
                <div className="grid grid-cols-2 gap-4 ml-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price Source
                    </label>
                    <select
                      value={editedPreset.fields.price.source}
                      onChange={(e) => updatePrice({ source: e.target.value as any })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="retail">Retail Price</option>
                      <option value="wholesale">Wholesale Price</option>
                      <option value="credit">Credit Price</option>
                      <option value="other">Other Price</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center pt-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editedPreset.fields.price.show_label}
                        onChange={(e) => updatePrice({ show_label: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Show "Price:" label</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Weight Hint */}
            {editedPreset.type === 'shelf' && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={editedPreset.fields.weight_hint || false}
                  onChange={(e) => updateFields({ weight_hint: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Show "/kg" for weight-based items
                </label>
              </div>
            )}

            {/* Language Mode */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900">Language Settings</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Language Mode
                </label>
                <select
                  value={editedPreset.fields.languageMode || 'preset'}
                  onChange={(e) => updateFields({ languageMode: e.target.value as 'preset' | 'per_item' })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="preset">Use preset default language</option>
                  <option value="per_item">Allow per-item language selection</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Per-item mode allows each label to have its own language setting
                </p>
              </div>
            </div>

            {/* Additional Fields */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900">Additional Fields</h4>
              
              {/* Date Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editedPreset.fields.showPackedDate || false}
                    onChange={(e) => updateFields({ showPackedDate: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Show Packed Date
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editedPreset.fields.showExpiryDate || false}
                    onChange={(e) => updateFields({ showExpiryDate: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Show Expiry Date
                  </label>
                </div>
              </div>

              {/* MRP and Batch */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editedPreset.fields.showMRP || false}
                    onChange={(e) => updateFields({ showMRP: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Show MRP
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editedPreset.fields.showBatch || false}
                    onChange={(e) => updateFields({ showBatch: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Show Batch Number
                  </label>
                </div>
              </div>

              {/* Date Format */}
              {(editedPreset.fields.showPackedDate || editedPreset.fields.showExpiryDate) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Format
                  </label>
                  <select
                    value={editedPreset.fields.dateFormat || 'YYYY-MM-DD'}
                    onChange={(e) => updateFields({ dateFormat: e.target.value as any })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="YYYY-MM-DD">YYYY-MM-DD (2024-03-15)</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (15/03/2024)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (03/15/2024)</option>
                  </select>
                </div>
              )}

              {/* Field Labels */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    MRP Label
                  </label>
                  <input
                    type="text"
                    value={editedPreset.fields.mrpLabel || 'MRP'}
                    onChange={(e) => updateFields({ mrpLabel: e.target.value })}
                    placeholder="MRP"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Batch Label
                  </label>
                  <input
                    type="text"
                    value={editedPreset.fields.batchLabel || 'Batch'}
                    onChange={(e) => updateFields({ batchLabel: e.target.value })}
                    placeholder="Batch"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Packed Label
                  </label>
                  <input
                    type="text"
                    value={editedPreset.fields.packedLabel || 'Packed'}
                    onChange={(e) => updateFields({ packedLabel: e.target.value })}
                    placeholder="Packed"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Label
                  </label>
                  <input
                    type="text"
                    value={editedPreset.fields.expiryLabel || 'Expiry'}
                    onChange={(e) => updateFields({ expiryLabel: e.target.value })}
                    placeholder="Expiry"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Section Order Help */}
            <div className="text-xs text-gray-500">
              Available sections: store, name_en, name_si, name_ta, barcode, price, mrp, batch, dates, desc
            </div>
          </div>

          {/* Style Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Style</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Font Scale
                </label>
                <input
                  type="range"
                  min="0.6"
                  max="1.6"
                  step="0.1"
                  value={editedPreset.style.font_scale}
                  onChange={(e) => updateStyle({ font_scale: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 text-center">
                  {Math.round(editedPreset.style.font_scale * 100)}%
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Text Alignment
                </label>
                <select
                  value={editedPreset.style.align}
                  onChange={(e) => updateStyle({ align: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={editedPreset.style.bold_name}
                  onChange={(e) => updateStyle({ bold_name: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Bold product name</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={editedPreset.style.show_store_logo}
                  onChange={(e) => updateStyle({ show_store_logo: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Show store logo</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSave}
            disabled={saving || !editedPreset.name.trim()}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isNew ? 'Create Preset' : 'Save Changes'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
