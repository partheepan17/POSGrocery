import React from 'react';
import { Globe, Calculator, Hash } from 'lucide-react';
import { AppSettings } from '@/types';

interface LanguageFormattingSectionProps {
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  onSettingsChange: () => void;
}

export function LanguageFormattingSection({ settings, updateSettings, onSettingsChange }: LanguageFormattingSectionProps) {
  // Safety check for settings.languageFormatting
  if (!settings || !settings.languageFormatting) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading language settings...</p>
        </div>
      </div>
    );
  }
  const handleInputChange = (field: keyof AppSettings['languageFormatting'], value: any) => {
    updateSettings({
      languageFormatting: {
        ...settings.languageFormatting,
        [field]: value,
      },
    });
    onSettingsChange();
  };

  const roundingExamples = {
    'NEAREST_1': { examples: ['123.45 → 123.00', '123.67 → 124.00', '123.50 → 124.00'], description: 'Round to nearest whole number' },
    'NEAREST_0_50': { examples: ['123.45 → 123.50', '123.67 → 123.50', '123.25 → 123.50'], description: 'Round to nearest 0.50' },
    'NEAREST_0_10': { examples: ['123.45 → 123.50', '123.67 → 123.70', '123.62 → 123.60'], description: 'Round to nearest 0.10' },
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Language & Formatting</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Configure display language, number formatting, and currency rounding for your POS system.
        </p>
      </div>

      <div className="space-y-8">
        {/* Display Language */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Globe className="w-5 h-5 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Display Language</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Interface Language
              </label>
              <select
                value={settings.languageFormatting.displayLanguage}
                onChange={(e) => handleInputChange('displayLanguage', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="EN">English</option>
                <option value="SI">සිංහල (Sinhala)</option>
                <option value="TA">தமிழ் (Tamil)</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This affects the POS interface language, menus, and system messages
              </p>
            </div>
          </div>
        </div>

        {/* Currency Rounding */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Calculator className="w-5 h-5 text-green-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">LKR Rounding Mode</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rounding Mode
              </label>
              <select
                value={settings.languageFormatting.roundingMode}
                onChange={(e) => handleInputChange('roundingMode', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="NEAREST_1">Nearest 1.00 (Whole Numbers)</option>
                <option value="NEAREST_0_50">Nearest 0.50</option>
                <option value="NEAREST_0_10">Nearest 0.10</option>
              </select>
            </div>

            {/* Rounding Examples */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Rounding Examples:
              </h4>
              <div className="space-y-2">
                {roundingExamples[settings.languageFormatting.roundingMode].examples.map((example, index) => (
                  <div key={index} className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                    {example}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {roundingExamples[settings.languageFormatting.roundingMode].description}
              </p>
            </div>
          </div>
        </div>

        {/* Weight Decimals */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Hash className="w-5 h-5 text-purple-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Weight Precision</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Decimal Places for Weight (kg)
              </label>
              <select
                value={settings.languageFormatting.kgDecimals}
                onChange={(e) => handleInputChange('kgDecimals', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={2}>2 decimal places (e.g., 1.25 kg)</option>
                <option value={3}>3 decimal places (e.g., 1.250 kg)</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This affects how weight values are displayed and calculated
              </p>
            </div>

            {/* Weight Examples */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Weight Display Examples:
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600 dark:text-gray-400 font-mono">
                    Raw: 1.2500 kg
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 font-mono">
                    Displayed: {settings.languageFormatting.kgDecimals === 2 ? '1.25 kg' : '1.250 kg'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600 dark:text-gray-400 font-mono">
                    Raw: 2.7500 kg
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 font-mono">
                    Displayed: {settings.languageFormatting.kgDecimals === 2 ? '2.75 kg' : '2.750 kg'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Live Preview</h3>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
            <div className="space-y-4">
              {/* Sample Product Line */}
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-600 pb-2">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Rice 5kg</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    1{settings.languageFormatting.kgDecimals === 2 ? '.25' : '.250'} kg × රු 100.00
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900 dark:text-white">
                    රු {formatAmount(125.00, settings.languageFormatting.roundingMode)}
                  </div>
                </div>
              </div>

              {/* Sample Total */}
              <div className="flex justify-between items-center border-t border-gray-200 dark:border-gray-600 pt-2">
                <div className="font-semibold text-gray-900 dark:text-white">Total</div>
                <div className="font-bold text-lg text-gray-900 dark:text-white">
                  රු {formatAmount(125.00, settings.languageFormatting.roundingMode)}
                </div>
              </div>

              {/* Language Display */}
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-600">
                Interface Language: {settings.languageFormatting.displayLanguage} | 
                Rounding: {settings.languageFormatting.roundingMode} | 
                Weight Decimals: {settings.languageFormatting.kgDecimals}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to format amounts based on rounding mode
function formatAmount(amount: number, roundingMode: string): string {
  switch (roundingMode) {
    case 'NEAREST_1':
      return Math.round(amount).toFixed(2);
    case 'NEAREST_0_50':
      return (Math.round(amount * 2) / 2).toFixed(2);
    case 'NEAREST_0_10':
      return (Math.round(amount * 10) / 10).toFixed(2);
    default:
      return amount.toFixed(2);
  }
}

