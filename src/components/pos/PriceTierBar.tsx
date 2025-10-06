import React from 'react';
import { useCartStore } from '@/store/cartStore';
import { AlertCircle } from 'lucide-react';

interface PriceTierBarProps {
  onTierChange?: (tier: string) => void;
}

export function PriceTierBar({ onTierChange }: PriceTierBarProps) {
  const { priceTier, setPriceTier } = useCartStore();

  const tiers = [
    { key: 'Retail', label: 'Retail', color: 'blue' },
    { key: 'Wholesale', label: 'Wholesale', color: 'green' },
    { key: 'Credit', label: 'Credit', color: 'yellow' },
    { key: 'Other', label: 'Other', color: 'gray' }
  ] as const;

  const handleTierChange = (tier: string) => {
    setPriceTier(tier as any);
    onTierChange?.(tier);
  };

  const isNonRetailTier = priceTier !== 'Retail';

  return (
    <div className="space-y-3">
      {/* Price Tier Buttons */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Price Tier
        </label>
        <div className="grid grid-cols-4 gap-2">
          {tiers.map((tier) => (
            <button
              key={tier.key}
              onClick={() => handleTierChange(tier.key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                priceTier === tier.key
                  ? `bg-${tier.color}-600 text-white`
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>
      </div>

      {/* Current Tier Display */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        • Current tier: {priceTier}
      </div>

      {/* Discount Rules Warning */}
      {isNonRetailTier && (
        <div className="flex items-center p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mr-2 flex-shrink-0" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <div className="font-medium">Rule-based item discounts disabled</div>
            <div className="text-amber-700 dark:text-amber-300">
              Item-level discount rules only apply to Retail tier. Manual discount still available.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

