import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'pos.db');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const BACKUP_PREFIX = 'pos_backup_';

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function getKey(): Buffer {
  const secret = process.env.BACKUP_KEY || 'dev-backup-key-please-change';
  return crypto.createHash('sha256').update(secret).digest();
}

export function runNightlyBackup() {
  ensureDir(BACKUP_DIR);
  if (!fs.existsSync(DB_PATH)) return { ok: false, error: 'DB not found' };

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-ctr', getKey(), iv);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.join(BACKUP_DIR, `${BACKUP_PREFIX}${ts}.enc`);

  const input = fs.createReadStream(DB_PATH);
  const output = fs.createWriteStream(outPath);
  input.pipe(cipher).pipe(output);

  // Append IV to file for decryption
  output.on('close', () => {
    fs.appendFileSync(outPath, iv);
  });

  // Rotate last 7 backups
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith(BACKUP_PREFIX) && f.endsWith('.enc')).sort();
  const toDelete = files.slice(0, Math.max(0, files.length - 7));
  toDelete.forEach(f => fs.unlinkSync(path.join(BACKUP_DIR, f)));

  return { ok: true, file: outPath };
}

export function listBackups(): { name: string; size: number; mtime: number }[] {
  ensureDir(BACKUP_DIR);
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith(BACKUP_PREFIX) && f.endsWith('.enc'))
    .map(f => {
      const p = path.join(BACKUP_DIR, f);
      const st = fs.statSync(p);
      return { name: f, size: st.size, mtime: st.mtimeMs };
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


