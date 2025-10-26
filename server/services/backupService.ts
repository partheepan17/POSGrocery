import { Database } from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export interface BackupInfo {
  id: string;
  filename: string;
  size: number;
  checksum: string;
  created_at: string;
  created_by: number;
  status: 'pending' | 'completed' | 'failed';
  error_message?: string;
}

export interface BackupLog {
  id: number;
  backup_id: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  created_at: string;
}

export class BackupService {
  private db: Database;
  private backupDir: string;
  private encryptionKey: string;

  constructor(db: Database, backupDir: string = './backups') {
    this.db = db;
    this.backupDir = backupDir;
    this.encryptionKey = process.env.BACKUP_ENCRYPTION_KEY || 'default-key-change-in-production';
    
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async createBackup(createdBy: number): Promise<BackupInfo> {
    const backupId = this.generateBackupId();
    const filename = `backup_${backupId}.db`;
    const filepath = path.join(this.backupDir, filename);

    // Create backup record
    const backupInfo: BackupInfo = {
      id: backupId,
      filename,
      size: 0,
      checksum: '',
      created_at: new Date().toISOString(),
      created_by: createdBy,
      status: 'pending'
    };

    this.db.prepare(`
      INSERT INTO backups (id, filename, size, checksum, created_at, created_by, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      backupInfo.id,
      backupInfo.filename,
      backupInfo.size,
      backupInfo.checksum,
      backupInfo.created_at,
      backupInfo.created_by,
      backupInfo.status
    );

    try {
      // Create database backup
      await this.createDatabaseBackup(filepath);
      
      // Get file stats
      const stats = fs.statSync(filepath);
      backupInfo.size = stats.size;
      
      // Calculate checksum
      const fileBuffer = fs.readFileSync(filepath);
      backupInfo.checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      
      // Encrypt backup
      await this.encryptBackup(filepath);
      
      // Update backup record
      backupInfo.status = 'completed';
      this.db.prepare(`
        UPDATE backups 
        SET size = ?, checksum = ?, status = ?
        WHERE id = ?
      `).run(backupInfo.size, backupInfo.checksum, backupInfo.status, backupInfo.id);

      this.logBackupEvent(backupId, 'info', 'Backup created successfully');
      
      return backupInfo;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      backupInfo.status = 'failed';
      backupInfo.error_message = errorMessage;
      
      this.db.prepare(`
        UPDATE backups 
        SET status = ?, error_message = ?
        WHERE id = ?
      `).run(backupInfo.status, backupInfo.error_message, backupInfo.id);

      this.logBackupEvent(backupId, 'error', `Backup failed: ${errorMessage}`);
      
      throw error;
    }
  }

  async restoreBackup(backupId: string, restoredBy: number): Promise<boolean> {
    try {
      // Get backup info
      const backup = this.db.prepare(`
        SELECT * FROM backups WHERE id = ?
      `).get(backupId) as any;

      if (!backup) {
        throw new Error('Backup not found');
      }

      if (backup.status !== 'completed') {
        throw new Error('Backup is not completed');
      }

      const filepath = path.join(this.backupDir, backup.filename);
      
      if (!fs.existsSync(filepath)) {
        throw new Error('Backup file not found');
      }

      // Verify checksum
      const fileBuffer = fs.readFileSync(filepath);
      const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      
      if (checksum !== backup.checksum) {
        throw new Error('Backup file is corrupted');
      }

      // Decrypt backup
      const decryptedPath = await this.decryptBackup(filepath);
      
      // Restore database
      await this.restoreDatabase(decryptedPath);
      
      // Clean up decrypted file
      fs.unlinkSync(decryptedPath);
      
      this.logBackupEvent(backupId, 'info', 'Backup restored successfully');
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logBackupEvent(backupId, 'error', `Restore failed: ${errorMessage}`);
      throw error;
    }
  }

  async getBackups(limit: number = 10, offset: number = 0): Promise<BackupInfo[]> {
    const backups = this.db.prepare(`
      SELECT * FROM backups 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `).all(limit, offset) as BackupInfo[];

    return backups;
  }

  async getLastBackup(): Promise<BackupInfo | null> {
    const backup = this.db.prepare(`
      SELECT * FROM backups 
      WHERE status = 'completed'
      ORDER BY created_at DESC 
      LIMIT 1
    `).get() as BackupInfo;

    return backup || null;
  }

  async verifyLastBackup(): Promise<{
    isValid: boolean;
    backup?: BackupInfo;
    error?: string;
  }> {
    try {
      const backup = await this.getLastBackup();
      
      if (!backup) {
        return { isValid: false, error: 'No completed backup found' };
      }

      const filepath = path.join(this.backupDir, backup.filename);
      
      if (!fs.existsSync(filepath)) {
        return { isValid: false, backup, error: 'Backup file not found' };
      }

      // Verify checksum
      const fileBuffer = fs.readFileSync(filepath);
      const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      
      if (checksum !== backup.checksum) {
        return { isValid: false, backup, error: 'Backup file is corrupted' };
      }

      return { isValid: true, backup };
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async getBackupLogs(backupId?: string): Promise<BackupLog[]> {
    let query = 'SELECT * FROM backup_logs WHERE 1=1';
    const params: any[] = [];

    if (backupId) {
      query += ' AND backup_id = ?';
      params.push(backupId);
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    const logs = this.db.prepare(query).all(...params) as BackupLog[];
    return logs;
  }

  async exportBackupLogs(): Promise<string> {
    const logs = await this.getBackupLogs();
    
    const csvRows = ['ID,Backup ID,Level,Message,Created At'];
    
    logs.forEach(log => {
      csvRows.push([
        log.id,
        log.backup_id,
        log.level,
        `"${log.message}"`,
        log.created_at
      ].join(','));
    });

    return csvRows.join('\n');
  }

  async cleanupOldBackups(retentionDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    // Get old backups
    const oldBackups = this.db.prepare(`
      SELECT * FROM backups 
      WHERE created_at < ? AND status = 'completed'
    `).all(cutoffDate.toISOString()) as BackupInfo[];

    let deletedCount = 0;

    for (const backup of oldBackups) {
      try {
        // Delete file
        const filepath = path.join(this.backupDir, backup.filename);
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }

        // Delete database record
        this.db.prepare(`
          DELETE FROM backups WHERE id = ?
        `).run(backup.id);

        // Delete logs
        this.db.prepare(`
          DELETE FROM backup_logs WHERE backup_id = ?
        `).run(backup.id);

        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete backup ${backup.id}:`, error);
      }
    }

