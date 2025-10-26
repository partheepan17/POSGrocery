import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings as SettingsIcon, Save, RefreshCw, Download, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TerminalRegistration } from '@/components/Settings/TerminalRegistration';
import { PreferencesSection } from '@/components/Settings/PreferencesSection';
import { RoleDisplay } from '@/components/Settings/RoleDisplay';
import { useSettingsStore, TerminalInfo } from '@/store/settingsStore';

export function Settings() {
  const { t } = useTranslation();
  const { preferences, currentTerminal } = useSettingsStore();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'terminal' | 'user'>('general');

  const handleTerminalChange = (terminal: TerminalInfo) => {
    // Terminal change is handled by the store
    toast.success(`Switched to terminal: ${terminal.name}`);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Simulate save operation
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportSettings = () => {
    try {
      const settingsData = {
        preferences,
        currentTerminal,
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
      };

      const blob = new Blob([JSON.stringify(settingsData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pos-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Settings exported successfully');
    } catch (error) {
      toast.error('Failed to export settings');
    }
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
      if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const settingsData = JSON.parse(e.target?.result as string);
        
        // Validate and apply settings
        if (settingsData.preferences) {
          useSettingsStore.getState().updatePreferences(settingsData.preferences);
        }
        if (settingsData.currentTerminal) {
          useSettingsStore.getState().setCurrentTerminal(settingsData.currentTerminal);
        }

        toast.success('Settings imported successfully');
      } catch (error) {
        toast.error('Invalid settings file');
      }
    };
    reader.readAsText(file);
  };

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'terminal', label: 'Terminal', icon: SettingsIcon },
    { id: 'user', label: 'User', icon: SettingsIcon },
  ];

    return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <SettingsIcon className="w-6 h-6" />
              {t('settings.title', 'Settings')}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('settings.description', 'Manage your application preferences and configuration')}
            </p>
        </div>
          <div className="flex items-center space-x-3">
            <input
              type="file"
              accept=".json"
              onChange={handleImportSettings}
              className="hidden"
              id="import-settings"
            />
            <label
              htmlFor="import-settings"
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors cursor-pointer gap-2"
            >
              <Upload className="w-4 h-4" />
              Import
            </label>
            <Button
              onClick={handleExportSettings}
              variant="outline"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </div>
            </button>
          ))}
        </nav>
          </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* General Settings Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <PreferencesSection />
              
              {/* System Information */}
              <Card>
                <CardHeader>
                  <CardTitle>System Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Application Version:</span>
                      <div className="font-medium text-gray-900 dark:text-white">
                        POS Grocery v2.0.0
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Build Date:</span>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {new Date().toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Environment:</span>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {import.meta.env.MODE}
                      </div>
        </div>
                <div>
                      <span className="text-gray-600 dark:text-gray-400">Platform:</span>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {navigator.platform}
                </div>
              </div>
            </div>
                </CardContent>
              </Card>
          </div>
        )}

          {/* Terminal Settings Tab */}
          {activeTab === 'terminal' && (
            <div className="space-y-6">
              <TerminalRegistration onTerminalChange={handleTerminalChange} />
              
              {/* Terminal Status */}
              {currentTerminal.id && (
                <Card>
                  <CardHeader>
                    <CardTitle>Terminal Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Terminal ID:</span>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {currentTerminal.id}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Status:</span>
                        <div className="font-medium text-gray-900 dark:text-white">
                          <Badge className={currentTerminal.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {currentTerminal.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Last Seen:</span>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {currentTerminal.lastSeen 
                            ? new Date(currentTerminal.lastSeen).toLocaleString()
                            : 'Never'
                          }
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Connection:</span>
                        <div className="font-medium text-gray-900 dark:text-white">
                          <Badge className="bg-green-100 text-green-800">
                            Online
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* User Settings Tab */}
          {activeTab === 'user' && (
            <div className="space-y-6">
              <RoleDisplay />
              
              {/* Current Settings Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Settings Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Theme:</span>
                        <div className="font-medium text-gray-900 dark:text-white capitalize">
                          {preferences.theme}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Language:</span>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {preferences.language.toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Valuation Method:</span>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {preferences.defaultValuationMethod}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Terminal:</span>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {currentTerminal.name || 'Not Registered'}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
          </div>
        )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span>Settings are automatically saved</span>
            <span>•</span>
            <span>Last updated: {new Date().toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {currentTerminal.name || 'No Terminal'}
            </Badge>
            <Badge variant="outline">
              {preferences.theme}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
