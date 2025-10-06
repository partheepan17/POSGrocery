import React from 'react';
import { useCartStore } from '@/store/cartStore';
import { formatCurrency } from '@/lib/currency';

interface QuickTenderProps {
  onTenderAmount?: (amount: number) => void;
  isPaymentModalOpen?: boolean;
  paymentType?: string;
}

export function QuickTender({ 
  onTenderAmount, 
  isPaymentModalOpen = false, 
  paymentType = 'CASH' 
}: QuickTenderProps) {
  const { totals } = useCartStore();

  // Check if quick tender is available
  const isAvailable = isPaymentModalOpen && (paymentType === 'CASH' || paymentType === 'WALLET');

  // Handle exact amount
  const handleExactAmount = () => {
    if (isAvailable) {
      onTenderAmount?.(totals.net_total);
    }
  };

  // Handle 500 tender
  const handle500Tender = () => {
    if (isAvailable) {
      onTenderAmount?.(500);
    }
  };

  // Handle 1000 tender
  const handle1000Tender = () => {
    if (isAvailable) {
      onTenderAmount?.(1000);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleExactAmount}
        disabled={!isAvailable}
        className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        title={isAvailable ? 'Set tendered amount to exact total' : 'Available only for Cash/Wallet payments'}
      >
        Exact (Alt+1)
      </button>
      
      <button
        onClick={handle500Tender}
        disabled={!isAvailable}
        className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        title={isAvailable ? 'Set tendered amount to 500' : 'Available only for Cash/Wallet payments'}
      >
        500 (Alt+2)
      </button>
      
      <button
        onClick={handle1000Tender}
        disabled={!isAvailable}
        className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        title={isAvailable ? 'Set tendered amount to 1000' : 'Available only for Cash/Wallet payments'}
      >
        1000 (Alt+3)
      </button>
      
      {!isAvailable && (
        <div className="text-xs text-gray-500 text-center">
          Available for Cash/Wallet payments
        </div>
      )}
    </div>
  );
}

