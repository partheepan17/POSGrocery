import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '@/store/cartStore';
import { AlertCircle } from 'lucide-react';

interface PriceTierBarProps {
  onTierChange?: (tier: string) => void;
}

export function PriceTierBar({ onTierChange }: PriceTierBarProps) {
  const { t } = useTranslation();
  const { priceTier, setPriceTier } = useCartStore();

  const tiers = [
    { key: 'Retail', label: t('sales.retail'), color: 'blue' },
    { key: 'Wholesale', label: t('sales.wholesale'), color: 'green' },
    { key: 'Credit', label: t('sales.credit'), color: 'yellow' },
    { key: 'Other', label: t('sales.other'), color: 'gray' }
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
          {t('sales.priceTier')}
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
        • {t('sales.currentTier')}: {priceTier}
      </div>

      {/* Discount Rules Warning */}
      {isNonRetailTier && (
        <div className="flex items-center p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mr-2 flex-shrink-0" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <div className="font-medium">{t('sales.ruleBasedDiscountsDisabled')}</div>
            <div className="text-amber-700 dark:text-amber-300">
              {t('sales.discountRulesOnlyRetail')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

