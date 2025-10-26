import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { 
  Plus, Search, Download, RefreshCw, Edit3, Eye, EyeOff, 
  MoreVertical, Filter, X, 
  ChevronUp, ChevronDown, SortAsc, SortDesc, User, Phone, Mail
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { dataService, Customer } from '@/services/dataService';
import { csvService } from '@/services/csvService';
import { useAuth, PermissionGuard } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';
import { AddCustomerModal } from '@/components/Customers/AddCustomerModal';

interface FilterState {
  search: string;
  customer_type: string;
  active_filter: 'all' | 'active' | 'inactive';
  sort_by: 'customer_name' | 'created_at' | 'customer_type';
  sort_order: 'asc' | 'desc';
}

interface StatsCounts {
  total: number;
  active: number;
  inactive: number;
  retail: number;
  wholesale: number;
  credit: number;
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function Customers() {
  const { t: _t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canAccess: _canAccess } = useAuth();
  
  // State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsCounts>({ 
    total: 0, active: 0, inactive: 0, retail: 0, wholesale: 0, credit: 0 
  });
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: parseInt(searchParams.get('page') || '1'),
    pageSize: parseInt(searchParams.get('pageSize') || '20'),
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  
  // Filters
  const [filters, setFilters] = useState<FilterState>({
    search: searchParams.get('search') || '',
    customer_type: searchParams.get('customer_type') || '',
    active_filter: (searchParams.get('status') as 'all' | 'active' | 'inactive') || 'all',
    sort_by: (searchParams.get('sortBy') as any) || 'customer_name',
    sort_order: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc'
  });

  // UI State
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const tableRef = useRef<HTMLDivElement>(null);

  // Update URL parameters
  const updateURL = useCallback((updates: Partial<FilterState & { page: number; pageSize: number }>) => {
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

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await dataService.getCustomers({
        search: filters.search,
        customer_type: filters.customer_type,
        active_filter: filters.active_filter,
        sortBy: filters.sort_by,
        sortOrder: filters.sort_order,
        page: pagination.page,
        pageSize: pagination.pageSize
      });

      const customersData = Array.isArray(result) ? result : [];
      // const meta = {}; // No meta data available from direct array response

      setCustomers(customersData);

      // Update pagination
      setPagination(prev => ({
        ...prev,
        total: customersData.length,
        totalPages: 1, // No pagination info available
        hasNextPage: false,
        hasPrevPage: false
      }));

      // Calculate stats
      const stats: StatsCounts = {
        total: customersData.length,
        active: customersData.filter((c: Customer) => c.active).length,
        inactive: customersData.filter((c: Customer) => !c.active).length,
        retail: customersData.filter((c: Customer) => c.customer_type === 'Retail').length,
        wholesale: customersData.filter((c: Customer) => c.customer_type === 'Wholesale').length,
        credit: customersData.filter((c: Customer) => c.customer_type === 'Credit').length
      };
      setStats(stats);
    } catch (error) {
      console.error('Failed to load customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.pageSize]);

  // Effects
  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-customer-dropdown]')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      loadData();
    }, 300);
  }, [filters.search, loadData]);

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
    setFilters(prev => ({ ...prev, search: value }));
    updateURL({ search: value, page: 1 });
  };

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    updateURL({ [key]: value, page: 1 });
  };

  const handleSortChange = (sortBy: FilterState['sort_by']) => {
    const newSortOrder = filters.sort_by === sortBy && filters.sort_order === 'asc' ? 'desc' : 'asc';
    setFilters(prev => ({ ...prev, sort_by: sortBy, sort_order: newSortOrder }));
    updateURL({ sort_by: sortBy, sort_order: newSortOrder, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    updateURL({ page: newPage });
    tableRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPagination(prev => ({ ...prev, pageSize: newPageSize, page: 1 }));
    updateURL({ pageSize: newPageSize, page: 1 });
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      customer_type: '',
      active_filter: 'all',
      sort_by: 'customer_name',
      sort_order: 'asc'
    });
    updateURL({ 
      search: '', 
      customer_type: '', 
      active_filter: 'all',
      sort_by: 'customer_name',
      sort_order: 'asc',
      page: 1 
    });
  };

  const handleToggleActive = async (customer: Customer) => {
    try {
      await dataService.updateCustomer(customer.id, { active: !customer.active });
      toast.success(`Customer ${!customer.active ? 'activated' : 'deactivated'} successfully`);
      loadData();
    } catch (error) {
      console.error('Failed to toggle customer status:', error);
      toast.error('Failed to update customer status');
    }
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    const confirmMessage = `Are you sure you want to deactivate "${customer.customer_name}"?`;
    if (!window.confirm(confirmMessage)) return;

    try {
      await dataService.deleteCustomer(customer.id);
      toast.success('Customer deactivated successfully');
      loadData();
    } catch (error) {
      console.error('Failed to delete customer:', error);
      toast.error('Failed to delete customer');
    }
  };

  const handleExportCSV = async () => {
    try {
      const exportData = customers.map(customer => ({
        customer_name: customer.customer_name,
        customer_phone: customer.customer_phone || '',
        customer_email: customer.customer_email || '',
        address: customer.address || '',
        city: customer.city || '',
        customer_type: customer.customer_type,
        credit_limit: customer.credit_limit || 0,
        active: customer.active
      }));

      await csvService.exportData(exportData, 'customers.csv');
      toast.success('Customers exported successfully');
    } catch (error) {
      console.error('Failed to export customers:', error);
      toast.error('Failed to export customers');
    }
  };

  const handleOpenAddModal = () => {
    setSelectedCustomer(null);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowEditModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setSelectedCustomer(null);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedCustomer(null);
  };

  const handleCustomerSaved = () => {
    loadData();
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedCustomer(null);
  };

  const getSortIcon = (field: string) => {
    if (filters.sort_by !== field) return null;
    return filters.sort_order === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />;
  };

  const getCustomerTypeColor = (type: string) => {
    switch (type) {
      case 'Retail': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Wholesale': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Credit': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Other': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage customer information and relationships
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <PermissionGuard permission="customers.create">
              <Button
                onClick={handleOpenAddModal}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Customer
              </Button>
            </PermissionGuard>
            
            <Button
              onClick={handleExportCSV}
              variant="outline"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            
            <Button
              onClick={loadData}
              variant="outline"
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="flex items-center space-x-4">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Total: {stats.total}
          </Badge>
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Active: {stats.active}
          </Badge>
          <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            Inactive: {stats.inactive}
          </Badge>
          <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
            Retail: {stats.retail}
          </Badge>
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            Credit: {stats.credit}
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
              <Button
                onClick={handleClearFilters}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <X className="w-4 h-4" />
                Clear
              </Button>
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
                  placeholder="Search customers..."
                  value={filters.search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Customer Type Filter */}
              <select
                value={filters.customer_type}
                onChange={(e) => handleFilterChange('customer_type', e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
              >
                <option value="">All Types</option>
                <option value="Retail">Retail</option>
                <option value="Wholesale">Wholesale</option>
                <option value="Credit">Credit</option>
                <option value="Other">Other</option>
              </select>

              {/* Active Filter */}
              <select
                value={filters.active_filter}
                onChange={(e) => handleFilterChange('active_filter', e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            <Separator />

            {/* Sort Options */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</span>
              <div className="flex items-center gap-2">
                {[
                  { key: 'customer_name', label: 'Name' },
                  { key: 'customer_type', label: 'Type' },
                  { key: 'created_at', label: 'Created Date' }
                ].map(({ key, label }) => (
                  <Button
                    key={key}
                    onClick={() => handleSortChange(key as FilterState['sort_by'])}
                    variant={filters.sort_by === key ? 'default' : 'outline'}
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

      {/* Customers Table */}
      <div className="flex-1 overflow-hidden px-6 pb-6">
        <Card>
          <div ref={tableRef} className="overflow-auto max-h-[calc(100vh-400px)]">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => handleSortChange('customer_name')}
                      className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <span>Name</span>
                      {getSortIcon('customer_name')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button
                      onClick={() => handleSortChange('customer_type')}
                      className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <span>Type</span>
                      {getSortIcon('customer_type')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Credit Limit
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
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading customers...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      No customers found matching your filters.
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          {customer.customer_name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        <div className="space-y-1">
                          {customer.customer_phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-gray-400" />
                              <span>{customer.customer_phone}</span>
                            </div>
                          )}
                          {customer.customer_email && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-gray-400" />
                              <span>{customer.customer_email}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        <Badge className={getCustomerTypeColor(customer.customer_type)}>
                          {customer.customer_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {customer.credit_limit ? `රු ${customer.credit_limit.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={customer.active ? 'default' : 'secondary'}
                            className={customer.active 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }
                          >
                            {customer.active ? 'Active' : 'Inactive'}
                          </Badge>
                          <PermissionGuard permission="customers.update">
                            <Button
                              onClick={() => handleToggleActive(customer)}
                              size="sm"
                              variant="outline"
                              className="h-6 w-6 p-0"
                            >
                              {customer.active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </Button>
                          </PermissionGuard>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {new Date(customer.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center space-x-2">
                          <PermissionGuard permission="customers.update">
                            <Button
                              onClick={() => handleOpenEditModal(customer)}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                          </PermissionGuard>
                          
                          <div className="relative" data-customer-dropdown>
                            <Button
                              onClick={() => setOpenDropdown(openDropdown === customer.id ? null : customer.id)}
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                            
                            {openDropdown === customer.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
                                <div className="py-1">
                                  <PermissionGuard permission="customers.update">
                                    <button
                                      onClick={() => {
                                        setOpenDropdown(null);
                                        handleDeleteCustomer(customer);
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                      <EyeOff className="w-4 h-4 mr-2" />
                                      Deactivate Customer
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

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={showAddModal}
        onClose={handleCloseAddModal}
        onSave={handleCustomerSaved}
      />

      {/* Edit Customer Modal */}
      <AddCustomerModal
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        onSave={handleCustomerSaved}
        customer={selectedCustomer}
      />
    </div>
  );
}

export default Customers;