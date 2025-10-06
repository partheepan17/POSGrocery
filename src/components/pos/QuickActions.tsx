import React, { useState } from 'react';
import { Clock, RefreshCw, FileText, RotateCcw } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { toast } from 'react-hot-toast';

interface HeldSale {
  id: string;
  timestamp: Date;
  items: any[];
  priceTier: string;
  customerName: string;
  total: number;
}

interface QuickActionsProps {
  onShiftReports?: () => void;
}

export function QuickActions({ onShiftReports }: QuickActionsProps) {
  const { items, priceTier, customerName, totals, clearCart } = useCartStore();
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  const [showHeldModal, setShowHeldModal] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);

  // Hold current sale
  const handleHoldSale = async () => {
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    try {
      const heldSale: HeldSale = {
        id: `held_${Date.now()}`,
        timestamp: new Date(),
        items: [...items],
        priceTier,
        customerName,
        total: totals.net_total
      };

      // Save to localStorage (in real app, save to server)
      const existingHeld = JSON.parse(localStorage.getItem('heldSales') || '[]');
      existingHeld.push(heldSale);
      localStorage.setItem('heldSales', JSON.stringify(existingHeld));

      setHeldSales(existingHeld);
      clearCart();
      toast.success('Sale held successfully');
    } catch (error) {
      console.error('Error holding sale:', error);
      toast.error('Failed to hold sale');
    }
  };

  // Load held sales
  const loadHeldSales = () => {
    try {
      const held = JSON.parse(localStorage.getItem('heldSales') || '[]');
      setHeldSales(held);
    } catch (error) {
      console.error('Error loading held sales:', error);
      setHeldSales([]);
    }
  };

  // Resume held sale
  const handleResumeHold = () => {
    loadHeldSales();
    setShowResumeModal(true);
  };

  // Resume specific held sale
  const handleResumeSpecificSale = (heldSale: HeldSale) => {
    if (items.length > 0) {
      if (!confirm('Current cart is not empty. Resume will replace current items. Continue?')) {
        return;
      }
    }

    // Restore cart state
    clearCart();
    // In real app, restore items to cart
    toast.success(`Resumed sale from ${heldSale.timestamp.toLocaleString()}`);
    setShowResumeModal(false);
  };

  // Delete held sale
  const handleDeleteHeldSale = (heldSaleId: string) => {
    if (!confirm('Delete this held sale?')) return;

    try {
      const updated = heldSales.filter(sale => sale.id !== heldSaleId);
      localStorage.setItem('heldSales', JSON.stringify(updated));
      setHeldSales(updated);
      toast.success('Held sale deleted');
    } catch (error) {
      console.error('Error deleting held sale:', error);
      toast.error('Failed to delete held sale');
    }
  };

  // Show held sales
  const handleShowHeldSales = () => {
    loadHeldSales();
    setShowHeldModal(true);
  };

  return (
    <>
      <div className="space-y-2">
        <button
          onClick={handleHoldSale}
          disabled={items.length === 0}
          className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <Clock className="w-4 h-4" />
          <span>Hold Sale (F5)</span>
        </button>
        
        <button
          onClick={handleResumeHold}
          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Resume Hold (F6)</span>
        </button>
        
        <button
          onClick={onShiftReports}
          className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center space-x-2"
        >
          <FileText className="w-4 h-4" />
          <span>Shift Reports (F12)</span>
        </button>
        
        <button
          onClick={() => {/* Navigate to returns */}}
          className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center justify-center space-x-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Start Return (F11)</span>
        </button>
      </div>

      {/* Held Sales Modal */}
      {showHeldModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Held Sales
              </h3>
              <button
                onClick={() => setShowHeldModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-96">
              {heldSales.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  No held sales found
                </div>
              ) : (
                <div className="space-y-3">
                  {heldSales.map((sale) => (
                    <div key={sale.id} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {sale.timestamp.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {sale.customerName} • {sale.priceTier}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {sale.items.length} items • රු {sale.total.toLocaleString()}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleResumeSpecificSale(sale)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            Resume
                          </button>
                          <button
                            onClick={() => handleDeleteHeldSale(sale.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resume Hold Modal */}
      {showResumeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Resume Held Sale
              </h3>
              <button
                onClick={() => setShowResumeModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-96">
              {heldSales.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  No held sales found
                </div>
              ) : (
                <div className="space-y-3">
                  {heldSales.map((sale) => (
                    <div key={sale.id} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {sale.timestamp.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {sale.customerName} • {sale.priceTier}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {sale.items.length} items • රු {sale.total.toLocaleString()}
                          </div>
                        </div>
                        <button
                          onClick={() => handleResumeSpecificSale(sale)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Resume
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

