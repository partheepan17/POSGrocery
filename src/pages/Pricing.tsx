import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, Upload, RefreshCw, Calculator, AlertTriangle, ArrowRight, Edit3, Trash2, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { dataService, Product, Category } from '@/services/dataService';
import { csvService } from '@/services/csvService';
import { BulkActionsModal } from '@/components/Pricing/BulkActionsModal';
import { CSVImportModal } from '@/components/Pricing/CSVImportModal';
import { VirtualizedTable } from '@/components/Pricing/VirtualizedTable';
import { EditPriceModal } from '@/components/Pricing/EditPriceModal';
import { AddPriceModal } from '@/components/Pricing/AddPriceModal';
import { useAppStore } from '@/store/appStore';

interface ProductWithCategory extends Product {
  category?: Category;
}

interface FilterState {
  search: string;
  category_id: string;
  missing_price_filter: 'any' | 'retail' | 'wholesale' | 'credit' | 'other';
  active_filter: 'all' | 'active' | 'inactive';
}

interface StatsCounts {
  total: number;
  missing_retail: number;
  missing_wholesale: number;
  missing_credit: number;
  missing_other: number;
}

interface EditableCell {
  productId: number;
  field: 'price_retail' | 'price_wholesale' | 'price_credit' | 'price_other';
  value: string;
}

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

interface BulkPreviewItem {
  product: ProductWithCategory;
  oldValues: Record<string, number>;
  newValues: Record<string, number>;
  changes: Record<string, number>;
}

interface ImportResults {
  success: boolean;
  imported: number;
  updated: number;
  rejected: number;
  errors: string[];
  warnings: string[];
}

