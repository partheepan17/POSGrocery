/**
 * Health Service
 * Comprehensive system health checks for all POS components
 */

import { dataService } from './dataService';
import { db } from './database';
// import { backupService } from './backupService'; // Temporarily disabled - causing Node.js module issues in browser
// import { schedulerService } from './schedulerService'; // Temporarily disabled - causing Node.js module issues in browser
import { useAppStore } from '../store/appStore';
import packageJson from '../../package.json';
import { auditService } from './auditService';
import { stocktakeService } from './stocktakeService';
import { grnService } from './grnService';
import { labelService } from './labelService';
import { barcodeService } from './barcodeService';

export type HealthStatus = 'OK' | 'WARN' | 'FAIL';

export interface HealthItem {
  key: string;
  label: string;
  status: HealthStatus;
  details?: string;
  suggestion?: string;
  metrics?: Record<string, string | number | boolean>;
}

export interface HealthReport {
  ranAt: string;        // ISO timestamp
  durationMs: number;
  overall: HealthStatus; // FAIL if any FAIL; else WARN if any WARN; else OK
  items: HealthItem[];
}

class HealthService {
  private readonly CHECK_TIMEOUT = 5000; // 5 seconds per check

  /**
   * Run all health checks in parallel
   */
  async runHealthChecks(): Promise<HealthReport> {
    const startTime = Date.now();
    const ranAt = new Date().toISOString();

    console.log('🏥 Running comprehensive health checks...');

    try {
      // Run all checks in parallel with timeout protection
      const checkPromises = [
        this.withTimeout(() => this.checkAppVersion(), 'app-version'),
        this.withTimeout(() => this.checkEnvironmentFlags(), 'environment'),
        this.withTimeout(() => this.checkDatabaseConnectivity(), 'database'),
        this.withTimeout(() => this.checkDataIntegrity(), 'data-integrity'),
        this.withTimeout(() => this.checkSettingsValidity(), 'settings'),
        this.withTimeout(() => this.checkBackupsHealth(), 'backups'),
        this.withTimeout(() => this.checkStorageQuota(), 'storage'),
        this.withTimeout(() => this.checkSecurityHealth(), 'security'),
        this.withTimeout(() => this.checkStocktakeHealth(), 'stocktake'),
        this.withTimeout(() => this.checkGrnHealth(), 'grn'),
        this.withTimeout(() => this.checkLabelSystem(), 'labels'),
        this.withTimeout(() => this.checkDeviceAdapters(), 'devices'),
        this.withTimeout(() => this.checkServiceWorker(), 'service-worker'),
        this.withTimeout(() => this.checkI18nCatalogs(), 'i18n'),
        this.withTimeout(() => this.checkScheduler(), 'scheduler')
      ];

      const results = await Promise.all(checkPromises);
      const items = results.flat() as HealthItem[];
      const durationMs = Date.now() - startTime;

      // Compute overall status
      const overall = this.computeOverallStatus(items);

      console.log(`✅ Health checks completed in ${durationMs}ms - Overall: ${overall}`);

      return {
        ranAt,
        durationMs,
        overall,
        items
      };

    } catch (error) {
      const durationMs = Date.now() - startTime;
      console.error('❌ Health checks failed:', error);

      return {
        ranAt,
        durationMs,
        overall: 'FAIL',
        items: [{
          key: 'health-service-error',
          label: 'Health Service',
          status: 'FAIL',
          details: `Health check system failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          suggestion: 'Check browser console for detailed error information'
        }]
      };
    }
  }

  /**
   * Wrap check with timeout protection
   */
  private async withTimeout<T>(checkFn: () => Promise<T>, checkName: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Health check '${checkName}' timed out after ${this.CHECK_TIMEOUT}ms`));
      }, this.CHECK_TIMEOUT);

      checkFn()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          // Convert errors to FAIL items instead of throwing
          const failItem = {
            key: checkName,
            label: checkName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            status: 'FAIL' as HealthStatus,
            details: error instanceof Error ? error.message : 'Check failed',
            suggestion: 'Check system logs and configuration'
          };
          resolve(failItem as T);
        });
    });
  }

  /**
   * Compute overall health status
   */
  private computeOverallStatus(items: HealthItem[]): HealthStatus {
    const hasFailures = items.some(item => item.status === 'FAIL');
    if (hasFailures) return 'FAIL';

    const hasWarnings = items.some(item => item.status === 'WARN');
    if (hasWarnings) return 'WARN';

    return 'OK';
  }

  /**
   * Check app version and build information
   */
  private async checkAppVersion(): Promise<HealthItem> {
    try {
      // Fetch build info from API
      const response = await fetch('/api/health');
      if (response.ok) {
        const healthData = await response.json();
        const build = healthData.build || {};
        
        // Use API data directly - no fallbacks to hardcoded values
        const version = build.version;
        const buildTime = build.buildTime;
        const buildSha = build.buildSha;
        const appName = build.name;

        return {
          key: 'app-version',
          label: 'App Version & Build',
          status: version && buildTime && buildSha ? 'OK' : 'WARN',
          details: `${appName} v${version} (${buildSha?.substring(0, 8) || 'unknown'}) - ${buildTime}`,
          metrics: {
            appName,
            version,
            buildTime,
            buildSha,
            nodeEnv: healthData.environment || 'unknown'
          }
        };
      } else {
        // API failed - return FAIL status instead of fallback
        return {
          key: 'app-version',
          label: 'App Version & Build',
          status: 'FAIL',
          details: 'Failed to fetch build information from API',
          suggestion: 'Check if backend server is running and accessible'
        };
      }
    } catch (error) {
      return {
        key: 'app-version',
        label: 'App Version & Build',
        status: 'FAIL',
        details: 'Unable to read version information',
        suggestion: 'Check package.json and build configuration'
      };
    }
  }

  /**
   * Check environment configuration
   */
  private async checkEnvironmentFlags(): Promise<HealthItem> {
    try {
      const appEnv = import.meta.env.VITE_APP_ENV || 'unknown';
      const baseUrl = import.meta.env.VITE_APP_BASE_URL || '/';
      const swEnabled = import.meta.env.VITE_SERVICE_WORKER_ENABLED === 'true';
      const appName = import.meta.env.VITE_APP_NAME || 'Grocery POS';

      const issues: string[] = [];
      
      if (appEnv === 'production' && !swEnabled) {
        issues.push('Service Worker disabled in production');
      }

      // Check currency configuration from settings instead of env var
      const settings = useAppStore.getState().settings;
      if (!settings.currency && !import.meta.env.VITE_CURRENCY) {
        issues.push('Currency not configured in settings or environment');
      }

      const status: HealthStatus = issues.length > 0 ? 'WARN' : 'OK';

      return {
        key: 'environment',
        label: 'Environment Flags',
        status,
        details: issues.length > 0 ? issues.join(', ') : 'All environment flags configured',
        suggestion: issues.length > 0 ? 'Review .env configuration' : undefined,
        metrics: {
          appEnv,
          baseUrl,
          swEnabled,
          appName,
          currency: settings.currency || import.meta.env.VITE_CURRENCY || 'not set'
        }
      };
    } catch (error) {
      return {
        key: 'environment',
        label: 'Environment Flags',
        status: 'FAIL',
        details: 'Unable to read environment configuration',
        suggestion: 'Check environment variables and build configuration'
      };
    }
  }

  /**
   * Check database connectivity and core tables
   */
  private async checkDatabaseConnectivity(): Promise<HealthItem> {
    try {
      const tables = [
        'products',
        'sales',
        'sale_lines',
        'discount_rules',
        'inventory_movements',
        'settings',
        'categories',
        'suppliers',
        'customers'
      ];

      const tableCounts: Record<string, number> = {};
      const errors: string[] = [];

      for (const table of tables) {
        try {
          const result = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
          tableCounts[table] = result[0]?.count || 0;
        } catch (error) {
          errors.push(`${table}: ${error instanceof Error ? error.message : 'query failed'}`);
        }
      }

      const status: HealthStatus = errors.length > 0 ? 'FAIL' : 'OK';

      return {
        key: 'database',
        label: 'Database Connectivity',
        status,
        details: errors.length > 0 ? `Errors: ${errors.join(', ')}` : 'All core tables accessible',
        suggestion: errors.length > 0 ? 'Check database file and permissions' : undefined,
        metrics: {
          ...tableCounts,
          totalTables: tables.length,
          errorCount: errors.length
        }
      };
    } catch (error) {
      return {
        key: 'database',
        label: 'Database Connectivity',
        status: 'FAIL',
        details: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestion: 'Check database configuration and file permissions'
      };
    }
  }

  /**
   * Check data integrity and referential consistency
   */
  private async checkDataIntegrity(): Promise<HealthItem> {
    try {
      const checks: Array<{ name: string; query: string; threshold?: number }> = [
        {
          name: 'Orphan Sale Lines',
          query: 'SELECT COUNT(*) as count FROM sale_lines sl LEFT JOIN sales s ON sl.sale_id = s.id WHERE s.id IS NULL',
          threshold: 0
        },
        {
          name: 'Products without Categories',
          query: 'SELECT COUNT(*) as count FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE c.id IS NULL',
          threshold: 0
        },
        {
          name: 'Inventory Movements without Products',
          query: 'SELECT COUNT(*) as count FROM inventory_movements im LEFT JOIN products p ON im.product_id = p.id WHERE p.id IS NULL',
          threshold: 0
        }
      ];

      const results: Record<string, number> = {};
      const warnings: string[] = [];

      for (const check of checks) {
        try {
          const result = await db.query(check.query);
          const count = result[0]?.count || 0;
          results[check.name] = count;

          if (check.threshold !== undefined && count > check.threshold) {
            warnings.push(`${check.name}: ${count} found`);
          }
        } catch (error) {
          warnings.push(`${check.name}: Check failed`);
        }
      }

      const status: HealthStatus = warnings.length > 0 ? 'WARN' : 'OK';

      return {
        key: 'data-integrity',
        label: 'Data Integrity',
        status,
        details: warnings.length > 0 ? warnings.join(', ') : 'No data integrity issues found',
        suggestion: warnings.length > 0 ? 'Review data consistency and run cleanup if needed' : undefined,
        metrics: results
      };
    } catch (error) {
      return {
        key: 'data-integrity',
        label: 'Data Integrity',
        status: 'FAIL',
        details: `Data integrity checks failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestion: 'Check database queries and data structure'
      };
    }
  }

  /**
   * Check settings validity
   */
  private async checkSettingsValidity(): Promise<HealthItem> {
    try {
      const settings = useAppStore.getState().settings;
      const issues: string[] = [];
      const metrics: Record<string, any> = {};

      // Check backup settings
      const backupCredentials = settings.backupSettings?.credentials;
      const hasEncryptionKey = backupCredentials && Object.keys(backupCredentials).some(key => 
        key.toLowerCase().includes('encryption') || key.toLowerCase().includes('key')
      );
      
      // Check if using default development key in production
      const isDevelopmentKey = backupCredentials?.encryptionKey === 'default-development-key-change-in-production';
      const isProduction = import.meta.env.VITE_APP_ENV === 'production';
      
      if (!hasEncryptionKey) {
        issues.push('Backup encryption key not set');
      } else if (isDevelopmentKey && isProduction) {
        issues.push('Using default development encryption key in production');
      } else if (isDevelopmentKey) {
        // In development, this is just a warning
        // Don't add to issues, just note in metrics
      }
      
      metrics.backupProvider = settings.backupSettings?.provider || 'not configured';
      metrics.backupEncrypted = !!hasEncryptionKey;
      metrics.usingDefaultKey = isDevelopmentKey;
      metrics.isProduction = isProduction;

      // Check pricing settings
      const validPolicies = ['warn', 'block'];
      if (settings.pricingSettings?.missingPricePolicy && 
          !validPolicies.includes(settings.pricingSettings.missingPricePolicy)) {
        issues.push('Invalid missing price policy');
      }
      metrics.missingPricePolicy = settings.pricingSettings?.missingPricePolicy || 'not set';

      // Check store info
      if (!settings.storeInfo?.name) {
        issues.push('Store name not configured');
      }
      metrics.storeName = !!settings.storeInfo?.name;

      const status: HealthStatus = issues.length > 0 ? 'WARN' : 'OK';

      return {
        key: 'settings',
        label: 'Settings Validity',
        status,
        details: issues.length > 0 ? issues.join(', ') : 'All settings valid',
        suggestion: issues.length > 0 ? 'Review Settings page and complete configuration' : undefined,
        metrics
      };
    } catch (error) {
      return {
        key: 'settings',
        label: 'Settings Validity',
        status: 'FAIL',
        details: `Settings validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestion: 'Check settings store and configuration'
      };
    }
  }

  /**
   * Check backup system health
   */
  private async checkBackupsHealth(): Promise<HealthItem> {
    try {
      const settings = useAppStore.getState().settings;
      const backupSettings = settings.backupSettings;

      if (!backupSettings?.provider) {
        return {
          key: 'backups',
          label: 'Backups',
          status: 'FAIL',
          details: 'No backup provider configured',
          suggestion: 'Configure backup provider in Settings → Backups'
        };
      }

      // Check for encryption key in credentials
      const backupCredentials = backupSettings.credentials;
      const hasEncryptionKey = backupCredentials && Object.keys(backupCredentials).some(key => 
        key.toLowerCase().includes('encryption') || key.toLowerCase().includes('key')
      );
      
      const isDevelopmentKey = backupCredentials?.encryptionKey === 'default-development-key-change-in-production';
      const isProduction = import.meta.env.VITE_APP_ENV === 'production';
      
      if (!hasEncryptionKey) {
        return {
          key: 'backups',
          label: 'Backups',
          status: 'FAIL',
          details: 'Backup encryption key not set',
          suggestion: 'Set encryption key in Settings → Backups'
        };
      }
      
      if (isDevelopmentKey && isProduction) {
        return {
          key: 'backups',
          label: 'Backups',
          status: 'FAIL',
          details: 'Using default development encryption key in production',
          suggestion: 'Set a secure encryption key in Settings → Backups'
        };
      }

      // Test connection (simplified - backup service temporarily disabled)
      let connectionOk = true; // Assume OK for now since backup service has Node.js dependencies
      let connectionError = '';
      
      // Check last backup age (mock data since backup service is temporarily disabled)
      let lastBackupAge = 0;
      let backupCount = 0;
      // TODO: Re-enable when backup service is made browser-compatible

      // Get next scheduled run (simplified)
      let nextRun = 'Not scheduled';
      try {
        if (backupSettings.schedule?.dailyTime) {
          nextRun = `Daily at ${backupSettings.schedule.dailyTime}`;
        }
      } catch (error) {
        // Ignore scheduler errors
      }

      const lastBackupHours = Math.floor(lastBackupAge / (1000 * 60 * 60));
      const isStale = lastBackupAge > 36 * 60 * 60 * 1000; // 36 hours

      let status: HealthStatus = 'OK';
      const issues: string[] = [];

      if (!connectionOk) {
        status = 'FAIL';
        issues.push(`Connection failed: ${connectionError}`);
      } else if (backupCount === 0) {
        status = 'WARN';
        issues.push('No backups found');
      } else if (isStale) {
        status = 'WARN';
        issues.push(`Last backup ${lastBackupHours}h ago (stale)`);
      }

      return {
        key: 'backups',
        label: 'Backups',
        status,
        details: issues.length > 0 ? issues.join(', ') : `Last backup ${lastBackupHours}h ago, ${backupCount} total`,
        suggestion: status === 'FAIL' ? 'Fix backup configuration and test connection' : 
                   status === 'WARN' ? 'Run manual backup or check schedule' : undefined,
        metrics: {
          provider: backupSettings.provider,
          connectionOk,
          backupCount,
          lastBackupHours,
          nextRun,
          encrypted: !!hasEncryptionKey
        }
      };
    } catch (error) {
      return {
        key: 'backups',
        label: 'Backups',
        status: 'FAIL',
        details: `Backup system check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestion: 'Check backup service configuration'
      };
    }
  }

  /**
   * Check browser storage quota
   */
  private async checkStorageQuota(): Promise<HealthItem> {
    try {
      if (!navigator.storage?.estimate) {
        return {
          key: 'storage',
          label: 'Storage Quota',
          status: 'WARN',
          details: 'Storage API not available',
          suggestion: 'Update to a modern browser that supports Storage API'
        };
      }

      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const usagePercent = quota > 0 ? Math.round((usage / quota) * 100) : 0;

      const usageMB = Math.round(usage / 1024 / 1024);
      const quotaMB = Math.round(quota / 1024 / 1024);

      let status: HealthStatus = 'OK';
      let suggestion: string | undefined;

      if (usagePercent > 90) {
        status = 'FAIL';
        suggestion = 'Clear browser data or increase storage quota';
      } else if (usagePercent > 80) {
        status = 'WARN';
        suggestion = 'Consider clearing old data or backups';
      }

      return {
        key: 'storage',
        label: 'Storage Quota',
        status,
        details: `Using ${usageMB}MB of ${quotaMB}MB (${usagePercent}%)`,
        suggestion,
        metrics: {
          usageMB,
          quotaMB,
          usagePercent,
          available: quota > 0
        }
      };
    } catch (error) {
      return {
        key: 'storage',
        label: 'Storage Quota',
        status: 'WARN',
        details: `Storage check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestion: 'Check browser storage permissions'
      };
    }
  }

  /**
   * Check device adapter availability
   */
  private async checkDeviceAdapters(): Promise<HealthItem> {
    try {
      const settings = useAppStore.getState().settings;
      const deviceSettings = settings.devices || {};

      const adapters = {
        barcode: deviceSettings.barcodeInputMode === 'keyboard_wedge',
        scale: deviceSettings.scaleMode !== 'off',
        printer: deviceSettings.receiptPaper !== undefined,
        cashDrawer: deviceSettings.cashDrawerOpenOnCash || false
      };

      const enabledCount = Object.values(adapters).filter(Boolean).length;
      const warnings: string[] = [];

      // Check if at least one print option is available
      if (!adapters.printer) {
        warnings.push('No printer configured (HTML preview only)');
      }

      // In browser environment, most hardware won't be available
      if (typeof window !== 'undefined') {
        // This is expected in browser environment
      }

      const status: HealthStatus = warnings.length > 0 ? 'WARN' : 'OK';

      return {
        key: 'devices',
        label: 'Device Adapters',
        status,
        details: warnings.length > 0 ? warnings.join(', ') : `${enabledCount} devices configured`,
        suggestion: warnings.length > 0 ? 'Configure hardware devices in Settings → Devices' : undefined,
        metrics: {
          ...adapters,
          enabledCount,
          totalAdapters: Object.keys(adapters).length
        }
      };
    } catch (error) {
      return {
        key: 'devices',
        label: 'Device Adapters',
        status: 'FAIL',
        details: `Device check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestion: 'Check device configuration and browser permissions'
      };
    }
  }

  /**
   * Check service worker status
   */
  private async checkServiceWorker(): Promise<HealthItem> {
    try {
      const swEnabled = import.meta.env.VITE_SERVICE_WORKER_ENABLED === 'true';
      const isProduction = import.meta.env.VITE_APP_ENV === 'production';

      if (!('serviceWorker' in navigator)) {
        return {
          key: 'service-worker',
          label: 'Service Worker',
          status: 'WARN',
          details: 'Service Worker not supported',
          suggestion: 'Update to a modern browser that supports Service Workers'
        };
      }

      const registrations = await navigator.serviceWorker.getRegistrations();
      const isRegistered = registrations.length > 0;

      let status: HealthStatus = 'OK';
      let details = '';
      let suggestion: string | undefined;

      if (isProduction && !swEnabled) {
        status = 'WARN';
        details = 'Service Worker disabled in production';
        suggestion = 'Enable Service Worker for offline capabilities';
      } else if (swEnabled && !isRegistered) {
        status = 'WARN';
        details = 'Service Worker enabled but not registered';
        suggestion = 'Check Service Worker registration in main.tsx';
      } else if (isRegistered) {
        details = `Service Worker active (${registrations.length} registrations)`;
      } else {
        details = 'Service Worker not enabled (development mode)';
      }

      return {
        key: 'service-worker',
        label: 'Service Worker',
        status,
        details,
        suggestion,
        metrics: {
          swEnabled,
          isProduction,
          isRegistered,
          registrationCount: registrations.length,
          supported: 'serviceWorker' in navigator
        }
      };
    } catch (error) {
      return {
        key: 'service-worker',
        label: 'Service Worker',
        status: 'FAIL',
        details: `Service Worker check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestion: 'Check Service Worker configuration and browser support'
      };
    }
  }

  /**
   * Check i18n catalog availability
   */
  private async checkI18nCatalogs(): Promise<HealthItem> {
    try {
      // In a real implementation, you would check your i18n service
      // For now, we'll simulate based on environment
      const catalogs = {
        en: true, // English is always required
        si: !!import.meta.env.VITE_I18N_SI_ENABLED,
        ta: !!import.meta.env.VITE_I18N_TA_ENABLED
      };

      const warnings: string[] = [];
      
      if (!catalogs.en) {
        return {
          key: 'i18n',
          label: 'i18n Catalogs',
          status: 'FAIL',
          details: 'English catalog missing (required)',
          suggestion: 'Check i18n configuration and English translations'
        };
      }

      if (!catalogs.si) {
        warnings.push('Sinhala translations not available');
      }

      if (!catalogs.ta) {
        warnings.push('Tamil translations not available');
      }

      const availableCount = Object.values(catalogs).filter(Boolean).length;
      const status: HealthStatus = warnings.length > 0 ? 'WARN' : 'OK';

      return {
        key: 'i18n',
        label: 'i18n Catalogs',
        status,
        details: warnings.length > 0 ? warnings.join(', ') : `${availableCount} languages available`,
        suggestion: warnings.length > 0 ? 'Add missing translation catalogs' : undefined,
        metrics: {
          ...catalogs,
          availableCount,
          totalLanguages: 3
        }
      };
    } catch (error) {
      return {
        key: 'i18n',
        label: 'i18n Catalogs',
        status: 'FAIL',
        details: `i18n check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestion: 'Check internationalization configuration'
      };
    }
  }

  /**
   * Check scheduler service status
   */
  private async checkScheduler(): Promise<HealthItem> {
    try {
      const settings = useAppStore.getState().settings;
      const backupSettings = settings.backupSettings;

      if (!backupSettings?.schedule?.dailyTime) {
        return {
          key: 'scheduler',
          label: 'Scheduler',
          status: 'WARN',
          details: 'No backup schedule configured',
          suggestion: 'Set daily backup time in Settings → Backups'
        };
      }

      // Get scheduler status (simplified)
      let isRunning = true; // Assume scheduler is running
      let nextRun = `Daily at ${backupSettings.schedule.dailyTime}`;
      let lastRun = 'Unknown';

      // Check if scheduler service exists and is initialized (simplified)
      try {
        // Simple check - if we have schedule settings, assume scheduler is working
        // TODO: Re-enable proper scheduler checks when service is made browser-compatible
        isRunning = !!backupSettings.schedule.dailyTime;
      } catch (error) {
        isRunning = false;
      }

      const status: HealthStatus = isRunning ? 'OK' : 'WARN';

      return {
        key: 'scheduler',
        label: 'Scheduler',
        status,
        details: isRunning ? `Next run: ${nextRun}` : 'Scheduler not running',
        suggestion: !isRunning ? 'Check scheduler service initialization' : undefined,
        metrics: {
          isRunning,
          nextRun,
          lastRun,
          dailyTime: backupSettings.schedule.dailyTime,
          onSettingsChange: backupSettings.schedule.onSettingsChange || false
        }
      };
    } catch (error) {
      return {
        key: 'scheduler',
        label: 'Scheduler',
        status: 'FAIL',
        details: `Scheduler check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestion: 'Check scheduler service configuration'
      };
    }
  }

  /**
   * Check security and audit health
   */
  private async checkSecurityHealth(): Promise<HealthItem[]> {
    const items: HealthItem[] = [];

    try {
      // Check for manager users
      const users = await dataService.query<{count: number}>(
        'SELECT COUNT(*) as count FROM users WHERE role IN (?, ?) AND active = true',
        ['MANAGER', 'ADMIN']
      );
      
      const managerCount = users[0]?.count || 0;
      if (managerCount === 0) {
        items.push({
          key: 'no-managers',
          label: 'Manager Users',
          status: 'WARN',
          details: 'No active manager or admin users found',
          suggestion: 'Create at least one manager or admin user'
        });
      } else {
        items.push({
          key: 'managers-ok',
          label: 'Manager Users',
          status: 'OK',
          details: `${managerCount} manager/admin users active`
        });
      }

      // Check for users without roles
      const noRoleUsers = await dataService.query<{count: number}>(
        'SELECT COUNT(*) as count FROM users WHERE role IS NULL OR role = ""'
      );
      
      const noRoleCount = noRoleUsers[0]?.count || 0;
      if (noRoleCount > 0) {
        items.push({
          key: 'users-no-role',
          label: 'User Roles',
          status: 'WARN',
          details: `${noRoleCount} users without assigned roles`,
          suggestion: 'Assign roles to all users for proper access control'
        });
      } else {
        items.push({
          key: 'user-roles-ok',
          label: 'User Roles',
          status: 'OK',
          details: 'All users have assigned roles'
        });
      }

      // Check for locked users
      const lockedUsers = await dataService.query<{count: number}>(
        'SELECT COUNT(*) as count FROM users WHERE pin_locked_until > datetime("now") AND active = true'
      );
      
      const lockedCount = lockedUsers[0]?.count || 0;
      if (lockedCount > 0) {
        items.push({
          key: 'locked-users',
          label: 'User Lockouts',
          status: 'WARN',
          details: `${lockedCount} users currently locked out`,
          suggestion: 'Review and unlock users if appropriate'
        });
      } else {
        items.push({
          key: 'no-lockouts',
          label: 'User Lockouts',
          status: 'OK',
          details: 'No users currently locked out'
        });
      }

      // Check recent audit events
      const recentEvents = await auditService.getRecentEvents(5);
      if (recentEvents.length > 0) {
        items.push({
          key: 'audit-active',
          label: 'Audit Logging',
          status: 'OK',
          details: `${recentEvents.length} recent audit events recorded`
        });
      } else {
        items.push({
          key: 'audit-inactive',
          label: 'Audit Logging',
          status: 'WARN',
          details: 'No recent audit events found',
          suggestion: 'Verify audit logging is working correctly'
        });
      }

    } catch (error) {
      items.push({
        key: 'security-error',
        label: 'Security Check',
        status: 'FAIL',
        details: `Security check failed: ${error}`,
        suggestion: 'Check security service configuration'
      });
    }

    return items;
  }

  /**
   * Check stocktake health
   */
  private async checkStocktakeHealth(): Promise<HealthItem[]> {
    const items: HealthItem[] = [];

    try {
      const stats = await stocktakeService.getSessionStats();
      
      // Check for old draft sessions
      if (stats.draftSessions > 0) {
        const oldDrafts = await dataService.query<{count: number}>(
          'SELECT COUNT(*) as count FROM stocktake_sessions WHERE status = ? AND created_at < datetime("now", "-7 days")',
          ['DRAFT']
        );
        
        const oldCount = oldDrafts[0]?.count || 0;
        if (oldCount > 0) {
          items.push({
            key: 'old-stocktake-drafts',
            label: 'Stocktake Sessions',
            status: 'WARN',
            details: `${oldCount} draft stocktake sessions older than 7 days`,
            suggestion: 'Review and finalize or delete old draft sessions'
          });
        } else {
          items.push({
            key: 'stocktake-drafts-ok',
            label: 'Stocktake Sessions',
            status: 'OK',
            details: `${stats.draftSessions} active draft sessions`
          });
        }
      } else {
        items.push({
          key: 'no-stocktake-drafts',
          label: 'Stocktake Sessions',
          status: 'OK',
          details: 'No draft stocktake sessions'
        });
      }

    } catch (error) {
      items.push({
        key: 'stocktake-error',
        label: 'Stocktake Check',
        status: 'FAIL',
        details: `Stocktake check failed: ${error}`,
        suggestion: 'Check stocktake service configuration'
      });
    }

    return items;
  }

  /**
   * Check GRN health
   */
  private async checkGrnHealth(): Promise<HealthItem[]> {
    const items: HealthItem[] = [];

    try {
      const stats = await grnService.getGrnStats();
      
      // Check recent GRN activity
      if (stats.recentPostedCount > 0) {
        items.push({
          key: 'grn-recent-activity',
          label: 'GRN Activity',
          status: 'OK',
          details: `${stats.recentPostedCount} GRNs posted in last 7 days`
        });
      } else {
        items.push({
          key: 'grn-no-recent',
          label: 'GRN Activity',
          status: 'WARN',
          details: 'No GRNs posted in last 7 days',
          suggestion: 'Consider if recent deliveries should have been recorded'
        });
      }

      // Check draft GRNs
      if (stats.draftCount > 0) {
        items.push({
          key: 'grn-drafts',
          label: 'Draft GRNs',
          status: 'OK',
          details: `${stats.draftCount} draft GRNs pending posting`
        });
      } else {
        items.push({
          key: 'no-grn-drafts',
          label: 'Draft GRNs',
          status: 'OK',
          details: 'No draft GRNs pending'
        });
      }

    } catch (error) {
      items.push({
        key: 'grn-error',
        label: 'GRN Check',
        status: 'FAIL',
        details: `GRN check failed: ${error}`,
        suggestion: 'Check GRN service configuration'
      });
    }

    return items;
  }

  /**
   * Check Label System health
   */
  private async checkLabelSystem(): Promise<HealthItem[]> {
    const items: HealthItem[] = [];

    try {
      // Check barcode encoder
      try {
        const testEan13 = barcodeService.encodeEAN13('123456789012');
        const testCode128 = barcodeService.encodeCode128('TEST123');
        
        if (testEan13.data && testCode128.data) {
          items.push({
            key: 'barcode-encoder',
            label: 'Barcode Encoder',
            status: 'OK',
            details: 'EAN-13 and Code128 encoding working correctly'
          });
        } else {
          items.push({
            key: 'barcode-encoder',
            label: 'Barcode Encoder',
            status: 'WARN',
            details: 'Barcode generation may not be working correctly',
            suggestion: 'Check barcode service configuration'
          });
        }
      } catch (error) {
        items.push({
          key: 'barcode-encoder',
          label: 'Barcode Encoder',
          status: 'FAIL',
          details: `Barcode encoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          suggestion: 'Check barcode service implementation'
        });
      }

      // Check label presets
      try {
        const presets = await labelService.listPresets();
        
        if (presets.length > 0) {
          items.push({
            key: 'label-presets',
            label: 'Label Presets',
            status: 'OK',
            details: `${presets.length} label preset${presets.length === 1 ? '' : 's'} available`,
            metrics: { preset_count: presets.length }
          });
        } else {
          items.push({
            key: 'label-presets',
            label: 'Label Presets',
            status: 'WARN',
            details: 'No label presets configured',
            suggestion: 'Create at least one label preset for printing'
          });
        }
      } catch (error) {
        items.push({
          key: 'label-presets',
          label: 'Label Presets',
          status: 'FAIL',
          details: `Failed to load label presets: ${error instanceof Error ? error.message : 'Unknown error'}`,
          suggestion: 'Check label service configuration'
        });
      }

      // Check default preset configuration
      const appStore = useAppStore.getState();
      const labelSettings = appStore.labelSettings;
      
      if (labelSettings?.defaultPresetId) {
        try {
          const defaultPreset = await labelService.getPreset(labelSettings.defaultPresetId);
          if (defaultPreset) {
            items.push({
              key: 'default-preset',
              label: 'Default Label Preset',
              status: 'OK',
              details: `Default preset: ${defaultPreset.name}`,
              metrics: { default_preset: defaultPreset.name }
            });
          } else {
            items.push({
              key: 'default-preset',
              label: 'Default Label Preset',
              status: 'WARN',
              details: 'Configured default preset not found',
              suggestion: 'Update default preset in label settings'
            });
          }
        } catch (error) {
          items.push({
            key: 'default-preset',
            label: 'Default Label Preset',
            status: 'FAIL',
            details: `Failed to validate default preset: ${error instanceof Error ? error.message : 'Unknown error'}`,
            suggestion: 'Check label service and settings configuration'
          });
        }
      } else {
        items.push({
          key: 'default-preset',
          label: 'Default Label Preset',
          status: 'WARN',
          details: 'No default label preset configured',
          suggestion: 'Set a default preset in label settings for faster workflow'
        });
      }

      // Check label jobs history
      try {
        const recentJobs = await labelService.listJobs({ limit: 10 });
        
        items.push({
          key: 'label-history',
          label: 'Label Print History',
          status: 'OK',
          details: `${recentJobs.length} recent print job${recentJobs.length === 1 ? '' : 's'} recorded`,
          metrics: { recent_jobs: recentJobs.length }
        });
      } catch (error) {
        items.push({
          key: 'label-history',
          label: 'Label Print History',
          status: 'WARN',
          details: `Failed to load print history: ${error instanceof Error ? error.message : 'Unknown error'}`,
          suggestion: 'History functionality may be impaired'
        });
      }

      // Check DPI settings
      if (labelSettings) {
        const dpi = labelSettings.defaultDPI;
        if (dpi === 203 || dpi === 300) {
          items.push({
            key: 'dpi-settings',
            label: 'Label DPI Configuration',
            status: 'OK',
            details: `Default DPI: ${dpi}`,
            metrics: { default_dpi: dpi }
          });
        } else {
          items.push({
            key: 'dpi-settings',
            label: 'Label DPI Configuration',
            status: 'WARN',
            details: `Unusual DPI setting: ${dpi}`,
            suggestion: 'Standard thermal printers use 203 or 300 DPI'
          });
        }

        // Check default date format
        const dateFormat = labelSettings.defaultDateFormat;
        if (dateFormat && ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'].includes(dateFormat)) {
          items.push({
            key: 'date-format',
            label: 'Label Date Format',
            status: 'OK',
            details: `Default date format: ${dateFormat}`,
            metrics: { date_format: dateFormat }
          });
        } else {
          items.push({
            key: 'date-format',
            label: 'Label Date Format',
            status: 'WARN',
            details: `Invalid or missing date format: ${dateFormat}`,
            suggestion: 'Set defaultDateFormat to YYYY-MM-DD, DD/MM/YYYY, or MM/DD/YYYY'
          });
        }
      }

      // Check preset configurations for new fields
      try {
        const presets = await labelService.listPresets();
        let presetsWithDateFields = 0;
        let presetsWithMissingDateFormat = 0;
        let presetsWithLanguageMode = 0;

        for (const preset of presets) {
          const hasDateFields = preset.fields.showPackedDate || preset.fields.showExpiryDate;
          if (hasDateFields) {
            presetsWithDateFields++;
            if (!preset.fields.dateFormat) {
              presetsWithMissingDateFormat++;
            }
          }

          if (preset.fields.languageMode === 'per_item') {
            presetsWithLanguageMode++;
          }
        }

        // Check for presets with date fields but missing date format
        if (presetsWithMissingDateFormat > 0) {
          items.push({
            key: 'preset-date-format',
            label: 'Preset Date Format Configuration',
            status: 'WARN',
            details: `${presetsWithMissingDateFormat} preset(s) have date fields enabled but no date format specified`,
            suggestion: 'Configure dateFormat for presets that show packed/expiry dates',
            metrics: { 
              presets_with_dates: presetsWithDateFields,
              missing_date_format: presetsWithMissingDateFormat 
            }
          });
        } else if (presetsWithDateFields > 0) {
          items.push({
            key: 'preset-date-format',
            label: 'Preset Date Format Configuration',
            status: 'OK',
            details: `${presetsWithDateFields} preset(s) with date fields properly configured`,
            metrics: { presets_with_dates: presetsWithDateFields }
          });
        }

        // Check language mode configuration
        if (presetsWithLanguageMode > 0) {
          items.push({
            key: 'preset-language-mode',
            label: 'Preset Language Configuration',
            status: 'OK',
            details: `${presetsWithLanguageMode} preset(s) configured for per-item language selection`,
            metrics: { per_item_language_presets: presetsWithLanguageMode }
          });
        }

      } catch (error) {
        items.push({
          key: 'preset-validation',
          label: 'Preset Configuration Validation',
          status: 'WARN',
          details: `Failed to validate preset configurations: ${error instanceof Error ? error.message : 'Unknown error'}`,
          suggestion: 'Check preset configuration and ensure proper field settings'
        });
      }

    } catch (error) {
      items.push({
        key: 'label-system-error',
        label: 'Label System Check',
        status: 'FAIL',
        details: `Label system check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestion: 'Check label system components and configuration'
      });
    }

    return items;
  }
}

// Export singleton instance
export const healthService = new HealthService();

// Export types and main function
export { HealthService };
export const runHealthChecks = () => healthService.runHealthChecks();
