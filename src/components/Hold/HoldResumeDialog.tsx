/**
 * Hold Resume Dialog
 * Dialog for choosing how to resume a hold (replace, merge, or append)
 */

import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Plus, Merge, Replace, Lock, Unlock } from 'lucide-react';
import { cn } from '@/utils/cn';
import { HoldSale, holdService } from '@/services/holdService';

interface HoldResumeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: {
    mode: 'replace' | 'merge' | 'append';
    lock_prices: boolean;
  }) => void;
  hold: HoldSale | null;
  hasCurrentCart: boolean;
}

type ResumeMode = 'replace' | 'merge' | 'append';

const HoldResumeDialog: React.FC<HoldResumeDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  hold,
  hasCurrentCart
}) => {
  const [selectedMode, setSelectedMode] = useState<ResumeMode>('replace');
  const [lockPrices, setLockPrices] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen && hold) {
      const settings = holdService.getHoldSettings();
      setSelectedMode(hasCurrentCart ? 'replace' : 'replace');
      setLockPrices(settings.lockPricesDefault);
    }
  }, [isOpen, hold, hasCurrentCart]);

  // Handle confirmation
  const handleConfirm = () => {
    onConfirm({
      mode: selectedMode,
      lock_prices: lockPrices
    });
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      
      if (event.key === 'Enter') {
        event.preventDefault();
        handleConfirm();
      }

      // Number keys for mode selection
      if (event.key === '1') {
        event.preventDefault();
        setSelectedMode('replace');
      }
      if (event.key === '2' && hasCurrentCart) {
        event.preventDefault();
        setSelectedMode('merge');
      }
      if (event.key === '3' && hasCurrentCart) {
        event.preventDefault();
        setSelectedMode('append');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleConfirm, hasCurrentCart]);

  if (!isOpen || !hold) return null;

  const isExpired = hold.status === 'EXPIRED';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            Resume Hold
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Hold Info */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">{hold.hold_name}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {hold.items_count} item{hold.items_count !== 1 ? 's' : ''} • {holdService.formatCurrency(hold.net)}
              </p>
              {hold.customer_name && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Customer: {hold.customer_name}
                </p>
              )}
            </div>
            
            {isExpired && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400">
                EXPIRED
              </span>
            )}
          </div>

          {isExpired && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                ⚠️ This hold has expired. Resuming may use current prices instead of original prices.
              </p>
            </div>
          )}
        </div>

        {/* Resume Options */}
        <div className="p-6">
          <h5 className="font-medium text-gray-900 dark:text-white mb-4">
            How would you like to resume this hold?
          </h5>

          <div className="space-y-3">
            {/* Replace Mode */}
            <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <input
                type="radio"
                name="resume-mode"
                value="replace"
                checked={selectedMode === 'replace'}
                onChange={(e) => setSelectedMode(e.target.value as ResumeMode)}
                className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Replace className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    Replace Current Cart (1)
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {hasCurrentCart 
                    ? "Clear current cart and load this hold"
                    : "Load this hold (recommended)"
                  }
                </p>
              </div>
            </label>

            {/* Merge Mode */}
            {hasCurrentCart && (
              <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <input
                  type="radio"
                  name="resume-mode"
                  value="merge"
                  checked={selectedMode === 'merge'}
                  onChange={(e) => setSelectedMode(e.target.value as ResumeMode)}
                  className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Merge className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      Merge with Current Cart (2)
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Combine quantities for same items, re-evaluate discounts
                  </p>
                </div>
              </label>
            )}

            {/* Append Mode */}
            {hasCurrentCart && (
              <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <input
                  type="radio"
                  name="resume-mode"
                  value="append"
                  checked={selectedMode === 'append'}
                  onChange={(e) => setSelectedMode(e.target.value as ResumeMode)}
                  className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Plus className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      Append to Current Cart (3)
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Add hold items as new lines, keep current cart items
                  </p>
                </div>
              </label>
            )}
          </div>

          {/* Price Lock Option */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={lockPrices}
                onChange={(e) => setLockPrices(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="flex items-center gap-2">
                {lockPrices ? (
                  <Lock className="h-4 w-4 text-amber-600" />
                ) : (
                  <Unlock className="h-4 w-4 text-green-600" />
                )}
                <span className="font-medium text-gray-900 dark:text-white">
                  Lock Original Prices
                </span>
              </div>
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 ml-7">
              {lockPrices 
                ? "Keep original unit prices and tax from when hold was created"
                : "Use current prices and recalculate discounts (recommended)"
              }
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel (Esc)
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Resume Hold (Enter)
          </button>
        </div>

        {/* Help */}
        <div className="px-6 pb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">Resume Tips:</p>
              <ul className="text-xs space-y-1">
                <li>• <strong>Replace:</strong> Best for resuming a single hold</li>
                <li>• <strong>Merge:</strong> Combines same items, useful for similar orders</li>
                <li>• <strong>Append:</strong> Keeps items separate, good for different customers</li>
                <li>• <strong>Lock Prices:</strong> Use for expired holds to maintain original pricing</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HoldResumeDialog;







