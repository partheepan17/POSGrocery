import { BackupAdapter, MetaJson, RemoteItem } from '@/adapters/backup/BackupAdapter';
import { LocalBackupAdapter } from '@/adapters/backup/LocalBackupAdapter';
import { DriveBackupAdapter } from '@/adapters/backup/DriveBackupAdapter';
import { OneDriveBackupAdapter } from '@/adapters/backup/OneDriveBackupAdapter';
import { S3BackupAdapter } from '@/adapters/backup/S3BackupAdapter';
import { cryptoService } from './cryptoService';
import { useAppStore } from '@/store/appStore';
import { dataService } from './dataService';

export interface BackupLog {
  id: number;
  datetime: Date;
  type: 'Created' | 'Restored' | 'Verify' | 'Rotate' | 'Error';
  provider: string;
  location_url?: string;
  filename?: string;
  bytes?: number;
  checksum?: string;
  result: 'Success' | 'Failed' | 'Warning';
  by_user: string;
  note?: string;
  error_details?: string;
}

export interface SnapshotInfo {
  name: string;
  created_at: Date;
  type: 'daily' | 'config';
  bytes: number;
  checksum: string;
  provider: string;
  url?: string;
  meta?: MetaJson;
}

export interface BackupProgress {
  stage: 'preparing' | 'copying' | 'compressing' | 'encrypting' | 'uploading' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  currentFile?: string;
  bytesProcessed?: number;
  totalBytes?: number;
}

export type BackupProgressCallback = (progress: BackupProgress) => void;

class BackupService {
  private logs: BackupLog[] = [];
  private currentAdapter: BackupAdapter | null = null;
  
  constructor() {
    this.loadLogs();
  }

  /**
   * Initialize backup adapter based on current settings
   */
  private getAdapter(): BackupAdapter {
    const { settings } = useAppStore.getState();
    const backupSettings = settings?.backupSettings;
    
    if (!backupSettings) {
      throw new Error('Backup settings not configured');
    }

    const { provider, credentials = {} } = backupSettings;
    
    switch (provider) {
      case 'local':
        return new LocalBackupAdapter(credentials);
      case 'google_drive':
        return new DriveBackupAdapter(credentials);
      case 'onedrive':
        return new OneDriveBackupAdapter(credentials);
      case 's3':
        return new S3BackupAdapter(credentials, false);
      case 'backblaze':
        return new S3BackupAdapter(credentials, true);
      default:
        throw new Error(`Unsupported backup provider: ${provider}`);
    }
  }

