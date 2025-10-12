import React, { useState, useEffect, useMemo } from 'react';
import { Package, FileInput, Upload, History, Printer, Download, Save, Settings2, Calendar, Globe, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { LabelPreset, LabelItem, LabelBatch } from '@/types';
import { labelService } from '@/services/labelService';
import { labelPrintAdapter } from '@/services/print/LabelPrintAdapter';
import { csvService } from '@/services/csvService';
import { dataService, Product } from '@/services/dataService';
import { LabelPresetPicker } from '@/components/Labels/LabelPresetPicker';
import { LabelPreview } from '@/components/Labels/LabelPreview';
import { CSVImportModal } from '@/components/Labels/CSVImportModal';
import { BatchSelector } from '@/components/Labels/BatchSelector';
import { TemplateEditor } from '@/components/Labels/TemplateEditor';
import { cn } from '@/utils/cn';

type Tab = 'products' | 'grn' | 'csv' | 'history';

export function Labels() {
  const [activeTab, setActiveTab] = useState<Tab>('products');
  const [selectedPreset, setSelectedPreset] = useState<LabelPreset | null>(null);
  const [batch, setBatch] = useState<LabelBatch>({ items: [], preset: null as any });
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingPreset, setEditingPreset] = useState<LabelPreset | null>(null);
  const [isNewPreset, setIsNewPreset] = useState(false);

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [productFilters, setProductFilters] = useState({
    search: '',
    category: '',
    activeOnly: true
  });

  // Batch analysis for date legend and quick actions
  const batchAnalysis = useMemo(() => {
    const hasDateFields = batch.items.some(item => item.packedDate || item.expiryDate);
    const dateFormat = batch.preset?.fields.dateFormat || 'YYYY-MM-DD';
    const languages = [...new Set(batch.items.map(item => item.language).filter(Boolean))];
    
    return {
      hasDateFields,
      dateFormat,
      languages,
      totalItems: batch.items.length,
      totalLabels: batch.items.reduce((sum, item) => sum + item.qty, 0)
    };
  }, [batch.items, batch.preset]);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedPreset) {
      setBatch(prev => ({ ...prev, preset: selectedPreset }));
    }
  }, [selectedPreset]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const productsData = await dataService.getProducts();
      setProducts(productsData);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    if (productFilters.activeOnly && !product.is_active) return false;
    if (productFilters.search) {
      const search = productFilters.search.toLowerCase();
      return (
        product.name_en.toLowerCase().includes(search) ||
        product.sku.toLowerCase().includes(search) ||
        (product.barcode && product.barcode.toLowerCase().includes(search))
      );
    }
    return true;
  });

  const handleAddProductsToBatch = async () => {
    if (!selectedPreset || selectedProducts.length === 0) return;

    try {
      setLoading(true);
      const labelItems = await labelService.generateLabelItems({
        source: 'products',
        productIds: selectedProducts,
        preset: selectedPreset
      });

      setBatch(prev => ({
        ...prev,
        items: [...prev.items, ...labelItems]
      }));

      setSelectedProducts([]);
      toast.success(`Added ${labelItems.length} items to batch`);
    } catch (error) {
      console.error('Failed to add products to batch:', error);
      toast.error('Failed to add products to batch');
    } finally {
      setLoading(false);
    }
  };

  const handleCSVImport = (items: LabelItem[]) => {
    setBatch(prev => ({
      ...prev,
      items: [...prev.items, ...items]
    }));
    toast.success(`Added ${items.length} items from CSV`);
  };

  const handleUpdateBatchItem = (index: number, updates: Partial<LabelItem>) => {
    setBatch(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, ...updates } : item)
    }));
  };

  const handleRemoveBatchItem = (index: number) => {
    setBatch(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleClearBatch = () => {
    setBatch(prev => ({ ...prev, items: [] }));
  };

  // Quick action handlers
  const handleSetPackedDateToday = () => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    setBatch(prev => ({
      ...prev,
      items: prev.items.map(item => ({ ...item, packedDate: today }))
    }));
    toast.success('Set packed date to today for all items');
  };

  const handleClearDates = () => {
    setBatch(prev => ({
      ...prev,
      items: prev.items.map(item => ({ ...item, packedDate: null, expiryDate: null }))
    }));
    toast.success('Cleared dates for all items');
  };

  const handleSetLanguageForAll = (language: 'EN' | 'SI' | 'TA') => {
    setBatch(prev => ({
      ...prev,
      items: prev.items.map(item => ({ ...item, language }))
    }));
    toast.success(`Set language to ${language} for all items`);
  };

  const handlePrint = async () => {
    if (!selectedPreset || batch.items.length === 0) {
      toast.error('Select a preset and add items to print');
      return;
    }

    try {
      setLoading(true);
      
      if (selectedPreset.paper === 'THERMAL') {
        await labelPrintAdapter.printThermal(batch as LabelBatch);
      } else {
        await labelPrintAdapter.printA4(batch as LabelBatch);
      }

      // Record the job
      await labelService.recordJob(
        selectedPreset,
        batch.items,
        'products', // TODO: Track actual source
        'Current User', // TODO: Get from auth context
        'POS-001' // TODO: Get from settings
      );

      toast.success('Labels sent to printer');
    } catch (error) {
      console.error('Failed to print labels:', error);
      toast.error('Failed to print labels');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (batch.items.length === 0) {
      toast.error('No items to export');
      return;
    }

    try {
      csvService.exportLabelsCSV(batch.items);
      toast.success('Labels exported to CSV');
    } catch (error) {
      console.error('Failed to export CSV:', error);
      toast.error('Failed to export CSV');
    }
  };

  const handleSavePreset = (preset: LabelPreset) => {
    setSelectedPreset(preset);
    toast.success('Preset saved successfully');
  };

  const handleEditPreset = (preset: LabelPreset) => {
    setEditingPreset(preset);
    setIsNewPreset(false);
    setShowTemplateEditor(true);
  };

  const handleCreatePreset = () => {
    setEditingPreset(null);
    setIsNewPreset(true);
    setShowTemplateEditor(true);
  };

  const handleEnableAllFields = async () => {
    if (!selectedPreset) {
      toast.error('Please select a preset first');
      return;
    }

    const updatedPreset = {
      ...selectedPreset,
      fields: {
        ...selectedPreset.fields,
        showMRP: true,
        showBatch: true,
        showPackedDate: true,
        showExpiryDate: true,
        languageMode: 'per_item' as const,
        dateFormat: 'YYYY-MM-DD' as const
      }
    };

    try {
      await labelService.savePreset(updatedPreset);
      setSelectedPreset(updatedPreset);
      setBatch(prev => ({ ...prev, preset: updatedPreset }));
      toast.success('Enabled all new fields! Try editing items in the batch.');
    } catch (error) {
      console.error('Failed to update preset:', error);
      toast.error('Failed to enable fields');
    }
  };

  const tabs = [
    { id: 'products' as const, label: 'From Products', icon: Package },
    { id: 'grn' as const, label: 'From GRN', icon: FileInput },
    { id: 'csv' as const, label: 'From CSV', icon: Upload },
    { id: 'history' as const, label: 'History', icon: History }
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Label Center</h1>
            <p className="text-sm text-gray-600 mt-1">
              Create and print product and shelf labels with custom presets
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleEnableAllFields}
              disabled={!selectedPreset}
              className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              title="Enable MRP, Batch, Dates, and Per-item Language"
            >
              <Settings2 className="w-4 h-4" />
              <span>Enable New Fields</span>
            </button>
            
            <LabelPresetPicker
              selectedPreset={selectedPreset}
              onPresetChange={setSelectedPreset}
              onEditPreset={handleEditPreset}
              onCreatePreset={handleCreatePreset}
              className="w-64"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Source Selection */}
        <div className="w-1/2 flex flex-col border-r border-gray-200 bg-white">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'products' && (
              <ProductsTab
                products={filteredProducts}
                selectedProducts={selectedProducts}
                onProductSelectionChange={setSelectedProducts}
                filters={productFilters}
                onFiltersChange={setProductFilters}
                onAddToBatch={handleAddProductsToBatch}
                loading={loading}
              />
            )}

            {activeTab === 'grn' && (
              <div className="p-6 text-center text-gray-500">
                <FileInput className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>GRN integration coming soon</p>
              </div>
            )}

            {activeTab === 'csv' && (
              <div className="p-6">
                <button
                  onClick={() => setShowCSVImport(true)}
                  className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Import Labels from CSV
                </button>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="p-6 text-center text-gray-500">
                <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Print history coming soon</p>
              </div>
            )}
          </div>

          {/* Batch Summary */}
          <div className="border-t border-gray-200">
            <BatchSelector
              items={batch.items}
              onUpdateItem={handleUpdateBatchItem}
              onRemoveItem={handleRemoveBatchItem}
              onClearBatch={handleClearBatch}
            />
            
            {/* Date Legend and Quick Actions */}
            {batch.items.length > 0 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  {/* Date Legend */}
                  <div className="flex items-center space-x-4 text-xs text-gray-600">
                    {batchAnalysis.hasDateFields && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>Dates in {batchAnalysis.dateFormat} format</span>
                      </div>
                    )}
                    {batchAnalysis.languages.length > 0 && (
                      <div className="flex items-center space-x-1">
                        <Globe className="w-3 h-3" />
                        <span>Languages: {batchAnalysis.languages.join(', ')}</span>
                      </div>
                    )}
                    <div className="text-gray-500">
                      {batchAnalysis.totalItems} items • {batchAnalysis.totalLabels} labels
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleSetPackedDateToday}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      title="Set packed date to today for all items"
                    >
                      <Calendar className="w-3 h-3 inline mr-1" />
                      Today
                    </button>
                    
                    <button
                      onClick={handleClearDates}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      title="Clear all dates"
                    >
                      <Trash2 className="w-3 h-3 inline mr-1" />
                      Clear Dates
                    </button>

                    {/* Language Quick Actions */}
                    <div className="flex items-center space-x-1">
                      {(['EN', 'SI', 'TA'] as const).map(lang => (
                        <button
                          key={lang}
                          onClick={() => handleSetLanguageForAll(lang)}
                          className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                          title={`Set language to ${lang} for all items`}
                        >
                          <Globe className="w-3 h-3 inline mr-1" />
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Preview & Actions */}
        <div className="w-1/2 flex flex-col bg-gray-50">
          {/* Actions Bar */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Preview & Print</h2>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleExportCSV}
                  disabled={batch.items.length === 0}
                  className="flex items-center px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export CSV
                </button>
                
                <button
                  onClick={handlePrint}
                  disabled={!selectedPreset || batch.items.length === 0 || loading}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Printing...
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4 mr-2" />
                      Print Labels
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="flex-1 p-6 overflow-auto">
            {selectedPreset && batch.items.length > 0 ? (
              <LabelPreview batch={batch as LabelBatch} />
            ) : (
              <div className="h-full flex items-center justify-center bg-white rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center text-gray-500">
                  <Printer className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No Preview Available</h3>
                  <p className="text-sm">
                    {!selectedPreset ? 'Select a preset to get started' : 'Add items to see preview'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CSVImportModal
        isOpen={showCSVImport}
        onClose={() => setShowCSVImport(false)}
        onImport={handleCSVImport}
      />

      <TemplateEditor
        preset={editingPreset}
        isOpen={showTemplateEditor}
        onClose={() => setShowTemplateEditor(false)}
        onSave={handleSavePreset}
        isNew={isNewPreset}
      />
    </div>
  );
}

interface ProductsTabProps {
  products: Product[];
  selectedProducts: string[];
  onProductSelectionChange: (productIds: string[]) => void;
  filters: {
    search: string;
    category: string;
    activeOnly: boolean;
  };
  onFiltersChange: (filters: any) => void;
  onAddToBatch: () => void;
  loading: boolean;
}

function ProductsTab({
  products,
  selectedProducts,
  onProductSelectionChange,
  filters,
  onFiltersChange,
  onAddToBatch,
  loading
}: ProductsTabProps) {
  const handleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      onProductSelectionChange([]);
    } else {
      onProductSelectionChange(products.map(p => p.id.toString()));
    }
  };

  const handleProductToggle = (productId: string) => {
    if (selectedProducts.includes(productId)) {
      onProductSelectionChange(selectedProducts.filter(id => id !== productId));
    } else {
      onProductSelectionChange([...selectedProducts, productId]);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="space-y-3">
          <div>
            <input
              type="text"
              placeholder="Search products..."
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={filters.activeOnly}
                onChange={(e) => onFiltersChange({ ...filters, activeOnly: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
              />
              Active only
            </label>
            
            <button
              onClick={onAddToBatch}
              disabled={selectedProducts.length === 0 || loading}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add to Batch ({selectedProducts.length})
            </button>
          </div>
        </div>
      </div>

      {/* Product List */}
      <div className="flex-1 overflow-y-auto">
        {products.length > 0 && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <label className="flex items-center text-sm font-medium">
              <input
                type="checkbox"
                checked={selectedProducts.length === products.length}
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
              />
              Select All ({products.length})
            </label>
          </div>
        )}

        <div className="divide-y divide-gray-200">
          {products.map((product) => (
            <div
              key={product.id}
              className={cn(
                "p-4 hover:bg-gray-50 cursor-pointer transition-colors",
                selectedProducts.includes(product.id.toString()) && "bg-blue-50"
              )}
              onClick={() => handleProductToggle(product.id.toString())}
            >
              <div className="flex items-start">
                <input
                  type="checkbox"
                  checked={selectedProducts.includes(product.id.toString())}
                  onChange={() => handleProductToggle(product.id.toString())}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                
                <div className="ml-3 flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {product.name_en}
                  </h4>
                  <div className="flex items-center mt-1 space-x-3 text-xs text-gray-500">
                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                      {product.sku}
                    </span>
                    {product.barcode && (
                      <span className="font-mono">{product.barcode}</span>
                    )}
                    <span>රු {product.price_retail.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {products.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No products found</p>
          </div>
        )}
      </div>
    </div>
  );
}
