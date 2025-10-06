export interface BackupData {
  id: string;
  name: string;
  type: 'full' | 'incremental';
  size: number;
  createdAt: Date;
  data: any;
  checksum: string;
}

export interface BackupConfig {
  enabled: boolean;
  provider: 'local' | 'cloud' | 'ftp';
  cloudProvider?: 'aws' | 'google' | 'azure';
  endpoint?: string;
  credentials?: {
    accessKey?: string;
    secretKey?: string;
    bucket?: string;
    region?: string;
  };
  encryption: boolean;
  compression: boolean;
  retention: number; // days
}

export abstract class BackupAdapter {
  protected config: BackupConfig;

  constructor(config: BackupConfig) {
    this.config = config;
  }

  abstract createBackup(data: any, name: string): Promise<BackupData>;
  abstract restoreBackup(backupId: string): Promise<any>;
  abstract listBackups(): Promise<BackupData[]>;
  abstract deleteBackup(backupId: string): Promise<void>;
  abstract isAvailable(): Promise<boolean>;
  abstract getStorageInfo(): Promise<{ used: number; total: number; available: number }>;
}

export class LocalBackupAdapter extends BackupAdapter {
  async createBackup(data: any, name: string): Promise<BackupData> {
    const backupId = `backup_${Date.now()}`;
    const backupData = {
      id: backupId,
      name,
      type: 'full' as const,
      size: JSON.stringify(data).length,
      createdAt: new Date(),
      data,
      checksum: this.generateChecksum(data),
    };

    // Store in localStorage
    localStorage.setItem(`backup_${backupId}`, JSON.stringify(backupData));
    
    // Update backup index
    const index = JSON.parse(localStorage.getItem('backup_index') || '[]');
    index.push(backupId);
    localStorage.setItem('backup_index', JSON.stringify(index));

    return backupData;
  }

  async restoreBackup(backupId: string): Promise<any> {
    const backupStr = localStorage.getItem(`backup_${backupId}`);
    if (!backupStr) {
      throw new Error('Backup not found');
    }

    const backup: BackupData = JSON.parse(backupStr);
    
    // Verify checksum
    if (backup.checksum !== this.generateChecksum(backup.data)) {
      throw new Error('Backup data corrupted');
    }

    return backup.data;
  }

  async listBackups(): Promise<BackupData[]> {
    const index = JSON.parse(localStorage.getItem('backup_index') || '[]');
    const backups: BackupData[] = [];

    for (const backupId of index) {
      const backupStr = localStorage.getItem(`backup_${backupId}`);
      if (backupStr) {
        const backup: BackupData = JSON.parse(backupStr);
        backup.createdAt = new Date(backup.createdAt);
        backups.push(backup);
      }
    }

    return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async deleteBackup(backupId: string): Promise<void> {
    localStorage.removeItem(`backup_${backupId}`);
    
    // Update index
    const index = JSON.parse(localStorage.getItem('backup_index') || '[]');
    const newIndex = index.filter((id: string) => id !== backupId);
    localStorage.setItem('backup_index', JSON.stringify(newIndex));
  }

  async isAvailable(): Promise<boolean> {
    try {
      const testKey = 'backup_test_' + Date.now();
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  async getStorageInfo(): Promise<{ used: number; total: number; available: number }> {
    let used = 0;
    for (const key in localStorage) {
      if (key.startsWith('backup_')) {
        used += localStorage[key].length;
      }
    }

    // Estimate available storage (5MB limit for localStorage)
    const total = 5 * 1024 * 1024; // 5MB
    const available = Math.max(0, total - used);

    return { used, total, available };
  }

  private generateChecksum(data: any): string {
    // Simple checksum implementation
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }
}

export class CloudBackupAdapter extends BackupAdapter {
  async createBackup(data: any, name: string): Promise<BackupData> {
    const backupId = `backup_${Date.now()}`;
    const backupData = {
      id: backupId,
      name,
      type: 'full' as const,
      size: JSON.stringify(data).length,
      createdAt: new Date(),
      data,
      checksum: this.generateChecksum(data),
    };

    // In a real implementation, this would upload to cloud storage
    console.log('Uploading backup to cloud:', backupId);
    
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return backupData;
  }

  async restoreBackup(backupId: string): Promise<any> {
    // In a real implementation, this would download from cloud storage
    console.log('Downloading backup from cloud:', backupId);
    
    // Simulate download delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Return mock data
    return { message: 'Backup restored from cloud' };
  }

  async listBackups(): Promise<BackupData[]> {
    // In a real implementation, this would list backups from cloud storage
    console.log('Listing cloud backups');
    
    return [
      {
        id: 'cloud_backup_1',
        name: 'Daily Backup',
        type: 'full',
        size: 1024000,
        createdAt: new Date(Date.now() - 86400000),
        data: {},
        checksum: 'abc123',
      },
    ];
  }

  async deleteBackup(backupId: string): Promise<void> {
    // In a real implementation, this would delete from cloud storage
    console.log('Deleting cloud backup:', backupId);
  }

  async isAvailable(): Promise<boolean> {
    // Check if cloud credentials are configured
    return !!(this.config.credentials?.accessKey && this.config.credentials?.secretKey);
  }

  async getStorageInfo(): Promise<{ used: number; total: number; available: number }> {
    // In a real implementation, this would query cloud storage
    return {
      used: 1024000, // 1MB
      total: 1024000000, // 1GB
      available: 1023998976, // 1GB - 1MB
    };
  }

  private generateChecksum(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
}

export class FTPBackupAdapter extends BackupAdapter {
  async createBackup(data: any, name: string): Promise<BackupData> {
    const backupId = `backup_${Date.now()}`;
    const backupData = {
      id: backupId,
      name,
      type: 'full' as const,
      size: JSON.stringify(data).length,
      createdAt: new Date(),
      data,
      checksum: this.generateChecksum(data),
    };

    // In a real implementation, this would upload to FTP server
    console.log('Uploading backup to FTP:', backupId);
    
    return backupData;
  }

  async restoreBackup(backupId: string): Promise<any> {
    // In a real implementation, this would download from FTP server
    console.log('Downloading backup from FTP:', backupId);
    
    return { message: 'Backup restored from FTP' };
  }

  async listBackups(): Promise<BackupData[]> {
    // In a real implementation, this would list files from FTP server
    console.log('Listing FTP backups');
    
    return [];
  }

  async deleteBackup(backupId: string): Promise<void> {
    // In a real implementation, this would delete from FTP server
    console.log('Deleting FTP backup:', backupId);
  }

  async isAvailable(): Promise<boolean> {
    return !!this.config.endpoint;
  }

  async getStorageInfo(): Promise<{ used: number; total: number; available: number }> {
    // FTP doesn't typically provide storage info
    return {
      used: 0,
      total: 0,
      available: 0,
    };
  }

  private generateChecksum(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
}

// Factory function to get the appropriate adapter
export function createBackupAdapter(config: BackupConfig): BackupAdapter {
  switch (config.provider) {
    case 'cloud':
      return new CloudBackupAdapter(config);
    case 'ftp':
      return new FTPBackupAdapter(config);
    case 'local':
    default:
      return new LocalBackupAdapter(config);
  }
}









