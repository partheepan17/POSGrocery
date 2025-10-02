import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Settings,
  Clock,
  RotateCcw,
  Play,
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Key,
  Folder,
  Cloud,
  HardDrive,
  Database,
  FileText,
  RefreshCw,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { backupService, BackupLog, BackupProgress } from '@/services/backupService';
import { schedulerService, ScheduleInfo } from '@/services/schedulerService';
import { csvService } from '@/services/csvService';
import { cryptoService } from '@/services/cryptoService';
import { LocalBackupAdapter } from '@/adapters/backup/LocalBackupAdapter';
import { DriveBackupAdapter } from '@/adapters/backup/DriveBackupAdapter';
import { OneDriveBackupAdapter } from '@/adapters/backup/OneDriveBackupAdapter';
import { S3BackupAdapter } from '@/adapters/backup/S3BackupAdapter';

type SectionId = 'provider' | 'schedule' | 'retention' | 'actions' | 'logs';

type ProviderType = 'local' | 'google_drive' | 'onedrive' | 's3' | 'backblaze';

interface ProviderConfig {
  [key: string]: any;
}

export function Backups() {
  const { settings, updateSettings } = useAppStore();
  
  // UI States
  const [activeSection, setActiveSection] = useState<SectionId>('provider');
  const [loading, setLoading] = useState(false);
  const [connectionTesting, setConnectionTesting] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ ok: boolean; message?: string } | null>(null);
  
  // Provider Configuration
  const [selectedProvider, setSelectedProvider] = useState<ProviderType>('local');
  const [providerConfig, setProviderConfig] = useState<ProviderConfig>({});
  const [showEncryptionKey, setShowEncryptionKey] = useState(false);
  
  // Schedule Configuration
  const [scheduleInfo, setScheduleInfo] = useState<ScheduleInfo | null>(null);
  const [dailyTime, setDailyTime] = useState('22:30');
  const [onSettingsChange, setOnSettingsChange] = useState(false);
  
  // Retention Configuration
  const [keepDaily, setKeepDaily] = useState(30);
  const [keepConfig, setKeepConfig] = useState(5);
  
  // Actions
  const [backupProgress, setBackupProgress] = useState<BackupProgress | null>(null);
  const [managerPin, setManagerPin] = useState('');
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [restoreConfirming, setRestoreConfirming] = useState(false);
  
  // Logs
  const [logs, setLogs] = useState<BackupLog[]>([]);
  const [logFilters, setLogFilters] = useState({
    fromDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    toDate: new Date(),
    type: '' as BackupLog['type'] | '',
    result: '' as BackupLog['result'] | ''
  });
  
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Load initial data
  useEffect(() => {
    loadBackupSettings();
    loadScheduleInfo();
    loadLogs();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.altKey && e.key === 's') {
        e.preventDefault();
        handleSaveProvider();
      }
      
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        handleManualBackup();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadBackupSettings = () => {
    const backupSettings = settings?.backupSettings;
    if (backupSettings) {
      setSelectedProvider(backupSettings.provider as ProviderType || 'local');
      setProviderConfig(backupSettings.credentials || {});
      
      if (backupSettings.schedule) {
        setDailyTime(backupSettings.schedule.dailyTime || '22:30');
        setOnSettingsChange(backupSettings.schedule.onSettingsChange || false);
      }
      
      if (backupSettings.retention) {
        setKeepDaily(backupSettings.retention.keepDaily || 30);
        setKeepConfig(backupSettings.retention.keepConfigChange || 5);
      }
    }
  };

  const loadScheduleInfo = () => {
    try {
      const info = schedulerService.getScheduleInfo();
      setScheduleInfo(info);
    } catch (error) {
      console.error('Failed to load schedule info:', error);
    }
  };

  const loadLogs = () => {
    try {
      const allLogs = backupService.getLogs({
        fromDate: logFilters.fromDate,
        toDate: logFilters.toDate,
        type: logFilters.type || undefined,
        result: logFilters.result || undefined
      });
      setLogs(allLogs);
    } catch (error) {
      console.error('Failed to load backup logs:', error);
      setLogs([]);
    }
  };

  const handleProviderChange = (provider: ProviderType) => {
    setSelectedProvider(provider);
    setProviderConfig({});
    setConnectionResult(null);
  };

  const handleConfigChange = (key: string, value: any) => {
    setProviderConfig(prev => ({
      ...prev,
      [key]: value
    }));
    setConnectionResult(null);
  };

  const handleTestConnection = async () => {
    setConnectionTesting(true);
    setConnectionResult(null);
    
    try {
      // Create temporary adapter for testing
      let adapter;
      switch (selectedProvider) {
        case 'local':
          adapter = new LocalBackupAdapter(providerConfig);
          break;
      case 'google_drive':
        adapter = new DriveBackupAdapter(providerConfig);
        break;
        case 'onedrive':
          adapter = new OneDriveBackupAdapter(providerConfig);
          break;
        case 's3':
          adapter = new S3BackupAdapter(providerConfig, false);
          break;
        case 'backblaze':
          adapter = new S3BackupAdapter(providerConfig, true);
          break;
        default:
          throw new Error('Unsupported provider');
      }
      
      const result = await adapter.testConnection();
      setConnectionResult(result);
      
    } catch (error) {
      setConnectionResult({
        ok: false,
        message: error instanceof Error ? error.message : 'Connection test failed'
      });
    } finally {
      setConnectionTesting(false);
    }
  };

  const handleSaveProvider = async () => {
    if (!settings) return;
    
    setLoading(true);
    try {
      // Validate encryption key if provided
      if (providerConfig.encryptionKey) {
        const validation = cryptoService.validateEncryptionKey(providerConfig.encryptionKey);
        if (!validation.valid) {
          alert(`Invalid encryption key: ${validation.error}`);
          return;
        }
      }
      
      const updatedSettings = {
        ...settings,
        backupSettings: {
          ...settings.backupSettings,
          provider: selectedProvider,
          credentials: providerConfig
        }
      };
      
      updateSettings(updatedSettings);
      
      // Reload schedule info
      loadScheduleInfo();
      
      alert('Backup provider settings saved successfully');
      
    } catch (error) {
      alert(`Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchedule = () => {
    schedulerService.updateSchedule(dailyTime, onSettingsChange);
    loadScheduleInfo();
    alert('Backup schedule saved successfully');
  };

  const handleSaveRetention = async () => {
    if (!settings) return;
    
    const updatedSettings = {
      ...settings,
      backupSettings: {
        ...settings.backupSettings,
        retention: {
          keepDaily,
          keepConfigChange: keepConfig
        }
      }
    };
    
    updateSettings(updatedSettings);
    alert('Retention policy saved successfully');
  };

  const handleApplyRetention = async () => {
    setLoading(true);
    try {
      await backupService.applyRetentionNow();
      loadLogs();
      alert('Retention policy applied successfully');
    } catch (error) {
      alert(`Failed to apply retention: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleManualBackup = async () => {
    setLoading(true);
    setBackupProgress(null);
    
    try {
      await backupService.createSnapshot('daily', (progress) => {
        setBackupProgress(progress);
      });
      
      loadLogs();
      alert('Manual backup completed successfully');
      
    } catch (error) {
      alert(`Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setBackupProgress(null);
    }
  };

  const handleRestoreLast = () => {
    setShowPinDialog(true);
    setManagerPin('');
    setTimeout(() => pinInputRef.current?.focus(), 100);
  };

  const handlePinSubmit = async () => {
    if (managerPin.length < 4 || managerPin.length > 6) {
      alert('Manager PIN must be 4-6 digits');
      return;
    }
    
    // TODO: Validate PIN against users table
    if (managerPin !== '1234') { // Mock validation
      alert('Invalid Manager PIN');
      return;
    }
    
    setShowPinDialog(false);
    setRestoreConfirming(true);
  };

  const handleConfirmRestore = async () => {
    setRestoreConfirming(false);
    setLoading(true);
    setBackupProgress(null);
    
    try {
      await backupService.restoreLatest((progress) => {
        setBackupProgress(progress);
      });
      
      loadLogs();
      alert('Restore completed successfully. The application will reload.');
      
    } catch (error) {
      alert(`Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setBackupProgress(null);
    }
  };

  const handleVerifyLast = async () => {
    setLoading(true);
    try {
      await backupService.verifyLatest();
      loadLogs();
      alert('Backup verification completed successfully');
    } catch (error) {
      alert(`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportLogs = () => {
    csvService.exportBackupLogsCSV(logs, logFilters);
  };

  const generateEncryptionKey = () => {
    const key = cryptoService.generateEncryptionKey();
    handleConfigChange('encryptionKey', key);
    alert('New encryption key generated. Make sure to save your settings!');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard');
    });
  };

  const renderProviderFields = () => {
    let adapter;
    switch (selectedProvider) {
      case 'local':
        adapter = new LocalBackupAdapter({});
        break;
      case 'google_drive':
        adapter = new DriveBackupAdapter({});
        break;
      case 'onedrive':
        adapter = new OneDriveBackupAdapter({});
        break;
      case 's3':
        adapter = new S3BackupAdapter({}, false);
        break;
      case 'backblaze':
        adapter = new S3BackupAdapter({}, true);
        break;
      default:
        return null;
    }
    
    const schema = adapter.getConfigSchema();
    
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">{schema.description}</p>
        
        {schema.fields.map(field => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            
            {field.type === 'select' ? (
              <select
                value={providerConfig[field.key] || ''}
                onChange={(e) => handleConfigChange(field.key, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required={field.required}
              >
                <option value="">Select...</option>
                {field.options?.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : field.type === 'boolean' ? (
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={providerConfig[field.key] || false}
                  onChange={(e) => handleConfigChange(field.key, e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">{field.label}</span>
              </label>
            ) : (
              <div className="relative">
                <input
                  type={field.type === 'password' ? (showEncryptionKey && field.key === 'encryptionKey' ? 'text' : 'password') : 'text'}
                  value={providerConfig[field.key] || ''}
                  onChange={(e) => handleConfigChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required={field.required}
                />
                {field.type === 'password' && field.key === 'encryptionKey' && (
                  <div className="absolute right-2 top-2 flex space-x-1">
                    <button
                      type="button"
                      onClick={() => setShowEncryptionKey(!showEncryptionKey)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {showEncryptionKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={generateEncryptionKey}
                      className="text-gray-400 hover:text-gray-600"
                      title="Generate new encryption key"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        
        {/* Encryption key field for all providers */}
        {!schema.fields.find(f => f.key === 'encryptionKey') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Encryption Key <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <input
                type={showEncryptionKey ? 'text' : 'password'}
                value={providerConfig.encryptionKey || ''}
                onChange={(e) => handleConfigChange('encryptionKey', e.target.value)}
                placeholder="Enter a secure encryption key (min 8 characters)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <div className="absolute right-2 top-2 flex space-x-1">
                <button
                  type="button"
                  onClick={() => setShowEncryptionKey(!showEncryptionKey)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {showEncryptionKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={generateEncryptionKey}
                  className="text-gray-400 hover:text-gray-600"
                  title="Generate new encryption key"
                >
                  <Key className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              This key encrypts your backups. Keep it safe - you'll need it to restore backups.
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderProviderSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Backup Provider</h3>
        
        {/* Provider Selection */}
        <div className="space-y-3 mb-6">
          {[
            { id: 'local' as ProviderType, name: 'Local Folder', icon: HardDrive, description: 'Store backups on this computer' },
            { id: 'google_drive' as ProviderType, name: 'Google Drive', icon: Cloud, description: 'Store backups in Google Drive' },
            { id: 'onedrive' as ProviderType, name: 'OneDrive', icon: Cloud, description: 'Store backups in Microsoft OneDrive' },
            { id: 's3' as ProviderType, name: 'Amazon S3', icon: Database, description: 'Store backups in Amazon S3' },
            { id: 'backblaze' as ProviderType, name: 'Backblaze B2', icon: Database, description: 'Store backups in Backblaze B2' }
          ].map(provider => (
            <label key={provider.id} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="provider"
                value={provider.id}
                checked={selectedProvider === provider.id}
                onChange={(e) => handleProviderChange(e.target.value as ProviderType)}
                className="mr-3"
              />
              <provider.icon className="w-5 h-5 mr-3 text-gray-600" />
              <div>
                <div className="font-medium text-gray-900">{provider.name}</div>
                <div className="text-sm text-gray-600">{provider.description}</div>
              </div>
            </label>
          ))}
        </div>
        
        {/* Provider Configuration */}
        {renderProviderFields()}
        
        {/* Connection Test */}
        <div className="flex items-center space-x-3 mt-6">
          <button
            onClick={handleTestConnection}
            disabled={connectionTesting}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${connectionTesting ? 'animate-spin' : ''}`} />
            Test Connection
          </button>
          
          {connectionResult && (
            <div className={`flex items-center px-3 py-2 rounded-lg ${
              connectionResult.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {connectionResult.ok ? (
                <CheckCircle className="w-4 h-4 mr-2" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              <span className="text-sm">{connectionResult.message}</span>
            </div>
          )}
        </div>
        
        {/* Save Button */}
        <div className="flex justify-end mt-6">
          <button
            onClick={handleSaveProvider}
            disabled={loading}
            className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Settings className="w-4 h-4 mr-2" />
            Save Provider Settings
          </button>
        </div>
      </div>
    </div>
  );

  const renderScheduleSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Backup Schedule</h3>
        
        {scheduleInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center mb-2">
              <Clock className="w-5 h-5 text-blue-600 mr-2" />
              <span className="font-medium text-blue-900">Current Schedule</span>
            </div>
            <div className="text-sm text-blue-800 space-y-1">
              <div>Status: {scheduleInfo.isEnabled ? 'Enabled' : 'Disabled'}</div>
              <div>Daily backup at: {scheduleInfo.dailyTime}</div>
              <div>On settings change: {scheduleInfo.onSettingsChange ? 'Yes' : 'No'}</div>
              <div>Next run: {scheduleInfo.nextRun ? scheduleInfo.nextRun.toLocaleString() : 'Not scheduled'}</div>
              <div>Last run: {scheduleInfo.lastRun ? scheduleInfo.lastRun.toLocaleString() : 'Never'}</div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Daily Backup Time</label>
            <input
              type="time"
              value={dailyTime}
              onChange={(e) => setDailyTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">24-hour format (e.g., 22:30 for 10:30 PM)</p>
          </div>
          
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={onSettingsChange}
                onChange={(e) => setOnSettingsChange(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">Run backup when settings change</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">Creates config snapshots automatically</p>
          </div>
        </div>
        
        <div className="flex justify-end mt-6">
          <button
            onClick={handleSaveSchedule}
            className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Clock className="w-4 h-4 mr-2" />
            Save Schedule
          </button>
        </div>
      </div>
    </div>
  );

  const renderRetentionSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Retention Policy</h3>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
            <span className="font-medium text-yellow-900">Automatic Cleanup</span>
          </div>
          <p className="text-sm text-yellow-800">
            Rotation automatically deletes oldest backups beyond these counts to save storage space.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Keep Daily Backups</label>
            <input
              type="number"
              value={keepDaily}
              onChange={(e) => setKeepDaily(parseInt(e.target.value) || 30)}
              min="1"
              max="365"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Default: 30 days</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Keep Config Change Backups</label>
            <input
              type="number"
              value={keepConfig}
              onChange={(e) => setKeepConfig(parseInt(e.target.value) || 5)}
              min="1"
              max="50"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Default: 5 backups</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 mt-6">
          <button
            onClick={handleSaveRetention}
            className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Settings className="w-4 h-4 mr-2" />
            Save Retention Policy
          </button>
          
          <button
            onClick={handleApplyRetention}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Apply Retention Now
          </button>
        </div>
      </div>
    </div>
  );

  const renderActionsSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Backup Actions</h3>
        
        {/* Progress Display */}
        {backupProgress && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center mb-2">
              <RefreshCw className="w-5 h-5 text-blue-600 mr-2 animate-spin" />
              <span className="font-medium text-blue-900">{backupProgress.message}</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${backupProgress.progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-blue-800 mt-1">{backupProgress.progress}% complete</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Manual Backup */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Upload className="w-6 h-6 text-green-600 mr-3" />
              <div>
                <h4 className="font-medium text-gray-900">Manual Backup</h4>
                <p className="text-sm text-gray-600">Create backup now</p>
              </div>
            </div>
            <button
              onClick={handleManualBackup}
              disabled={loading}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4 mr-2 inline" />
              Backup Now (Ctrl+B)
            </button>
          </div>
          
          {/* Restore Last */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Download className="w-6 h-6 text-red-600 mr-3" />
              <div>
                <h4 className="font-medium text-gray-900">Restore Last</h4>
                <p className="text-sm text-gray-600">Restore from latest backup</p>
              </div>
            </div>
            <button
              onClick={handleRestoreLast}
              disabled={loading}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4 mr-2 inline" />
              Restore (Danger)
            </button>
          </div>
          
          {/* Verify Last */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <CheckCircle className="w-6 h-6 text-blue-600 mr-3" />
              <div>
                <h4 className="font-medium text-gray-900">Verify Last</h4>
                <p className="text-sm text-gray-600">Check backup integrity</p>
              </div>
            </div>
            <button
              onClick={handleVerifyLast}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-4 h-4 mr-2 inline" />
              Verify
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLogsSection = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Backup Logs</h3>
        <button
          onClick={handleExportLogs}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </button>
      </div>
      
      {/* Log Filters */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={logFilters.fromDate.toISOString().split('T')[0]}
              onChange={(e) => setLogFilters(prev => ({ ...prev, fromDate: new Date(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={logFilters.toDate.toISOString().split('T')[0]}
              onChange={(e) => setLogFilters(prev => ({ ...prev, toDate: new Date(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={logFilters.type}
              onChange={(e) => setLogFilters(prev => ({ ...prev, type: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="Created">Created</option>
              <option value="Restored">Restored</option>
              <option value="Verify">Verify</option>
              <option value="Rotate">Rotate</option>
              <option value="Error">Error</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Result</label>
            <select
              value={logFilters.result}
              onChange={(e) => setLogFilters(prev => ({ ...prev, result: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Results</option>
              <option value="Success">Success</option>
              <option value="Failed">Failed</option>
              <option value="Warning">Warning</option>
            </select>
          </div>
        </div>
        
        <div className="flex justify-end mt-4">
          <button
            onClick={loadLogs}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Apply Filters
          </button>
        </div>
      </div>
      
      {/* Logs Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DateTime</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filename</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {log.datetime.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    log.type === 'Created' ? 'bg-green-100 text-green-800' :
                    log.type === 'Restored' ? 'bg-blue-100 text-blue-800' :
                    log.type === 'Verify' ? 'bg-purple-100 text-purple-800' :
                    log.type === 'Rotate' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {log.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {log.provider}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {log.filename || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {log.bytes ? `${Math.round(log.bytes / 1024)} KB` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    log.result === 'Success' ? 'bg-green-100 text-green-800' :
                    log.result === 'Warning' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {log.result}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                  {log.note}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {log.filename && (
                    <button
                      onClick={() => copyToClipboard(log.filename!)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Copy filename"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {logs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No backup logs found</p>
            <p className="text-sm">Try adjusting your filters or create a backup</p>
          </div>
        )}
      </div>
    </div>
  );

  const sections = [
    { id: 'provider' as SectionId, label: 'Provider', icon: Shield },
    { id: 'schedule' as SectionId, label: 'Schedule', icon: Clock },
    { id: 'retention' as SectionId, label: 'Retention', icon: RotateCcw },
    { id: 'actions' as SectionId, label: 'Actions', icon: Play },
    { id: 'logs' as SectionId, label: 'Logs', icon: FileText },
  ];

  return (
    <div className="h-full flex bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <div className="p-6">
          <div className="flex items-center mb-6">
            <Shield className="w-6 h-6 text-blue-600 mr-3" />
            <h1 className="text-xl font-bold text-gray-900">Backups</h1>
          </div>
          
          <nav className="space-y-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeSection === section.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <section.icon className="w-5 h-5 mr-3" />
                {section.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {activeSection === 'provider' && renderProviderSection()}
          {activeSection === 'schedule' && renderScheduleSection()}
          {activeSection === 'retention' && renderRetentionSection()}
          {activeSection === 'actions' && renderActionsSection()}
          {activeSection === 'logs' && renderLogsSection()}
        </div>
      </div>

      {/* Manager PIN Dialog */}
      {showPinDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <Shield className="w-6 h-6 text-red-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Manager Authorization Required</h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Restore operations require manager authorization. Please enter your manager PIN.
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Manager PIN</label>
              <input
                ref={pinInputRef}
                type="password"
                value={managerPin}
                onChange={(e) => setManagerPin(e.target.value)}
                placeholder="Enter 4-6 digit PIN"
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center text-lg tracking-widest"
                onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowPinDialog(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePinSubmit}
                disabled={managerPin.length < 4}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Authorize
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Dialog */}
      {restoreConfirming && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Confirm Restore</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                You are about to restore from the latest backup. This will:
              </p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Replace your current database with the backup</li>
                <li>• Restore all application settings</li>
                <li>• Reload the application</li>
                <li>• Any changes since the backup will be lost</li>
              </ul>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> This action cannot be undone. Make sure you want to proceed.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setRestoreConfirming(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRestore}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Confirm Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}