export function Pricing() {
  const { settings } = useAppStore();
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsCounts>({ 
    total: 0, 
    missing_retail: 0, 
    missing_wholesale: 0, 
    missing_credit: 0, 
    missing_other: 0 
  });
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category_id: '',
    missing_price_filter: 'any',
    active_filter: 'all'
  });
  const [editingCell, setEditingCell] = useState<EditableCell | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  
  // Performance optimization: use virtualization for large datasets
  const VIRTUALIZATION_THRESHOLD = 200;
  const shouldUseVirtualization = products.length > VIRTUALIZATION_THRESHOLD;
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithCategory | null>(null);
  const [showAddPrice, setShowAddPrice] = useState(false);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      loadData();
    }, 250);
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        dataService.getProducts(filters),
        dataService.getCategories()
      ]);

      // Enrich products with category data
      const enrichedProducts = productsData.map((product: Product) => ({
        ...product,
        category: categoriesData.find((c: Category) => c.id === product.category_id)
      }));

      // Apply missing price filter
      let filteredProducts = enrichedProducts;
      if (filters.missing_price_filter !== 'any') {
        filteredProducts = enrichedProducts.filter((product: ProductWithCategory) => {
          switch (filters.missing_price_filter) {
            case 'retail': return !product.price_retail || product.price_retail === 0;
            case 'wholesale': return !product.price_wholesale || product.price_wholesale === 0;
            case 'credit': return !product.price_credit || product.price_credit === 0;
            case 'other': return !product.price_other || product.price_other === 0;
            default: return true;
          }
        });
      }

      setProducts(filteredProducts);
      setCategories(categoriesData);

      // Calculate stats
      const stats: StatsCounts = {
        total: filteredProducts.length,
        missing_retail: filteredProducts.filter((p: ProductWithCategory) => !p.price_retail || p.price_retail === 0).length,
        missing_wholesale: filteredProducts.filter((p: ProductWithCategory) => !p.price_wholesale || p.price_wholesale === 0).length,
        missing_credit: filteredProducts.filter((p: ProductWithCategory) => !p.price_credit || p.price_credit === 0).length,
        missing_other: filteredProducts.filter((p: ProductWithCategory) => !p.price_other || p.price_other === 0).length,
      };
      setStats(stats);
    } catch (error) {
      console.error('Failed to load pricing data:', error);
      toast.error('Failed to load pricing data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    
    // Debounce search for better performance
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      loadData();
    }, 250);
  };

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleCellEdit = (productId: number, field: 'price_retail' | 'price_wholesale' | 'price_credit' | 'price_other') => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setEditingCell({
      productId,
      field,
      value: String(product[field] || '')
    });
  };

  const handleCellValueChange = (value: string) => {
    if (!editingCell) return;
    
    // Validate numeric input
    if (value && !/^\d*\.?\d*$/.test(value)) return;
    
    setEditingCell(prev => prev ? { ...prev, value } : null);
  };

  const handleSaveEdit = async () => {
    if (!editingCell) return;

    const { productId, field, value } = editingCell;
    const numericValue = parseFloat(value) || 0;

    if (numericValue < 0) {
      toast.error('Price must be greater than or equal to 0');
      return;
    }

    // Check if this would violate blocking policy
    const product = products.find(p => p.id === productId);
    if (product) {
      const tempProduct = { ...product, [field]: numericValue };
      
      // Check if any required tiers would still be missing after this update
      for (const tier of settings.pricingSettings.requiredTiers) {
        const fieldName = `price_${tier}` as 'price_retail' | 'price_wholesale' | 'price_credit' | 'price_other';
        if (isPriceBlocked(tempProduct, fieldName)) {
          toast.error(`Cannot save: ${getValidationMessage(tempProduct, fieldName)}`);
          setEditingCell(null);
          return;
        }
      }
    }

    try {
      // Update the product in the database
      await dataService.updateProduct(productId, { [field]: numericValue });
      
      // Update local state
      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, [field]: numericValue } : p
      ));

      setEditingCell(null);
      toast.success(`${field.replace('price_', '').charAt(0).toUpperCase() + field.replace('price_', '').slice(1)} price updated`);
    } catch (error) {
      console.error('Failed to update price:', error);
      toast.error('Failed to update price');
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
  };

  const handleRowSelect = (productId: number, selected: boolean) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(productId);
      } else {
        newSet.delete(productId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedRows.size === products.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(products.map(p => p.id)));
    }
  };

  const handleExportCSV = async () => {
    try {
      const exportData = products.map(product => ({
        sku: product.sku,
        price_retail: product.price_retail || 0,
        price_wholesale: product.price_wholesale || 0,
        price_credit: product.price_credit || 0,
        price_other: product.price_other || 0
      }));

      await csvService.exportData(exportData, 'pricing.csv');
      toast.success('Pricing data exported successfully');
    } catch (error) {
      console.error('Failed to export pricing:', error);
      toast.error('Failed to export pricing data');
    }
  };

  const handleBulkAction = async (action: BulkAction, preview: BulkPreviewItem[]) => {
    try {
      let updatedCount = 0;
      let errorCount = 0;

      for (const item of preview) {
        try {
          const updates: Record<string, number> = {};
          Object.keys(item.changes).forEach(field => {
            updates[field] = item.newValues[field];
          });

          await dataService.updateProduct(item.product.id, updates);
          updatedCount++;
        } catch (error) {
          console.error(`Failed to update product ${item.product.sku}:`, error);
          errorCount++;
        }
      }

      // Update local state
      setProducts(prev => prev.map(product => {
        const previewItem = preview.find(p => p.product.id === product.id);
        if (previewItem) {
          return { ...product, ...previewItem.newValues };
        }
        return product;
      }));

      // Refresh stats
      loadData();

      if (errorCount === 0) {
        toast.success(`Successfully updated ${updatedCount} products`);
      } else {
        toast.error(`Updated ${updatedCount} products, ${errorCount} failed`);
      }
    } catch (error) {
      console.error('Failed to apply bulk action:', error);
      toast.error('Failed to apply bulk action');
    }
  };

  const handleImportComplete = (results: ImportResults) => {
    // Refresh the data to show updated prices
    loadData();
    
    // Show appropriate toast message
    if (results.success) {
      toast.success(`Import completed: ${results.updated} updated, ${results.imported} new products`);
    } else {
      toast.error(`Import completed with issues: ${results.updated} updated, ${results.rejected} failed`);
    }
  };

  const isMissingPrice = (product: ProductWithCategory, field: keyof ProductWithCategory) => {
    const value = product[field] as number;
    return !value || value === 0;
  };

  const isPriceBlocked = (product: ProductWithCategory, field: 'price_retail' | 'price_wholesale' | 'price_credit' | 'price_other') => {
    const policy = settings.pricingSettings.missingPricePolicy;
    const requiredTiers = settings.pricingSettings.requiredTiers;
    
    if (policy === 'block') {
      const tierName = field.replace('price_', '') as 'retail' | 'wholesale' | 'credit' | 'other';
      return requiredTiers.includes(tierName) && isMissingPrice(product, field);
    }
    
    return false;
  };

  const getValidationMessage = (product: ProductWithCategory, field: 'price_retail' | 'price_wholesale' | 'price_credit' | 'price_other') => {
    if (isPriceBlocked(product, field)) {
      const tierName = field.replace('price_', '');
      return `Missing ${tierName} price is required`;
    }
    
    if (isMissingPrice(product, field)) {
      const tierName = field.replace('price_', '');
      return `Missing ${tierName} price (warning)`;
    }
    
    return null;
  };

  const getPriceDisplay = (product: ProductWithCategory, field: 'price_retail' | 'price_wholesale' | 'price_credit' | 'price_other') => {
    const value = product[field];
    if (!value || value === 0) {
      return (
        <div className="flex items-center space-x-1">
          <span className="text-gray-400">-</span>
          <AlertTriangle className="w-3 h-3 text-yellow-500" />
        </div>
      );
    }
    return `රු ${value.toLocaleString()}`;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (editingCell) {
          handleSaveEdit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingCell]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Price Management</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage tier prices with inline editing and bulk operations
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAddPrice(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title="Add Price"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Price
            </button>
            <button
              onClick={() => setShowBulkModal(true)}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Calculator className="w-4 h-4 mr-2" />
              Bulk Actions
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={loadData}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats Pills */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              All: {stats.total}
            </span>
            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
              Missing Retail: {stats.missing_retail}
            </span>
            <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
              Missing Wholesale: {stats.missing_wholesale}
            </span>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
              Missing Credit: {stats.missing_credit}
            </span>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
              Missing Other: {stats.missing_other}
            </span>
          </div>
          
          {/* Performance Indicator */}
          {shouldUseVirtualization && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Virtualized ({products.length} items)</span>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search SKU, name, barcode... (/)"
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={filters.category_id}
            onChange={(e) => handleFilterChange('category_id', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          {/* Missing Price Filter */}
          <select
            value={filters.missing_price_filter}
            onChange={(e) => handleFilterChange('missing_price_filter', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="any">Any Missing Price</option>
            <option value="retail">Missing Retail</option>
            <option value="wholesale">Missing Wholesale</option>
            <option value="credit">Missing Credit</option>
            <option value="other">Missing Other</option>
          </select>

          {/* Active Filter */}
          <select
            value={filters.active_filter}
            onChange={(e) => handleFilterChange('active_filter', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Table - Use virtualization for large datasets */}
      {shouldUseVirtualization ? (
        <VirtualizedTable
          products={products}
          selectedRows={selectedRows}
          editingCell={editingCell}
          onRowSelect={handleRowSelect}
          onSelectAll={handleSelectAll}
          onCellEdit={handleCellEdit}
          onCellValueChange={handleCellValueChange}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit}
          isMissingPrice={isMissingPrice}
          isPriceBlocked={isPriceBlocked}
          getPriceDisplay={getPriceDisplay}
          getValidationMessage={getValidationMessage}
        />
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedRows.size === products.length && products.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                      SKU
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-16 bg-gray-50">
                      Name (EN)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <span>Retail</span>
                        <span className="text-xs text-gray-400" title="Used for standard customer purchases">ℹ️</span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <span>Wholesale</span>
                        <span className="text-xs text-gray-400" title="Used for bulk purchases">ℹ️</span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <span>Credit</span>
                        <span className="text-xs text-gray-400" title="Used for credit customers">ℹ️</span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <span>Other</span>
                        <span className="text-xs text-gray-400" title="Used for special pricing">ℹ️</span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(product.id)}
                          onChange={(e) => handleRowSelect(product.id, e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white">
                        {product.sku}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 sticky left-16 bg-white max-w-xs truncate">
                        {product.name_en}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {editingCell?.productId === product.id && editingCell?.field === 'price_retail' ? (
                          <input
                            type="text"
                            value={editingCell.value}
                            onChange={(e) => handleCellValueChange(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            onBlur={handleSaveEdit}
                            className={`w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 ${
                              isPriceBlocked(product, 'price_retail') 
                                ? 'border-red-500 bg-red-50' 
                                : 'border-blue-500'
                            }`}
                            autoFocus
                            title={getValidationMessage(product, 'price_retail') || ''}
                          />
                        ) : (
                          <button
                            onClick={() => handleCellEdit(product.id, 'price_retail')}
                            className={`w-full text-left px-2 py-1 rounded hover:bg-gray-100 ${
                              isMissingPrice(product, 'price_retail') 
                                ? isPriceBlocked(product, 'price_retail')
                                  ? 'text-red-600 font-semibold'
                                  : 'text-red-600'
                                : 'text-gray-900'
                            }`}
                            title={getValidationMessage(product, 'price_retail') || ''}
                          >
                            {getPriceDisplay(product, 'price_retail')}
                          </button>
                        )}
                      </td>

                      {/* Wholesale Price */}
                      <td className="px-4 py-3 text-sm">
                        {editingCell?.productId === product.id && editingCell?.field === 'price_wholesale' ? (
                          <input
                            type="text"
                            value={editingCell.value}
                            onChange={(e) => handleCellValueChange(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            onBlur={handleSaveEdit}
                            className={`w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 ${
                              isPriceBlocked(product, 'price_wholesale') 
                                ? 'border-red-500 bg-red-50' 
                                : 'border-blue-500'
                            }`}
                            autoFocus
                            title={getValidationMessage(product, 'price_wholesale') || ''}
                          />
                        ) : (
                          <button
                            onClick={() => handleCellEdit(product.id, 'price_wholesale')}
                            className={`w-full text-left px-2 py-1 rounded hover:bg-gray-100 ${
                              isMissingPrice(product, 'price_wholesale') 
                                ? isPriceBlocked(product, 'price_wholesale')
                                  ? 'text-red-600 font-semibold'
                                  : 'text-red-600'
                                : 'text-gray-900'
                            }`}
                            title={getValidationMessage(product, 'price_wholesale') || ''}
                          >
                            {getPriceDisplay(product, 'price_wholesale')}
                          </button>
                        )}
                      </td>

                      {/* Credit Price */}
                      <td className="px-4 py-3 text-sm">
                        {editingCell?.productId === product.id && editingCell?.field === 'price_credit' ? (
                          <input
                            type="text"
                            value={editingCell.value}
                            onChange={(e) => handleCellValueChange(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            onBlur={handleSaveEdit}
                            className={`w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 ${
                              isPriceBlocked(product, 'price_credit') 
                                ? 'border-red-500 bg-red-50' 
                                : 'border-blue-500'
                            }`}
                            autoFocus
                            title={getValidationMessage(product, 'price_credit') || ''}
                          />
                        ) : (
                          <button
                            onClick={() => handleCellEdit(product.id, 'price_credit')}
                            className={`w-full text-left px-2 py-1 rounded hover:bg-gray-100 ${
                              isMissingPrice(product, 'price_credit') 
                                ? isPriceBlocked(product, 'price_credit')
                                  ? 'text-red-600 font-semibold'
                                  : 'text-red-600'
                                : 'text-gray-900'
                            }`}
                            title={getValidationMessage(product, 'price_credit') || ''}
                          >
                            {getPriceDisplay(product, 'price_credit')}
                          </button>
                        )}
                      </td>

                      {/* Other Price */}
                      <td className="px-4 py-3 text-sm">
                        {editingCell?.productId === product.id && editingCell?.field === 'price_other' ? (
                          <input
                            type="text"
                            value={editingCell.value}
                            onChange={(e) => handleCellValueChange(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            onBlur={handleSaveEdit}
                            className={`w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 ${
                              isPriceBlocked(product, 'price_other') 
                                ? 'border-red-500 bg-red-50' 
                                : 'border-blue-500'
                            }`}
                            autoFocus
                            title={getValidationMessage(product, 'price_other') || ''}
                          />
                        ) : (
                          <button
                            onClick={() => handleCellEdit(product.id, 'price_other')}
                            className={`w-full text-left px-2 py-1 rounded hover:bg-gray-100 ${
                              isMissingPrice(product, 'price_other') 
                                ? isPriceBlocked(product, 'price_other')
                                  ? 'text-red-600 font-semibold'
                                  : 'text-red-600'
                                : 'text-gray-900'
                            }`}
                            title={getValidationMessage(product, 'price_other') || ''}
                          >
                            {getPriceDisplay(product, 'price_other')}
                          </button>
                        )}
                      </td>

                      {/* Last Updated */}
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {product.updated_at ? new Date(product.updated_at).toLocaleString() : '-'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setEditingProduct(product)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit Prices"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(`Delete ${product.sku}?`)) return;
                              await dataService.deleteProduct(product.id as any);
                              toast.success('Deleted');
                              loadData();
                            }}
                            className="text-gray-500 hover:text-red-700"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-gray-600">Loading pricing data...</span>
          </div>
        </div>
      )}

      {/* Bulk Actions Modal */}
      <BulkActionsModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        selectedProducts={products.filter(p => selectedRows.has(p.id))}
        allProducts={products}
        onApplyBulkAction={handleBulkAction}
      />

      {/* CSV Import Modal */}
      <CSVImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={handleImportComplete}
      />

      {editingProduct && (
        <EditPriceModal
          product={editingProduct as any}
          onClose={() => setEditingProduct(null)}
          onSaved={(updated) => {
            setProducts(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
            setEditingProduct(null);
          }}
        />
      )}

      {showAddPrice && (
        <AddPriceModal
          onClose={() => setShowAddPrice(false)}
          onAdded={(updated) => {
            setProducts(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
            setShowAddPrice(false);
          }}
        />
      )}
    </div>
  );
}
