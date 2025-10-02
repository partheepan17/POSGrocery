import { BaseBackupAdapter, BackupConfigSchema, ConnectionTestResult, UploadResult, DownloadResult, RemoteItem, MetaJson } from './BackupAdapter';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync, readFileSync } from 'fs';
import { join, dirname } from 'path';

export class LocalBackupAdapter extends BaseBackupAdapter {
  
  getConfigSchema(): BackupConfigSchema {
    return {
      description: 'Store backups in a local folder on this computer',
      testConnectionLabel: 'Test Folder Access',
      fields: [
        {
          key: 'folderPath',
          label: 'Backup Folder Path',
          type: 'text',
          required: true,
          placeholder: 'C:\\Backups\\GroceryPOS or /home/user/backups',
          validation: {
            minLength: 1
          }
        }
      ]
    };
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      this.validateConfig(['folderPath']);
      
      const folderPath = this.config.folderPath;
      
      // Check if folder exists or can be created
      if (!existsSync(folderPath)) {
        try {
          mkdirSync(folderPath, { recursive: true });
        } catch (error) {
          return {
            ok: false,
            message: `Cannot create backup folder: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      }

      // Test write permissions by creating a test file
      const testFile = join(folderPath, 'test_write_permissions.tmp');
      try {
        require('fs').writeFileSync(testFile, 'test');
        unlinkSync(testFile);
      } catch (error) {
        return {
          ok: false,
          message: `No write permission to backup folder: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }

      return {
        ok: true,
        message: `Backup folder ready: ${folderPath}`
      };

    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async upload(localPath: string, remoteName: string): Promise<UploadResult> {
    try {
      this.validateConfig(['folderPath']);
      
      const folderPath = this.config.folderPath;
      const destinationPath = join(folderPath, remoteName);
      
      // Ensure backup folder exists
      if (!existsSync(folderPath)) {
        mkdirSync(folderPath, { recursive: true });
      }
      
      // Copy file to backup location
      copyFileSync(localPath, destinationPath);
      
      // Get file size
      const stats = statSync(destinationPath);
      
      return {
        url: destinationPath,
        bytes: stats.size
      };

    } catch (error) {
      throw new Error(`Local backup upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async downloadLatest(prefix: string = ''): Promise<DownloadResult> {
    try {
      this.validateConfig(['folderPath']);
      
      const items = await this.list(prefix);
      if (items.length === 0) {
        throw new Error('No backups found');
      }
      
      // Sort by creation date (newest first)
      const latest = items.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0];
      
      // For local adapter, the file is already accessible at the URL
      const localPath = latest.url!;
      
      if (!existsSync(localPath)) {
        throw new Error(`Backup file not found: ${localPath}`);
      }
      
      // Extract metadata from filename or try to read from companion meta file
      let meta: MetaJson;
      const metaPath = localPath.replace('.zip', '.meta.json');
      
      if (existsSync(metaPath)) {
        meta = JSON.parse(readFileSync(metaPath, 'utf8'));
      } else {
        // Fallback: create basic metadata from filename
        const parsed = this.parseBackupName(latest.name);
        if (!parsed) {
          throw new Error('Cannot parse backup filename');
        }
        
        meta = this.createMeta(parsed.type, latest.bytes, '', 'local');
      }
      
      return {
        path: localPath,
        meta
      };

    } catch (error) {
      throw new Error(`Local backup download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async list(prefix: string = ''): Promise<RemoteItem[]> {
    try {
      this.validateConfig(['folderPath']);
      
      const folderPath = this.config.folderPath;
      
      if (!existsSync(folderPath)) {
        return [];
      }
      
      const files = readdirSync(folderPath);
      const backupFiles = files.filter(file => 
        file.includes('grocerypos_backup_') && 
        file.endsWith('.zip') &&
        (prefix === '' || file.startsWith(prefix))
      );
      
      const items: RemoteItem[] = [];
      
      for (const file of backupFiles) {
        try {
          const filePath = join(folderPath, file);
          const stats = statSync(filePath);
          
          // Try to parse metadata from filename
          const parsed = this.parseBackupName(file);
          const createdAt = parsed ? parsed.timestamp : stats.mtime;
          
          items.push({
            name: file,
            created_at: createdAt,
            bytes: stats.size,
            url: filePath
          });
        } catch (error) {
          console.warn(`Failed to process backup file ${file}:`, error);
        }
      }
      
      return items.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

    } catch (error) {
      throw new Error(`Local backup list failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async remove(name: string): Promise<void> {
    try {
      this.validateConfig(['folderPath']);
      
      const folderPath = this.config.folderPath;
      const filePath = join(folderPath, name);
      
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
      
      // Also remove companion meta file if it exists
      const metaPath = filePath.replace('.zip', '.meta.json');
      if (existsSync(metaPath)) {
        unlinkSync(metaPath);
      }

    } catch (error) {
      throw new Error(`Local backup remove failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get backup folder path for UI display
   */
  getBackupFolderPath(): string {
    return this.config.folderPath || '';
  }

  /**
   * Open backup folder in system file explorer (if supported)
   */
  async openBackupFolder(): Promise<void> {
    try {
      const folderPath = this.config.folderPath;
      if (!folderPath || !existsSync(folderPath)) {
        throw new Error('Backup folder does not exist');
      }

      // In browser environment, we can't open file explorer
      if (typeof window !== 'undefined') {
        console.log('Would open backup folder:', folderPath);
        return;
      }

      // In Node.js environment, try to open with system default
      const { exec } = require('child_process');
      const command = process.platform === 'win32' 
        ? `explorer "${folderPath}"`
        : process.platform === 'darwin'
        ? `open "${folderPath}"`
        : `xdg-open "${folderPath}"`;
      
      exec(command, (error: any) => {
        if (error) {
          console.error('Failed to open backup folder:', error);
        }
      });

    } catch (error) {
      throw new Error(`Cannot open backup folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}



