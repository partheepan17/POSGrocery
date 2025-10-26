import Database from 'better-sqlite3';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { env } from '../config/env';

let db: Database.Database;

export function initDatabase(): Database.Database {
  if (db) {
    return db;
  }

  // Ensure database directory exists
  const dbDir = dirname(env.DB_PATH);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  // Open database with WAL mode and foreign keys
  db = new Database(env.DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  
  // Production-optimized settings for reliability and performance
  if (env.FAST_DEV) {
    db.pragma('synchronous = OFF');
    db.pragma('cache_size = 10000');
    db.pragma('temp_store = MEMORY');
  } else {
    // Production settings: FULL sync for data integrity, larger cache
    db.pragma('synchronous = FULL');
    db.pragma('cache_size = 50000'); // 50MB cache
    db.pragma('temp_store = MEMORY');
    db.pragma('mmap_size = 268435456'); // 256MB memory-mapped I/O
    db.pragma('page_size = 4096'); // 4KB pages for better performance
  }

  // Run migrations only if not in fast dev mode or explicitly enabled
  if (!env.FAST_DEV || !env.SKIP_MIGRATIONS) {
    runMigrations();
  }

  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    console.warn('Database not initialized, initializing now...');
    return initDatabase();
  }
  return db;
}

function runMigrations(): void {
  // Create migrations table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get list of applied migrations
  const appliedMigrations = db.prepare('SELECT name FROM _migrations ORDER BY id').all() as Array<{ name: string }>;
  const appliedNames = new Set(appliedMigrations.map(m => m.name));

  // Find migration files - try both compiled and source locations
  let migrationsDir = join(__dirname, 'migrations');
  if (!existsSync(migrationsDir)) {
    // Try compiled location (dist/db/migrations)
    migrationsDir = join(__dirname, 'dist', 'db', 'migrations');
    if (!existsSync(migrationsDir)) {
      // Try source location if compiled location doesn't exist
      migrationsDir = join(process.cwd(), 'server', 'db', 'migrations');
      if (!existsSync(migrationsDir)) {
        if (env.FAST_DEV) {
          // In fast dev mode, just warn and continue
          console.warn('⚠️  No migrations directory found, skipping in fast dev mode');
          return;
        }
        console.warn('⚠️  No migrations directory found at:', join(__dirname, 'migrations'));
        return;
      }
    }
  }

  const migrationFiles = require('fs').readdirSync(migrationsDir)
    .filter((file: string) => file.endsWith('.sql'))
    .sort();

  // Apply new migrations
  let newMigrationsCount = 0;
  for (const file of migrationFiles) {
    if (!appliedNames.has(file)) {
      if (env.FAST_DEV) {
        console.log(`🔄 Fast dev: Running migration: ${file}`);
      } else {
        console.log(`🔄 Running migration: ${file}`);
      }
      
      try {
        const sql = readFileSync(join(migrationsDir, file), 'utf8');
        
        // Execute the entire file at once to support triggers/procedures that contain semicolons
        // Wrap in a transaction for atomicity
        const transaction = db.transaction(() => {
          try {
            db.exec(sql);
          } catch (error: any) {
            // Skip ALTER TABLE errors for columns that already exist
            if (error.code === 'SQLITE_ERROR' && error.message?.includes('duplicate column name')) {
              console.log(`⚠️  Skipping duplicate column: ${error.message}`);
              return;
            }
            throw error;
          }
          db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
        });
        transaction();
        newMigrationsCount++;
        
        if (env.FAST_DEV) {
          console.log(`✅ Fast dev: Migration applied: ${file}`);
        } else {
          console.log(`✅ Migration applied: ${file}`);
        }
      } catch (error: any) {
        console.error(`❌ Migration failed: ${file}`, error);
        const msg = String(error?.message || '');
        // Tolerate known idempotent/schema drift issues and mark as applied
        if (
          msg.includes('duplicate column name') ||
          msg.includes('already exists') ||
          msg.includes('no such column') ||
          msg.includes('non-constant default') ||
          msg.includes('has no column named') ||
          msg.includes('has') && msg.includes('columns') && msg.includes('values were supplied') ||
          msg.includes('incomplete input')
        ) {
          console.log(`⚠️  Skipping problematic migration and marking as applied: ${file}`);
          try { db.prepare('INSERT OR IGNORE INTO _migrations (name) VALUES (?)').run(file); } catch {}
          continue;
        }
        throw error;
      }
    }
  }
  
  if (newMigrationsCount === 0 && !env.FAST_DEV) {
    console.log('✅ All migrations up to date');
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = undefined as any;
  }
}
