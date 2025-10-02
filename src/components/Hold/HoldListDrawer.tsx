/**
 * Hold List Drawer
 * Drawer component for listing, searching, and managing holds
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Package, 
  Printer, 
  Edit, 
  Trash2, 
  RefreshCw,
  AlertTriangle,
  Eye,
  Download
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/utils/cn';
import { holdService, HoldSale, HoldFilters } from '@/services/holdService';
import { holdSlipAdapter } from '@/services/print/HoldSlipAdapter';

interface HoldListDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onResume: (hold: HoldSale) => void;
  terminal: string;
  currentUserId: number;
}

const HoldListDrawer: React.FC<HoldListDrawerProps> = ({
  isOpen,
  onClose,
  onResume,
  terminal,
  currentUserId
}) => {
  const [holds, setHolds] = useState<HoldSale[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHold, setSelectedHold] = useState<HoldSale | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState<HoldFilters>({
    terminal: terminal,
    status: 'HELD'
  });

  // Load holds
  const loadHolds = useCallback(async () => {
    setLoading(true);
    try {
      // Auto-purge expired holds if enabled
      const settings = holdService.getHoldSettings();
      if (settings.purgeOnOpen) {
        await holdService.purgeExpired();
      }

      const searchFilters = {
        ...filters,
        search: searchTerm.trim() || undefined
      };

      const holdsList = await holdService.listHolds(searchFilters);
      setHolds(holdsList);
    } catch (error) {
      console.error('Failed to load holds:', error);
      toast.error('Failed to load holds');
    } finally {
      setLoading(false);
    }
  }, [filters, searchTerm]);

  // Load holds when drawer opens or filters change
  useEffect(() => {
    if (isOpen) {
      loadHolds();
    }
  }, [isOpen, loadHolds]);

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  // Handle hold selection
  const handleSelectHold = useCallback((hold: HoldSale) => {
    setSelectedHold(selectedHold?.id === hold.id ? null : hold);
  }, [selectedHold]);

  // Handle hold resume
  const handleResumeHold = useCallback((hold: HoldSale) => {
    onResume(hold);
    onClose();
  }, [onResume, onClose]);

  // Handle hold deletion
  const handleDeleteHold = useCallback(async (holdId: number, holdName: string) => {
    if (!confirm(`Delete hold "${holdName}"?`)) {
      return;
    }

    try {
      await holdService.deleteHold(holdId);
      toast.success('Hold deleted');
      loadHolds();
    } catch (error) {
      console.error('Failed to delete hold:', error);
      toast.error('Failed to delete hold');
    }
  }, [loadHolds]);

  // Handle hold renaming
  const handleRenameHold = useCallback(async (holdId: number, currentName: string) => {
    const newName = prompt('Enter new hold name:', currentName);
    if (!newName || newName.trim() === currentName) {
      return;
    }

    try {
      await holdService.updateHold(holdId, { hold_name: newName.trim() });
      toast.success('Hold renamed');
      loadHolds();
    } catch (error) {
      console.error('Failed to rename hold:', error);
      toast.error('Failed to rename hold');
    }
  }, [loadHolds]);

  // Handle expiry extension
  const handleExtendExpiry = useCallback(async (holdId: number, currentExpiry?: string) => {
    const settings = holdService.getHoldSettings();
    const defaultMinutes = settings.expiryMinutes || 120;
    
    const minutesStr = prompt(
      `Extend expiry by how many minutes?`,
      defaultMinutes.toString()
    );
    
    if (!minutesStr) return;
    
    const minutes = parseInt(minutesStr);
    if (isNaN(minutes) || minutes <= 0) {
      toast.error('Invalid minutes');
      return;
    }

    try {
      const newExpiry = new Date();
      newExpiry.setMinutes(newExpiry.getMinutes() + minutes);
      
      await holdService.updateHold(holdId, { 
        expires_at: newExpiry.toISOString() 
      });
      
      toast.success(`Expiry extended by ${minutes} minutes`);
      loadHolds();
    } catch (error) {
      console.error('Failed to extend expiry:', error);
      toast.error('Failed to extend expiry');
    }
  }, [loadHolds]);

  // Handle print slip
  const handlePrintSlip = useCallback(async (hold: HoldSale) => {
    try {
      await holdSlipAdapter.printHoldSlip({
        hold,
        store_info: {
          name: 'POS Store', // Would come from settings
          address: 'Store Address'
        }
      });
      toast.success('Hold slip printed');
    } catch (error) {
      console.error('Failed to print hold slip:', error);
      toast.error('Failed to print hold slip');
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }

      if (event.key === '/' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        const searchInput = document.getElementById('hold-search-input');
        (searchInput as HTMLInputElement)?.focus();
      }

      if (event.key === 'Enter' && selectedHold) {
        event.preventDefault();
        handleResumeHold(selectedHold);
      }

      if (event.key === 'Delete' && selectedHold) {
        event.preventDefault();
        handleDeleteHold(selectedHold.id, selectedHold.hold_name);
      }

      if (event.ctrlKey && event.key.toLowerCase() === 'p' && selectedHold) {
        event.preventDefault();
        handlePrintSlip(selectedHold);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedHold, onClose, handleResumeHold, handleDeleteHold, handlePrintSlip]);

  if (!isOpen) return null;

  const filteredHolds = holds;
  const expiredCount = holds.filter(h => h.status === 'EXPIRED').length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-50">
      <div className="bg-white dark:bg-gray-800 h-full w-full max-w-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Held Sales ({filteredHolds.length})
              </h3>
              {expiredCount > 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  {expiredCount} expired hold{expiredCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                showFilters 
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              )}
              title="Toggle Filters"
            >
              <Filter className="h-4 w-4" />
            </button>
            
            <button
              onClick={loadHolds}
              disabled={loading}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
              title="Refresh"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              id="hold-search-input"
              type="text"
              placeholder="Search by name, customer, or cashier... (Press / to focus)"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Terminal
                </label>
                <select
                  value={filters.terminal || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, terminal: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">All Terminals</option>
                  <option value={terminal}>This Terminal</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={filters.status || 'ALL'}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                >
                  <option value="ALL">All</option>
                  <option value="HELD">Active</option>
                  <option value="EXPIRED">Expired</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Hold List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading holds...</span>
            </div>
          ) : filteredHolds.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
              <Package className="h-8 w-8 mb-2" />
              <p>No holds found</p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-600">
              {filteredHolds.map((hold) => (
                <div
                  key={hold.id}
                  onClick={() => handleSelectHold(hold)}
                  className={cn(
                    "p-4 cursor-pointer transition-colors",
                    selectedHold?.id === hold.id 
                      ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700",
                    hold.status === 'EXPIRED' && "opacity-75"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate">
                          {hold.hold_name}
                        </h4>
                        {hold.status === 'EXPIRED' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            EXPIRED
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(hold.created_at).toLocaleString()}
                        </div>
                        
                        {hold.customer_name && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {hold.customer_name}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {hold.items_count} item{hold.items_count !== 1 ? 's' : ''}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {holdService.formatCurrency(hold.net)}
                        </span>
                        
                        {hold.expires_at && (
                          <span className={cn(
                            "text-xs px-2 py-1 rounded-full",
                            hold.status === 'EXPIRED'
                              ? "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                              : "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                          )}>
                            {hold.status === 'EXPIRED' 
                              ? 'Expired'
                              : holdService.getTimeUntilExpiry(hold.expires_at)
                            }
                          </span>
                        )}
                      </div>
                      
                      {hold.hold_note && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                          {hold.hold_note}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions for selected hold */}
                  {selectedHold?.id === hold.id && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResumeHold(hold);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                        >
                          <Eye className="h-3 w-3" />
                          Resume (Enter)
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRenameHold(hold.id, hold.hold_name);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
                        >
                          <Edit className="h-3 w-3" />
                          Rename
                        </button>
                        
                        {hold.expires_at && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExtendExpiry(hold.id, hold.expires_at);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm transition-colors"
                          >
                            <Clock className="h-3 w-3" />
                            Extend
                          </button>
                        )}
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintSlip(hold);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                        >
                          <Printer className="h-3 w-3" />
                          Print (Ctrl+P)
                        </button>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteHold(hold.id, hold.hold_name);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete (Del)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <span>{filteredHolds.length} hold{filteredHolds.length !== 1 ? 's' : ''}</span>
              {selectedHold && (
                <span className="text-blue-600 dark:text-blue-400">
                  {selectedHold.hold_name} selected
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-xs">
              <span><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">/</kbd> Search</span>
              <span><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">Enter</kbd> Resume</span>
              <span><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">Del</kbd> Delete</span>
              <span><kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">Esc</kbd> Close</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HoldListDrawer;


