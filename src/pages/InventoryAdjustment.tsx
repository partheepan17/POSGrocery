import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, RefreshCw, AlertTriangle, TrendingUp, TrendingDown, Package, History, BarChart3 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { dataService } from '@/services/dataService';
import { Product } from '@/types';
import { useAuth, RoleGuard } from '@/store/authStore';

interface Adjustment {
  id: number;
  product_id: number;
  delta_qty: number;
  reason: string;
  notes?: string;
  created_by: number;
  created_at: string;
  product_name?: string;
  product_sku?: string;
  current_quantity?: number;
  new_quantity?: number;
  created_by_username?: string;
  created_by_name?: string;
}

interface AdjustmentForm {
  product_id: number | '';
  delta_qty: number | '';
  reason: string;
  notes: string;
}

interface Stats {
  total_adjustments: number;
  products_adjusted: number;
  total_increases: number;
  total_decreases: number;
  users_made_adjustments: number;
}

const REASON_OPTIONS = [
  { value: 'stock_take', label: 'Stock Take' },
  { value: 'damage', label: 'Damage' },
  { value: 'theft', label: 'Theft' },
  { value: 'expired', label: 'Expired' },
  { value: 'found', label: 'Found' },
  { value: 'correction', label: 'Correction' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'other', label: 'Other' }
];

