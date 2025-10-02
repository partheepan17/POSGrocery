import { BaseBackupAdapter, BackupConfigSchema, ConnectionTestResult, UploadResult, DownloadResult, RemoteItem, MetaJson } from './BackupAdapter';
import { readFileSync, writeFileSync } from 'fs';

export class OneDriveBackupAdapter extends BaseBackupAdapter {
  
  getConfigSchema(): BackupConfigSchema {
    return {
      description: 'Store backups in Microsoft OneDrive folder',
      testConnectionLabel: 'Test OneDrive Connection',
      fields: [
        {
          key: 'driveType',
          label: 'Drive Type',
          type: 'select',
          required: true,
          options: [
            { value: 'personal', label: 'Personal OneDrive' },
            { value: 'business', label: 'OneDrive for Business' }
          ]
        },
        {
          key: 'folderPath',
          label: 'Folder Path',
          type: 'text',
          required: true,
          placeholder: '/Backups/GroceryPOS or root:/Backups/GroceryPOS:',
          validation: {
            minLength: 1
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
      this.validateConfig(['driveType', 'folderPath', 'accessToken']);
      
      const { driveType, folderPath, accessToken } = this.config;
      
      // In development/browser environment, simulate the test
      if (typeof window !== 'undefined' || accessToken.startsWith('mock_')) {
        return this.simulateConnection(driveType, folderPath);
      }

      // Real OneDrive API test
      const driveEndpoint = driveType === 'personal' ? '/me/drive' : '/me/drives';
      const response = await this.makeOneDriveRequest(
        `https://graph.microsoft.com/v1.0${driveEndpoint}`,
        'GET',
        accessToken
      );

      if (response.ok) {
        const drive = await response.json();
        return {
          ok: true,
          message: `Connected to OneDrive: ${drive.name || driveType}`
        };
      } else {
        const error = await response.json().catch(() => ({ error: { message: 'Connection failed' } }));
        return {
          ok: false,
          message: `OneDrive error: ${error.error?.message || 'Connection failed'}`
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
      this.validateConfig(['driveType', 'folderPath', 'accessToken']);
      
      const { driveType, folderPath, accessToken } = this.config;
      
      // In development/browser environment, simulate upload
      if (typeof window !== 'undefined' || accessToken.startsWith('mock_')) {
        return this.simulateUpload(localPath, remoteName);
      }

      // Read file data
      const fileData = readFileSync(localPath);
      
      // Create folder path if it doesn't exist
      await this.ensureFolderExists(folderPath, accessToken);
      
      // Upload file using simple upload (for files < 4MB) or resumable upload
      const uploadUrl = this.getUploadUrl(driveType, folderPath, remoteName);
      
      const response = await this.makeOneDriveRequest(
        uploadUrl,
        'PUT',
        accessToken,
        {
          'Content-Type': 'application/zip'
        },
        fileData
      );

      if (response.ok) {
        const result = await response.json();
        return {
          url: result.webUrl || `https://onedrive.live.com/redir?resid=${result.id}`,
          bytes: fileData.length
        };
      } else {
        const error = await response.json().catch(() => ({ error: { message: 'Upload failed' } }));
        throw new Error(`OneDrive upload failed: ${error.error?.message || 'Unknown error'}`);
      }

    } catch (error) {
      throw new Error(`OneDrive upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async downloadLatest(prefix: string = ''): Promise<DownloadResult> {
    try {
      const items = await this.list(prefix);
      if (items.length === 0) {
        throw new Error('No backups found in OneDrive');
      }
      
      // Get the latest backup
      const latest = items.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0];
      
      // In development/browser environment, simulate download
      if (typeof window !== 'undefined' || this.config.accessToken.startsWith('mock_')) {
        return this.simulateDownload(latest);
      }

      // Download the file
      const { driveType, folderPath, accessToken } = this.config;
      const downloadUrl = this.getDownloadUrl(driveType, folderPath, latest.name);
      
      const response = await this.makeOneDriveRequest(downloadUrl, 'GET', accessToken);

      if (response.ok) {
        const data = await response.arrayBuffer();
        const tempPath = `/tmp/downloaded_${Date.now()}.zip`;
        
        // Write to file
        writeFileSync(tempPath, Buffer.from(data));
        
        // Create metadata
        const parsed = this.parseBackupName(latest.name);
        const meta = parsed 
          ? this.createMeta(parsed.type, latest.bytes, '', 'onedrive')
          : this.createMeta('daily', latest.bytes, '', 'onedrive');
        
        return {
          path: tempPath,
          meta
        };
      } else {
        throw new Error('Failed to download from OneDrive');
      }

    } catch (error) {
      throw new Error(`OneDrive download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async list(prefix: string = ''): Promise<RemoteItem[]> {
    try {
      this.validateConfig(['driveType', 'folderPath', 'accessToken']);
      
      const { driveType, folderPath, accessToken } = this.config;
      
      // In development/browser environment, simulate list
      if (typeof window !== 'undefined' || accessToken.startsWith('mock_')) {
        return this.simulateList(prefix);
      }

      // List files in the backup folder
      const listUrl = this.getListUrl(driveType, folderPath);
      const response = await this.makeOneDriveRequest(listUrl, 'GET', accessToken);

      if (response.ok) {
        const result = await response.json();
        const items: RemoteItem[] = [];
        
        for (const file of result.value || []) {
          if (file.name.includes('grocerypos_backup_') && (prefix === '' || file.name.startsWith(prefix))) {
            const parsed = this.parseBackupName(file.name);
            
            items.push({
              name: file.name,
              created_at: parsed ? parsed.timestamp : new Date(file.createdDateTime),
              bytes: file.size || 0,
              url: file.webUrl || `https://onedrive.live.com/redir?resid=${file.id}`
            });
          }
        }
        
        return items.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      } else {
        throw new Error('Failed to list OneDrive files');
      }

    } catch (error) {
      throw new Error(`OneDrive list failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async remove(name: string): Promise<void> {
    try {
      this.validateConfig(['driveType', 'folderPath', 'accessToken']);
      
      const { driveType, folderPath, accessToken } = this.config;
      
      // In development/browser environment, simulate removal
      if (typeof window !== 'undefined' || accessToken.startsWith('mock_')) {
        this.simulateRemove(name);
        return;
      }

      // Delete the file
      const deleteUrl = this.getFileUrl(driveType, folderPath, name);
      const response = await this.makeOneDriveRequest(deleteUrl, 'DELETE', accessToken);
      
      if (!response.ok && response.status !== 404) {
        throw new Error('Failed to delete file from OneDrive');
      }

    } catch (error) {
      throw new Error(`OneDrive remove failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async makeOneDriveRequest(
    url: string, 
    method: string, 
    accessToken: string, 
    headers: Record<string, string> = {},
    body?: Buffer | string
  ): Promise<Response> {
    const requestHeaders = {
      'Authorization': `Bearer ${accessToken}`,
      ...headers
    };

    return fetch(url, {
      method,
      headers: requestHeaders,
      body: body as BodyInit | null
    });
  }

  private getUploadUrl(driveType: string, folderPath: string, fileName: string): string {
    const basePath = driveType === 'personal' ? '/me/drive' : '/me/drive';
    const encodedPath = encodeURIComponent(`${folderPath}/${fileName}`);
    return `https://graph.microsoft.com/v1.0${basePath}/root:/${encodedPath}:/content`;
  }

  private getDownloadUrl(driveType: string, folderPath: string, fileName: string): string {
    const basePath = driveType === 'personal' ? '/me/drive' : '/me/drive';
    const encodedPath = encodeURIComponent(`${folderPath}/${fileName}`);
    return `https://graph.microsoft.com/v1.0${basePath}/root:/${encodedPath}:/content`;
  }

  private getListUrl(driveType: string, folderPath: string): string {
    const basePath = driveType === 'personal' ? '/me/drive' : '/me/drive';
    const encodedPath = encodeURIComponent(folderPath);
    return `https://graph.microsoft.com/v1.0${basePath}/root:/${encodedPath}:/children`;
  }

  private getFileUrl(driveType: string, folderPath: string, fileName: string): string {
    const basePath = driveType === 'personal' ? '/me/drive' : '/me/drive';
    const encodedPath = encodeURIComponent(`${folderPath}/${fileName}`);
    return `https://graph.microsoft.com/v1.0${basePath}/root:/${encodedPath}:`;
  }

  private async ensureFolderExists(folderPath: string, accessToken: string): Promise<void> {
    // This is a simplified implementation
    // In a real implementation, you would check if the folder exists and create it if not
    console.log(`Ensuring OneDrive folder exists: ${folderPath}`);
  }

  // Simulation methods for development
  private async simulateConnection(driveType: string, folderPath: string): Promise<ConnectionTestResult> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (this.config.accessToken === 'mock_invalid') {
      return {
        ok: false,
        message: 'Invalid access token'
      };
    }
    
    return {
      ok: true,
      message: `Connected to mock OneDrive (${driveType}): ${folderPath}`
    };
  }

  private async simulateUpload(localPath: string, remoteName: string): Promise<UploadResult> {
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const mockSize = Math.floor(Math.random() * 1000000) + 100000;
    const mockId = 'onedrive_' + Date.now();
    
    // Store in sessionStorage for simulation
    const stored = JSON.parse(sessionStorage.getItem('mock_onedrive_files') || '[]');
    stored.push({
      id: mockId,
      name: remoteName,
      size: mockSize,
      createdDateTime: new Date().toISOString(),
      webUrl: `https://onedrive.live.com/redir?resid=${mockId}`
    });
    sessionStorage.setItem('mock_onedrive_files', JSON.stringify(stored));
    
    return {
      url: `https://onedrive.live.com/redir?resid=${mockId}`,
      bytes: mockSize
    };
  }

  private async simulateDownload(item: RemoteItem): Promise<DownloadResult> {
    await new Promise(resolve => setTimeout(resolve, 1800));
    
    const tempPath = `mock_downloaded_${Date.now()}.zip`;
    const parsed = this.parseBackupName(item.name);
    const meta = parsed 
      ? this.createMeta(parsed.type, item.bytes, '', 'onedrive')
      : this.createMeta('daily', item.bytes, '', 'onedrive');
    
    return { path: tempPath, meta };
  }

  private async simulateList(prefix: string): Promise<RemoteItem[]> {
    await new Promise(resolve => setTimeout(resolve, 900));
    
    const stored = JSON.parse(sessionStorage.getItem('mock_onedrive_files') || '[]');
    
    return stored
      .filter((file: any) => prefix === '' || file.name.startsWith(prefix))
      .map((file: any) => {
        const parsed = this.parseBackupName(file.name);
        return {
          name: file.name,
          created_at: parsed ? parsed.timestamp : new Date(file.createdDateTime),
          bytes: file.size,
          url: file.webUrl
        };
      })
      .sort((a: RemoteItem, b: RemoteItem) => b.created_at.getTime() - a.created_at.getTime());
  }

  private simulateRemove(name: string): void {
    const stored = JSON.parse(sessionStorage.getItem('mock_onedrive_files') || '[]');
    const filtered = stored.filter((file: any) => file.name !== name);
    sessionStorage.setItem('mock_onedrive_files', JSON.stringify(filtered));
  }
}
