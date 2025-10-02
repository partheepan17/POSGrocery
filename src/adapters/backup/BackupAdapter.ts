export interface MetaJson {
  created_at: string;
  type: 'daily' | 'config';
  app_version: string;
  terminal: string;
  by_user: string;
  db_bytes: number;
  checksum_sha256: string;
  provider: 'local' | 'gdrive' | 'onedrive' | 's3' | 'backblaze';
  retention_policy: {
    daily: number;
    config: number;
  };
}

export interface RemoteItem {
  name: string;
  created_at: Date;
  bytes: number;
  url?: string;
  meta?: MetaJson;
}

export interface UploadResult {
  url: string;
  bytes: number;
}

export interface DownloadResult {
  path: string;
  meta: MetaJson;
}

export interface ConnectionTestResult {
  ok: boolean;
  message?: string;
}

export interface BackupAdapter {
  /**
   * Test connection to the backup provider
   */
  testConnection(): Promise<ConnectionTestResult>;

  /**
   * Upload a file to the backup provider
   */
  upload(localPath: string, remoteName: string): Promise<UploadResult>;

  /**
   * Download the latest backup file
   */
  downloadLatest(prefix: string): Promise<DownloadResult>;

  /**
   * List all backup files with optional prefix filter
   */
  list(prefix?: string): Promise<RemoteItem[]>;

  /**
   * Remove a backup file by name
   */
  remove(name: string): Promise<void>;

  /**
   * Get provider-specific configuration requirements
   */
  getConfigSchema(): BackupConfigSchema;
}

export interface BackupConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'select' | 'boolean';
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

export interface BackupConfigSchema {
  fields: BackupConfigField[];
  testConnectionLabel: string;
  description: string;
}

export abstract class BaseBackupAdapter implements BackupAdapter {
  protected config: Record<string, any>;

  constructor(config: Record<string, any>) {
    this.config = config;
  }

  abstract testConnection(): Promise<ConnectionTestResult>;
  abstract upload(localPath: string, remoteName: string): Promise<UploadResult>;
  abstract downloadLatest(prefix: string): Promise<DownloadResult>;
  abstract list(prefix?: string): Promise<RemoteItem[]>;
  abstract remove(name: string): Promise<void>;
  abstract getConfigSchema(): BackupConfigSchema;

  /**
   * Validate required configuration fields
   */
  protected validateConfig(requiredFields: string[]): void {
    const missing = requiredFields.filter(field => !this.config[field]);
    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
  }

  /**
   * Generate backup filename
   */
  protected generateBackupName(type: 'daily' | 'config'): string {
    const timestamp = new Date().toISOString()
      .replace(/[:-]/g, '')
      .replace(/\.\d{3}Z$/, '')
      .replace('T', '_');
    return `grocerypos_backup_${timestamp}_${type}.zip`;
  }

  /**
   * Parse backup filename to extract metadata
   */
  protected parseBackupName(filename: string): { timestamp: Date; type: 'daily' | 'config' } | null {
    const match = filename.match(/grocerypos_backup_(\d{8}_\d{6})_(daily|config)\.zip$/);
    if (!match) return null;

    const [, timestampStr, type] = match;
    const timestamp = new Date(
      timestampStr.replace(/(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6Z')
    );

    return { timestamp, type: type as 'daily' | 'config' };
  }

  /**
   * Create metadata object
   */
  protected createMeta(
    type: 'daily' | 'config',
    dbBytes: number,
    checksum: string,
    provider: MetaJson['provider']
  ): MetaJson {
    return {
      created_at: new Date().toISOString(),
      type,
      app_version: 'v1',
      terminal: 'Counter-1', // TODO: Get from settings
      by_user: 'manager', // TODO: Get current user
      db_bytes: dbBytes,
      checksum_sha256: checksum,
      provider,
      retention_policy: {
        daily: 30,
        config: 5
      }
    };
  }
}



