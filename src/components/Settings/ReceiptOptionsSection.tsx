import React from 'react';
import { Receipt, QrCode, BarChart3, Eye } from 'lucide-react';
import { AppSettings } from '@/types';

interface ReceiptOptionsSectionProps {
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  onSettingsChange: () => void;
}

export function ReceiptOptionsSection({ settings, updateSettings, onSettingsChange }: ReceiptOptionsSectionProps) {
  // Safety check for settings.receiptOptions
  if (!settings || !settings.receiptOptions) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading receipt options...</p>
        </div>
      </div>
    );
  }
  const handleInputChange = (field: keyof AppSettings['receiptOptions'], value: any) => {
    updateSettings({
      receiptOptions: {
        ...settings.receiptOptions,
        [field]: value,
      },
    });
    onSettingsChange();
  };

  const languages = [
    { code: 'EN', name: 'English', flag: '🇺🇸' },
    { code: 'SI', name: 'සිංහල', flag: '🇱🇰' },
    { code: 'TA', name: 'தமிழ்', flag: '🇱🇰' },
  ];

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Receipt Options</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Configure receipt appearance, footer text, and additional features.
        </p>
      </div>

      <div className="space-y-8">
        {/* Footer Text by Language */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Receipt className="w-5 h-5 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Footer Text</h3>
          </div>
          
          <div className="space-y-6">
            {languages.map((lang) => {
              const fieldName = `footerText${lang.code}` as keyof AppSettings['receiptOptions'];
              const currentValue = settings.receiptOptions[fieldName] as string;
              
              return (
                <div key={lang.code}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <span className="mr-2">{lang.flag}</span>
                    {lang.name} Footer Text
                  </label>
                  <textarea
                    value={currentValue}
                    onChange={(e) => handleInputChange(fieldName, e.target.value)}
                    placeholder={`Enter footer text for ${lang.name} receipts...`}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    This text will appear at the bottom of receipts in {lang.name}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Receipt Features */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Eye className="w-5 h-5 text-green-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Receipt Features</h3>
          </div>
          
          <div className="space-y-6">
            {/* QR Code */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <QrCode className="w-5 h-5 text-purple-600 mr-3" />
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Show QR Code
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Display QR code on receipts for digital verification
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.receiptOptions.showQRCode}
                  onChange={(e) => handleInputChange('showQRCode', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Barcode */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <BarChart3 className="w-5 h-5 text-orange-600 mr-3" />
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Show Barcode
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Display invoice number as barcode on receipts
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.receiptOptions.showBarcode}
                  onChange={(e) => handleInputChange('showBarcode', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Tier Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Receipt className="w-5 h-5 text-blue-600 mr-3" />
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Show Tier Badge
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Display pricing tier badge on receipt (Retail, Wholesale, etc.)
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.receiptOptions.showTierBadge}
                  onChange={(e) => handleInputChange('showTierBadge', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Receipt Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Receipt Preview</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {languages.map((lang) => {
              const fieldName = `footerText${lang.code}` as keyof AppSettings['receiptOptions'];
              const footerText = settings.receiptOptions[fieldName] as string;
              
              return (
                <div key={lang.code} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      {lang.flag} {lang.name}
                    </div>
                    
                    {/* Mini Receipt Preview */}
                    <div className="bg-white dark:bg-gray-800 rounded border text-xs p-3 text-left">
                      <div className="text-center border-b border-gray-200 dark:border-gray-600 pb-2 mb-2">
                        <div className="font-bold">My Grocery Store</div>
                        <div className="text-xs">123 Main Street</div>
                        <div className="text-xs">Colombo 01</div>
                      </div>
                      
                      <div className="space-y-1 mb-2">
                        <div className="flex justify-between">
                          <span>Rice 5kg</span>
                          <span>රු 500.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sugar 1kg</span>
                          <span>රු 120.00</span>
                        </div>
                      </div>
                      
                      <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mb-2">
                        <div className="flex justify-between font-bold">
                          <span>Total:</span>
                          <span>රු 620.00</span>
                        </div>
                      </div>
                      
                      {/* Features */}
                      {settings.receiptOptions.showTierBadge && (
                        <div className="text-center mb-2">
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                            Retail
                          </span>
                        </div>
                      )}
                      
                      {settings.receiptOptions.showQRCode && (
                        <div className="text-center mb-2">
                          <div className="w-8 h-8 bg-gray-300 mx-auto rounded flex items-center justify-center">
                            <QrCode className="w-4 h-4 text-gray-600" />
                          </div>
                        </div>
                      )}
                      
                      {settings.receiptOptions.showBarcode && (
                        <div className="text-center mb-2">
                          <div className="h-4 bg-black mx-auto" style={{ width: '80%' }}></div>
                        </div>
                      )}
                      
                      {/* Footer */}
                      <div className="border-t border-gray-200 dark:border-gray-600 pt-2 text-center">
                        <div className="text-xs text-gray-500">
                          {footerText || 'Thank you for your business!'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

