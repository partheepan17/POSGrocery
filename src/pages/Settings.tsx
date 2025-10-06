import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Download, Upload, Settings as SettingsIcon, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAppStore } from '@/store/appStore';
import { AppSettings } from '@/types';
import { SettingsValidationService } from '@/services/settingsValidation';
import { settingsIntegration } from '@/services/settingsIntegration';

// Import section components
import { StoreInfoSection } from '@/components/Settings/StoreInfoSection';
import { DevicesSection } from '@/components/Settings/DevicesSection';
import { LanguageFormattingSection } from '@/components/Settings/LanguageFormattingSection';
import { PricingPoliciesSection } from '@/components/Settings/PricingPoliciesSection';
import { ReceiptOptionsSection } from '@/components/Settings/ReceiptOptionsSection';
import { BackupsSection } from '@/components/Settings/BackupsSection';
import CompanySettings from './Settings/Company';

type SettingsSection = 'store-info' | 'devices' | 'language-formatting' | 'pricing-policies' | 'receipt-options' | 'backups' | 'company';

const sectionConfig = [
  { id: 'store-info' as SettingsSection, label: 'Store Info', icon: SettingsIcon },
  { id: 'company' as SettingsSection, label: 'Company', icon: SettingsIcon },
  { id: 'devices' as SettingsSection, label: 'Devices', icon: SettingsIcon },
  { id: 'language-formatting' as SettingsSection, label: 'Language & Formatting', icon: SettingsIcon },
  { id: 'pricing-policies' as SettingsSection, label: 'Pricing Policies', icon: SettingsIcon },
  { id: 'receipt-options' as SettingsSection, label: 'Receipt Options', icon: SettingsIcon },
  { id: 'backups' as SettingsSection, label: 'Backups', icon: SettingsIcon },
];

