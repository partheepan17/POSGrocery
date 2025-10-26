/**
 * Yesterday Session Banner
 * Displays a banner for yesterday's unclosed quick sales session
 */

import React from 'react';
import { useQuickSales } from '@/contexts/QuickSalesContext';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function YesterdaySessionBanner() {
  const { state, setShowYesterdayBanner } = useQuickSales();

  if (!state.showYesterdayBanner) {
    return null;
  }

  const handleDismiss = () => {
    setShowYesterdayBanner(false);
  };

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Yesterday's Quick Sales Session
          </h3>
          <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
            <p>
              You have an unclosed quick sales session from yesterday. 
              Please review and close it to maintain accurate records.
            </p>
          </div>
          <div className="mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDismiss}
              className="text-yellow-800 border-yellow-400 hover:bg-yellow-100 dark:text-yellow-200 dark:border-yellow-600 dark:hover:bg-yellow-800/20"
            >
              Dismiss
            </Button>
          </div>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-yellow-500 hover:text-yellow-600 dark:text-yellow-400 dark:hover:text-yellow-300"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}