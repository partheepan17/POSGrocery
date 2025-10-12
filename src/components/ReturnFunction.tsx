import React, { useState, useEffect } from 'react';
import { Search, ArrowLeft, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface Invoice {
  id: number;
  receipt_no: string;
  date: string;
  total: number;
  payment_type: string;
  customer?: string;
}

interface InvoiceItem {
  id: number;
  item_id: number;
  qty: number;
  retail_price: number;
  selling_price: number;
  line_discount_value: number;
  line_discount_type: string;
  line_total: number;
  tax_amount: number;
  product: {
    name_en: string;
    name_si?: string;
    name_ta?: string;
    sku: string;
    unit: string;
  };
}

interface ReturnItem {
  item_id: number;
  qty: number;
  refund_amount: number;
  restock_flag: boolean;
  reason: string;
}

interface ReturnFunctionProps {
  onBack: () => void;
}

export function ReturnFunction({ onBack }: ReturnFunctionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceDetails, setInvoiceDetails] = useState<any>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search invoices
  const searchInvoices = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
      const response = await fetch(`${apiBaseUrl}/api/invoices?limit=50&query=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      if (response.ok) {
        setInvoices(data.invoices);
      } else {
        setError(data.error || 'Failed to search invoices');
      }
    } catch (error) {
      setError('Network error while searching invoices');
    } finally {
      setIsLoading(false);
    }
  };

  // Load invoice details
  const loadInvoiceDetails = async (invoice: Invoice) => {
    setIsLoading(true);
    setError(null);

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
      const response = await fetch(`${apiBaseUrl}/api/invoices/${invoice.id}`);
      const data = await response.json();

      if (response.ok) {
        setSelectedInvoice(invoice);
        setInvoiceDetails(data.invoice);
        
        // Initialize return items
        const initialReturnItems: ReturnItem[] = data.invoice.items.map((item: InvoiceItem) => ({
          item_id: item.item_id,
          qty: 0,
          refund_amount: 0,
          restock_flag: true,
          reason: 'Customer return'
        }));
        setReturnItems(initialReturnItems);
      } else {
        setError(data.error || 'Failed to load invoice details');
      }
    } catch (error) {
      setError('Network error while loading invoice details');
    } finally {
      setIsLoading(false);
    }
  };

  // Update return item
  const updateReturnItem = (itemId: number, field: keyof ReturnItem, value: any) => {
    setReturnItems(prev => prev.map(item => 
      item.item_id === itemId 
        ? { ...item, [field]: value }
        : item
    ));
  };

  // Calculate refund amount for an item
  const calculateRefundAmount = (item: InvoiceItem, returnQty: number): number => {
    if (returnQty <= 0) return 0;
    return (returnQty / item.qty) * item.line_total;
  };

  // Process return
  const processReturn = async () => {
    const validReturnItems = returnItems.filter(item => item.qty > 0);
    
    if (validReturnItems.length === 0) {
      setError('Please select items to return');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
      const response = await fetch(`${apiBaseUrl}/api/returns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          original_receipt_no: selectedInvoice?.receipt_no,
          items: validReturnItems,
          operator_id: 1, // FIXED: Get from auth context
          reason: 'Customer return'
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Return processed successfully. Return Receipt: ${data.receipt_no_return}`);
        
        // Print return receipt
        try {
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
          await fetch(`${apiBaseUrl}/api/print`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'return',
              format: 'html',
              payload: data.printable_payload
            })
          });
        } catch (printError) {
          console.warn('Failed to print return receipt:', printError);
        }

        // Reset form
        setSelectedInvoice(null);
        setInvoiceDetails(null);
        setReturnItems([]);
        setSearchQuery('');
        setInvoices([]);
      } else {
        setError(data.error || 'Failed to process return');
      }
    } catch (error) {
      setError('Network error while processing return');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchInvoices();
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Return / Refund</h1>
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Search Invoice
          </h2>
          
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter receipt number or customer name..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !searchQuery.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Search
            </button>
          </form>

          {/* Search Results */}
          {invoices.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Results ({invoices.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    onClick={() => loadInvoiceDetails(invoice)}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedInvoice?.id === invoice.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          Receipt: {invoice.receipt_no}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(invoice.date).toLocaleString()}
                        </div>
                        {invoice.customer && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Customer: {invoice.customer}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900 dark:text-white">
                          රු {invoice.total.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {invoice.payment_type}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Invoice Details and Return Items */}
        {invoiceDetails && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Invoice Details - {invoiceDetails.receipt_no}
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Original Items */}
              <div>
                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                  Original Items
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {invoiceDetails.items.map((item: InvoiceItem) => (
                    <div key={item.id} className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {item.product.name_en}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {item.product.sku} • {item.product.unit}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900 dark:text-white">
                            රු {item.line_total.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Qty: {item.qty}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Return Items */}
              <div>
                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                  Return Items
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {returnItems.map((returnItem, index) => {
                    const originalItem = invoiceDetails.items.find((item: InvoiceItem) => 
                      item.item_id === returnItem.item_id
                    );
                    
                    if (!originalItem) return null;

                    return (
                      <div key={returnItem.item_id} className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                        <div className="mb-3">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {originalItem.product.name_en}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Available: {originalItem.qty} {originalItem.product.unit}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Return Quantity
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={originalItem.qty}
                              value={returnItem.qty}
                              onChange={(e) => {
                                const qty = parseFloat(e.target.value) || 0;
                                updateReturnItem(returnItem.item_id, 'qty', qty);
                                updateReturnItem(returnItem.item_id, 'refund_amount', 
                                  calculateRefundAmount(originalItem, qty)
                                );
                              }}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Refund Amount
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={returnItem.refund_amount}
                              onChange={(e) => updateReturnItem(returnItem.item_id, 'refund_amount', 
                                parseFloat(e.target.value) || 0
                              )}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Reason
                            </label>
                            <input
                              type="text"
                              value={returnItem.reason}
                              onChange={(e) => updateReturnItem(returnItem.item_id, 'reason', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500"
                            />
                          </div>

                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id={`restock-${returnItem.item_id}`}
                              checked={returnItem.restock_flag}
                              onChange={(e) => updateReturnItem(returnItem.item_id, 'restock_flag', e.target.checked)}
                              className="mr-2"
                            />
                            <label htmlFor={`restock-${returnItem.item_id}`} className="text-sm text-gray-700 dark:text-gray-300">
                              Restock item
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Process Return Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={processReturn}
                disabled={isProcessing || returnItems.every(item => item.qty <= 0)}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isProcessing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Process Return
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700 dark:text-red-300">{error}</span>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-green-700 dark:text-green-300">{success}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
