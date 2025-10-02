import React from 'react';
import { Printer, CreditCard, Scan, Scale, Info } from 'lucide-react';
import { AppSettings } from '@/types';

interface DevicesSectionProps {
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  onSettingsChange: () => void;
}

export function DevicesSection({ settings, updateSettings, onSettingsChange }: DevicesSectionProps) {
  // Safety check for settings.devices
  if (!settings || !settings.devices) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading device settings...</p>
        </div>
      </div>
    );
  }
  const handleInputChange = (field: keyof AppSettings['devices'], value: any) => {
    updateSettings({
      devices: {
        ...settings.devices,
        [field]: value,
      },
    });
    onSettingsChange();
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Device Settings</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Configure your POS hardware devices and peripherals.
        </p>
      </div>

      <div className="space-y-8">
        {/* Receipt Printer */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Printer className="w-5 h-5 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Receipt Printer</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Receipt Paper Size
              </label>
              <select
                value={settings.devices.receiptPaper}
                onChange={(e) => handleInputChange('receiptPaper', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="58mm">58mm Thermal</option>
                <option value="80mm">80mm Thermal</option>
                <option value="A4">A4 Paper</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Select the paper size for your receipt printer
              </p>
            </div>
          </div>
        </div>

        {/* Cash Drawer */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <CreditCard className="w-5 h-5 text-green-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cash Drawer</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Open drawer on cash payment
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Automatically open the cash drawer when processing cash payments
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.devices.cashDrawerOpenOnCash}
                  onChange={(e) => handleInputChange('cashDrawerOpenOnCash', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Barcode Scanner */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Scan className="w-5 h-5 text-purple-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Barcode Scanner</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Input Mode
              </label>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Keyboard Wedge
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Scanner acts as a keyboard input device
                    </div>
                  </div>
                  <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                    Active
                  </div>
                </div>
              </div>
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-start">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 mr-2" />
                  <div className="text-xs text-blue-800 dark:text-blue-200">
                    <p className="font-medium">Keyboard Wedge Mode</p>
                    <p className="mt-1">
                      Your barcode scanner is configured to send data as keyboard input. 
                      Simply scan a barcode in any text field to input the barcode data.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scale Integration */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Scale className="w-5 h-5 text-orange-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Scale Integration</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Scale Mode
              </label>
              <select
                value={settings.devices.scaleMode}
                onChange={(e) => handleInputChange('scaleMode', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="off">Off - No scale integration</option>
                <option value="weight_embedded">Weight Embedded - PLU + Weight</option>
                <option value="price_embedded">Price Embedded - PLU + Weight + Price</option>
              </select>
            </div>

            {settings.devices.scaleMode !== 'off' && (
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-start">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 mr-2" />
                    <div className="text-xs text-blue-800 dark:text-blue-200">
                      <p className="font-medium">Scale Adapter Information</p>
                      {settings.devices.scaleMode === 'weight_embedded' && (
                        <div className="mt-1 space-y-1">
                          <p>• Format: PLU + Weight (e.g., "SUGAR10001.250")</p>
                          <p>• PLU: Product lookup code</p>
                          <p>• Weight: In kg with decimal places</p>
                        </div>
                      )}
                      {settings.devices.scaleMode === 'price_embedded' && (
                        <div className="mt-1 space-y-1">
                          <p>• Format: PLU + Weight + Price (e.g., "SUGAR10001.250125.00")</p>
                          <p>• PLU: Product lookup code</p>
                          <p>• Weight: In kg with decimal places</p>
                          <p>• Price: Total price for the weight</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="flex items-start">
                    <Info className="w-4 h-4 text-yellow-600 mt-0.5 mr-2" />
                    <div className="text-xs text-yellow-800 dark:text-yellow-200">
                      <p className="font-medium">Setup Required</p>
                      <p className="mt-1">
                        Configure your scale to send data in the specified format. 
                        The system will automatically parse weight and price information from scanned barcodes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Device Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Device Status</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center">
                <Printer className="w-4 h-4 text-gray-600 mr-2" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Receipt Printer</span>
              </div>
              <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                Ready
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center">
                <CreditCard className="w-4 h-4 text-gray-600 mr-2" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Cash Drawer</span>
              </div>
              <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                Ready
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center">
                <Scan className="w-4 h-4 text-gray-600 mr-2" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Barcode Scanner</span>
              </div>
              <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                Active
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center">
                <Scale className="w-4 h-4 text-gray-600 mr-2" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Scale</span>
              </div>
              <div className={`text-xs px-2 py-1 rounded-full ${
                settings.devices.scaleMode === 'off' 
                  ? 'bg-gray-100 text-gray-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {settings.devices.scaleMode === 'off' ? 'Disabled' : 'Configured'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

