import { BaseBackupAdapter, BackupConfigSchema, ConnectionTestResult, UploadResult, DownloadResult, RemoteItem, MetaJson } from './BackupAdapter';
import { createHash, createHmac } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';

export class S3BackupAdapter extends BaseBackupAdapter {
  private readonly isBackblaze: boolean;

  constructor(config: Record<string, any>, isBackblaze: boolean = false) {
    super(config);
    this.isBackblaze = isBackblaze;
  }
  
  getConfigSchema(): BackupConfigSchema {
    const providerName = this.isBackblaze ? 'Backblaze B2' : 'Amazon S3';
    const endpointPlaceholder = this.isBackblaze 
      ? 's3.us-west-002.backblazeb2.com'
      : 's3.amazonaws.com';
    
    return {
      description: `Store backups in ${providerName} bucket`,
      testConnectionLabel: `Test ${providerName} Connection`,
      fields: [
        {
          key: 'endpoint',
          label: 'S3 Endpoint',
          type: 'text',
          required: true,
          placeholder: endpointPlaceholder
        },
        {
          key: 'bucket',
          label: 'Bucket Name',
          type: 'text',
          required: true,
          placeholder: 'my-backup-bucket'
        },
        {
          key: 'region',
          label: 'Region',
          type: 'text',
          required: true,
          placeholder: this.isBackblaze ? 'us-west-002' : 'us-east-1'
        },
        {
          key: 'accessKey',
          label: 'Access Key ID',
          type: 'text',
          required: true,
          placeholder: 'AKIAIOSFODNN7EXAMPLE'
        },
        {
          key: 'secretKey',
          label: 'Secret Access Key',
          type: 'password',
          required: true,
          placeholder: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
        },
        {
          key: 'folderPrefix',
          label: 'Folder Prefix (Optional)',
          type: 'text',
          required: false,
          placeholder: 'backups/grocerypos/'
        }
      ]
    };
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      this.validateConfig(['endpoint', 'bucket', 'region', 'accessKey', 'secretKey']);
      
      const { bucket } = this.config;
      
      // In development/browser environment, simulate the test
      if (typeof window !== 'undefined' || this.config.accessKey.startsWith('mock_')) {
        return this.simulateConnection();
      }

      // Test connection by listing bucket (HEAD request)
      const response = await this.makeS3Request('HEAD', '', {}, '');

      if (response.ok) {
        return {
          ok: true,
          message: `Connected to ${this.isBackblaze ? 'Backblaze B2' : 'S3'} bucket: ${bucket}`
        };
      } else {
        const errorText = await response.text().catch(() => 'Connection failed');
        return {
          ok: false,
          message: `${this.isBackblaze ? 'Backblaze B2' : 'S3'} error: ${errorText}`
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
      this.validateConfig(['endpoint', 'bucket', 'region', 'accessKey', 'secretKey']);
      
      // In development/browser environment, simulate upload
      if (typeof window !== 'undefined' || this.config.accessKey.startsWith('mock_')) {
        return this.simulateUpload(localPath, remoteName);
      }

      // Read file data
      const fileData = readFileSync(localPath);
      const key = this.getFullKey(remoteName);
      
      // Upload to S3
      const response = await this.makeS3Request('PUT', key, {
        'Content-Type': 'application/zip',
        'Content-Length': fileData.length.toString()
      }, fileData.toString('binary'));

      if (response.ok) {
        const url = this.getObjectUrl(key);
        return {
          url,
          bytes: fileData.length
        };
      } else {
        const errorText = await response.text().catch(() => 'Upload failed');
        throw new Error(`S3 upload failed: ${errorText}`);
      }

    } catch (error) {
      throw new Error(`S3 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async downloadLatest(prefix: string = ''): Promise<DownloadResult> {
    try {
      const items = await this.list(prefix);
      if (items.length === 0) {
        throw new Error('No backups found in S3 bucket');
      }
      
      // Get the latest backup
      const latest = items.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0];
      
      // In development/browser environment, simulate download
      if (typeof window !== 'undefined' || this.config.accessKey.startsWith('mock_')) {
        return this.simulateDownload(latest);
      }

      // Download the file
      const key = this.getFullKey(latest.name);
      const response = await this.makeS3Request('GET', key);

      if (response.ok) {
        const data = await response.arrayBuffer();
        const tempPath = `/tmp/downloaded_${Date.now()}.zip`;
        
        // Write to file
        writeFileSync(tempPath, Buffer.from(data));
        
        // Create metadata
        const parsed = this.parseBackupName(latest.name);
        const meta = parsed 
          ? this.createMeta(parsed.type, latest.bytes, '', this.isBackblaze ? 'backblaze' : 's3')
          : this.createMeta('daily', latest.bytes, '', this.isBackblaze ? 'backblaze' : 's3');
        
        return {
          path: tempPath,
          meta
        };
      } else {
        throw new Error('Failed to download from S3');
      }

    } catch (error) {
      throw new Error(`S3 download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async list(prefix: string = ''): Promise<RemoteItem[]> {
    try {
      this.validateConfig(['endpoint', 'bucket', 'region', 'accessKey', 'secretKey']);
      
      // In development/browser environment, simulate list
      if (typeof window !== 'undefined' || this.config.accessKey.startsWith('mock_')) {
        return this.simulateList(prefix);
      }

      const fullPrefix = this.getFullKey(prefix);
      const response = await this.makeS3Request('GET', '', {}, '', `?prefix=${encodeURIComponent(fullPrefix)}`);

      if (response.ok) {
        const xmlText = await response.text();
        const items = this.parseS3ListResponse(xmlText);
        
        return items
          .filter(item => item.name.includes('grocerypos_backup_'))
          .map(item => {
            const name = item.name.replace(this.getFullKey(''), '');
            const parsed = this.parseBackupName(name);
            
            return {
              name,
              created_at: parsed ? parsed.timestamp : new Date(item.lastModified),
              bytes: item.size,
              url: this.getObjectUrl(item.name)
            };
          })
          .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      } else {
        throw new Error('Failed to list S3 objects');
      }

    } catch (error) {
      throw new Error(`S3 list failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async remove(name: string): Promise<void> {
    try {
      this.validateConfig(['endpoint', 'bucket', 'region', 'accessKey', 'secretKey']);
      
      // In development/browser environment, simulate removal
      if (typeof window !== 'undefined' || this.config.accessKey.startsWith('mock_')) {
        this.simulateRemove(name);
        return;
      }

      const key = this.getFullKey(name);
      const response = await this.makeS3Request('DELETE', key);
      
      if (!response.ok) {
        throw new Error('Failed to delete object from S3');
      }

    } catch (error) {
      throw new Error(`S3 remove failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getFullKey(name: string): string {
    const prefix = this.config.folderPrefix || '';
    return prefix ? `${prefix}${name}` : name;
  }

  private getObjectUrl(key: string): string {
    const { endpoint, bucket } = this.config;
    return `https://${bucket}.${endpoint}/${key}`;
  }

  private async makeS3Request(
    method: string,
    key: string,
    headers: Record<string, string> = {},
    body: string = '',
    queryString: string = ''
  ): Promise<Response> {
    const { endpoint, bucket, region, accessKey, secretKey } = this.config;
    
    const url = `https://${bucket}.${endpoint}/${key}${queryString}`;
    const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const date = timestamp.substr(0, 8);
    
    // Create canonical request
    const canonicalHeaders = {
      'host': `${bucket}.${endpoint}`,
      'x-amz-date': timestamp,
      ...headers
    };
    
    const signedHeaders = Object.keys(canonicalHeaders).sort().join(';');
    const canonicalHeadersStr = Object.keys(canonicalHeaders)
      .sort()
      .map(key => `${key}:${canonicalHeaders[key as keyof typeof canonicalHeaders]}`)
      .join('\n');
    
    const payloadHash = createHash('sha256').update(body).digest('hex');
    
    const canonicalRequest = [
      method,
      `/${key}`,
      queryString.replace('?', ''),
      canonicalHeadersStr + '\n',
      signedHeaders,
      payloadHash
    ].join('\n');
    
    // Create string to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${date}/${region}/s3/aws4_request`;
    const stringToSign = [
      algorithm,
      timestamp,
      credentialScope,
      createHash('sha256').update(canonicalRequest).digest('hex')
    ].join('\n');
    
    // Calculate signature
    const kDate = createHmac('sha256', `AWS4${secretKey}`).update(date).digest();
    const kRegion = createHmac('sha256', kDate).update(region).digest();
    const kService = createHmac('sha256', kRegion).update('s3').digest();
    const kSigning = createHmac('sha256', kService).update('aws4_request').digest();
    const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex');
    
    // Create authorization header
    const authorization = `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    
    const requestHeaders = {
      ...canonicalHeaders,
      'Authorization': authorization
    };

    return fetch(url, {
      method,
      headers: requestHeaders,
      body: body || undefined
    });
  }

  private parseS3ListResponse(xml: string): Array<{name: string, lastModified: string, size: number}> {
    const items: Array<{name: string, lastModified: string, size: number}> = [];
    
    // Simple XML parsing for S3 ListObjects response
    const contentRegex = /<Contents>(.*?)<\/Contents>/gs;
    let match;
    
    while ((match = contentRegex.exec(xml)) !== null) {
      const content = match[1];
      const keyMatch = content.match(/<Key>(.*?)<\/Key>/);
      const lastModifiedMatch = content.match(/<LastModified>(.*?)<\/LastModified>/);
      const sizeMatch = content.match(/<Size>(\d+)<\/Size>/);
      
      if (keyMatch && lastModifiedMatch && sizeMatch) {
        items.push({
          name: keyMatch[1],
          lastModified: lastModifiedMatch[1],
          size: parseInt(sizeMatch[1])
        });
      }
    }
    
    return items;
  }

  // Simulation methods for development
  private async simulateConnection(): Promise<ConnectionTestResult> {
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    if (this.config.accessKey === 'mock_invalid') {
      return {
        ok: false,
        message: 'Invalid access credentials'
      };
    }
    
    return {
      ok: true,
      message: `Connected to mock ${this.isBackblaze ? 'Backblaze B2' : 'S3'} bucket: ${this.config.bucket}`
    };
  }

  private async simulateUpload(localPath: string, remoteName: string): Promise<UploadResult> {
    await new Promise(resolve => setTimeout(resolve, 3000)); // Longer delay for S3
    
    const mockSize = Math.floor(Math.random() * 1000000) + 100000;
    const key = this.getFullKey(remoteName);
    
    // Store in sessionStorage for simulation
    const storageKey = `mock_s3_files_${this.isBackblaze ? 'b2' : 's3'}`;
    const stored = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
    stored.push({
      name: key,
      size: mockSize,
      lastModified: new Date().toISOString(),
      url: this.getObjectUrl(key)
    });
    sessionStorage.setItem(storageKey, JSON.stringify(stored));
    
    return {
      url: this.getObjectUrl(key),
      bytes: mockSize
    };
  }

  private async simulateDownload(item: RemoteItem): Promise<DownloadResult> {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const tempPath = `mock_downloaded_${Date.now()}.zip`;
    const parsed = this.parseBackupName(item.name);
    const provider = this.isBackblaze ? 'backblaze' : 's3';
    const meta = parsed 
      ? this.createMeta(parsed.type, item.bytes, '', provider as MetaJson['provider'])
      : this.createMeta('daily', item.bytes, '', provider as MetaJson['provider']);
    
    return { path: tempPath, meta };
  }

  private async simulateList(prefix: string): Promise<RemoteItem[]> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const storageKey = `mock_s3_files_${this.isBackblaze ? 'b2' : 's3'}`;
    const stored = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
    
    return stored
      .filter((file: any) => {
        const name = file.name.replace(this.getFullKey(''), '');
        return (prefix === '' || name.startsWith(prefix)) && name.includes('grocerypos_backup_');
      })
      .map((file: any) => {
        const name = file.name.replace(this.getFullKey(''), '');
        const parsed = this.parseBackupName(name);
        return {
          name,
          created_at: parsed ? parsed.timestamp : new Date(file.lastModified),
          bytes: file.size,
          url: file.url
        };
      })
      .sort((a: RemoteItem, b: RemoteItem) => b.created_at.getTime() - a.created_at.getTime());
  }

  private simulateRemove(name: string): void {
    const storageKey = `mock_s3_files_${this.isBackblaze ? 'b2' : 's3'}`;
    const stored = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
    const key = this.getFullKey(name);
    const filtered = stored.filter((file: any) => file.name !== key);
    sessionStorage.setItem(storageKey, JSON.stringify(filtered));
  }
}



