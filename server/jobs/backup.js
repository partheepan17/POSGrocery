"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runNightlyBackup = runNightlyBackup;
exports.listBackups = listBackups;
exports.readBackup = readBackup;
exports.restoreBackup = restoreBackup;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const DATA_DIR = path_1.default.join(process.cwd(), 'data');
const DB_PATH = path_1.default.join(DATA_DIR, 'pos.db');
const BACKUP_DIR = path_1.default.join(DATA_DIR, 'backups');
const BACKUP_PREFIX = 'pos_backup_';
function ensureDir(p) {
    if (!fs_1.default.existsSync(p))
        fs_1.default.mkdirSync(p, { recursive: true });
}
function getKey() {
    const secret = process.env.BACKUP_KEY || 'dev-backup-key-please-change';
    return crypto_1.default.createHash('sha256').update(secret).digest();
}
function runNightlyBackup() {
    ensureDir(BACKUP_DIR);
    if (!fs_1.default.existsSync(DB_PATH))
        return { ok: false, error: 'DB not found' };
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipheriv('aes-256-ctr', getKey(), iv);
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const outPath = path_1.default.join(BACKUP_DIR, `${BACKUP_PREFIX}${ts}.enc`);
    const input = fs_1.default.createReadStream(DB_PATH);
    const output = fs_1.default.createWriteStream(outPath);
    input.pipe(cipher).pipe(output);
    // Append IV to file for decryption
    output.on('close', () => {
        fs_1.default.appendFileSync(outPath, iv);
    });
    // Rotate last 7 backups
    const files = fs_1.default.readdirSync(BACKUP_DIR).filter(f => f.startsWith(BACKUP_PREFIX) && f.endsWith('.enc')).sort();
    const toDelete = files.slice(0, Math.max(0, files.length - 7));
    toDelete.forEach(f => fs_1.default.unlinkSync(path_1.default.join(BACKUP_DIR, f)));
    return { ok: true, file: outPath };
}
function listBackups() {
    ensureDir(BACKUP_DIR);
    return fs_1.default.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith(BACKUP_PREFIX) && f.endsWith('.enc'))
        .map(f => {
        const p = path_1.default.join(BACKUP_DIR, f);
        const st = fs_1.default.statSync(p);
        return { name: f, size: st.size, mtime: st.mtimeMs };
    })
        .sort((a, b) => b.mtime - a.mtime);
}
function readBackup(name) {
    const p = path_1.default.join(BACKUP_DIR, path_1.default.basename(name));
    return fs_1.default.readFileSync(p);
}
function restoreBackup(name) {
    const p = path_1.default.join(BACKUP_DIR, path_1.default.basename(name));
    const buf = fs_1.default.readFileSync(p);
    // Last 16 bytes are IV
    const iv = buf.slice(buf.length - 16);
    const enc = buf.slice(0, buf.length - 16);
    const decipher = crypto_1.default.createDecipheriv('aes-256-ctr', getKey(), iv);
    const decrypted = Buffer.concat([decipher.update(enc), decipher.final()]);
    fs_1.default.writeFileSync(DB_PATH, decrypted);
    return { ok: true };
}
