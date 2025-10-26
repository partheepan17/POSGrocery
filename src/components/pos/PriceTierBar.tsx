/**
 * Price Tier Bar Component
 * Displays and allows switching between price tiers
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useCartStore } from '@/store/cartStore';

export function PriceTierBar() {
  const { t } = useTranslation();
  const { priceTier, setPriceTier } = useCartStore();

  const priceTiers = [
    { key: 'Retail', label: t('pos.retail'), color: 'blue' },
    { key: 'Wholesale', label: t('pos.wholesale'), color: 'green' },
    { key: 'Credit', label: t('pos.credit'), color: 'purple' },
    { key: 'Other', label: t('pos.other'), color: 'gray' },
  ] as const;

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Retail': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Wholesale': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Credit': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'Other': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('pos.priceTier')}:
          </span>
          
          <div className="flex items-center space-x-2">
            {priceTiers.map((tier) => (
              <Button
                key={tier.key}
                size="sm"
                variant={priceTier === tier.key ? 'default' : 'outline'}
                onClick={() => setPriceTier(tier.key as any)}
                className={`text-xs ${
                  priceTier === tier.key 
                    ? getTierColor(tier.key)
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {tier.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge 
            variant="secondary" 
            className={getTierColor(priceTier)}
          >
            {priceTiers.find(t => t.key === priceTier)?.label}
          </Badge>
        </div>
      </div>
    </div>
  );
}