    return deletedCount;
  }

  private generateBackupId(): string {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async createDatabaseBackup(filepath: string): Promise<void> {
    // Get the current database file path
    const dbPath = this.db.prepare('PRAGMA database_list').get() as any;
    const sourcePath = dbPath.file;

    // Copy database file
    fs.copyFileSync(sourcePath, filepath);
  }

  private async restoreDatabase(backupPath: string): Promise<void> {
    // This would typically involve stopping the application,
    // replacing the database file, and restarting
    // For now, we'll just copy the file
    const dbPath = this.db.prepare('PRAGMA database_list').get() as any;
    const targetPath = dbPath.file;
    
    fs.copyFileSync(backupPath, targetPath);
  }

  private async encryptBackup(filepath: string): Promise<void> {
    const fileBuffer = fs.readFileSync(filepath);
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    
    let encrypted = cipher.update(fileBuffer);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    fs.writeFileSync(filepath, encrypted);
  }

  private async decryptBackup(filepath: string): Promise<string> {
    const encryptedBuffer = fs.readFileSync(filepath);
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    
    let decrypted = decipher.update(encryptedBuffer);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    const decryptedPath = filepath.replace('.db', '_decrypted.db');
    fs.writeFileSync(decryptedPath, decrypted);
    
    return decryptedPath;
  }

  private logBackupEvent(backupId: string, level: 'info' | 'warn' | 'error', message: string): void {
    this.db.prepare(`
      INSERT INTO backup_logs (backup_id, level, message, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(backupId, level, message);
  }

  async seedBackupTables(): Promise<void> {
    // Create backups table
    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS backups (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        size INTEGER NOT NULL,
        checksum TEXT NOT NULL,
        created_at DATETIME NOT NULL,
        created_by INTEGER NOT NULL,
        status TEXT NOT NULL,
        error_message TEXT,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `).run();

    // Create backup_logs table
    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS backup_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backup_id TEXT NOT NULL,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME NOT NULL,
        FOREIGN KEY (backup_id) REFERENCES backups(id)
      )
    `).run();

    console.log('✅ Backup tables seeded successfully');
  }
}










