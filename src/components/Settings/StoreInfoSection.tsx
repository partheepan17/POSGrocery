import React, { useState } from 'react';
import { Upload, Image as ImageIcon, Globe } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { AppSettings } from '@/types';

interface StoreInfoSectionProps {
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  onSettingsChange: () => void;
}

export function StoreInfoSection({ settings, updateSettings, onSettingsChange }: StoreInfoSectionProps) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Debug logging
  console.log('StoreInfoSection - settings:', settings);
  console.log('StoreInfoSection - settings.storeInfo:', settings?.storeInfo);

  // Safety check for settings.storeInfo
  if (!settings || !settings.storeInfo) {
    console.log('StoreInfoSection - Missing settings or storeInfo, showing loading state');
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading store information...</p>
          <p className="text-xs text-gray-500 mt-2">
            Settings: {settings ? 'exists' : 'missing'}, 
            StoreInfo: {settings?.storeInfo ? 'exists' : 'missing'}
          </p>
        </div>
      </div>
    );
  }

  const handleInputChange = (field: keyof AppSettings['storeInfo'], value: string) => {
    updateSettings({
      storeInfo: {
        ...settings.storeInfo,
        [field]: value,
      },
    });
    onSettingsChange();
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image file must be smaller than 2MB');
      return;
    }

    setLogoFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setLogoPreview(result);
      handleInputChange('logoUrl', result);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUrlChange = (url: string) => {
    handleInputChange('logoUrl', url);
    setLogoPreview(url);
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Store Information</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Configure your store details and branding. These will appear on receipts and reports.
        </p>
      </div>

      <div className="space-y-8">
        {/* Store Logo */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Store Logo</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload Logo
              </label>
              
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    PNG, JPG up to 2MB
                  </span>
                </label>
              </div>
            </div>

            {/* Logo URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Or Logo URL
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="url"
                  value={settings.storeInfo.logoUrl || ''}
                  onChange={(e) => handleLogoUrlChange(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Logo Preview */}
          {(logoPreview || settings.storeInfo.logoUrl) && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preview
              </label>
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                <img
                  src={logoPreview || settings.storeInfo.logoUrl}
                  alt="Store logo preview"
                  className="max-h-20 max-w-full object-contain"
                  onError={() => {
                    setLogoPreview(null);
                    toast.error('Failed to load logo image');
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Store Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Store Details</h3>
          
          <div className="space-y-6">
            {/* Store Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Store Name *
              </label>
              <input
                type="text"
                value={settings.storeInfo.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter store name"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Store Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Store Address *
              </label>
              <textarea
                value={settings.storeInfo.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Enter store address"
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Use line breaks to format the address on receipts
              </p>
            </div>

            {/* Tax/VAT ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tax/VAT ID *
              </label>
              <input
                type="text"
                value={settings.storeInfo.taxId}
                onChange={(e) => handleInputChange('taxId', e.target.value)}
                placeholder="e.g., 123456789V"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Default Receipt Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Default Receipt Language *
              </label>
              <select
                value={settings.storeInfo.defaultReceiptLanguage}
                onChange={(e) => handleInputChange('defaultReceiptLanguage', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="EN">English</option>
                <option value="SI">සිංහල (Sinhala)</option>
                <option value="TA">தமிழ் (Tamil)</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This language will be used by default for receipts
              </p>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Receipt Preview</h3>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="text-center">
              {/* Logo */}
              {(logoPreview || settings.storeInfo.logoUrl) && (
                <div className="mb-4">
                  <img
                    src={logoPreview || settings.storeInfo.logoUrl}
                    alt="Store logo"
                    className="h-12 mx-auto object-contain"
                  />
                </div>
              )}
              
              {/* Store Name */}
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {settings.storeInfo.name || 'Store Name'}
              </h4>
              
              {/* Address */}
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 whitespace-pre-line">
                {settings.storeInfo.address || 'Store Address'}
              </div>
              
              {/* Tax ID */}
              <div className="text-xs text-gray-500 dark:text-gray-500">
                TAX ID: {settings.storeInfo.taxId || '123456789V'}
              </div>
              
              <div className="border-t border-gray-300 dark:border-gray-600 mt-4 pt-4">
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  Language: {settings.storeInfo.defaultReceiptLanguage}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

