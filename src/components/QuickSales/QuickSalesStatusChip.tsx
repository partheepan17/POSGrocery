/**
 * Quick Sales Status Chip
 * Displays the current quick sales session status
 */

import React from 'react';
import { useQuickSales } from '@/contexts/QuickSalesContext';
import { Badge } from '@/components/ui/Badge';
import { Clock, DollarSign, ShoppingCart } from 'lucide-react';

export function QuickSalesStatusChip() {
  const { state } = useQuickSales();

  if (!state.isActive) {
    return null;
  }

  const formatDuration = (startTime: Date) => {
    const now = new Date();
    const diff = now.getTime() - startTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <Clock className="w-3 h-3 mr-1" />
        Quick Sales Active
      </Badge>
      
      {state.startTime && (
        <Badge variant="outline" className="text-xs">
          {formatDuration(state.startTime)}
        </Badge>
      )}
      
      <Badge variant="outline" className="text-xs">
        <DollarSign className="w-3 h-3 mr-1" />
        {state.totalSales.toLocaleString()}
      </Badge>
      
      <Badge variant="outline" className="text-xs">
        <ShoppingCart className="w-3 h-3 mr-1" />
        {state.totalTransactions}
      </Badge>
    </div>
  );
}