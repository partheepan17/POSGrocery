import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, AlertCircle } from 'lucide-react';
import { useReturnStore } from '@/store/returnStore';
import { keyboardManager, POS_SHORTCUTS } from '@/lib/keyboard';
import { toast } from 'react-hot-toast';

// Components
import { ReturnLookup } from '@/components/returns/ReturnLookup';
import { ReturnLinesTable } from '@/components/returns/ReturnLinesTable';
import { ReturnSummary } from '@/components/returns/ReturnSummary';
import { LanguagePicker } from '@/components/common/LanguagePicker';

export default function ReturnsPage() {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);

  const { 
    originalInvoice, 
    lastReturnReceiptNo, 
    printable, 
    setError,
    error 
  } = useReturnStore();

  // Health check
  const checkOnlineStatus = async () => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100';
      const response = await fetch(`${apiBaseUrl}/api/health`);
      const data = await response.json();
      setIsOnline(data.status === 'ok');
    } catch (error) {
      setIsOnline(false);
    }
  };

  // Health check on mount
  useEffect(() => {
    checkOnlineStatus();
    const healthInterval = setInterval(checkOnlineStatus, 15000);
    return () => clearInterval(healthInterval);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    // Returns shortcut (already active)
    keyboardManager.register({
      ...POS_SHORTCUTS.RETURNS,
      action: () => navigate('/returns')
    });

    // Print return receipt
    keyboardManager.register({
      key: 'P',
      ctrl: true,
      action: () => handlePrintReturnReceipt(),
      description: 'Print Return Receipt'
    });

    return () => {
      // Cleanup handled by main keyboard manager
    };
  }, [navigate]);

  // Handle back navigation
  const handleBack = () => {
    navigate('/pos');
  };

  // Handle print return receipt
  const handlePrintReturnReceipt = async () => {
    if (!printable || !lastReturnReceiptNo) {
      toast.error('No return receipt to print');
      return;
    }

    setIsPrinting(true);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100';
      const response = await fetch(`${apiBaseUrl}/api/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receipt_no: lastReturnReceiptNo,
          type: 'return',
          language: 'en', // From store
          payload: printable
        })
      });

      if (response.ok) {
        toast.success('Return receipt printed successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Print failed');
      }
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to print return receipt');
    } finally {
      setIsPrinting(false);
    }
  };

  // Handle return processed
  const handleReturnProcessed = (receiptNo: string) => {
    // Return processed successfully
    console.log('Return processed:', receiptNo);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Back button and title */}
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Returns & Refunds
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Process returns and refunds
                </p>
              </div>
            </div>

            {/* Center: Status */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>

            {/* Right: Language picker and print button */}
            <div className="flex items-center space-x-4">
              <LanguagePicker />
              {printable && lastReturnReceiptNo && (
                <button
                  onClick={handlePrintReturnReceipt}
                  disabled={isPrinting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Return Receipt (Ctrl+P)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
            {/* Left Column: Sales Search & Lookup */}
            <div className="xl:col-span-1">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <span className="mr-2">🔍</span>
                  Sales Search & Return Lookup
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Find past sales transactions to process returns
                </p>
              </div>
              <ReturnLookup onInvoiceFound={handleReturnProcessed} />
            </div>

            {/* Center Column: Return Lines */}
            <div className="xl:col-span-1">
              <ReturnLinesTable />
            </div>

            {/* Right Column: Summary and Preview */}
            <div className="xl:col-span-1 space-y-4 lg:space-y-6">
              {/* Return Summary */}
              <ReturnSummary onReturnProcessed={handleReturnProcessed} />

              {/* Return Receipt Preview */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Return Receipt Preview
                </h2>
                
                {printable && printable.html ? (
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                    <iframe
                      srcDoc={printable.html}
                      className="w-full h-96"
                      title="Return Receipt Preview"
                    />
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <Printer className="w-12 h-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No Return Receipt
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Process a return to see the receipt preview
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-2 text-white hover:text-gray-200"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Offline Warning */}
      {!isOnline && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5" />
            <span>Offline - Some features may be limited</span>
          </div>
        </div>
      )}
    </div>
  );
}
