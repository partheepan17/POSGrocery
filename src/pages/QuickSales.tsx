import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
// import ReactWindow from 'react-window';
// const List = ReactWindow.FixedSizeList;
import { 
  Barcode, 
  X, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  ShoppingCart,
  DollarSign,
  Clock,
  Package
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { useUIStore } from '@/store/uiStore';
import { useQuickSales, QuickSalesProvider } from '@/contexts/QuickSalesContext';
import QuickSalesPrintSummary from '@/components/pos/QuickSalesPrintSummary';

interface QuickSalesLine {
  id: number;
  product_id: number;
  sku: string;
  name: string;
  uom: string;
  qty: number;
  unit_price: number;
  auto_discount: number;
  manual_discount: number;
  line_total: number;
  created_at: string;
}

interface QuickSalesSession {
  id: number;
  session_date: string;
  status: string;
  total_amount: number;
  total_lines: number;
}

interface QuickSalesState {
  session: QuickSalesSession | null;
  lines: QuickSalesLine[];
  hasMore: boolean;
  nextCursor?: string;
}

const QuickSalesPage: React.FC = () => {
  const { t } = useTranslation();
  const { userRole } = useUIStore();
  const { session, isLoading, closeSession, refreshSession } = useQuickSales();
  
  // State
  const [scanInput, setScanInput] = useState('');
  const [lines, setLines] = useState<QuickSalesLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [managerPin, setManagerPin] = useState('');
  const [closing, setClosing] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<number | null>(null);
  const [showPrintSummary, setShowPrintSummary] = useState(false);
  const [closedSessionData, setClosedSessionData] = useState<any>(null);
  
  // Refs
  const scanInputRef = useRef<HTMLInputElement>(null);
  const lastScanRef = useRef<string>('');
  
  // Auto-focus scan input
  useEffect(() => {
    if (scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, []);
  
  // Load lines when session changes
  useEffect(() => {
    if (session) {
      loadLines();
    }
  }, [session]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault();
        handleCloseSession();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [session]);
  
  
  // Load lines
  const loadLines = async (cursor?: string) => {
    try {
      const params = new URLSearchParams();
      if (cursor) params.set('cursor', cursor);
      params.set('limit', '200');
      
      const response = await fetch(`/api/quick-sales/lines?${params}`);
      if (!response.ok) throw new Error('Failed to load lines');
      
      const data = await response.json();
      
      if (cursor) {
        setLines(prev => [...prev, ...data.lines]);
      } else {
        setLines(data.lines);
      }
    } catch (error) {
      console.error('Failed to load lines:', error);
      toast.error(t('quickSales.errors.loadLinesFailed'));
    }
  };
  
  // Handle scan/search using centralized barcode service
  const handleScan = useCallback(async (value: string) => {
    if (!value.trim() || value === lastScanRef.current) return;
    
    lastScanRef.current = value;
    setLastScanTime(Date.now());
    
    try {
      setLoading(true);
      
      // Use centralized barcode service for better performance and consistency
      const { barcodeService } = await import('@/services/barcodeService');
      const barcodeResult = await barcodeService.searchBarcode(value, {
        debounceMs: 0,
        retryAttempts: 2,
        timeout: 5000
      });
      
      if (!barcodeResult.found || !barcodeResult.product) {
        toast.error(t('quickSales.errors.productNotFound'));
        return;
      }
      
      const product = barcodeResult.product;
      
      // Add to Quick Sales
      const addResponse = await fetch('/api/quick-sales/lines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          qty: 1,
          uom: 'BASE'
        })
      });
      
      if (!addResponse.ok) {
        const errorData = await addResponse.json();
        throw new Error(errorData.message || 'Failed to add product');
      }
      
      const lineData = await addResponse.json();
      
      // Update local state
      setLines(prev => [lineData.line, ...prev]);
      
      // Refresh session data from context
      refreshSession();
      
      // Clear input
      setScanInput('');
      
      toast.success(t('quickSales.success.productAdded'));
      
    } catch (error) {
      console.error('Scan failed:', error);
      toast.error(error instanceof Error ? error.message : t('quickSales.errors.addProductFailed'));
    } finally {
      setLoading(false);
    }
  }, [session]);
  
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScanInput(e.target.value);
  };
  
  // Handle input key down
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleScan(scanInput);
    }
  };
  
  // Remove line
  const handleRemoveLine = async (lineId: number) => {
    try {
      const response = await fetch(`/api/quick-sales/lines/${lineId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerPin: '1234' }) // TODO: Get actual manager PIN
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove line');
      }
      
      // Update local state
      setLines(prev => prev.filter(line => line.id !== lineId));
      
      // Refresh session data from context
      refreshSession();
      
      toast.success(t('quickSales.success.lineRemoved'));
    } catch (error) {
      console.error('Remove failed:', error);
      toast.error(error instanceof Error ? error.message : t('quickSales.errors.removeLineFailed'));
    }
  };
  
  // Close session
  const handleCloseSession = () => {
    if (!session || session.total_lines === 0) {
      toast.error(t('quickSales.errors.noItemsToClose'));
      return;
    }
    setShowCloseModal(true);
  };
  
  // Confirm close
  const handleConfirmClose = async () => {
    if (!managerPin.trim()) {
      toast.error(t('quickSales.errors.managerPinRequired'));
      return;
    }
    
    setClosing(true);
    const success = await closeSession(managerPin, 'Quick Sales session closed');
    
    if (success) {
      setLines([]);
      setShowCloseModal(false);
      setManagerPin('');
      
      // Fetch print summary data and show print modal
      try {
        const response = await fetch(`/api/quick-sales/print-summary/${session?.id}?topN=10`);
        if (response.ok) {
          const printData = await response.json();
          setClosedSessionData(printData);
          setShowPrintSummary(true);
        }
      } catch (error) {
        console.error('Failed to fetch print summary:', error);
        // Still show success even if print data fetch fails
        toast.success(t('quickSales.success.sessionClosed'));
      }
    }
    
    setClosing(false);
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  // Format time
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString();
  };

  
  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('quickSales.title')}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('quickSales.description')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {session && (
              <Badge variant="success" size="lg">
                <CheckCircle className="w-4 h-4 mr-2" />
                {t('quickSales.sessionOpen')}
              </Badge>
            )}
            
            <Button
              onClick={handleCloseSession}
              disabled={!session || session.total_lines === 0}
              variant="danger"
              size="lg"
            >
              <X className="w-4 h-4 mr-2" />
              {t('quickSales.closeSession')} (F12)
            </Button>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Scan Input */}
        <div className="w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Scan Input */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="space-y-4">
              <div className="relative">
                <Input
                  ref={scanInputRef}
                  type="text"
                  placeholder={t('quickSales.scanPlaceholder')}
                  value={scanInput}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  leftIcon={<Barcode className="w-5 h-5" />}
                  variant="pos"
                  inputSize="lg"
                  className="text-lg"
                  disabled={loading || isLoading}
                />
                {lastScanTime && (
                  <div className="absolute -top-8 right-0">
                    <Badge variant="success" size="sm">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Scanned
                    </Badge>
                  </div>
                )}
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p>{t('quickSales.instructions.scanBarcode')}</p>
                <p>{t('quickSales.instructions.rescanIncrement')}</p>
                <p>{t('quickSales.instructions.pressEnter')}</p>
              </div>
            </div>
          </div>
          
          {/* Session Info */}
          {session && (
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('quickSales.sessionDate')}:</span>
                  <span className="text-sm text-gray-900 dark:text-white">{session.session_date}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('quickSales.totalLines')}:</span>
                  <span className="text-sm text-gray-900 dark:text-white">{session.total_lines}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('quickSales.totalAmount')}:</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(session.total_amount)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Right Panel - Lines Table */}
        <div className="flex-1 flex flex-col">
          {/* Table Header */}
          <div className="bg-gray-50 dark:bg-gray-800 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-7 gap-4 text-sm font-medium text-gray-600 dark:text-gray-400">
              <div>{t('quickSales.product')}</div>
              <div className="text-right">{t('quickSales.quantity')}</div>
              <div className="text-center">{t('quickSales.unit')}</div>
              <div className="text-right">{t('quickSales.unitPrice')}</div>
              <div className="text-right">{t('quickSales.lineTotal')}</div>
              <div className="text-center">{t('quickSales.addedAt')}</div>
              <div className="text-center">{t('quickSales.actions')}</div>
            </div>
          </div>
          
          {/* Table Body */}
          <div className="flex-1 overflow-y-auto">
            {lines.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">{t('quickSales.noItems')}</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    {t('quickSales.scanToStart')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-0">
                {lines.map((line, index) => (
                  <div key={line.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-7 gap-4 items-center">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{line.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{line.sku}</div>
                      </div>
                      <div className="text-right font-mono">{line.qty.toFixed(3)}</div>
                      <div className="text-center text-sm text-gray-600 dark:text-gray-400">{line.uom}</div>
                      <div className="text-right font-mono">{formatCurrency(line.unit_price)}</div>
                      <div className="text-right font-mono font-medium">{formatCurrency(line.line_total)}</div>
                      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                        {formatTime(line.created_at)}
                      </div>
                      <div className="text-center">
                        <Button
                          onClick={() => handleRemoveLine(line.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Running Total Banner */}
      {session && session.total_lines > 0 && (
        <div className="bg-blue-600 text-white px-6 py-4 sticky bottom-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <ShoppingCart className="w-6 h-6" />
              <div>
                <div className="text-sm font-medium">{t('quickSales.runningTotal')}</div>
                <div className="text-xs opacity-90">{session.total_lines} {t('quickSales.items')}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{formatCurrency(session.total_amount)}</div>
              <div className="text-sm opacity-90">{t('quickSales.beforeTax')}</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Close Confirmation Modal */}
      <Dialog isOpen={showCloseModal} onClose={() => setShowCloseModal(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('quickSales.closeConfirmation.title')}</DialogTitle>
            <DialogDescription>
              {t('quickSales.closeConfirmation.description')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('quickSales.closeConfirmation.managerPin')}
              </label>
              <Input
                type="password"
                value={managerPin}
                onChange={(e) => setManagerPin(e.target.value)}
                placeholder={t('quickSales.closeConfirmation.pinPlaceholder')}
                className="w-full"
              />
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('quickSales.closeConfirmation.sessionSummary')}:</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>{t('quickSales.items')}:</span>
                  <span className="font-medium">{session?.total_lines || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('quickSales.totalAmount')}:</span>
                  <span className="font-medium">{formatCurrency(session?.total_amount || 0)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                onClick={() => setShowCloseModal(false)}
                variant="ghost"
                disabled={closing}
              >
                {t('quickSales.closeConfirmation.cancel')}
              </Button>
              <Button
                onClick={handleConfirmClose}
                variant="danger"
                disabled={closing || !managerPin.trim()}
                loading={closing}
              >
                {t('quickSales.closeConfirmation.confirm')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Print Summary Modal */}
      {showPrintSummary && closedSessionData && (
        <QuickSalesPrintSummary
          session={closedSessionData.session}
          invoice={closedSessionData.invoice}
          topItems={closedSessionData.topItems}
          totalLines={closedSessionData.totalLines}
          onPrint={() => {
            toast.success(t('quickSales.success.printed'));
          }}
          onClose={() => {
            setShowPrintSummary(false);
            setClosedSessionData(null);
            toast.success(t('quickSales.success.sessionClosed'));
          }}
        />
      )}
    </div>
  );
};

export default function QuickSalesPageWrapper() {
  return (
    <QuickSalesProvider>
      <QuickSalesPage />
    </QuickSalesProvider>
  );
}
