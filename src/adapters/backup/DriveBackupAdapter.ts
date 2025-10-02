import { BaseBackupAdapter, BackupConfigSchema, ConnectionTestResult, UploadResult, DownloadResult, RemoteItem, MetaJson } from './BackupAdapter';
import { readFileSync, writeFileSync } from 'fs';

export class DriveBackupAdapter extends BaseBackupAdapter {
  
  getConfigSchema(): BackupConfigSchema {
    return {
      description: 'Store backups in Google Drive folder',
      testConnectionLabel: 'Test Google Drive Connection',
      fields: [
        {
          key: 'folderId',
          label: 'Google Drive Folder ID',
          type: 'text',
          required: true,
          placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          validation: {
            minLength: 10
          }
        },
        {
          key: 'accessToken',
          label: 'Access Token (Dev/Mock)',
          type: 'password',
          required: true,
          placeholder: 'For development: enter mock token or real OAuth token'
        },
        {
          key: 'refreshToken',
          label: 'Refresh Token (Optional)',
          type: 'password',
          required: false,
          placeholder: 'OAuth refresh token for automatic renewal'
        }
      ]
    };
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      this.validateConfig(['folderId', 'accessToken']);
      
      const { folderId, accessToken } = this.config;
      
      // In development/browser environment, simulate the test
      if (typeof window !== 'undefined' || accessToken.startsWith('mock_')) {
        return this.simulateConnection(folderId, accessToken);
      }

      // Real Google Drive API test
      const response = await this.makeGoogleDriveRequest(
        `https://www.googleapis.com/drive/v3/files/${folderId}`,
        'GET',
        accessToken
      );

      if (response.ok) {
        const folder = await response.json();
        return {
          ok: true,
          message: `Connected to Google Drive folder: ${folder.name || folderId}`
        };
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        return {
          ok: false,
          message: `Google Drive error: ${error.error?.message || 'Connection failed'}`
        };
      }

    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async upload(localPath: string, remoteName: string): Promise<UploadResult> {
    try {
      this.validateConfig(['folderId', 'accessToken']);
      
      const { folderId, accessToken } = this.config;
      
      // In development/browser environment, simulate upload
      if (typeof window !== 'undefined' || accessToken.startsWith('mock_')) {
        return this.simulateUpload(localPath, remoteName);
      }

      // Read file data
      const fileData = readFileSync(localPath);
      
      // Create multipart upload request
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;
      
      const metadata = {
        name: remoteName,
        parents: [folderId]
      };
      
      const multipartRequestBody = 
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/zip\r\n\r\n' +
        fileData.toString('binary') +
        closeDelimiter;

      const response = await this.makeGoogleDriveRequest(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        'POST',
        accessToken,
        {
          'Content-Type': `multipart/related; boundary="${boundary}"`,
          'Content-Length': multipartRequestBody.length.toString()
        },
        multipartRequestBody
      );

      if (response.ok) {
        const result = await response.json();
        return {
          url: `https://drive.google.com/file/d/${result.id}`,
          bytes: fileData.length
        };
      } else {
        const error = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(`Google Drive upload failed: ${error.error?.message || 'Unknown error'}`);
      }

    } catch (error) {
      throw new Error(`Google Drive upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async downloadLatest(prefix: string = ''): Promise<DownloadResult> {
    try {
      const items = await this.list(prefix);
      if (items.length === 0) {
        throw new Error('No backups found in Google Drive');
      }
      
      // Get the latest backup
      const latest = items.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0];
      
      // Extract file ID from URL
      const fileId = this.extractFileIdFromUrl(latest.url!);
      if (!fileId) {
        throw new Error('Cannot extract file ID from Google Drive URL');
      }
      
      // Download the file
      const { accessToken } = this.config;
      
      if (typeof window !== 'undefined' || accessToken.startsWith('mock_')) {
        return this.simulateDownload(latest);
      }

      const response = await this.makeGoogleDriveRequest(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        'GET',
        accessToken
      );

      if (response.ok) {
        const data = await response.arrayBuffer();
        const tempPath = `/tmp/downloaded_${Date.now()}.zip`;
        
        // In Node.js environment, write to file
        if (typeof window === 'undefined') {
          writeFileSync(tempPath, Buffer.from(data));
        }
        
        // Create metadata
        const parsed = this.parseBackupName(latest.name);
        const meta = parsed 
          ? this.createMeta(parsed.type, latest.bytes, '', 'gdrive')
          : this.createMeta('daily', latest.bytes, '', 'gdrive');
        
        return {
          path: tempPath,
          meta
        };
      } else {
        throw new Error('Failed to download from Google Drive');
      }

    } catch (error) {
      throw new Error(`Google Drive download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async list(prefix: string = ''): Promise<RemoteItem[]> {
    try {
      this.validateConfig(['folderId', 'accessToken']);
      
      const { folderId, accessToken } = this.config;
      
      // In development/browser environment, simulate list
      if (typeof window !== 'undefined' || accessToken.startsWith('mock_')) {
        return this.simulateList(prefix);
      }

      // Query for backup files in the folder
      const query = `'${folderId}' in parents and name contains 'grocerypos_backup_' and trashed=false`;
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,size,createdTime,webViewLink)`;
      
      const response = await this.makeGoogleDriveRequest(url, 'GET', accessToken);

      if (response.ok) {
        const result = await response.json();
        const items: RemoteItem[] = [];
        
        for (const file of result.files || []) {
          if (prefix === '' || file.name.startsWith(prefix)) {
            const parsed = this.parseBackupName(file.name);
            
            items.push({
              name: file.name,
              created_at: parsed ? parsed.timestamp : new Date(file.createdTime),
              bytes: parseInt(file.size || '0'),
              url: file.webViewLink || `https://drive.google.com/file/d/${file.id}`
            });
          }
        }
        
        return items.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      } else {
        throw new Error('Failed to list Google Drive files');
      }

    } catch (error) {
      throw new Error(`Google Drive list failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async remove(name: string): Promise<void> {
    try {
      this.validateConfig(['folderId', 'accessToken']);
      
      const { folderId, accessToken } = this.config;
      
      // In development/browser environment, simulate removal
      if (typeof window !== 'undefined' || accessToken.startsWith('mock_')) {
        this.simulateRemove(name);
        return;
      }

      // Find the file by name
      const query = `'${folderId}' in parents and name='${name}' and trashed=false`;
      const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`;
      
      const searchResponse = await this.makeGoogleDriveRequest(searchUrl, 'GET', accessToken);
      
      if (searchResponse.ok) {
        const result = await searchResponse.json();
        const files = result.files || [];
        
        if (files.length === 0) {
          throw new Error(`Backup file not found: ${name}`);
        }
        
        // Delete the file
        const fileId = files[0].id;
        const deleteResponse = await this.makeGoogleDriveRequest(
          `https://www.googleapis.com/drive/v3/files/${fileId}`,
          'DELETE',
          accessToken
        );
        
        if (!deleteResponse.ok) {
          throw new Error('Failed to delete file from Google Drive');
        }
      } else {
        throw new Error('Failed to search for file in Google Drive');
      }

    } catch (error) {
      throw new Error(`Google Drive remove failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async makeGoogleDriveRequest(
    url: string, 
    method: string, 
    accessToken: string, 
    headers: Record<string, string> = {},
    body?: string
  ): Promise<Response> {
    const requestHeaders = {
      'Authorization': `Bearer ${accessToken}`,
      ...headers
    };

    return fetch(url, {
      method,
      headers: requestHeaders,
      body
    });
  }

  private extractFileIdFromUrl(url: string): string | null {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  }

  // Simulation methods for development
  private async simulateConnection(folderId: string, accessToken: string): Promise<ConnectionTestResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (accessToken === 'mock_invalid') {
      return {
        ok: false,
        message: 'Invalid access token'
      };
    }
    
    return {
      ok: true,
      message: `Connected to mock Google Drive folder: ${folderId}`
    };
  }

  private async simulateUpload(localPath: string, remoteName: string): Promise<UploadResult> {
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockSize = Math.floor(Math.random() * 1000000) + 100000;
    const mockId = 'mock_' + Date.now();
    
    // Store in sessionStorage for simulation
    const stored = JSON.parse(sessionStorage.getItem('mock_gdrive_files') || '[]');
    stored.push({
      id: mockId,
      name: remoteName,
      size: mockSize,
      createdTime: new Date().toISOString(),
      webViewLink: `https://drive.google.com/file/d/${mockId}`
    });
    sessionStorage.setItem('mock_gdrive_files', JSON.stringify(stored));
    
    return {
      url: `https://drive.google.com/file/d/${mockId}`,
      bytes: mockSize
    };
  }

  private async simulateDownload(item: RemoteItem): Promise<DownloadResult> {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const tempPath = `mock_downloaded_${Date.now()}.zip`;
    const parsed = this.parseBackupName(item.name);
    const meta = parsed 
      ? this.createMeta(parsed.type, item.bytes, '', 'gdrive')
      : this.createMeta('daily', item.bytes, '', 'gdrive');
    
    return { path: tempPath, meta };
  }

  private async simulateList(prefix: string): Promise<RemoteItem[]> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const stored = JSON.parse(sessionStorage.getItem('mock_gdrive_files') || '[]');
    
    return stored
      .filter((file: any) => prefix === '' || file.name.startsWith(prefix))
      .map((file: any) => {
        const parsed = this.parseBackupName(file.name);
        return {
          name: file.name,
          created_at: parsed ? parsed.timestamp : new Date(file.createdTime),
          bytes: file.size,
          url: file.webViewLink
        };
      })
      .sort((a: RemoteItem, b: RemoteItem) => b.created_at.getTime() - a.created_at.getTime());
  }

  private simulateRemove(name: string): void {
    const stored = JSON.parse(sessionStorage.getItem('mock_gdrive_files') || '[]');
    const filtered = stored.filter((file: any) => file.name !== name);
    sessionStorage.setItem('mock_gdrive_files', JSON.stringify(filtered));
  }
}



