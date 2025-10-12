import React, { useState, useRef, useEffect } from 'react';
import { Search, AlertCircle, CheckCircle, Calendar, FileText } from 'lucide-react';
import { useReturnStore } from '@/store/returnStore';
import { toast } from 'react-hot-toast';
import { dataService } from '@/services/dataService';

interface ReturnLookupProps {
  onInvoiceFound?: (invoice: any) => void;
}

export function ReturnLookup({ onInvoiceFound }: ReturnLookupProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [showInvoiceList, setShowInvoiceList] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const scanTimeoutRef = useRef<NodeJS.Timeout>();
  
  const { 
    lookupValue, 
    setLookupValue, 
    setOriginalInvoice, 
    setAlreadyReturned,
    setLines,
    setError,
    setLoading,
    isLoading,
    error 
  } = useReturnStore();

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle barcode scanning (fast typing + Enter)
  useEffect(() => {
    if (isScanning && lookupValue.length > 0) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = setTimeout(() => {
        setIsScanning(false);
      }, 100);
    }
  }, [lookupValue, isScanning]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLookupValue(value);
    setError(null);
    
    // Check if this looks like a barcode scan (fast typing)
    if (value.length > 5 && !isScanning) {
      setIsScanning(true);
    }
  };

  // Handle key down
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLookup();
    }
  };

  // Handle lookup
  const handleLookup = async () => {
    if (!lookupValue.trim()) {
      // If lookup field is empty, show today's invoices
      await loadInvoices();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch invoice details via returns lookup API (receipt barcode or number)
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
      const invoiceResponse = await fetch(`${apiBaseUrl}/api/returns/lookup?receipt=${encodeURIComponent(lookupValue.trim())}`);
      const invoiceData = await invoiceResponse.json();

      if (!invoiceResponse.ok || !invoiceData.invoice) {
        setError(invoiceData.error || 'Sale not found');
        return;
      }

      // Fetch already returned summary
      const returnsResponse = await fetch(`${apiBaseUrl}/api/returns/summary?receipt_no=${lookupValue.trim()}`);
      const returnsData = await returnsResponse.json();

      if (!returnsResponse.ok) {
        console.warn('Failed to fetch returns summary:', returnsData.error);
      }

      const alreadyReturned = returnsData.summary || {};

      // Check if invoice is already fully returned
      const isFullyReturned = (invoiceData.lines || []).every((item: any) => {
        const returned = alreadyReturned[item.id] || { qty: 0 };
        return returned.qty >= item.qty;
      });

      if (isFullyReturned) {
        setError('This sale has already been fully returned');
        return;
      }

      // Build return lines
      const lines = (invoiceData.lines || []).map((item: any) => {
        const returned = alreadyReturned[item.id] || { qty: 0, amount: 0 };
        const eligible_qty = item.qty - returned.qty;
        
        // Calculate refund unit price (original effective price)
        const refund_unit_estimate = (item.line_total || (item.qty * item.unit_price)) / (item.qty || 1);

        return {
          invoice_item_id: item.id,
          item_id: item.product_id,
          name: item.name || '',
          sku: item.sku || '',
          sold_qty: item.qty,
          already_returned_qty: returned.qty,
          eligible_qty: Math.max(0, eligible_qty),
          return_qty: 0,
          restock_flag: true,
          reason: '',
          refund_unit_estimate: roundCurrency(refund_unit_estimate),
          refund_line_estimate: 0
        };
      });

      // Set store state
      setOriginalInvoice(invoiceData.invoice);
      setAlreadyReturned(alreadyReturned);
      setLines(lines);

      // Notify parent
      onInvoiceFound?.(invoiceData.invoice);

      toast.success('Invoice loaded successfully');

    } catch (error) {
      console.error('Lookup error:', error);
      setError('Network error while looking up invoice');
    } finally {
      setLoading(false);
    }
  };

  // Load invoices for the selected date range
  const loadInvoices = async () => {
    setLoadingInvoices(true);
    setError(null);
    
    try {
      const invoices = await dataService.listInvoices({
        dateRange: {
          from: dateRange.from,
          to: dateRange.to
        },
        limit: 50
      });
      
      setInvoices(invoices);
      setShowInvoiceList(true);
      
      if (invoices.length === 0) {
        setError('No invoices found for the selected date range');
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
      setError('Failed to load invoices');
    } finally {
      setLoadingInvoices(false);
    }
  };

  // Handle invoice selection
  const handleInvoiceSelect = async (invoice: any) => {
    setLookupValue(invoice.receipt_no);
    setShowInvoiceList(false);
    // Trigger the normal lookup process
    await handleLookup();
  };

  // Round currency helper
  const roundCurrency = (amount: number): number => {
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Lookup Sale
      </h2>
      
      <div className="space-y-4">
        {/* Date Filter */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        {/* Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={lookupValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="🔍 Search Sales: Enter receipt number or scan receipt barcode..."
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-lg"
            autoComplete="off"
            disabled={isLoading}
          />
          {isLoading && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>

        {/* Find Button */}
        <button
          onClick={handleLookup}
          disabled={isLoading || loadingInvoices}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-medium"
        >
          {isLoading || loadingInvoices ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>{loadingInvoices ? 'Loading invoices...' : 'Looking up...'}</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>{lookupValue.trim() ? 'Find Past Sale' : 'Find'}</span>
            </>
          )}
        </button>

        {/* Error Message */}
        {error && (
          <div className="flex items-center p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
            <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
          </div>
        )}

        {/* Success Message */}
        {!error && !isLoading && lookupValue && (
          <div className="flex items-center p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
            <span className="text-green-700 dark:text-green-300 text-sm">
              Ready to process return
            </span>
          </div>
        )}

        {/* Hint */}
        <p className="text-sm text-gray-600 dark:text-gray-400">
          • Sales Search: Enter receipt number or scan receipt barcode to find past transactions for returns
        </p>

        {/* Invoice List */}
        {showInvoiceList && (
          <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3 flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Invoices ({invoices.length})
            </h3>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  onClick={() => handleInvoiceSelect(invoice)}
                  className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        Receipt: {invoice.receipt_no}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(invoice.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {roundCurrency(invoice.total_amount || 0).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {invoice.customer_name || 'Walk-in'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {invoices.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No invoices found for the selected date range
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

