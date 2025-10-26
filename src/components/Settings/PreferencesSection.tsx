import React from 'react';
import { Palette, Globe, Calculator, Bell, Monitor, Keyboard, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useSettingsStore, Theme, Language, ValuationMethod } from '@/store/settingsStore';

export function PreferencesSection() {
  const { 
    preferences, 
    updatePreference, 
    updateNestedPreference, 
    resetPreferences 
  } = useSettingsStore();

  const handleThemeChange = (theme: Theme) => {
    updatePreference('theme', theme);
    // Apply theme to document
    const root = document.documentElement;
    if (theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const handleLanguageChange = (language: Language) => {
    updatePreference('language', language);
  };

  const handleValuationMethodChange = (method: ValuationMethod) => {
    updatePreference('defaultValuationMethod', method);
  };

  const handleNotificationChange = (key: keyof typeof preferences.notifications, value: boolean) => {
    updateNestedPreference('notifications', key, value);
  };

  const handleUIChange = (key: keyof typeof preferences.ui, value: boolean) => {
    updateNestedPreference('ui', key, value);
  };

  const getThemeIcon = (theme: Theme) => {
    switch (theme) {
      case 'light': return '☀️';
      case 'dark': return '🌙';
      case 'auto': return '🔄';
      default: return '🔄';
    }
  };

  const getLanguageName = (lang: Language) => {
    switch (lang) {
      case 'en': return 'English';
      case 'si': return 'සිංහල';
      case 'ta': return 'தமிழ்';
      default: return 'English';
    }
  };

  const getValuationMethodName = (method: ValuationMethod) => {
    switch (method) {
      case 'fifo': return 'FIFO (First In, First Out)';
      case 'lifo': return 'LIFO (Last In, First Out)';
      case 'average': return 'Average Cost';
      case 'informational': return 'Informational Only';
      default: return 'Informational Only';
    }
  };

  const getValuationMethodDescription = (method: ValuationMethod) => {
    switch (method) {
      case 'fifo': return 'Uses the cost of the oldest inventory first';
      case 'lifo': return 'Uses the cost of the newest inventory first';
      case 'average': return 'Uses the average cost of all inventory';
      case 'informational': return 'Cost tracking for reporting only, no impact on calculations';
      default: return 'Cost tracking for reporting only, no impact on calculations';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Selection */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Theme
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {(['light', 'dark', 'auto'] as Theme[]).map((theme) => (
              <button
                key={theme}
                onClick={() => handleThemeChange(theme)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  preferences.theme === theme
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="text-2xl mb-1">{getThemeIcon(theme)}</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                  {theme}
                </div>
                {theme === 'auto' && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    System
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Language Selection */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Language
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {(['en', 'si', 'ta'] as Language[]).map((language) => (
              <button
                key={language}
                onClick={() => handleLanguageChange(language)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  preferences.language === language
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {getLanguageName(language)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {language.toUpperCase()}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Valuation Method */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Default Valuation Method
          </h4>
          <div className="space-y-2">
            {(['fifo', 'lifo', 'average', 'informational'] as ValuationMethod[]).map((method) => (
              <button
                key={method}
                onClick={() => handleValuationMethodChange(method)}
                className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                  preferences.defaultValuationMethod === method
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {getValuationMethodName(method)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {getValuationMethodDescription(method)}
                    </div>
                  </div>
                  {preferences.defaultValuationMethod === method && (
                    <Badge variant="default" className="text-xs">
                      Current
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </h4>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Sound Notifications</span>
              <input
                type="checkbox"
                checked={preferences.notifications.sound}
                onChange={(e) => handleNotificationChange('sound', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Desktop Notifications</span>
              <input
                type="checkbox"
                checked={preferences.notifications.desktop}
                onChange={(e) => handleNotificationChange('desktop', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Email Notifications</span>
              <input
                type="checkbox"
                checked={preferences.notifications.email}
                onChange={(e) => handleNotificationChange('email', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        {/* UI Preferences */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Keyboard className="w-4 h-4" />
            Interface
          </h4>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Compact Mode</span>
              <input
                type="checkbox"
                checked={preferences.ui.compactMode}
                onChange={(e) => handleUIChange('compactMode', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Show Keyboard Shortcuts</span>
              <input
                type="checkbox"
                checked={preferences.ui.showKeyboardShortcuts}
                onChange={(e) => handleUIChange('showKeyboardShortcuts', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Auto Save</span>
              <input
                type="checkbox"
                checked={preferences.ui.autoSave}
                onChange={(e) => handleUIChange('autoSave', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Reset all preferences to default values
            </div>
            <Button
              onClick={resetPreferences}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              Reset to Defaults
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}










