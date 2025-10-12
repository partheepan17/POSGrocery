import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Download, Upload, RefreshCw, Edit3, Copy, Eye, EyeOff, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { dataService, DiscountRule, Product, Category } from '@/services/dataService';
import { csvService } from '@/services/csvService';
import { DiscountModal } from '@/components/Discounts/DiscountModal';
import { DiscountCSVModal } from '@/components/Discounts/DiscountCSVModal';

interface FilterState {
  search: string;
  type_filter: 'all' | 'PERCENT' | 'AMOUNT';
  applies_to_filter: 'all' | 'PRODUCT' | 'CATEGORY';
  status_filter: 'all' | 'active' | 'inactive';
  date_from: string;
  date_to: string;
}

interface StatsCounts {
  total: number;
  active: number;
  inactive: number;
  product_rules: number;
  category_rules: number;
}

export function Discounts() {
  const { t } = useTranslation();
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsCounts>({ total: 0, active: 0, inactive: 0, product_rules: 0, category_rules: 0 });
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    type_filter: 'all',
    applies_to_filter: 'all',
    status_filter: 'all',
    date_from: '',
    date_to: ''
  });

  // Modals
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingRule, setEditingRule] = useState<DiscountRule | null>(null);

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
      const [rulesData, productsData, categoriesData] = await Promise.all([
        dataService.getDiscountRules(false), // Get all rules (active and inactive)
        dataService.getProducts(),
        dataService.getCategories()
      ]);

      setDiscountRules(rulesData);
      setProducts(productsData);
      setCategories(categoriesData);

      // Calculate stats
      const stats: StatsCounts = {
        total: rulesData.length,
        active: rulesData.filter((r: DiscountRule) => r.active).length,
        inactive: rulesData.filter((r: DiscountRule) => !r.active).length,
        product_rules: rulesData.filter((r: DiscountRule) => r.applies_to === 'PRODUCT').length,
        category_rules: rulesData.filter((r: DiscountRule) => r.applies_to === 'CATEGORY').length
      };
      setStats(stats);
    } catch (error) {
      console.error('Failed to load discount rules:', error);
      toast.error('Failed to load discount rules');
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
      const exportData = discountRules.map(rule => {
        const target = rule.applies_to === 'PRODUCT' 
          ? products.find(p => p.id === rule.target_id)?.sku || `PRODUCT_${rule.target_id}`
          : categories.find(c => c.id === rule.target_id)?.name || `CATEGORY_${rule.target_id}`;

        return {
          name: rule.name,
          applies_to_type: rule.applies_to.toLowerCase(),
          applies_to_value: target,
          type: rule.type.toLowerCase(),
          value: rule.value,
          max_qty_or_weight: rule.max_qty_or_weight || '',
          active_from: rule.active_from ? new Date(rule.active_from).toISOString().split('T')[0] : '',
          active_to: rule.active_to ? new Date(rule.active_to).toISOString().split('T')[0] : '',
          priority: rule.priority,
          reason_required: rule.reason_required,
          active: rule.active
        };
      });

      await csvService.exportData(exportData, 'discount_rules.csv');
      toast.success('Discount rules exported successfully');
    } catch (error) {
      console.error('Failed to export discount rules:', error);
      toast.error('Failed to export discount rules');
    }
  };

  const handleRuleSaved = () => {
    loadData();
    setShowRuleModal(false);
    setEditingRule(null);
  };

  const handleImportComplete = () => {
    loadData();
    setShowImportModal(false);
  };

  const handleEditRule = (rule: DiscountRule) => {
    setEditingRule(rule);
    setShowRuleModal(true);
  };

  const handleDuplicateRule = (rule: DiscountRule) => {
    const duplicatedRule = {
      ...rule,
      id: 0, // Will be assigned by database
      name: `${rule.name} (Copy)`,
      active: false // Start as inactive
    };
    setEditingRule(duplicatedRule as DiscountRule);
    setShowRuleModal(true);
  };

  const handleToggleActive = async (rule: DiscountRule) => {
    try {
      await dataService.updateDiscountRule(rule.id, { active: !rule.active });
      toast.success(`Rule ${rule.active ? 'deactivated' : 'activated'} successfully`);
      loadData();
    } catch (error) {
      console.error('Failed to toggle rule status:', error);
      toast.error('Failed to update rule status');
    }
  };

  const handleDeleteRule = async (rule: DiscountRule) => {
    if (!confirm(`Are you sure you want to delete the rule "${rule.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await dataService.deleteDiscountRule(rule.id);
      toast.success('Rule deleted successfully');
      loadData();
    } catch (error) {
      console.error('Failed to delete rule:', error);
      toast.error('Failed to delete rule');
    }
  };

  const getTargetName = (rule: DiscountRule): string => {
    if (rule.applies_to === 'PRODUCT') {
      const product = products.find(p => p.id === rule.target_id);
      return product ? `${product.sku} - ${product.name_en}` : `Product ID: ${rule.target_id}`;
    } else {
      const category = categories.find(c => c.id === rule.target_id);
      return category ? category.name : `Category ID: ${rule.target_id}`;
    }
  };

  const formatValue = (rule: DiscountRule): string => {
    if (rule.type === 'PERCENT') {
      return `${rule.value}%`;
    } else {
      return `රු ${rule.value.toFixed(2)}`;
    }
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-GB');
  };

  const filteredRules = discountRules.filter(rule => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const targetName = getTargetName(rule).toLowerCase();
      if (!rule.name.toLowerCase().includes(searchLower) && !targetName.includes(searchLower)) {
        return false;
      }
    }

    // Type filter
    if (filters.type_filter !== 'all' && rule.type !== filters.type_filter) {
      return false;
    }

    // Applies to filter
    if (filters.applies_to_filter !== 'all' && rule.applies_to !== filters.applies_to_filter) {
      return false;
    }

    // Status filter
    if (filters.status_filter !== 'all') {
      if (filters.status_filter === 'active' && !rule.active) return false;
      if (filters.status_filter === 'inactive' && rule.active) return false;
    }

    // Date filters
    if (filters.date_from) {
      const ruleFrom = new Date(rule.active_from);
      const filterFrom = new Date(filters.date_from);
      if (ruleFrom < filterFrom) return false;
    }

    if (filters.date_to) {
      const ruleTo = new Date(rule.active_to);
      const filterTo = new Date(filters.date_to);
      if (ruleTo > filterTo) return false;
    }

    return true;
  });

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Discount Rules</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage discount rules that apply automatically during sales
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowRuleModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Rule
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
              Product Rules: {stats.product_rules}
            </span>
            <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
              Category Rules: {stats.category_rules}
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by name or target... (/)"
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white placeholder-gray-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filters.type_filter}
            onChange={(e) => handleFilterChange('type_filter', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
          >
            <option value="all">All Types</option>
            <option value="PERCENT">Percent</option>
            <option value="AMOUNT">Amount</option>
          </select>

          {/* Applies To Filter */}
          <select
            value={filters.applies_to_filter}
            onChange={(e) => handleFilterChange('applies_to_filter', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
          >
            <option value="all">All Targets</option>
            <option value="PRODUCT">Product</option>
            <option value="CATEGORY">Category</option>
          </select>

          {/* Status Filter */}
          <select
            value={filters.status_filter}
            onChange={(e) => handleFilterChange('status_filter', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Date From */}
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => handleFilterChange('date_from', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            placeholder="From Date"
          />

          {/* Date To */}
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => handleFilterChange('date_to', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            placeholder="To Date"
          />
        </div>
      </div>

      {/* Rules Table */}
      <div className="flex-1 overflow-auto">
        <div className="bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applies To
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Target
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Max Qty/Weight
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active From
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active To
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason Required
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-gray-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading discount rules...
                    </td>
                  </tr>
                ) : filteredRules.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-gray-500">
                      No discount rules found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {rule.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          rule.applies_to === 'PRODUCT' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {rule.applies_to}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {getTargetName(rule)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          rule.type === 'PERCENT' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {rule.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {formatValue(rule)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {rule.max_qty_or_weight ? rule.max_qty_or_weight : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDate(rule.active_from)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDate(rule.active_to)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {rule.priority}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          rule.reason_required 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {rule.reason_required ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          rule.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {rule.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditRule(rule)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDuplicateRule(rule)}
                            className="text-green-600 hover:text-green-900"
                            title="Duplicate"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(rule)}
                            className={`${rule.active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                            title={rule.active ? 'Deactivate' : 'Activate'}
                          >
                            {rule.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
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
      {showRuleModal && (
        <DiscountModal
          rule={editingRule}
          products={products}
          categories={categories}
          onClose={() => {
            setShowRuleModal(false);
            setEditingRule(null);
          }}
          onSave={handleRuleSaved}
        />
      )}

      {showImportModal && (
        <DiscountCSVModal
          products={products}
          categories={categories}
          onClose={() => setShowImportModal(false)}
          onImport={handleImportComplete}
        />
      )}
    </div>
  );
}
