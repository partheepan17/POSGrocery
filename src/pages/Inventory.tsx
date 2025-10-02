import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, 
  Plus, 
  Minus, 
  Download, 
  Upload, 
  RefreshCw, 
  Search, 
  Filter, 
  AlertTriangle,
  Clock,
  FileText,
  Scale
} from 'lucide-react';
import { inventoryService, StockRow, StockFilters, MovementLogRow, MovementLogFilters } from '@/services/inventoryService';
import { csvService } from '@/services/csvService';
import { useAppStore } from '@/store/appStore';
import { ReceiveModal } from '@/components/Inventory/ReceiveModal';
import { AdjustModal } from '@/components/Inventory/AdjustModal';
import { StocktakeImportModal } from '@/components/Inventory/StocktakeImportModal';

type TabId = 'stock' | 'receive' | 'adjust' | 'stocktake' | 'logs';

export function Inventory() {
  const { settings } = useAppStore();
  
  // UI states
  const [activeTab, setActiveTab] = useState<TabId>('stock');
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  
  // Modal states
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showStocktakeModal, setShowStocktakeModal] = useState(false);
  
  // Data states
  const [stockRows, setStockRows] = useState<StockRow[]>([]);
  const [movementLogs, setMovementLogs] = useState<MovementLogRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  
  // Filter states
  const [stockFilters, setStockFilters] = useState<StockFilters>({
    active: true,
    limit: 100
  });
  
  const [logFilters, setLogFilters] = useState<MovementLogFilters>({
    fromDate: new Date(new Date().setDate(new Date().getDate() - 7)), // Last 7 days
    toDate: new Date(),
    limit: 100
  });
  
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Debounced filter changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      if (activeTab === 'stock') {
        loadStockData();
      } else if (activeTab === 'logs') {
        loadMovementLogs();
      }
    }, 250);
  }, [stockFilters, logFilters, activeTab]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.key) {
        case '/':
          e.preventDefault();
          searchRef.current?.focus();
          break;
        case 'r':
        case 'R':
          if (!e.ctrlKey && !e.altKey) {
            e.preventDefault();
            setShowReceiveModal(true);
          }
          break;
        case 'a':
        case 'A':
          if (!e.ctrlKey && !e.altKey) {
            e.preventDefault();
            setShowAdjustModal(true);
          }
          break;
      }
      
      // Tab switching with Alt+1-5
      if (e.altKey && e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        const tabs: TabId[] = ['stock', 'receive', 'adjust', 'stocktake', 'logs'];
        const tabIndex = parseInt(e.key) - 1;
        if (tabs[tabIndex]) {
          setActiveTab(tabs[tabIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadInitialData = async () => {
    try {
      const [categoriesData, suppliersData] = await Promise.all([
        inventoryService.getCategories(),
        inventoryService.getSuppliers()
      ]);
      
      setCategories(categoriesData);
      setSuppliers(suppliersData);
      
      // Load initial stock data
      await loadStockData();
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  const loadStockData = async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getStockRows(stockFilters);
      setStockRows(data);
    } catch (error) {
      console.error('Failed to load stock data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMovementLogs = async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getMovementLogs(logFilters);
      setMovementLogs(data);
    } catch (error) {
      console.error('Failed to load movement logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (activeTab === 'stock') {
      loadStockData();
    } else if (activeTab === 'logs') {
      loadMovementLogs();
    }
  };

  const handleExportStock = () => {
    csvService.exportStockCSV(stockRows, stockFilters);
  };

  const handleExportStocktakeTemplate = () => {
    csvService.exportStocktakeTemplateCSV(stockRows);
  };

  const handleExportLogs = () => {
    csvService.exportInventoryLogsCSV(movementLogs, logFilters);
  };

  const formatQuantity = (qty: number, unit: 'pc' | 'kg'): string => {
    if (unit === 'pc') {
      return Math.floor(qty).toString();
    } else {
      const decimals = settings?.languageFormatting?.kgDecimals || 3;
      return qty.toFixed(decimals);
    }
  };

  const getActiveFiltersCount = (): number => {
    let count = 0;
    if (activeTab === 'stock') {
      if (stockFilters.search) count++;
      if (stockFilters.category) count++;
      if (stockFilters.supplier) count++;
      if (stockFilters.lowStockOnly) count++;
      if (stockFilters.unit) count++;
    } else if (activeTab === 'logs') {
      if (logFilters.type) count++;
      if (logFilters.sku) count++;
      if (logFilters.reason) count++;
    }
    return count;
  };

  const renderStockTab = () => (
    <div className="flex-1 flex flex-col">
      {/* Stock Filters */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                ref={searchRef}
                type="text"
                placeholder="SKU, Barcode, or Name..."
                value={stockFilters.search || ''}
                onChange={(e) => setStockFilters(prev => ({ ...prev, search: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={stockFilters.category || ''}
                onChange={(e) => setStockFilters(prev => ({ ...prev, category: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <select
                value={stockFilters.supplier || ''}
                onChange={(e) => setStockFilters(prev => ({ ...prev, supplier: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Suppliers</option>
                {suppliers.map(supplier => (
                  <option key={supplier} value={supplier}>{supplier}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                value={stockFilters.unit || ''}
                onChange={(e) => setStockFilters(prev => ({ ...prev, unit: e.target.value as 'pc' | 'kg' || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Units</option>
                <option value="pc">Pieces</option>
                <option value="kg">Kilograms</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={stockFilters.lowStockOnly || false}
                onChange={(e) => setStockFilters(prev => ({ ...prev, lowStockOnly: e.target.checked || undefined }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Low stock only</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={stockFilters.active !== false}
                onChange={(e) => setStockFilters(prev => ({ ...prev, active: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Active products only</span>
            </label>
          </div>
        </div>
      )}
      
      {/* Stock Table */}
      <div className="flex-1 overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reorder Level</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {stockRows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {row.sku}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center space-x-2">
                    <span>{row.name_en}</span>
                    {row.is_scale_item && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                        <Scale className="w-3 h-3 mr-1" />
                        Scale
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {row.unit}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatQuantity(row.current_stock, row.unit)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {row.reorder_level ? formatQuantity(row.reorder_level, row.unit) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {row.preferred_supplier || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center space-x-2">
                    {row.is_low_stock && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Low Stock
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {row.updated_at.toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {stockRows.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Package className="w-12 h-12 mb-4" />
            <h3 className="text-lg font-medium mb-2">No products found</h3>
            <p className="text-sm">Try adjusting your filters or add some products</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderLogsTab = () => (
    <div className="flex-1 flex flex-col">
      {/* Log Filters */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={logFilters.fromDate?.toISOString().split('T')[0] || ''}
                onChange={(e) => setLogFilters(prev => ({ 
                  ...prev, 
                  fromDate: e.target.value ? new Date(e.target.value) : undefined 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={logFilters.toDate?.toISOString().split('T')[0] || ''}
                onChange={(e) => setLogFilters(prev => ({ 
                  ...prev, 
                  toDate: e.target.value ? new Date(e.target.value) : undefined 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={logFilters.type || ''}
                onChange={(e) => setLogFilters(prev => ({ 
                  ...prev, 
                  type: e.target.value as 'RECEIVE' | 'ADJUST' | 'WASTE' || undefined 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="RECEIVE">Receive</option>
                <option value="ADJUST">Adjust</option>
                <option value="WASTE">Waste</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input
                type="text"
                placeholder="Filter by SKU..."
                value={logFilters.sku || ''}
                onChange={(e) => setLogFilters(prev => ({ ...prev, sku: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Logs Table */}
      <div className="flex-1 overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DateTime</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User/Terminal</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {movementLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {log.datetime.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    log.type === 'RECEIVE' ? 'bg-green-100 text-green-800' :
                    log.type === 'ADJUST' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {log.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {log.sku}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {log.name_en}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className={log.qty < 0 ? 'text-red-600' : 'text-green-600'}>
                    {log.qty > 0 ? '+' : ''}{log.qty}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {log.reason || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {log.note || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {log.cashier || log.terminal || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {movementLogs.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Clock className="w-12 h-12 mb-4" />
            <h3 className="text-lg font-medium mb-2">No movement logs found</h3>
            <p className="text-sm">Try adjusting your date range or filters</p>
          </div>
        )}
      </div>
    </div>
  );

  const tabs = [
    { id: 'stock' as TabId, label: 'Stock', icon: Package, shortcut: '1' },
    { id: 'receive' as TabId, label: 'Receive', icon: Plus, shortcut: '2' },
    { id: 'adjust' as TabId, label: 'Adjust', icon: Minus, shortcut: '3' },
    { id: 'stocktake' as TabId, label: 'Stocktake', icon: FileText, shortcut: '4' },
    { id: 'logs' as TabId, label: 'Logs', icon: Clock, shortcut: '5' },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
            <p className="text-sm text-gray-600 mt-1">
              Stock management, receiving, adjustments, and stocktake
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center px-4 py-2 border rounded-lg transition-all duration-200 shadow-sm ${
                showFilters 
                  ? 'border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100' 
                  : 'border-gray-300 hover:bg-gray-50 hover:border-gray-400'
              }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {getActiveFiltersCount() > 0 && (
                <span className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                  {getActiveFiltersCount()}
                </span>
              )}
            </button>
            
            {activeTab === 'stock' && (
              <>
                <button
                  onClick={() => setShowReceiveModal(true)}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-sm"
                  title="Receive inventory (R)"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Receive
                </button>
                <button
                  onClick={() => setShowAdjustModal(true)}
                  className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 shadow-sm"
                  title="Adjust/Waste inventory (A)"
                >
                  <Minus className="w-4 h-4 mr-2" />
                  Adjust
                </button>
                <button
                  onClick={handleExportStock}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </button>
              </>
            )}
            
            {activeTab === 'stocktake' && (
              <>
                <button
                  onClick={handleExportStocktakeTemplate}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Template
                </button>
                <button
                  onClick={() => setShowStocktakeModal(true)}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-sm"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import Counts
                </button>
              </>
            )}
            
            {activeTab === 'logs' && (
              <button
                onClick={handleExportLogs}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
            )}
            
            <button
              onClick={handleRefresh}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-5 h-5 mr-2" />
              {tab.label}
              <span className="ml-2 text-xs text-gray-400">(Alt+{tab.shortcut})</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'stock' && renderStockTab()}
      {activeTab === 'logs' && renderLogsTab()}
      {activeTab === 'receive' && (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <Plus className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">Receive Inventory</h3>
            <p className="text-sm mb-4">Click "Receive" button or press "R" to add inventory</p>
          </div>
        </div>
      )}
      {activeTab === 'adjust' && (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <Minus className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">Adjust Inventory</h3>
            <p className="text-sm mb-4">Click "Adjust" button or press "A" to modify inventory</p>
          </div>
        </div>
      )}
      {activeTab === 'stocktake' && (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">Stocktake</h3>
            <p className="text-sm mb-4">Export template, count inventory, then import counts</p>
            <div className="space-x-4">
              <button
                onClick={handleExportStocktakeTemplate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Export Template
              </button>
              <button
                onClick={() => setShowStocktakeModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Import Counts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showReceiveModal && (
        <ReceiveModal
          onClose={() => setShowReceiveModal(false)}
          onSuccess={() => {
            setShowReceiveModal(false);
            loadStockData();
          }}
        />
      )}
      
      {showAdjustModal && (
        <AdjustModal
          onClose={() => setShowAdjustModal(false)}
          onSuccess={() => {
            setShowAdjustModal(false);
            loadStockData();
          }}
        />
      )}
      
      {showStocktakeModal && (
        <StocktakeImportModal
          onClose={() => setShowStocktakeModal(false)}
          onSuccess={() => {
            setShowStocktakeModal(false);
            loadStockData();
          }}
        />
      )}
    </div>
  );
}