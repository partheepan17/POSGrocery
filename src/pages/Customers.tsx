import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Download, Upload, RefreshCw, Edit3, Eye, EyeOff, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { dataService, Customer } from '@/services/dataService';
import { csvService } from '@/services/csvService';
import { CustomerModal } from '@/components/Customers/CustomerModal';
import { CustomerCSVModal } from '@/components/Customers/CustomerCSVModal';

interface FilterState {
  search: string;
  customer_type: 'all' | 'Retail' | 'Wholesale' | 'Credit' | 'Other';
  status_filter: 'all' | 'active' | 'inactive';
}

interface CustomerStats {
  total: number;
  retail: number;
  wholesale: number;
  credit: number;
  other: number;
  active: number;
  inactive: number;
}

interface CustomerWithSalesCount extends Customer {
  sales_count?: number;
}

export function Customers() {
  const [customers, setCustomers] = useState<CustomerWithSalesCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CustomerStats>({ 
    total: 0, retail: 0, wholesale: 0, credit: 0, other: 0, active: 0, inactive: 0 
  });
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    customer_type: 'all',
    status_filter: 'all'
  });

  // Modals
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

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
      
      // Get customers with filters
      const customersData = await dataService.getCustomersWithFilters({
        search: filters.search,
        customer_type: filters.customer_type === 'all' ? undefined : filters.customer_type,
        active: filters.status_filter === 'all' ? undefined : filters.status_filter === 'active'
      });

      // Get sales counts for each customer
      const customersWithCounts = await Promise.all(
        customersData.map(async (customer) => ({
          ...customer,
          sales_count: await dataService.getSalesCountByCustomer(customer.id)
        }))
      );

      setCustomers(customersWithCounts);

      // Get stats for all customers (not filtered)
      const statsData = await dataService.getCustomerStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load customers:', error);
      toast.error('Failed to load customers');
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
      const csvContent = await csvService.exportCustomers();
      csvService.downloadCSV(csvContent, 'customers.csv');
      toast.success('Customers exported successfully');
    } catch (error) {
      console.error('Failed to export customers:', error);
      toast.error('Failed to export customers');
    }
  };

  const handleCustomerSaved = () => {
    loadData();
    setShowCustomerModal(false);
    setEditingCustomer(null);
  };

  const handleImportComplete = () => {
    loadData();
    setShowImportModal(false);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowCustomerModal(true);
  };

  const handleToggleActive = async (customer: Customer) => {
    try {
      await dataService.updateCustomer(customer.id, { active: !customer.active });
      toast.success(`Customer ${customer.active ? 'deactivated' : 'activated'} successfully`);
      loadData();
    } catch (error) {
      console.error('Failed to toggle customer status:', error);
      toast.error('Failed to update customer status');
    }
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    const hasSales = customers.find(c => c.id === customer.id)?.sales_count || 0;
    
    let confirmMessage = `Are you sure you want to delete "${customer.customer_name}"?`;
    if (hasSales > 0) {
      confirmMessage += `\n\nThis customer has ${hasSales} linked sale(s). The sales will lose their customer reference.`;
    }
    confirmMessage += '\n\nThis action cannot be undone.';

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      await dataService.deleteCustomer(customer.id);
      toast.success('Customer deleted successfully');
      loadData();
    } catch (error) {
      console.error('Failed to delete customer:', error);
      toast.error('Failed to delete customer');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Retail':
        return 'bg-blue-100 text-blue-800';
      case 'Wholesale':
        return 'bg-green-100 text-green-800';
      case 'Credit':
        return 'bg-yellow-100 text-yellow-800';
      case 'Other':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage customers and their information
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCustomerModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Customer
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
          <div className="w-px h-4 bg-gray-300"></div>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            Retail: {stats.retail}
          </span>
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            Wholesale: {stats.wholesale}
          </span>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
            Credit: {stats.credit}
          </span>
          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
            Other: {stats.other}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by name or phone... (/)"
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white placeholder-gray-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filters.customer_type}
            onChange={(e) => handleFilterChange('customer_type', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
          >
            <option value="all">All Types</option>
            <option value="Retail">Retail</option>
            <option value="Wholesale">Wholesale</option>
            <option value="Credit">Credit</option>
            <option value="Other">Other</option>
          </select>

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

      {/* Customers Table */}
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
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Note
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #Sales
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading customers...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No customers found matching your filters.
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {customer.customer_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {customer.phone || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(customer.customer_type)}`}>
                          {customer.customer_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="max-w-xs truncate" title={customer.note}>
                          {customer.note || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          customer.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {customer.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {customer.sales_count || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditCustomer(customer)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(customer)}
                            className={`${customer.active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                            title={customer.active ? 'Deactivate' : 'Activate'}
                          >
                            {customer.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(customer)}
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
      {showCustomerModal && (
        <CustomerModal
          customer={editingCustomer}
          onClose={() => {
            setShowCustomerModal(false);
            setEditingCustomer(null);
          }}
          onSave={handleCustomerSaved}
        />
      )}

      {showImportModal && (
        <CustomerCSVModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImportComplete}
        />
      )}
    </div>
  );
}