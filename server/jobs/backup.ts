import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getLogger } from '../utils/logger';

const logger = getLogger();
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'pos.db');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const BACKUP_PREFIX = 'pos_backup_';

// Backup status tracking
export interface BackupStatus {
  lastBackup?: Date;
  lastSuccess?: Date;
  lastError?: string;
  errorCount: number;
  totalBackups: number;
  nextScheduled?: Date;
}

// Global backup status
let backupStatus: BackupStatus = {
  errorCount: 0,
  totalBackups: 0
};

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function getKey(): Buffer {
  const secret = process.env.BACKUP_KEY || 'dev-backup-key-please-change';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Get current backup status
 */
export function getBackupStatus(): BackupStatus {
  return { ...backupStatus };
}

/**
 * Update backup status
 */
function updateBackupStatus(updates: Partial<BackupStatus>): void {
  backupStatus = { ...backupStatus, ...updates };
}

/**
 * Run daily backup with date-named file
 */
export function runDailyBackup(): { ok: boolean; file?: string; error?: string } {
  const startTime = Date.now();
  updateBackupStatus({ lastBackup: new Date() });

  try {
    ensureDir(BACKUP_DIR);
    
    if (!fs.existsSync(DB_PATH)) {
      const error = 'Database file not found';
      updateBackupStatus({ 
        lastError: error,
        errorCount: backupStatus.errorCount + 1
      });
      logger.error('Backup failed: Database file not found', { dbPath: DB_PATH });
      return { ok: false, error };
    }

    // Create date-named backup file (YYYY-MM-DD.enc)
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const outPath = path.join(BACKUP_DIR, `${dateStr}.enc`);

    // Check if backup already exists for today
    if (fs.existsSync(outPath)) {
      logger.info('Backup already exists for today, skipping', { file: outPath });
      updateBackupStatus({ 
        lastSuccess: new Date(),
        totalBackups: backupStatus.totalBackups + 1
      });
      return { ok: true, file: outPath };
    }

    // Create encrypted backup
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-ctr', getKey(), iv);
    
    const input = fs.createReadStream(DB_PATH);
    const output = fs.createWriteStream(outPath);
    
    input.pipe(cipher).pipe(output);

    // Append IV to file for decryption
    output.on('close', () => {
      fs.appendFileSync(outPath, iv);
      
      const duration = Date.now() - startTime;
      const fileSize = fs.statSync(outPath).size;
      
      logger.info('Daily backup completed successfully', {
        file: outPath,
        size: fileSize,
        duration: `${duration}ms`
      });
      
      updateBackupStatus({ 
        lastSuccess: new Date(),
        errorCount: 0, // Reset error count on success
        totalBackups: backupStatus.totalBackups + 1
      });
    });

    output.on('error', (error) => {
      logger.error('Backup write error', { error: error.message, file: outPath });
      updateBackupStatus({ 
        lastError: error.message,
        errorCount: backupStatus.errorCount + 1
      });
    });

    // Clean up old backups (keep last 30 days)
    cleanupOldBackups();

    return { ok: true, file: outPath };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Backup failed with error', { error: errorMessage });
    
    updateBackupStatus({ 
      lastError: errorMessage,
      errorCount: backupStatus.errorCount + 1
    });
    
    return { ok: false, error: errorMessage };
  }
}

/**
 * Legacy function for backward compatibility
 */
export function runNightlyBackup() {
  return runDailyBackup();
}

/**
 * Clean up old backup files (keep last 30 days)
 */
function cleanupOldBackups(): void {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.enc$/)) // YYYY-MM-DD.enc format
      .map(f => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        date: new Date(f.replace('.enc', ''))
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime()); // Newest first

    // Keep last 30 days
    const toDelete = files.slice(30);
    
    if (toDelete.length > 0) {
      logger.info(`Cleaning up ${toDelete.length} old backup files`);
      toDelete.forEach(file => {
        try {
          fs.unlinkSync(file.path);
          logger.debug(`Deleted old backup: ${file.name}`);
        } catch (error) {
          logger.warn(`Failed to delete old backup: ${file.name}`, { error });
        }
      });
    }
  } catch (error) {
    logger.warn('Failed to cleanup old backups', { error });
  }
}

export function listBackups(): { name: string; size: number; mtime: number; date: string }[] {
  ensureDir(BACKUP_DIR);
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.enc$/) || (f.startsWith(BACKUP_PREFIX) && f.endsWith('.enc')))
    .map(f => {
      const p = path.join(BACKUP_DIR, f);
      const st = fs.statSync(p);
      return { 
        name: f, 
        size: st.size, 
        mtime: st.mtimeMs,
        date: f.replace('.enc', '')
      };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

export function readBackup(name: string): Buffer {
  const p = path.join(BACKUP_DIR, path.basename(name));
  return fs.readFileSync(p);
}

export function restoreBackup(name: string) {
  const p = path.join(BACKUP_DIR, path.basename(name));
  const buf = fs.readFileSync(p);
  // Last 16 bytes are IV
  const iv = buf.slice(buf.length - 16);
  const enc = buf.slice(0, buf.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-ctr', getKey(), iv);
  const decrypted = Buffer.concat([decipher.update(enc), decipher.final()]);
  fs.writeFileSync(DB_PATH, decrypted);
  return { ok: true };
}









