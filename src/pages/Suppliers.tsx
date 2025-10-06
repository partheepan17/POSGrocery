import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Download, Upload, RefreshCw, Edit3, Eye, EyeOff, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { dataService, Supplier } from '@/services/dataService';
import { csvService } from '@/services/csvService';
import { SupplierModal } from '@/components/Suppliers/SupplierModal';
import { SupplierCSVModal } from '@/components/Suppliers/SupplierCSVModal';

interface FilterState {
  search: string;
  status_filter: 'all' | 'active' | 'inactive';
}

interface StatsCounts {
  total: number;
  active: number;
  inactive: number;
}

interface SupplierWithProductCount extends Supplier {
  product_count?: number;
}

export function Suppliers() {
  const [suppliers, setSuppliers] = useState<SupplierWithProductCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsCounts>({ total: 0, active: 0, inactive: 0 });
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status_filter: 'all'
  });

  // Modals
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

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

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get suppliers with filters
      const suppliersData = await dataService.getSuppliersWithFilters({
        search: filters.search,
        active: filters.status_filter === 'all' ? undefined : filters.status_filter === 'active'
      });

      // Get product counts for each supplier
      const suppliersWithCounts = await Promise.all(
        suppliersData.map(async (supplier) => ({
          ...supplier,
          product_count: await dataService.getProductCountBySupplier(supplier.id)
        }))
      );

      setSuppliers(suppliersWithCounts);

      // Calculate stats from all suppliers (not filtered)
      const allSuppliers = await dataService.getSuppliers(false);
      const stats: StatsCounts = {
        total: allSuppliers.length,
        active: allSuppliers.filter(s => s.active).length,
        inactive: allSuppliers.filter(s => !s.active).length
      };
      setStats(stats);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExportCSV = async () => {
    try {
      const csvContent = await csvService.exportSuppliers();
      csvService.downloadCSV(csvContent, 'suppliers.csv');
      toast.success('Suppliers exported successfully');
    } catch (error) {
      console.error('Failed to export suppliers:', error);
      toast.error('Failed to export suppliers');
    }
  };

  const handleSupplierSaved = () => {
    loadData();
    setShowSupplierModal(false);
    setEditingSupplier(null);
  };

  const handleImportComplete = () => {
    loadData();
    setShowImportModal(false);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowSupplierModal(true);
  };

  const handleToggleActive = async (supplier: Supplier) => {
    try {
      await dataService.updateSupplier(supplier.id, { active: !supplier.active });
      toast.success(`Supplier ${supplier.active ? 'deactivated' : 'activated'} successfully`);
      loadData();
    } catch (error) {
      console.error('Failed to toggle supplier status:', error);
      toast.error('Failed to update supplier status');
    }
  };

  const handleDeleteSupplier = async (supplier: Supplier) => {
    const hasProducts = suppliers.find(s => s.id === supplier.id)?.product_count || 0;
    
    let confirmMessage = `Are you sure you want to delete "${supplier.supplier_name}"?`;
    if (hasProducts > 0) {
      confirmMessage += `\n\nThis supplier has ${hasProducts} linked product(s). The products will lose their supplier reference.`;
    }
    confirmMessage += '\n\nThis action cannot be undone.';

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      await dataService.deleteSupplier(supplier.id);
      toast.success('Supplier deleted successfully');
      loadData();
    } catch (error) {
      console.error('Failed to delete supplier:', error);
      toast.error('Failed to delete supplier');
    }
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-GB');
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage suppliers and their contact information
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowSupplierModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Supplier
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
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            Total: {stats.total}
          </span>
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            Active: {stats.active}
          </span>
          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
            Inactive: {stats.inactive}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by name, tax ID, phone, or email... (/)"
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white placeholder-gray-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filters.status_filter}
            onChange={(e) => handleFilterChange('status_filter', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Suppliers Table */}
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
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tax ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #Products
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading suppliers...
                    </td>
                  </tr>
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      No suppliers found matching your filters.
                    </td>
                  </tr>
                ) : (
                  suppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {supplier.supplier_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {supplier.contact_phone || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {supplier.contact_email || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {supplier.tax_id || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="max-w-xs truncate" title={supplier.address}>
                          {supplier.address || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          supplier.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {supplier.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {supplier.product_count || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditSupplier(supplier)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(supplier)}
                            className={`${supplier.active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                            title={supplier.active ? 'Deactivate' : 'Activate'}
                          >
                            {supplier.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDeleteSupplier(supplier)}
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
      {showSupplierModal && (
        <SupplierModal
          supplier={editingSupplier}
          onClose={() => {
            setShowSupplierModal(false);
            setEditingSupplier(null);
          }}
          onSave={handleSupplierSaved}
        />
      )}

      {showImportModal && (
        <SupplierCSVModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImportComplete}
        />
      )}
    </div>
  );
}