export function Settings() {
  const { settings, updateSettings } = useAppStore();
  
  // Debug logging
  console.log('Settings page - settings from store:', settings);
  console.log('Settings page - settings keys:', settings ? Object.keys(settings) : 'no settings');
  
  // Emergency reset function for debugging
  const emergencyReset = () => {
    console.log('Performing emergency settings reset...');
    localStorage.removeItem('grocery-pos-app');
    window.location.reload();
  };
  
  // If settings is completely broken, show reset option
  if (!settings) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-6 py-4 rounded-lg">
            <h3 className="font-bold mb-2">Settings Not Found</h3>
            <p className="mb-4">The application settings could not be loaded.</p>
            <button
              onClick={emergencyReset}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reset Settings
            </button>
          </div>
        </div>
      </div>
    );
  }
  const [activeSection, setActiveSection] = useState<SettingsSection>('store-info');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Track changes to detect unsaved state
  useEffect(() => {
    // This will be updated by child components when they detect changes
    setHasUnsavedChanges(false);
  }, [settings]);

  const handleSave = async () => {
    // Validate settings before saving
    const validation = SettingsValidationService.validateAllSettings(settings);
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors.map(error => `${error.section}: ${error.message}`));
      toast.error('Please fix validation errors before saving');
      return;
    }

    if (validation.warnings.length > 0) {
      toast.error(`Settings saved with ${validation.warnings.length} warning(s)`);
    }

    setIsSaving(true);
    try {
      // Apply settings changes immediately to the running application
      settingsIntegration.updateSettings(settings);
      
      // Settings are automatically saved to the store via updateSettings
      // This is just for UI feedback and any additional persistence logic
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate save operation
      setHasUnsavedChanges(false);
      setValidationErrors([]);
      toast.success('Settings saved and applied successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      // Reset to default settings
      updateSettings({
        storeInfo: {
          name: 'My Grocery Store',
          address: '123 Main Street\nColombo 01\nSri Lanka',
          taxId: '123456789V',
          logoUrl: '',
          defaultReceiptLanguage: 'EN',
        },
        devices: {
          receiptPaper: '80mm',
          cashDrawerOpenOnCash: true,
          barcodeInputMode: 'keyboard_wedge',
          scaleMode: 'off',
        },
        languageFormatting: {
          displayLanguage: 'EN',
          roundingMode: 'NEAREST_1',
          kgDecimals: 3,
        },
        pricingPolicies: {
          missingPricePolicy: 'warn_fallback',
          requiredTiers: ['retail'],
          autoCreateCategories: true,
          autoCreateSuppliers: true,
        },
        receiptOptions: {
          footerTextEN: 'Warranty: 7 days | Hotline: 011-1234567',
          footerTextSI: 'වගකීම: දින 7 | දුරකථන: 011-1234567',
          footerTextTA: 'உத்தரவாதம்: 7 நாட்கள் | தொலைபேசி: 011-1234567',
          showQRCode: true,
          showBarcode: true,
          showTierBadge: false,
        },
        backupSettings: {
          provider: 'local',
          schedule: {
            dailyTime: '22:30',
            onSettingsChange: true,
          },
          retention: {
            keepDaily: 30,
            keepConfigChange: 5,
          },
        },
      });
      setHasUnsavedChanges(false);
      toast.success('Settings reset to defaults');
    } catch (error) {
      console.error('Failed to reset settings:', error);
      toast.error('Failed to reset settings');
    } finally {
      setIsResetting(false);
    }
  };

  const handleExportConfig = () => {
    try {
      const configData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        settings: settings,
      };
      
      const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pos-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Configuration exported successfully');
    } catch (error) {
      console.error('Failed to export configuration:', error);
      toast.error('Failed to export configuration');
    }
  };

  const handleImportConfig = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const configData = JSON.parse(text);
        
        // Validate the imported configuration
        if (!configData.settings || !configData.version) {
          throw new Error('Invalid configuration file format');
        }

        // Show preview and confirmation
        const confirmed = window.confirm(
          'Import this configuration? This will overwrite your current settings.'
        );
        
        if (confirmed) {
          updateSettings(configData.settings);
          setHasUnsavedChanges(false);
          toast.success('Configuration imported successfully');
        }
      } catch (error) {
        console.error('Failed to import configuration:', error);
        toast.error('Failed to import configuration: ' + (error as Error).message);
      }
    };
    input.click();
  };

  const renderActiveSection = () => {
    const commonProps = {
      settings,
      updateSettings,
      onSettingsChange: () => setHasUnsavedChanges(true),
    };

    switch (activeSection) {
      case 'store-info':
        return <StoreInfoSection {...commonProps} />;
      case 'company':
        return <CompanySettings />;
      case 'devices':
        return <DevicesSection {...commonProps} />;
      case 'language-formatting':
        return <LanguageFormattingSection {...commonProps} />;
      case 'pricing-policies':
        return <PricingPoliciesSection {...commonProps} />;
      case 'receipt-options':
        return <ReceiptOptionsSection {...commonProps} />;
      case 'backups':
        return <BackupsSection {...commonProps} />;
      default:
        return <StoreInfoSection {...commonProps} />;
    }
  };

  // Simple fallback check
  if (!settings) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  // Check if settings is missing critical structure
  if (!settings.storeInfo || !settings.devices) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="bg-orange-100 border border-orange-400 text-orange-700 px-6 py-4 rounded-lg max-w-md">
            <h3 className="font-bold mb-2">Settings Structure Issue</h3>
            <p className="mb-4 text-sm">Settings are missing required structure. This usually happens after updates.</p>
            <div className="space-y-2">
              <button
                onClick={emergencyReset}
                className="block w-full px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                Fix Settings (Reset)
              </button>
              <p className="text-xs text-orange-600">This will reset all settings to defaults</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-gray-50 dark:bg-gray-900">
      {/* Left Sidebar - Section Navigation */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure your POS system
          </p>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {sectionConfig.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              
              return (
                <li key={section.id}>
                  <button
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-3" />
                    {section.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Action Buttons */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving || validationErrors.length > 0}
            className={`w-full flex items-center justify-center px-4 py-2 rounded-lg transition-colors ${
              validationErrors.length > 0
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : validationErrors.length > 0 ? 'Fix Errors First' : 'Save Changes'}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="flex items-center justify-center px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </button>

            <button
              onClick={handleExportConfig}
              className="flex items-center justify-center px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800 transition-colors"
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </button>
          </div>

          <button
            onClick={handleImportConfig}
            className="w-full flex items-center justify-center px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:hover:bg-purple-800 transition-colors"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import Config
          </button>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="px-4 pb-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 mr-2" />
                <div>
                  <p className="text-xs font-medium text-red-800 dark:text-red-200">
                    Validation Errors:
                  </p>
                  <ul className="text-xs text-red-700 dark:text-red-300 mt-1 space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Unsaved Changes Indicator */}
        {hasUnsavedChanges && validationErrors.length === 0 && (
          <div className="px-4 pb-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                You have unsaved changes
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Section Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {renderActiveSection()}
        </div>
      </div>
    </div>
  );
}