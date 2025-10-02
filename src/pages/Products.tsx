import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Download, Upload, RefreshCw, Edit3, Copy, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { dataService, Product, Category, Supplier } from '@/services/dataService';
import { csvService } from '@/services/csvService';
import { AddProductModal } from '@/components/Products/AddProductModal';
import { CSVImportModal } from '@/components/Products/CSVImportModal';

interface ProductWithRelations extends Product {
  category?: Category;
  preferred_supplier?: Supplier;
}

interface FilterState {
  search: string;
  category_id: string;
  scale_items_only: boolean;
  active_filter: 'all' | 'active' | 'inactive';
}

interface StatsCounts {
  total: number;
  active: number;
  inactive: number;
  scale_items: number;
}

export function Products() {
  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsCounts>({ total: 0, active: 0, inactive: 0, scale_items: 0 });
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category_id: '',
    scale_items_only: false,
    active_filter: 'all'
  });

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

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
      const [productsData, categoriesData, suppliersData] = await Promise.all([
        dataService.getProducts(filters),
        dataService.getCategories(),
        dataService.getSuppliers(false) // Get all suppliers including inactive ones
      ]);

      // Enrich products with related data
      const enrichedProducts = productsData.map((product: Product) => ({
        ...product,
        category: categoriesData.find((c: Category) => c.id === product.category_id),
        preferred_supplier: suppliersData.find((s: Supplier) => s.id === product.preferred_supplier_id)
      }));

      setProducts(enrichedProducts);
      setCategories(categoriesData);
      setSuppliers(suppliersData);

      // Calculate stats
      const stats: StatsCounts = {
        total: productsData.length,
        active: productsData.filter((p: Product) => p.is_active).length,
        inactive: productsData.filter((p: Product) => !p.is_active).length,
        scale_items: productsData.filter((p: Product) => p.is_scale_item).length
      };
      setStats(stats);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

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

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExportCSV = async () => {
    try {
      const exportData = products.map(product => ({
        sku: product.sku,
        barcode: product.barcode || '',
        alias_barcodes: '', // TODO: Implement alias barcodes
        name_en: product.name_en,
        name_si: product.name_si || '',
        name_ta: product.name_ta || '',
        unit: product.unit,
        category: product.category?.name || '',
        price_retail: product.price_retail,
        price_wholesale: product.price_wholesale,
        price_credit: product.price_credit,
        price_other: product.price_other,
        tax_code: product.tax_code || '',
        shelf_location: '', // TODO: Add shelf_location field
        reorder_level: product.reorder_level || 0,
        preferred_supplier: product.preferred_supplier?.supplier_name || '',
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
    loadData(); // Refresh the data
    setShowAddModal(false); // Close the modal
  };

  const handleImportComplete = () => {
    loadData(); // Refresh the data
    setShowImportModal(false); // Close the modal
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage your product catalog with inline editing and bulk operations
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Product
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
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
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
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              Total: {stats.total}
            </span>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              Active: {stats.active}
            </span>
            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
              Inactive: {stats.inactive}
            </span>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
              Scale Items: {stats.scale_items}
            </span>
          </div>
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
              placeholder="Search SKU, barcode, name... (/)"
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

          {/* Scale Items Toggle */}
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filters.scale_items_only}
              onChange={(e) => handleFilterChange('scale_items_only', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Scale Items Only</span>
          </label>

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

      {/* Products Table */}
      <div className="flex-1 overflow-auto">
        <div className="bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Barcode
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name (EN)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name (SI)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name (TA)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price Retail
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading products...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                      No products found matching your filters.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {product.sku}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {product.barcode || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {product.name_en}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {product.name_si || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {product.name_ta || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {product.unit}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {product.category?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        රු {product.price_retail.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          product.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {/* TODO: Implement edit */}}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {/* TODO: Implement duplicate */}}
                            className="text-green-600 hover:text-green-900"
                            title="Duplicate"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {/* TODO: Implement toggle active */}}
                            className={`${product.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                            title={product.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {product.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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