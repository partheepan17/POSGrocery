import React, { useState } from 'react';
import { Cloud, Clock, Download, Upload, Trash2, Key, AlertTriangle, CheckCircle, Activity, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { AppSettings } from '@/types';

interface BackupsSectionProps {
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  onSettingsChange: () => void;
}

export function BackupsSection({ settings, updateSettings, onSettingsChange }: BackupsSectionProps) {
  // Safety check for settings.backupSettings
  if (!settings || !settings.backupSettings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading backup settings...</p>
        </div>
      </div>
    );
  }
  const [showCredentials, setShowCredentials] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [managerPin, setManagerPin] = useState('');

  const handleInputChange = (field: keyof AppSettings['backupSettings'], value: any) => {
    updateSettings({
      backupSettings: {
        ...settings.backupSettings,
        [field]: value,
      },
    });
    onSettingsChange();
  };

  const handleScheduleChange = (field: keyof AppSettings['backupSettings']['schedule'], value: any) => {
    updateSettings({
      backupSettings: {
        ...settings.backupSettings,
        schedule: {
          ...settings.backupSettings.schedule,
          [field]: value,
        },
      },
    });
    onSettingsChange();
  };

  const handleRetentionChange = (field: keyof AppSettings['backupSettings']['retention'], value: number) => {
    updateSettings({
      backupSettings: {
        ...settings.backupSettings,
        retention: {
          ...settings.backupSettings.retention,
          [field]: value,
        },
      },
    });
    onSettingsChange();
  };

  const handleCredentialChange = (key: string, value: string) => {
    const newCredentials = {
      ...settings.backupSettings.credentials,
      [key]: value,
    };
    updateSettings({
      backupSettings: {
        ...settings.backupSettings,
        credentials: newCredentials,
      },
    });
    onSettingsChange();
  };

  const handleManualBackup = async () => {
    setIsCreatingBackup(true);
    try {
      // Simulate backup creation
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Manual backup created successfully');
    } catch (error) {
      console.error('Backup failed:', error);
      toast.error('Failed to create backup');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestoreLast = async () => {
    if (!managerPin) {
      toast.error('Manager PIN is required for restore operation');
      return;
    }

    setIsRestoring(true);
    try {
      // Simulate restore operation
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Last backup restored successfully');
      setManagerPin('');
    } catch (error) {
      console.error('Restore failed:', error);
      toast.error('Failed to restore backup');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleExportBackupLog = () => {
    // Mock backup log data
    const backupLog = [
      { date: '2024-01-15', time: '22:30:00', type: 'Scheduled', status: 'Success', size: '2.5 MB' },
      { date: '2024-01-14', time: '22:30:00', type: 'Scheduled', status: 'Success', size: '2.4 MB' },
      { date: '2024-01-13', time: '14:25:00', type: 'Settings Change', status: 'Success', size: '2.3 MB' },
      { date: '2024-01-12', time: '22:30:00', type: 'Scheduled', status: 'Success', size: '2.2 MB' },
      { date: '2024-01-11', time: '22:30:00', type: 'Scheduled', status: 'Success', size: '2.1 MB' },
    ];

    const csvContent = [
      'Date,Time,Type,Status,Size',
      ...backupLog.map(log => `${log.date},${log.time},${log.type},${log.status},${log.size}`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup-log-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Backup log exported successfully');
  };

  const providers = [
    { key: 'local', name: 'Local Storage', description: 'Store backups locally on this device', icon: Download },
    { key: 'google_drive', name: 'Google Drive', description: 'Store backups in your Google Drive', icon: Cloud },
    { key: 'onedrive', name: 'OneDrive', description: 'Store backups in your OneDrive', icon: Cloud },
    { key: 's3', name: 'Amazon S3', description: 'Store backups in Amazon S3 bucket', icon: Cloud },
    { key: 'backblaze', name: 'Backblaze B2', description: 'Store backups in Backblaze B2', icon: Cloud },
  ];

  const getProviderCredentials = (provider: string) => {
    switch (provider) {
      case 'google_drive':
        return [
          { key: 'client_id', label: 'Client ID', type: 'text' },
          { key: 'client_secret', label: 'Client Secret', type: 'password' },
          { key: 'refresh_token', label: 'Refresh Token', type: 'password' },
        ];
      case 'onedrive':
        return [
          { key: 'client_id', label: 'Application ID', type: 'text' },
          { key: 'client_secret', label: 'Client Secret', type: 'password' },
          { key: 'tenant_id', label: 'Tenant ID', type: 'text' },
        ];
      case 's3':
        return [
          { key: 'access_key', label: 'Access Key ID', type: 'text' },
          { key: 'secret_key', label: 'Secret Access Key', type: 'password' },
          { key: 'bucket_name', label: 'Bucket Name', type: 'text' },
          { key: 'region', label: 'Region', type: 'text' },
        ];
      case 'backblaze':
        return [
          { key: 'key_id', label: 'Key ID', type: 'text' },
          { key: 'application_key', label: 'Application Key', type: 'password' },
          { key: 'bucket_name', label: 'Bucket Name', type: 'text' },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Backup Settings</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Configure automatic backups, restore options, and backup storage providers.
        </p>
      </div>

      <div className="space-y-8">
        {/* Backup Provider */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Cloud className="w-5 h-5 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Backup Provider</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Select backup storage provider
              </label>
              
              <div className="space-y-3">
                {providers.map((provider) => {
                  const Icon = provider.icon;
                  const isSelected = settings.backupSettings.provider === provider.key;
                  
                  return (
                    <label
                      key={provider.key}
                      className={`relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name="backupProvider"
                        value={provider.key}
                        checked={isSelected}
                        onChange={(e) => handleInputChange('provider', e.target.value)}
                        className="sr-only"
                      />
                      <div className="flex items-start">
                        <Icon className={`w-5 h-5 mt-0.5 mr-3 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                        <div className="flex-1">
                          <div className={`text-sm font-medium ${isSelected ? 'text-blue-900 dark:text-blue-100' : 'text-gray-700 dark:text-gray-300'}`}>
                            {provider.name}
                          </div>
                          <div className={`text-xs mt-1 ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}>
                            {provider.description}
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

            {/* Provider Credentials */}
            {settings.backupSettings.provider !== 'local' && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Provider Credentials
                  </h4>
                  <button
                    onClick={() => setShowCredentials(!showCredentials)}
                    className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Key className="w-4 h-4 mr-1" />
                    {showCredentials ? 'Hide' : 'Show'} Credentials
                  </button>
                </div>

                {showCredentials && (
                  <div className="space-y-4">
                    {getProviderCredentials(settings.backupSettings.provider).map((cred) => (
                      <div key={cred.key}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {cred.label}
                        </label>
                        <input
                          type={cred.type}
                          value={settings.backupSettings.credentials?.[cred.key] || ''}
                          onChange={(e) => handleCredentialChange(cred.key, e.target.value)}
                          placeholder={`Enter ${cred.label.toLowerCase()}`}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Backup Schedule */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Clock className="w-5 h-5 text-green-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Backup Schedule</h3>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Daily Backup Time
              </label>
              <input
                type="time"
                value={settings.backupSettings.schedule.dailyTime}
                onChange={(e) => handleScheduleChange('dailyTime', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Automatic daily backup will run at this time
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Backup on Settings Change
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Create backup whenever settings are modified
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.backupSettings.schedule.onSettingsChange}
                  onChange={(e) => handleScheduleChange('onSettingsChange', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Backup Retention */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Trash2 className="w-5 h-5 text-orange-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Backup Retention</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Keep Daily Backups
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={settings.backupSettings.retention.keepDaily}
                onChange={(e) => handleRetentionChange('keepDaily', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Number of daily backups to retain
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Keep Config-Change Backups
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={settings.backupSettings.retention.keepConfigChange}
                onChange={(e) => handleRetentionChange('keepConfigChange', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Number of settings-change backups to retain
              </p>
            </div>
          </div>
        </div>

        {/* Manual Operations */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Manual Operations</h3>
          
          <div className="space-y-6">
            {/* Manual Backup */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Create Manual Backup
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Create an immediate backup of current settings and data
                </p>
              </div>
              <button
                onClick={handleManualBackup}
                disabled={isCreatingBackup}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isCreatingBackup ? 'Creating...' : 'Create Backup'}
              </button>
            </div>

            {/* Restore Last Backup */}
            <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Restore Last Backup
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Restore the most recent backup (requires manager PIN)
                  </p>
                </div>
                <button
                  onClick={handleRestoreLast}
                  disabled={isRestoring}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isRestoring ? 'Restoring...' : 'Restore Last'}
                </button>
              </div>
              
              <div className="max-w-xs">
                <input
                  type="password"
                  value={managerPin}
                  onChange={(e) => setManagerPin(e.target.value)}
                  placeholder="Enter manager PIN"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Export Backup Log */}
            <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Export Backup Log
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Download CSV log of all backup operations
                  </p>
                </div>
                <button
                  onClick={handleExportBackupLog}
                  className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Log
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Backup Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Backup Status</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Last Backup</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                2024-01-15 22:30:00 (Success)
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center">
                <Clock className="w-4 h-4 text-blue-600 mr-2" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Next Scheduled</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Today at {settings.backupSettings.schedule.dailyTime}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center">
                <Cloud className="w-4 h-4 text-purple-600 mr-2" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Storage Used</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                12.5 MB / 1 GB
              </div>
            </div>

            {/* Health Check Link */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" />
                  <div>
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">System Health Check</span>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Monitor backup system and overall application health
                    </p>
                  </div>
                </div>
                <Link
                  to="/health"
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded-md transition-colors"
                >
                  Check System
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

