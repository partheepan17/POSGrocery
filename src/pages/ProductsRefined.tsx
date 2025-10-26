import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { 
  Plus, Search, Download, Upload, RefreshCw, Edit3, Copy, Eye, EyeOff, 
  Trash2, Printer, MoreVertical, AlertTriangle, Filter, X, Check, 
  ChevronUp, ChevronDown, SortAsc, SortDesc, Scale, Package
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { dataService, Product, Category, Supplier } from '@/services/dataService';
import { csvService } from '@/services/csvService';
import { AddProductModal } from '@/components/Products/AddProductModal';
import { CSVImportModal } from '@/components/Products/CSVImportModal';
import { labelPrintAdapter } from '@/services/print/LabelPrintAdapter';
import { labelService } from '@/services/labelService';
import { useAuth, RoleGuard, PermissionGuard } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';
import { useProductsQuery, useDebouncedValue, useURLSync, FilterState, PaginationMeta } from '@/hooks/useProductsQuery';

export function ProductsRefined() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canAccess } = useAuth();
  
  // Initialize filters and pagination from URL
  const initialFilters: FilterState = {
    search: searchParams.get('search') || '',
    category_id: searchParams.get('category_id') || '',
    scale_items_only: searchParams.get('scale_items_only') === 'true',
    active_filter: (searchParams.get('status') as 'all' | 'active' | 'inactive') || 'all',
    sort_by: (searchParams.get('sortBy') as any) || 'created_at',
    sort_order: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
  };

  const initialPagination: PaginationMeta = {
    page: parseInt(searchParams.get('page') || '1'),
    pageSize: parseInt(searchParams.get('pageSize') || '20'),
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  };

  // Use the products query hook
  const {
    products,
    categories,
    suppliers,
    stats,
    pagination,
    loading,
    error,
    refetch,
    updateFilters,
    updatePagination,
    updateProduct,
    deleteProduct,
    toggleActive,
    hasFilters,
    isEmpty
  } = useProductsQuery(initialFilters, initialPagination);

  // Debounced search
  const debouncedSearch = useDebouncedValue(initialFilters.search, 300);

  // UI State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [printingBarcode, setPrintingBarcode] = useState<number | null>(null);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [editingPrice, setEditingPrice] = useState<{ id: number; field: string; value: string } | null>(null);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Update URL parameters
  const updateURL = useCallback((updates: Record<string, any>) => {
    const newParams = new URLSearchParams(searchParams);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined) {
        newParams.delete(key);
      } else {
        newParams.set(key, value.toString());
      }
    });
    
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  // Sync URL with state
  useURLSync(initialFilters, pagination, updateURL);

  // Effects
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-product-dropdown]')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update search when debounced value changes
  useEffect(() => {
    if (debouncedSearch !== initialFilters.search) {
      updateFilters({ search: debouncedSearch });
    }
  }, [debouncedSearch, initialFilters.search, updateFilters]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handlers
  const handleSearchChange = (value: string) => {
    updateFilters({ search: value });
  };

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    updateFilters({ [key]: value });
  };

  const handleSortChange = (sortBy: FilterState['sort_by']) => {
    const newSortOrder = initialFilters.sort_by === sortBy && initialFilters.sort_order === 'asc' ? 'desc' : 'asc';
    updateFilters({ sort_by: sortBy, sort_order: newSortOrder });
  };

  const handlePageChange = (newPage: number) => {
    updatePagination({ page: newPage });
    tableRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    updatePagination({ pageSize: newPageSize, page: 1 });
  };

  const handleClearFilters = () => {
    updateFilters({
      search: '',
      category_id: '',
      scale_items_only: false,
      active_filter: 'all',
      sort_by: 'created_at',
      sort_order: 'desc'
    });
  };

  // Inline price editing
  const handlePriceEdit = (productId: number, field: string, currentValue: number) => {
    setEditingPrice({ id: productId, field, value: currentValue.toString() });
  };

  const handlePriceSave = async (productId: number, field: string, value: string) => {
    try {
      const numericValue = parseFloat(value);
      if (isNaN(numericValue) || numericValue < 0) {
        toast.error('Invalid price value');
        return;
      }

      await updateProduct(productId, { [field]: numericValue });
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setEditingPrice(null);
    }
  };

  const handlePriceCancel = () => {
    setEditingPrice(null);
  };

  // Other handlers
  const handleExportCSV = async () => {
    try {
      const exportData = products.map(product => ({
        sku: product.sku,
        barcode: product.barcode || '',
        name_en: product.name_en,
        name_si: product.name_si || '',
        name_ta: product.name_ta || '',
        unit: product.unit,
        category: product.category?.name || '',
        price_retail: product.price_retail,
        price_wholesale: product.price_wholesale,
        price_credit: product.price_credit,
        price_other: product.price_other,
        is_scale_item: product.is_scale_item,
        is_active: product.is_active
      }));

      await csvService.exportData(exportData, 'products.csv');
      toast.success('Products exported successfully');
    } catch (error) {
      console.error('Failed to export products:', error);
      toast.error('Failed to export products');
    }
  };

  const handleProductSaved = () => {
    refetch();
    setShowAddModal(false);
  };

  const handleImportComplete = () => {
    refetch();
    setShowImportModal(false);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
  };

  const handleToggleActive = async (product: Product) => {
    try {
      await toggleActive(product.id);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    const confirmMessage = `Are you sure you want to deactivate "${product.name_en}" (${product.sku})?`;
    if (!window.confirm(confirmMessage)) return;

    try {
      await deleteProduct(product.id);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handlePrintBarcode = async (product: Product) => {
    if (!product.barcode && !product.sku) {
      toast.error('No barcode or SKU available for this product');
      return;
    }

    setPrintingBarcode(product.id);
    try {
      const productPreset = labelService.getPreset
        ? await labelService.getPreset(1)
        : (await labelService.getPreset(1)) || null;
      
      if (!productPreset) {
        toast.error('No label presets available');
        return;
      }

      const category = categories.find(c => c.id === product.category_id);
      const categoryName = category?.name || 'General';

      const labelItem = {
        id: product.id,
        name_en: product.name_en,
        name_si: product.name_si || product.name_en,
        name_ta: product.name_ta || product.name_en,
        sku: product.sku,
        barcode: product.barcode || product.sku,
        price_retail: product.price_retail,
        price_wholesale: product.price_wholesale,
        price_credit: product.price_credit,
        price_other: product.price_other,
        unit: product.unit,
        category_name: categoryName,
        packedDate: new Date().toISOString().split('T')[0],
        expiryDate: null,
        language: 'EN' as const
      };

      const batch: any = {
        preset: productPreset,
        items: [{ ...labelItem, id: String(product.id), qty: 1, price_tier: 'retail' }],
        qty: 1
      };

      if (productPreset.paper === 'THERMAL') {
        await labelPrintAdapter.printThermal(batch);
      } else {
        await labelPrintAdapter.printA4(batch);
      }

      toast.success(`Barcode label printed for ${product.name_en}`);
    } catch (error) {
      console.error('Failed to print barcode:', error);
      toast.error('Failed to print barcode label');
    } finally {
      setPrintingBarcode(null);
    }
  };

  const getSortIcon = (field: string) => {
    if (initialFilters.sort_by !== field) return null;
    return initialFilters.sort_order === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2
    }).format(value);
  };

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Error Loading Products
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <Button onClick={refetch} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('products.title')}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('products.description')}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <PermissionGuard permission="products.create">
              <Button
                onClick={() => setShowAddModal(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                {t('products.addProduct')}
              </Button>
            </PermissionGuard>
            
            <PermissionGuard permission="products.create">
              <Button
                onClick={() => setShowImportModal(true)}
                variant="outline"
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                {t('products.importCSV')}
              </Button>
            </PermissionGuard>
            
            <Button
              onClick={handleExportCSV}
              variant="outline"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              {t('products.exportCSV')}
            </Button>
            
            <Button
              onClick={refetch}
              variant="outline"
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="flex items-center space-x-4">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {t('products.total')}: {stats.total}
          </Badge>
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            {t('products.active')}: {stats.active}
          </Badge>
          <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            {t('products.inactive')}: {stats.inactive}
          </Badge>
          <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
            {t('products.scaleItems')}: {stats.scale_items}
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card className="m-6">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
              {hasFilters && (
                <Badge variant="outline" className="ml-2">
                  Active
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
              {hasFilters && (
                <Button
                  onClick={handleClearFilters}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        {showFilters && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search products..."
                  value={initialFilters.search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Category Filter */}
              <select
                value={initialFilters.category_id}
                onChange={(e) => handleFilterChange('category_id', e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              {/* Active Filter */}
              <select
                value={initialFilters.active_filter}
                onChange={(e) => handleFilterChange('active_filter', e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>

              {/* Scale Items Filter */}
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={initialFilters.scale_items_only}
                  onChange={(e) => handleFilterChange('scale_items_only', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <Scale className="w-4 h-4" />
                  Scale Items Only
                </span>
              </label>
            </div>

            <Separator />

            {/* Sort Options */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</span>
              <div className="flex items-center gap-2">
                {[
                  { key: 'name_en', label: 'Name' },
                  { key: 'sku', label: 'SKU' },
                  { key: 'created_at', label: 'Created Date' },
                  { key: 'price_retail', label: 'Price' }
                ].map(({ key, label }) => (
                  <Button
                    key={key}
                    onClick={() => handleSortChange(key as FilterState['sort_by'])}
                    variant={initialFilters.sort_by === key ? 'default' : 'outline'}
                    size="sm"
                    className="gap-2"
                  >
                    {label}
                    {getSortIcon(key)}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Products Table */}
      <div className="flex-1 overflow-hidden px-6 pb-6">
        <Card>
          <div ref={tableRef} className="overflow-auto max-h-[calc(100vh-400px)]">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => handleSortChange('sku')}
                      className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <span>SKU</span>
                      {getSortIcon('sku')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => handleSortChange('name_en')}
                      className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <span>Name</span>
                      {getSortIcon('name_en')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Barcode
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => handleSortChange('price_retail')}
                      className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <span>Retail Price</span>
                      {getSortIcon('price_retail')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => handleSortChange('created_at')}
                      className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <span>Created</span>
                      {getSortIcon('created_at')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading products...
                    </td>
                  </tr>
                ) : isEmpty ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <div className="text-lg font-medium mb-2">No products found</div>
                      <div className="text-sm">
                        {hasFilters ? 'Try adjusting your filters' : 'Add your first product to get started'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          {product.sku}
                          {product.is_scale_item && (
                            <Badge variant="outline" className="text-xs">
                              <Scale className="w-3 h-3 mr-1" />
                              Scale
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        <div>
                          <div className="font-medium">{product.name_en}</div>
                          {product.name_si && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">{product.name_si}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {product.barcode || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {product.category?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {product.unit}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {editingPrice?.id === product.id && editingPrice.field === 'price_retail' ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={editingPrice.value}
                              onChange={(e) => setEditingPrice(prev => prev ? { ...prev, value: e.target.value } : null)}
                              className="w-24 h-8 text-sm"
                              step="0.01"
                              min="0"
                            />
                            <Button
                              onClick={() => handlePriceSave(product.id, 'price_retail', editingPrice.value)}
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button
                              onClick={handlePriceCancel}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handlePriceEdit(product.id, 'price_retail', product.price_retail)}
                            className="text-left hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded"
                            title="Click to edit"
                          >
                            {formatCurrency(product.price_retail)}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={product.is_active ? 'default' : 'secondary'}
                            className={product.is_active 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }
                          >
                            {product.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <PermissionGuard permission="products.update">
                            <Button
                              onClick={() => handleToggleActive(product)}
                              size="sm"
                              variant="outline"
                              className="h-6 w-6 p-0"
                            >
                              {product.is_active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </Button>
                          </PermissionGuard>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {new Date(product.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center space-x-2">
                          <PermissionGuard permission="products.update">
                            <Button
                              onClick={() => handleEditProduct(product)}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                          </PermissionGuard>
                          
                          <Button
                            onClick={() => handlePrintBarcode(product)}
                            disabled={printingBarcode === product.id || (!product.barcode && !product.sku)}
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                          >
                            {printingBarcode === product.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Printer className="w-4 h-4" />
                            )}
                          </Button>
                          
                          <div className="relative" data-product-dropdown>
                            <Button
                              onClick={() => setOpenDropdown(openDropdown === product.id ? null : product.id)}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                            
                            {openDropdown === product.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
                                <div className="py-1">
                                  <PermissionGuard permission="products.update">
                                    <button
                                      onClick={() => {
                                        setOpenDropdown(null);
                                        handleDeleteProduct(product);
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                      <EyeOff className="w-4 h-4 mr-2" />
                                      Deactivate Product
                                    </button>
                                  </PermissionGuard>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Pagination */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700 dark:text-gray-300">Show</span>
              <select
                value={pagination.pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-700 dark:text-gray-300">per page</span>
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} results
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrevPage}
              variant="outline"
              size="sm"
            >
              Previous
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const pageNum = i + 1;
                const isActive = pageNum === pagination.page;
                return (
                  <Button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                  >
                    {pageNum}
                  </Button>
                );
              })}
              {pagination.totalPages > 5 && (
                <>
                  <span className="px-2 text-gray-500">...</span>
                  <Button
                    onClick={() => handlePageChange(pagination.totalPages)}
                    variant={pagination.page === pagination.totalPages ? 'default' : 'outline'}
                    size="sm"
                  >
                    {pagination.totalPages}
                  </Button>
                </>
              )}
            </div>
            
            <Button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNextPage}
              variant="outline"
              size="sm"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddProductModal
          categories={categories}
          suppliers={suppliers}
          onClose={() => setShowAddModal(false)}
          onSave={handleProductSaved}
        />
      )}

      {editingProduct && (
        <AddProductModal
          categories={categories}
          suppliers={suppliers}
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={() => {
            setEditingProduct(null);
            refetch();
          }}
        />
      )}

      {showImportModal && (
        <CSVImportModal
          categories={categories}
          suppliers={suppliers}
          onClose={() => setShowImportModal(false)}
          onImport={handleImportComplete}
        />
      )}
    </div>
  );
}










