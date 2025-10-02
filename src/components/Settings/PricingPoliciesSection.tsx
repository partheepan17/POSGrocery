import React from 'react';
import { AlertTriangle, CheckCircle, DollarSign, Settings } from 'lucide-react';
import { AppSettings } from '@/types';

interface PricingPoliciesSectionProps {
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  onSettingsChange: () => void;
}

export function PricingPoliciesSection({ settings, updateSettings, onSettingsChange }: PricingPoliciesSectionProps) {
  // Safety check for settings.pricingPolicies
  if (!settings || !settings.pricingPolicies) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pricing policies...</p>
        </div>
      </div>
    );
  }
  const handleInputChange = (field: keyof AppSettings['pricingPolicies'], value: any) => {
    updateSettings({
      pricingPolicies: {
        ...settings.pricingPolicies,
        [field]: value,
      },
    });
    onSettingsChange();
  };

  const handleRequiredTiersChange = (tier: 'retail' | 'wholesale' | 'credit' | 'other', checked: boolean) => {
    const currentTiers = settings.pricingPolicies.requiredTiers;
    let newTiers;
    
    if (checked) {
      newTiers = [...currentTiers, tier];
    } else {
      newTiers = currentTiers.filter(t => t !== tier);
    }
    
    handleInputChange('requiredTiers', newTiers);
  };

  const policyDescriptions = {
    'warn_fallback': {
      title: 'Warn & Fallback to Retail',
      description: 'Show warnings for missing tier prices but allow saving. Use retail price as fallback.',
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
    },
    'block_manager': {
      title: 'Block & Require Manager',
      description: 'Prevent saving products with missing required tier prices. Manager override required.',
      icon: CheckCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Pricing Policies</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Configure how the system handles missing tier prices and CSV import behavior.
        </p>
      </div>

      <div className="space-y-8">
        {/* Missing Price Policy */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <DollarSign className="w-5 h-5 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Missing Price Policy</h3>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-3">
              {Object.entries(policyDescriptions).map(([key, policy]) => {
                const Icon = policy.icon;
                const isSelected = settings.pricingPolicies.missingPricePolicy === key;
                
                return (
                  <label
                    key={key}
                    className={`relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? `${policy.bgColor} ${policy.borderColor} border-2`
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="missingPricePolicy"
                      value={key}
                      checked={isSelected}
                      onChange={(e) => handleInputChange('missingPricePolicy', e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex items-start">
                      <Icon className={`w-5 h-5 mt-0.5 mr-3 ${isSelected ? policy.color : 'text-gray-400'}`} />
                      <div className="flex-1">
                        <div className={`text-sm font-medium ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                          {policy.title}
                        </div>
                        <div className={`text-xs mt-1 ${isSelected ? 'text-gray-600 dark:text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          {policy.description}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="ml-3">
                          <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Required Price Tiers */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Settings className="w-5 h-5 text-green-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Required Price Tiers</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Select which price tiers are required for all products
              </label>
              
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'retail', label: 'Retail Price', description: 'Standard customer price' },
                  { key: 'wholesale', label: 'Wholesale Price', description: 'Bulk/business price' },
                  { key: 'credit', label: 'Credit Price', description: 'Credit customer price' },
                  { key: 'other', label: 'Other Price', description: 'Special pricing tier' },
                ].map((tier) => {
                  const isRequired = settings.pricingPolicies.requiredTiers.includes(tier.key as any);
                  
                  return (
                    <label
                      key={tier.key}
                      className={`relative flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                        isRequired
                          ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isRequired}
                        onChange={(e) => handleRequiredTiersChange(tier.key as any, e.target.checked)}
                        className="sr-only"
                      />
                      <div className="flex items-start">
                        <div className={`w-4 h-4 mt-0.5 mr-3 border-2 rounded flex items-center justify-center ${
                          isRequired
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {isRequired && (
                            <CheckCircle className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className={`text-sm font-medium ${
                            isRequired ? 'text-blue-900 dark:text-blue-100' : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {tier.label}
                          </div>
                          <div className={`text-xs mt-1 ${
                            isRequired ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {tier.description}
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* CSV Import Auto-Creation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Settings className="w-5 h-5 text-purple-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">CSV Import Auto-Creation</h3>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Auto-create Categories
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Automatically create categories that don't exist during CSV import
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.pricingPolicies.autoCreateCategories}
                    onChange={(e) => handleInputChange('autoCreateCategories', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Auto-create Suppliers
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Automatically create suppliers that don't exist during CSV import
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.pricingPolicies.autoCreateSuppliers}
                    onChange={(e) => handleInputChange('autoCreateSuppliers', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Policy Impact Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Policy Impact</h3>
          
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Current Policy Effects:
              </h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-2"></div>
                  <span>
                    <strong>Missing Price Policy:</strong> {policyDescriptions[settings.pricingPolicies.missingPricePolicy].title}
                  </span>
                </li>
                <li className="flex items-start">
                  <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 mr-2"></div>
                  <span>
                    <strong>Required Tiers:</strong> {settings.pricingPolicies.requiredTiers.length > 0 
                      ? settings.pricingPolicies.requiredTiers.map(tier => tier.charAt(0).toUpperCase() + tier.slice(1)).join(', ')
                      : 'None selected'
                    }
                  </span>
                </li>
                <li className="flex items-start">
                  <div className="w-1.5 h-1.5 bg-purple-600 rounded-full mt-2 mr-2"></div>
                  <span>
                    <strong>CSV Import:</strong> {settings.pricingPolicies.autoCreateCategories ? 'Auto-create categories' : 'Manual category creation'} • {settings.pricingPolicies.autoCreateSuppliers ? 'Auto-create suppliers' : 'Manual supplier creation'}
                  </span>
                </li>
              </ul>
            </div>

            {settings.pricingPolicies.missingPricePolicy === 'block_manager' && settings.pricingPolicies.requiredTiers.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Strict Policy Active
                    </h4>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                      Products cannot be saved without {settings.pricingPolicies.requiredTiers.join(', ')} prices. 
                      Manager override will be required for any exceptions.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

