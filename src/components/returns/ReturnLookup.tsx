import React, { useState, useRef, useEffect } from 'react';
import { Search, AlertCircle, CheckCircle } from 'lucide-react';
import { useReturnStore } from '@/store/returnStore';
import { toast } from 'react-hot-toast';

interface ReturnLookupProps {
  onInvoiceFound?: (invoice: any) => void;
}

export function ReturnLookup({ onInvoiceFound }: ReturnLookupProps) {
  const [isScanning, setIsScanning] = useState(false);
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
      setError('Please enter a receipt number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch invoice details via returns lookup API (receipt barcode or number)
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100';
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
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
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
          disabled={isLoading || !lookupValue.trim()}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-medium"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Looking up...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Find Past Sale</span>
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
      </div>
    </div>
  );
}

