/**
 * Returns Page
 * Handle refunds and returns with comprehensive workflow
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Printer,
  Download,
  RefreshCw,
  DollarSign,
  Package,
  Calendar,
  User,
  Filter,
  Eye,
  Trash2,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/utils/cn';
import { 
  refundService, 
  RefundableSale, 
  RefundableLine, 
  RefundInput, 
  RefundLineInput,
  RefundSummary,
  RefundFilters
} from '@/services/refundService';
import { csvService } from '@/services/csvService';
import { refundPrintAdapter } from '@/services/print/RefundPrintAdapter';
import { useAppStore } from '@/store/appStore';

type ViewMode = 'search' | 'refund' | 'history';

interface RefundState {
  viewMode: ViewMode;
  searchTerm: string;
  loading: boolean;
  
  // Current refund
  selectedSale: RefundableSale | null;
  returnableLines: RefundableLine[];
  refundLines: Map<number, { quantity: number; restock: boolean; reason: string }>;
  
  // Payment
  refundMethod: 'CASH' | 'CARD' | 'WALLET';
  managerPin: string;
  showManagerDialog: boolean;
  
  // History
  refunds: RefundSummary[];
  filters: RefundFilters;
  showFilters: boolean;
}

const Returns: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, currentSession, settings } = useAppStore();
  
  const [state, setState] = useState<RefundState>({
    viewMode: 'search',
    searchTerm: '',
    loading: false,
    selectedSale: null,
    returnableLines: [],
    refundLines: new Map(),
    refundMethod: 'CASH',
    managerPin: '',
    showManagerDialog: false,
    refunds: [],
    filters: {},
    showFilters: false
  });

  // Authentication check
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
  }, [currentUser, navigate]);

  // Load refund history
  const loadRefunds = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const refunds = await refundService.listRefunds(state.filters);
      setState(prev => ({ ...prev, refunds, loading: false }));
    } catch (error) {
      console.error('Failed to load refunds:', error);
      toast.error('Failed to load refund history');
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [state.filters]);

  // Search for sale
  const handleSearch = useCallback(async () => {
    if (!state.searchTerm.trim()) {
      toast.error('Please enter an invoice number or scan receipt');
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      const sale = await refundService.findSaleByNumberOrBarcode(state.searchTerm.trim());
      
      if (!sale) {
        toast.error('Sale not found or not eligible for refund');
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      // Check if refund is allowed
      const eligibility = await refundService.canRefundSale(sale.id);
      if (!eligibility.allowed) {
        toast.error(eligibility.reason || 'Refund not allowed');
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      // Get returnable lines
      const lines = await refundService.getReturnableLines(sale.id);
      
      if (lines.length === 0 || lines.every(l => l.quantity_returnable === 0)) {
        toast.error('No items available for return');
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      setState(prev => ({
        ...prev,
        selectedSale: sale,
        returnableLines: lines,
        viewMode: 'refund',
        loading: false,
        refundLines: new Map()
      }));

      toast.success(`Found sale ${sale.invoice_number} with ${lines.length} returnable items`);

    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Failed to search for sale');
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [state.searchTerm]);

  // Update refund line quantity
  const updateRefundLine = useCallback((lineId: number, updates: Partial<{ quantity: number; restock: boolean; reason: string }>) => {
    setState(prev => {
      const newRefundLines = new Map(prev.refundLines);
      const existing = newRefundLines.get(lineId) || { quantity: 0, restock: true, reason: '' };
      
      newRefundLines.set(lineId, { ...existing, ...updates });
      
      // Remove if quantity is 0
      if (updates.quantity === 0) {
        newRefundLines.delete(lineId);
      }
      
      return { ...prev, refundLines: newRefundLines };
    });
  }, []);

  // Calculate refund total
  const calculateRefundTotal = useCallback(() => {
    let total = 0;
    state.refundLines.forEach((refundLine, lineId) => {
      const returnableLine = state.returnableLines.find(rl => rl.id === lineId);
      if (returnableLine && refundLine.quantity > 0) {
        const lineTotal = returnableLine.unit_price * refundLine.quantity;
        const discountProportion = refundLine.quantity / returnableLine.quantity_sold;
        const lineDiscount = returnableLine.discount_amount * discountProportion;
        total += lineTotal - lineDiscount;
      }
    });
    return total;
  }, [state.refundLines, state.returnableLines]);

  // Process refund
  const processRefund = useCallback(async () => {
    if (!state.selectedSale || !currentUser) return;

    const refundLines: RefundLineInput[] = [];
    state.refundLines.forEach((refundLine, lineId) => {
      const returnableLine = state.returnableLines.find(rl => rl.id === lineId);
      if (returnableLine && refundLine.quantity > 0) {
        refundLines.push({
          original_line_id: lineId,
          product_id: returnableLine.product_id,
          quantity: refundLine.quantity,
          restock: refundLine.restock,
          reason: refundLine.reason
        });
      }
    });

    if (refundLines.length === 0) {
      toast.error('Please select items to refund');
      return;
    }

    const refundTotal = calculateRefundTotal();
    const returnSettings = refundService.getReturnSettings();

    // Check if manager PIN required
    if (refundTotal > returnSettings.managerPinRequiredAbove) {
      if (!state.managerPin) {
        setState(prev => ({ ...prev, showManagerDialog: true }));
        return;
      }
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      const refundInput: RefundInput = {
        original_sale_id: state.selectedSale.id,
        cashier_id: currentUser.id,
        refund_method: state.refundMethod,
        lines: refundLines,
        manager_pin: state.managerPin || undefined,
        notes: 'Customer return'
      };

      const result = await refundService.createRefund(refundInput);

      // Open cash drawer for cash refunds
      if (state.refundMethod === 'CASH' && settings?.devices?.cashDrawerOpenOnCash) {
        console.log('💰 Opening cash drawer for refund...');
        window.dispatchEvent(new CustomEvent('drawer-opened'));
      }

      // Print refund receipt
      try {
        const refundDetails = await refundService.getRefundById(result.refund_id);
        if (refundDetails) {
          await refundPrintAdapter.printRefund({
            refund: {
              id: result.refund_id,
              refund_datetime: new Date().toISOString(),
              original_invoice: state.selectedSale.invoice_number,
              cashier_name: currentUser.name,
              terminal: currentSession?.terminal || 'POS-001',
              method: state.refundMethod,
              refund_net: refundTotal,
              notes: 'Customer return'
            },
            original_sale: {
              datetime: state.selectedSale.datetime,
              invoice_number: state.selectedSale.invoice_number,
              customer_name: state.selectedSale.customer_name
            },
            lines: refundLines.map(rl => {
              const returnableLine = state.returnableLines.find(line => line.id === rl.original_line_id)!;
              return {
                product_sku: returnableLine.product_sku,
                product_name: returnableLine.product_name,
                quantity: rl.quantity,
                unit_price: returnableLine.unit_price,
                line_total: returnableLine.unit_price * rl.quantity,
                restock: rl.restock
              };
            }),
            store_info: {
              name: settings?.storeInfo?.name || 'POS Store',
              address: settings?.storeInfo?.address || 'Store Address',
              tax_id: settings?.storeInfo?.taxId
            }
          }, { openDrawer: state.refundMethod === 'CASH' });
        }
      } catch (printError) {
        console.error('Print failed:', printError);
        toast('Refund completed but print failed', { icon: '⚠️' });
      }

      toast.success(`Refund completed: ${refundService.formatCurrency(refundTotal)}`);
      
      // Reset to search mode
      setState(prev => ({
        ...prev,
        viewMode: 'search',
        selectedSale: null,
        returnableLines: [],
        refundLines: new Map(),
        searchTerm: '',
        managerPin: '',
        showManagerDialog: false,
        loading: false
      }));

    } catch (error) {
      console.error('Refund failed:', error);
      toast.error(`Refund failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [state, currentUser, currentSession, settings, calculateRefundTotal]);

  // Export refunds CSV
  const exportRefunds = useCallback(async () => {
    try {
      await csvService.exportRefundsCSV(state.refunds);
      toast.success('Refunds exported to CSV');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export refunds');
    }
  }, [state.refunds]);

  // Load refunds on history view
  useEffect(() => {
    if (state.viewMode === 'history') {
      loadRefunds();
    }
  }, [state.viewMode, loadRefunds]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F9' && state.viewMode === 'search') {
        event.preventDefault();
        handleSearch();
      }
      
      if (event.key === '/' && state.viewMode === 'search') {
        event.preventDefault();
        const searchInput = document.getElementById('search-input') as HTMLInputElement;
        searchInput?.focus();
      }
      
      if (event.ctrlKey && event.key === 'Enter' && state.viewMode === 'refund') {
        event.preventDefault();
        processRefund();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.viewMode, handleSearch, processRefund]);

  const refundTotal = calculateRefundTotal();
  const returnSettings = refundService.getReturnSettings();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/sales')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Sales
              </button>
              
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Returns & Refunds
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span>Cashier: <strong>{currentUser?.name}</strong></span>
                  {currentSession && (
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      Session #{currentSession.id}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setState(prev => ({ ...prev, viewMode: 'search' }))}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
                  state.viewMode === 'search'
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                )}
              >
                <Search className="h-4 w-4" />
                New Return
              </button>
              
              <button
                onClick={() => setState(prev => ({ ...prev, viewMode: 'history' }))}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
                  state.viewMode === 'history'
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                )}
              >
                <Calendar className="h-4 w-4" />
                History
              </button>
            </div>
          </div>
        </div>

        {/* Search Mode */}
        {state.viewMode === 'search' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
            <div className="max-w-2xl mx-auto text-center">
              <div className="mb-6">
                <RotateCcw className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Start a Return
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Enter invoice number or scan receipt barcode to begin
                </p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="search-input"
                    type="text"
                    placeholder="Invoice number or receipt barcode (Press / to focus)"
                    value={state.searchTerm}
                    onChange={(e) => setState(prev => ({ ...prev, searchTerm: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full pl-12 pr-4 py-4 text-lg border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <button
                  onClick={handleSearch}
                  disabled={state.loading || !state.searchTerm.trim()}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {state.loading ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-5 w-5" />
                      Find Sale (F9)
                    </>
                  )}
                </button>
              </div>

              <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
                <p className="mb-2">💡 <strong>Quick Tips:</strong></p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                  <p>• Scan receipt barcode for instant lookup</p>
                  <p>• Enter full invoice number (e.g., INV-000123)</p>
                  <p>• Returns allowed within {returnSettings.returnWindowDays} days</p>
                  <p>• Manager PIN required for refunds over {refundService.formatCurrency(returnSettings.managerPinRequiredAbove)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Refund Mode */}
        {state.viewMode === 'refund' && state.selectedSale && (
          <div className="space-y-6">
            {/* Sale Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Original Sale Details
                </h3>
                <button
                  onClick={() => setState(prev => ({ ...prev, viewMode: 'search' }))}
                  className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Search
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Invoice</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{state.selectedSale.invoice_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Date</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {new Date(state.selectedSale.datetime).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Cashier</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{state.selectedSale.cashier_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {refundService.formatCurrency(state.selectedSale.total_amount)}
                  </p>
                </div>
              </div>
            </div>

            {/* Returnable Items */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Select Items to Return
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Item</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-white">Sold</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-white">Refunded</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-white">Available</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-white">Return Qty</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-white">Unit Price</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-white">Restock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {state.returnableLines.map((line) => {
                      const refundLine = state.refundLines.get(line.id) || { quantity: 0, restock: returnSettings.defaultRestock, reason: '' };
                      
                      return (
                        <tr key={line.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{line.product_name}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{line.product_sku}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-900 dark:text-white">{line.quantity_sold}</td>
                          <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{line.quantity_refunded}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn(
                              "font-medium",
                              line.quantity_returnable > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                            )}>
                              {line.quantity_returnable}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              max={line.quantity_returnable}
                              value={refundLine.quantity}
                              onChange={(e) => updateRefundLine(line.id, { quantity: parseInt(e.target.value) || 0 })}
                              className="w-20 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              disabled={line.quantity_returnable === 0}
                            />
                          </td>
                          <td className="px-4 py-3 text-center text-gray-900 dark:text-white">
                            {refundService.formatCurrency(line.unit_price)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={refundLine.restock}
                              onChange={(e) => updateRefundLine(line.id, { restock: e.target.checked })}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                              disabled={refundLine.quantity === 0}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Refund Summary */}
            {state.refundLines.size > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Refund Summary
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Items to Return:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {Array.from(state.refundLines.values()).reduce((sum, line) => sum + line.quantity, 0)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Items to Restock:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {Array.from(state.refundLines.values()).filter(line => line.restock).length}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-lg">
                      <span className="font-semibold text-gray-900 dark:text-white">Refund Total:</span>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        {refundService.formatCurrency(refundTotal)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Refund Method
                      </label>
                      <select
                        value={state.refundMethod}
                        onChange={(e) => setState(prev => ({ ...prev, refundMethod: e.target.value as 'CASH' | 'CARD' | 'WALLET' }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="CASH">Cash</option>
                        <option value="CARD">Card</option>
                        <option value="WALLET">Wallet/Digital</option>
                      </select>
                    </div>
                    
                    {refundTotal > returnSettings.managerPinRequiredAbove && (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm font-medium">Manager authorization required</span>
                        </div>
                      </div>
                    )}
                    
                    <button
                      onClick={processRefund}
                      disabled={state.loading || refundTotal === 0}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {state.loading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <DollarSign className="h-4 w-4" />
                          Process Refund (Ctrl+Enter)
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* History Mode */}
        {state.viewMode === 'history' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Refund History
                </h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setState(prev => ({ ...prev, showFilters: !prev.showFilters }))}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Filter className="h-4 w-4" />
                    Filters
                  </button>
                  
                  <button
                    onClick={exportRefunds}
                    disabled={state.refunds.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </button>
                </div>
              </div>

              {state.showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date From
                    </label>
                    <input
                      type="date"
                      value={state.filters.dateFrom || ''}
                      onChange={(e) => setState(prev => ({ 
                        ...prev, 
                        filters: { ...prev.filters, dateFrom: e.target.value } 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date To
                    </label>
                    <input
                      type="date"
                      value={state.filters.dateTo || ''}
                      onChange={(e) => setState(prev => ({ 
                        ...prev, 
                        filters: { ...prev.filters, dateTo: e.target.value } 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Method
                    </label>
                    <select
                      value={state.filters.method || ''}
                      onChange={(e) => setState(prev => ({ 
                        ...prev, 
                        filters: { ...prev.filters, method: e.target.value || undefined } 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="">All Methods</option>
                      <option value="CASH">Cash</option>
                      <option value="CARD">Card</option>
                      <option value="WALLET">Wallet</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Refunds Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {state.loading ? (
                <div className="p-12 text-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Loading refunds...</p>
                </div>
              ) : state.refunds.length === 0 ? (
                <div className="p-12 text-center">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No refunds found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Refund ID</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Original Invoice</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Customer</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Cashier</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Method</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">Amount</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-white">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {state.refunds.map((refund) => (
                        <tr key={refund.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3 text-gray-900 dark:text-white font-mono">REF-{refund.id}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            {new Date(refund.refund_datetime).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white">{refund.original_invoice}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                            {refund.customer_name || 'Walk-in'}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{refund.cashier_name}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                              refund.method === 'CASH' && "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400",
                              refund.method === 'CARD' && "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400",
                              refund.method === 'WALLET' && "bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400"
                            )}>
                              {refund.method}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-red-600 dark:text-red-400">
                            -{refundService.formatCurrency(Math.abs(refund.refund_net))}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {/* View refund details */}}
                                className="p-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              
                              <button
                                onClick={() => {/* Reprint refund receipt */}}
                                className="p-1 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                                title="Reprint Receipt"
                              >
                                <Printer className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manager PIN Dialog */}
        {state.showManagerDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Manager Authorization Required
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                This refund of {refundService.formatCurrency(refundTotal)} requires manager approval.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Manager PIN
                  </label>
                  <input
                    type="password"
                    value={state.managerPin}
                    onChange={(e) => setState(prev => ({ ...prev, managerPin: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter manager PIN"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setState(prev => ({ ...prev, showManagerDialog: false, managerPin: '' }))}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={processRefund}
                  disabled={!state.managerPin}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Authorize & Process
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Returns;