  /**
   * Test connection to the configured backup provider
   */
  async testConnection(): Promise<{ ok: boolean; message?: string }> {
    try {
      const adapter = this.getAdapter();
      return await adapter.testConnection();
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create a backup snapshot
   */
  async createSnapshot(
    type: 'daily' | 'config',
    progressCallback?: BackupProgressCallback
  ): Promise<BackupLog> {
    const startTime = Date.now();
    let tempFiles: string[] = [];
    
    try {
      const { settings } = useAppStore.getState();
      const backupSettings = settings?.backupSettings;
      
      if (!backupSettings?.credentials?.encryptionKey) {
        throw new Error('Encryption key not configured. Please set it in Backups → Provider settings.');
      }

      const adapter = this.getAdapter();
      
      // Validate encryption key
      const keyValidation = cryptoService.validateEncryptionKey(backupSettings.credentials.encryptionKey);
      if (!keyValidation.valid) {
        throw new Error(`Invalid encryption key: ${keyValidation.error}`);
      }

      progressCallback?.({
        stage: 'preparing',
        progress: 10,
        message: 'Preparing backup...'
      });

      // Step 1: Create database snapshot
      const dbPath = await this.createDatabaseSnapshot();
      tempFiles.push(dbPath);
      
      progressCallback?.({
        stage: 'copying',
        progress: 20,
        message: 'Copying database...'
      });

      // Step 2: Create settings snapshot
      const settingsPath = await this.createSettingsSnapshot();
      tempFiles.push(settingsPath);

      progressCallback?.({
        stage: 'compressing',
        progress: 40,
        message: 'Creating backup archive...'
      });

      // Step 3: Create ZIP archive with metadata
      const zipPath = await this.createBackupArchive(dbPath, settingsPath, type);
      tempFiles.push(zipPath);

      progressCallback?.({
        stage: 'encrypting',
        progress: 60,
        message: 'Encrypting backup...'
      });

      // Step 4: Encrypt the archive
      const encryptionResult = await cryptoService.encryptFile(zipPath, backupSettings.credentials.encryptionKey);
      tempFiles.push(encryptionResult.encryptedPath);

      progressCallback?.({
        stage: 'uploading',
        progress: 80,
        message: 'Uploading to backup provider...'
      });

      // Step 5: Upload to backup provider
      const remoteName = this.generateBackupName(type);
      const uploadResult = await adapter.upload(encryptionResult.encryptedPath, remoteName);

      progressCallback?.({
        stage: 'complete',
        progress: 100,
        message: 'Backup completed successfully'
      });

      // Step 6: Create log entry
      const log: BackupLog = {
        id: Date.now(),
        datetime: new Date(),
        type: 'Created',
        provider: backupSettings.provider || 'unknown',
        location_url: uploadResult.url,
        filename: remoteName,
        bytes: uploadResult.bytes,
        checksum: encryptionResult.checksum,
        result: 'Success',
        by_user: 'system', // TODO: Get current user
        note: `${type} backup created in ${Math.round((Date.now() - startTime) / 1000)}s`
      };

      await this.addLog(log);

      // Step 7: Apply retention policy if needed
      if (type === 'daily' || type === 'config') {
        setTimeout(() => this.applyRetentionNow(), 5000); // Apply retention after 5 seconds
      }

      return log;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      progressCallback?.({
        stage: 'error',
        progress: 0,
        message: `Backup failed: ${errorMessage}`
      });

      // Create error log
      const errorLog: BackupLog = {
        id: Date.now(),
        datetime: new Date(),
        type: 'Error',
        provider: 'unknown',
        result: 'Failed',
        by_user: 'system',
        note: `Backup creation failed: ${errorMessage}`,
        error_details: error instanceof Error ? error.stack : undefined
      };

      await this.addLog(errorLog);
      throw error;

    } finally {
      // Cleanup temporary files
      tempFiles.forEach(file => {
        try {
          cryptoService.cleanupTempFile(file);
        } catch (cleanupError) {
          console.warn('Failed to cleanup temp file:', file, cleanupError);
        }
      });
    }
  }

  /**
   * Restore from the latest backup
   */
  async restoreLatest(progressCallback?: BackupProgressCallback): Promise<BackupLog> {
    const startTime = Date.now();
    let tempFiles: string[] = [];

    try {
      const { settings } = useAppStore.getState();
      const backupSettings = settings?.backupSettings;
      
      if (!backupSettings?.credentials?.encryptionKey) {
        throw new Error('Encryption key not configured');
      }

      const adapter = this.getAdapter();

      progressCallback?.({
        stage: 'preparing',
        progress: 10,
        message: 'Finding latest backup...'
      });

      // Step 1: Download latest backup
      const downloadResult = await adapter.downloadLatest('');
      tempFiles.push(downloadResult.path);

      progressCallback?.({
        stage: 'copying',
        progress: 30,
        message: 'Downloading backup...'
      });

      // Step 2: Decrypt the backup
      const decryptionResult = await cryptoService.decryptFile(
        downloadResult.path, 
        backupSettings.credentials.encryptionKey
      );
      tempFiles.push(decryptionResult.decryptedPath);

      progressCallback?.({
        stage: 'encrypting', // Using this stage for decryption
        progress: 50,
        message: 'Decrypting backup...'
      });

      // Step 3: Verify checksum
      if (downloadResult.meta.checksum_sha256 && !cryptoService.secureCompare(
        downloadResult.meta.checksum_sha256, 
        decryptionResult.checksum
      )) {
        throw new Error('Backup checksum verification failed - file may be corrupted');
      }

      progressCallback?.({
        stage: 'compressing', // Using this stage for extraction
        progress: 70,
        message: 'Extracting backup archive...'
      });

      // Step 4: Extract and restore files
      await this.extractAndRestoreBackup(decryptionResult.decryptedPath);

      progressCallback?.({
        stage: 'complete',
        progress: 100,
        message: 'Restore completed successfully'
      });

      // Step 5: Create log entry
      const log: BackupLog = {
        id: Date.now(),
        datetime: new Date(),
        type: 'Restored',
        provider: backupSettings.provider || 'unknown',
        location_url: downloadResult.meta ? 'encrypted' : undefined,
        filename: downloadResult.meta ? 'latest' : undefined,
        bytes: decryptionResult.size,
        checksum: decryptionResult.checksum,
        result: 'Success',
        by_user: 'manager', // Restore requires manager PIN
        note: `Restore completed in ${Math.round((Date.now() - startTime) / 1000)}s`
      };

      await this.addLog(log);
      return log;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      progressCallback?.({
        stage: 'error',
        progress: 0,
        message: `Restore failed: ${errorMessage}`
      });

      // Create error log
      const errorLog: BackupLog = {
        id: Date.now(),
        datetime: new Date(),
        type: 'Error',
        provider: 'unknown',
        result: 'Failed',
        by_user: 'manager',
        note: `Restore failed: ${errorMessage}`,
        error_details: error instanceof Error ? error.stack : undefined
      };

      await this.addLog(errorLog);
      throw error;

    } finally {
      // Cleanup temporary files
      tempFiles.forEach(file => {
        try {
          cryptoService.cleanupTempFile(file);
        } catch (cleanupError) {
          console.warn('Failed to cleanup temp file:', file, cleanupError);
        }
      });
    }
  }

  /**
   * Verify the latest backup
   */
  async verifyLatest(): Promise<BackupLog> {
    try {
      const { settings } = useAppStore.getState();
      const backupSettings = settings?.backupSettings;
      
      if (!backupSettings?.credentials?.encryptionKey) {
        throw new Error('Encryption key not configured');
      }

      const adapter = this.getAdapter();

      // Download and verify latest backup
      const downloadResult = await adapter.downloadLatest('');
      
      // Decrypt to verify integrity
      const decryptionResult = await cryptoService.decryptFile(
        downloadResult.path, 
        backupSettings.credentials.encryptionKey
      );

      // Verify checksum
      const checksumMatch = downloadResult.meta.checksum_sha256 && 
        cryptoService.secureCompare(downloadResult.meta.checksum_sha256, decryptionResult.checksum);

      const log: BackupLog = {
        id: Date.now(),
        datetime: new Date(),
        type: 'Verify',
        provider: backupSettings.provider || 'unknown',
        filename: downloadResult.meta ? 'latest' : undefined,
        bytes: decryptionResult.size,
        checksum: decryptionResult.checksum,
        result: checksumMatch ? 'Success' : 'Warning',
        by_user: 'system',
        note: checksumMatch ? 'Checksum verified successfully' : 'Checksum verification failed'
      };

      await this.addLog(log);

      // Cleanup
      cryptoService.cleanupTempFile(downloadResult.path);
      cryptoService.cleanupTempFile(decryptionResult.decryptedPath);

      return log;

    } catch (error) {
      const errorLog: BackupLog = {
        id: Date.now(),
        datetime: new Date(),
        type: 'Error',
        provider: 'unknown',
        result: 'Failed',
        by_user: 'system',
        note: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error_details: error instanceof Error ? error.stack : undefined
      };

      await this.addLog(errorLog);
      throw error;
    }
  }

  /**
   * List all available snapshots
   */
  async listSnapshots(limit?: number): Promise<SnapshotInfo[]> {
    try {
      const adapter = this.getAdapter();
      const items = await adapter.list();
      
      const snapshots: SnapshotInfo[] = items.map(item => {
        const parsed = this.parseBackupName(item.name);
        return {
          name: item.name,
          created_at: item.created_at,
          type: parsed?.type || 'daily',
          bytes: item.bytes,
          checksum: item.meta?.checksum_sha256 || '',
          provider: item.meta?.provider || 'unknown',
          url: item.url,
          meta: item.meta
        };
      });

      return limit ? snapshots.slice(0, limit) : snapshots;

    } catch (error) {
      console.error('Failed to list snapshots:', error);
      return [];
    }
  }

  /**
   * Apply retention policy now
   */
  async applyRetentionNow(): Promise<BackupLog> {
    try {
      const { settings } = useAppStore.getState();
      const retention = settings?.backupSettings?.retention || { keepDaily: 30, keepConfigChange: 5 };
      
      const adapter = this.getAdapter();
      const items = await adapter.list();
      
      // Group by type
      const dailyBackups = items.filter(item => {
        const parsed = this.parseBackupName(item.name);
        return parsed?.type === 'daily';
      }).sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      
      const configBackups = items.filter(item => {
        const parsed = this.parseBackupName(item.name);
        return parsed?.type === 'config';
      }).sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

      // Determine which files to delete
      const toDelete: RemoteItem[] = [];
      
      if (dailyBackups.length > retention.keepDaily) {
        toDelete.push(...dailyBackups.slice(retention.keepDaily));
      }
      
      if (configBackups.length > retention.keepConfigChange) {
        toDelete.push(...configBackups.slice(retention.keepConfigChange));
      }

      // Delete old backups
      for (const item of toDelete) {
        try {
          await adapter.remove(item.name);
        } catch (error) {
          console.warn(`Failed to remove backup ${item.name}:`, error);
        }
      }

      const log: BackupLog = {
        id: Date.now(),
        datetime: new Date(),
        type: 'Rotate',
        provider: settings?.backupSettings?.provider || 'unknown',
        result: 'Success',
        by_user: 'system',
        note: `Rotation complete: kept ${dailyBackups.length - Math.max(0, dailyBackups.length - retention.keepDaily)} daily, ${configBackups.length - Math.max(0, configBackups.length - retention.keepConfigChange)} config; removed ${toDelete.length} old backups`
      };

      await this.addLog(log);
      return log;

    } catch (error) {
      const errorLog: BackupLog = {
        id: Date.now(),
        datetime: new Date(),
        type: 'Error',
        provider: 'unknown',
        result: 'Failed',
        by_user: 'system',
        note: `Retention policy failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error_details: error instanceof Error ? error.stack : undefined
      };

      await this.addLog(errorLog);
      throw error;
    }
  }

  /**
   * Get backup logs with optional filtering
   */
  getLogs(filters?: {
    fromDate?: Date;
    toDate?: Date;
    type?: BackupLog['type'];
    result?: BackupLog['result'];
    provider?: string;
  }): BackupLog[] {
    let filtered = [...this.logs];

    if (filters?.fromDate) {
      filtered = filtered.filter(log => log.datetime >= filters.fromDate!);
    }

    if (filters?.toDate) {
      filtered = filtered.filter(log => log.datetime <= filters.toDate!);
    }

    if (filters?.type) {
      filtered = filtered.filter(log => log.type === filters.type);
    }

    if (filters?.result) {
      filtered = filtered.filter(log => log.result === filters.result);
    }

    if (filters?.provider) {
      filtered = filtered.filter(log => log.provider === filters.provider);
    }

    return filtered.sort((a, b) => b.datetime.getTime() - a.datetime.getTime());
  }

  // Private helper methods

  private async createDatabaseSnapshot(): Promise<string> {
    // In a real implementation, this would:
    // 1. Stop database writes
    // 2. Copy the database file
    // 3. Resume database writes
    
    // For now, simulate creating a database snapshot
    const dbPath = `/tmp/db_snapshot_${Date.now()}.sqlite`;
    
    // In browser environment, simulate
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(dbPath, JSON.stringify({
        type: 'database_snapshot',
        timestamp: Date.now(),
        size: Math.floor(Math.random() * 1000000) + 100000
      }));
    }
    
    return dbPath;
  }

  private async createSettingsSnapshot(): Promise<string> {
    const { settings } = useAppStore.getState();
    const settingsPath = `/tmp/settings_snapshot_${Date.now()}.json`;
    
    // In browser environment, simulate
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(settingsPath, JSON.stringify(settings));
    } else {
      // In Node.js environment, write to file
      const fs = require('fs');
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    }
    
    return settingsPath;
  }

  private async createBackupArchive(dbPath: string, settingsPath: string, type: 'daily' | 'config'): Promise<string> {
    const archivePath = `/tmp/backup_archive_${Date.now()}.zip`;
    
    // Create metadata
    const meta: MetaJson = {
      created_at: new Date().toISOString(),
      type,
      app_version: 'v1',
      terminal: 'Counter-1', // TODO: Get from settings
      by_user: 'system', // TODO: Get current user
      db_bytes: 500000, // Mock size
      checksum_sha256: '', // Will be filled after compression
      provider: 'local', // Will be updated by caller
      retention_policy: {
        daily: 30,
        config: 5
      }
    };

    // In browser environment, simulate archive creation
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(archivePath, JSON.stringify({
        type: 'backup_archive',
        meta,
        dbPath,
        settingsPath,
        timestamp: Date.now()
      }));
    } else {
      // In Node.js environment, create actual ZIP file
      // This would use a library like 'archiver' or 'node-stream-zip'
      console.log('Creating ZIP archive with:', { dbPath, settingsPath, meta });
    }
    
    return archivePath;
  }

  private async extractAndRestoreBackup(archivePath: string): Promise<void> {
    // In a real implementation, this would:
    // 1. Extract the ZIP file
    // 2. Stop the application
    // 3. Replace the database file
    // 4. Update settings
    // 5. Restart/reload the application
    
    console.log('Extracting and restoring backup from:', archivePath);
    
    // Simulate extraction
    if (typeof window !== 'undefined') {
      const archived = sessionStorage.getItem(archivePath);
      if (archived) {
        const data = JSON.parse(archived);
        console.log('Restored from backup:', data.meta);
        
        // Show reload prompt
        setTimeout(() => {
          if (confirm('Backup restored successfully. The application needs to reload to apply changes. Reload now?')) {
            window.location.reload();
          }
        }, 1000);
      }
    }
  }

  private generateBackupName(type: 'daily' | 'config'): string {
    const timestamp = new Date().toISOString()
      .replace(/[:-]/g, '')
      .replace(/\.\d{3}Z$/, '')
      .replace('T', '_');
    return `grocerypos_backup_${timestamp}_${type}.zip`;
  }

  private parseBackupName(filename: string): { timestamp: Date; type: 'daily' | 'config' } | null {
    const match = filename.match(/grocerypos_backup_(\d{8}_\d{6})_(daily|config)\.zip$/);
    if (!match) return null;

    const [, timestampStr, type] = match;
    const timestamp = new Date(
      timestampStr.replace(/(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6Z')
    );

    return { timestamp, type: type as 'daily' | 'config' };
  }

  private async addLog(log: BackupLog): Promise<void> {
    this.logs.unshift(log);
    
    // Keep only last 1000 logs
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(0, 1000);
    }
    
    this.saveLogs();
  }

  private loadLogs(): void {
    try {
      const stored = localStorage.getItem('backup-logs');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.logs = parsed.map((log: any) => ({
          ...log,
          datetime: new Date(log.datetime)
        }));
      }
    } catch (error) {
      console.warn('Failed to load backup logs:', error);
      this.logs = [];
    }
  }

  private saveLogs(): void {
    try {
      localStorage.setItem('backup-logs', JSON.stringify(this.logs));
    } catch (error) {
      console.warn('Failed to save backup logs:', error);
    }
  }
}

// Singleton instance
export const backupService = new BackupService();