export function InventoryAdjustment() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const [form, setForm] = useState<AdjustmentForm>({
    product_id: '',
    delta_qty: '',
    reason: '',
    notes: ''
  });

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, adjustmentsData, statsData] = await Promise.all([
        dataService.getProducts(),
        fetchAdjustments(),
        fetchStats()
      ]);
      
      setProducts(Array.isArray(productsData) ? productsData : []);
      setAdjustments(adjustmentsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdjustments = async (): Promise<Adjustment[]> => {
    const response = await fetch('/api/inventory/adjustments', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch adjustments');
    }
    
    const data = await response.json();
    return data.data.adjustments || [];
  };

  const fetchStats = async (): Promise<Stats> => {
    const response = await fetch('/api/inventory/adjustments/stats/summary', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }
    
    const data = await response.json();
    return data.data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.product_id || form.delta_qty === '' || !form.reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await fetch('/api/inventory/adjustments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          product_id: form.product_id,
          delta_qty: form.delta_qty,
          reason: form.reason,
          notes: form.notes || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create adjustment');
      }

      const result = await response.json();
      
      toast.success(`Adjustment created successfully. New quantity: ${result.data.new_quantity}`);
      
      // Reset form and reload data
      setForm({
        product_id: '',
        delta_qty: '',
        reason: '',
        notes: ''
      });
      setShowForm(false);
      setSelectedProduct(null);
      await loadData();
      
    } catch (error: any) {
      console.error('Failed to create adjustment:', error);
      toast.error(error.message || 'Failed to create adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProductSelect = (productId: number) => {
    const product = products.find(p => p.id === productId);
    setSelectedProduct(product || null);
    setForm(prev => ({ ...prev, product_id: productId }));
  };

  const filteredProducts = products.filter(product =>
    product.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAdjustments = adjustments.filter(adjustment =>
    adjustment.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    adjustment.product_sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    adjustment.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading inventory adjustments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Adjustments</h1>
            <p className="text-sm text-gray-600 mt-1">
              Adjust stock quantities and track inventory changes
            </p>
          </div>
          <RoleGuard roles={['manager', 'admin']}>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Adjustment
            </button>
          </RoleGuard>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <BarChart3 className="w-8 h-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-600">Total Adjustments</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.total_adjustments}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Package className="w-8 h-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-600">Products Adjusted</p>
                  <p className="text-2xl font-bold text-green-900">{stats.products_adjusted}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-emerald-50 p-4 rounded-lg">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-emerald-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-emerald-600">Total Increases</p>
                  <p className="text-2xl font-bold text-emerald-900">{stats.total_increases}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center">
                <TrendingDown className="w-8 h-8 text-red-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-600">Total Decreases</p>
                  <p className="text-2xl font-bold text-red-900">{stats.total_decreases}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center">
                <History className="w-8 h-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-purple-600">Users Active</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.users_made_adjustments}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search products or adjustments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={loadData}
            className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {showForm ? (
          <div className="h-full flex">
            {/* Form Panel */}
            <div className="w-1/2 bg-white border-r border-gray-200 p-6 overflow-y-auto">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Adjustment</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Product Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product *
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  {searchTerm && (
                    <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                      {filteredProducts.map(product => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleProductSelect(product.id)}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                            form.product_id === product.id ? 'bg-blue-50 text-blue-900' : ''
                          }`}
                        >
                          <div className="font-medium">{product.name_en}</div>
                          <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                          <div className="text-sm text-gray-500">Current Stock: 0</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Product Info */}
                {selectedProduct && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-medium text-blue-900">Selected Product</h3>
                    <p className="text-blue-700">{selectedProduct.name_en}</p>
                    <p className="text-sm text-blue-600">SKU: {selectedProduct.sku}</p>
                    <p className="text-sm text-blue-600">Current Stock: 0</p>
                  </div>
                )}

                {/* Quantity Adjustment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity Adjustment *
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={form.delta_qty}
                      onChange={(e) => setForm(prev => ({ ...prev, delta_qty: parseInt(e.target.value) || '' }))}
                      placeholder="Enter quantity change"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                    <div className="text-sm text-gray-500">
                      {Number(form.delta_qty) > 0 && <span className="text-green-600">+{form.delta_qty} (Increase)</span>}
                      {Number(form.delta_qty) < 0 && <span className="text-red-600">{form.delta_qty} (Decrease)</span>}
                    </div>
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason *
                  </label>
                  <select
                    value={form.reason}
                    onChange={(e) => setForm(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a reason</option>
                    {REASON_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes (optional)"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={submitting || !form.product_id || form.delta_qty === '' || !form.reason}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? 'Creating...' : 'Create Adjustment'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setForm({ product_id: '', delta_qty: '', reason: '', notes: '' });
                      setSelectedProduct(null);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>

            {/* History Panel */}
            <div className="w-1/2 bg-gray-50 p-6 overflow-y-auto">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Adjustments</h2>
              
              {filteredAdjustments.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No adjustments found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAdjustments.slice(0, 10).map(adjustment => (
                    <div key={adjustment.id} className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{adjustment.product_name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          adjustment.delta_qty > 0 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {adjustment.delta_qty > 0 ? '+' : ''}{adjustment.delta_qty}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">SKU: {adjustment.product_sku}</p>
                      <p className="text-sm text-gray-600 mb-1">Reason: {adjustment.reason}</p>
                      {adjustment.notes && (
                        <p className="text-sm text-gray-500 mb-1">Notes: {adjustment.notes}</p>
                      )}
                      <p className="text-xs text-gray-400">
                        By {adjustment.created_by_name} • {new Date(adjustment.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Adjustments List */
          <div className="h-full bg-white overflow-y-auto">
            {filteredAdjustments.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No adjustments found</h3>
                  <p className="text-gray-500 mb-4">Start by creating your first inventory adjustment</p>
                  <RoleGuard roles={['manager', 'admin']}>
                    <button
                      onClick={() => setShowForm(true)}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Adjustment
                    </button>
                  </RoleGuard>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="space-y-4">
                  {filteredAdjustments.map(adjustment => (
                    <div key={adjustment.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-gray-900">{adjustment.product_name}</h3>
                          <p className="text-sm text-gray-600">SKU: {adjustment.product_sku}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            adjustment.delta_qty > 0 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {adjustment.delta_qty > 0 ? '+' : ''}{adjustment.delta_qty}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {adjustment.current_quantity !== undefined && 
                              `New Qty: ${adjustment.current_quantity + adjustment.delta_qty}`
                            }
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Reason:</span>
                          <span className="ml-2 font-medium">{adjustment.reason}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">By:</span>
                          <span className="ml-2 font-medium">{adjustment.created_by_name}</span>
                        </div>
                      </div>
                      
                      {adjustment.notes && (
                        <div className="mt-2 text-sm">
                          <span className="text-gray-500">Notes:</span>
                          <span className="ml-2">{adjustment.notes}</span>
                        </div>
                      )}
                      
                      <div className="mt-2 text-xs text-gray-400">
                        {new Date(adjustment.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default InventoryAdjustment;
