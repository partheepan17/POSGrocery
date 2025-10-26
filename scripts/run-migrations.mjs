#!/usr/bin/env node

/**
 * Migration Runner Script
 * Runs database migrations and seeds for the POS system
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DB_PATH = process.env.DATABASE_URL || './data/pos-grocery.db';
const MIGRATIONS_DIR = './server/db/migrations';
const SEEDS_DIR = './seeds';

class MigrationRunner {
  constructor() {
    this.db = null;
    this.migrations = [];
    this.seeds = [];
  }

  /**
   * Initialize database connection
   */
  async init() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(DB_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.db = new Database(DB_PATH);
      console.log('✅ Connected to database:', DB_PATH);
    } catch (error) {
      console.error('❌ Failed to connect to database:', error.message);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.db) {
      this.db.close();
      console.log('✅ Database connection closed');
    }
  }

  /**
   * Create migrations table if it doesn't exist
   */
  async createMigrationsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT UNIQUE NOT NULL,
        executed_at TEXT DEFAULT (datetime('now')),
        checksum TEXT
      )
    `;
    
    this.db.exec(sql);
  }

  /**
   * Get list of migration files
   */
  getMigrationFiles() {
    if (!fs.existsSync(MIGRATIONS_DIR)) {
      console.log('⚠️  Migrations directory not found:', MIGRATIONS_DIR);
      return [];
    }

    return fs.readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort()
      .map(file => ({
        filename: file,
        path: path.join(MIGRATIONS_DIR, file)
      }));
  }

  /**
   * Get list of seed files
   */
  getSeedFiles() {
    if (!fs.existsSync(SEEDS_DIR)) {
      console.log('⚠️  Seeds directory not found:', SEEDS_DIR);
      return [];
    }

    return fs.readdirSync(SEEDS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort()
      .map(file => ({
        filename: file,
        path: path.join(SEEDS_DIR, file)
      }));
  }

  /**
   * Get executed migrations
   */
  async getExecutedMigrations() {
    const stmt = this.db.prepare('SELECT filename FROM migrations ORDER BY id');
    const rows = stmt.all();
    return rows.map(row => row.filename);
  }

  /**
   * Execute a SQL file
   */
  async executeSqlFile(filePath) {
    const sql = fs.readFileSync(filePath, 'utf8');
    this.db.exec(sql);
  }

  /**
   * Record migration as executed
   */
  async recordMigration(filename) {
    const fileContent = fs.readFileSync(path.join(MIGRATIONS_DIR, filename));
    const checksum = crypto.createHash('md5').update(fileContent).digest('hex');

    const stmt = this.db.prepare(
      'INSERT INTO migrations (filename, checksum) VALUES (?, ?)'
    );
    stmt.run(filename, checksum);
  }

  /**
   * Run migrations
   */
  async runMigrations() {
    console.log('\n🔄 Running migrations...');
    
    await this.createMigrationsTable();
    
    const migrationFiles = this.getMigrationFiles();
    const executedMigrations = await this.getExecutedMigrations();
    
    const pendingMigrations = migrationFiles.filter(
      migration => !executedMigrations.includes(migration.filename)
    );

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }

    console.log(`📋 Found ${pendingMigrations.length} pending migrations:`);
    pendingMigrations.forEach(migration => {
      console.log(`   - ${migration.filename}`);
    });

    for (const migration of pendingMigrations) {
      try {
        console.log(`🔄 Executing migration: ${migration.filename}`);
        await this.executeSqlFile(migration.path);
        await this.recordMigration(migration.filename);
        console.log(`✅ Migration completed: ${migration.filename}`);
      } catch (error) {
        console.error(`❌ Migration failed: ${migration.filename}`);
        console.error(error.message);
        throw error;
      }
    }

    console.log('✅ All migrations completed successfully');
  }

  /**
   * Run seeds
   */
  async runSeeds() {
    console.log('\n🌱 Running seeds...');
    
    const seedFiles = this.getSeedFiles();
    
    if (seedFiles.length === 0) {
      console.log('⚠️  No seed files found');
      return;
    }

    console.log(`📋 Found ${seedFiles.length} seed files:`);
    seedFiles.forEach(seed => {
      console.log(`   - ${seed.filename}`);
    });

    for (const seed of seedFiles) {
      try {
        console.log(`🌱 Executing seed: ${seed.filename}`);
        await this.executeSqlFile(seed.path);
        console.log(`✅ Seed completed: ${seed.filename}`);
      } catch (error) {
        console.error(`❌ Seed failed: ${seed.filename}`);
        console.error(error.message);
        throw error;
      }
    }

    console.log('✅ All seeds completed successfully');
  }

  /**
   * Verify installation
   */
  async verifyInstallation() {
    console.log('\n🔍 Verifying installation...');
    
    const queries = [
      { name: 'Features', sql: 'SELECT COUNT(*) as count FROM features' },
      { name: 'Roles', sql: 'SELECT COUNT(*) as count FROM roles' },
      { name: 'Permissions', sql: 'SELECT COUNT(*) as count FROM permissions' },
      { name: 'Role Permissions', sql: 'SELECT COUNT(*) as count FROM role_permissions' },
      { name: 'Feature Permissions', sql: 'SELECT COUNT(*) as count FROM feature_permissions' },
      { name: 'Discount Rules', sql: 'SELECT COUNT(*) as count FROM discount_rules' }
    ];

    for (const query of queries) {
      try {
        const stmt = this.db.prepare(query.sql);
        const result = stmt.get();
        console.log(`   ✅ ${query.name}: ${result.count} records`);
      } catch (error) {
        console.error(`   ❌ ${query.name}: Error - ${error.message}`);
      }
    }
  }

  /**
   * Show database schema
   */
  async showSchema() {
    console.log('\n📊 Database Schema:');
    
    const stmt = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    );
    const tables = stmt.all();

    tables.forEach(table => {
      console.log(`   📋 ${table.name}`);
    });
  }

  /**
   * Main execution
   */
  async run() {
    try {
      console.log('🚀 Starting migration and seed process...');
      
      await this.init();
      await this.runMigrations();
      await this.runSeeds();
      await this.verifyInstallation();
      await this.showSchema();
      
      console.log('\n🎉 Migration and seed process completed successfully!');
      
    } catch (error) {
      console.error('\n💥 Migration process failed:');
      console.error(error.message);
      process.exit(1);
    } finally {
      await this.close();
    }
  }
}

// Run if called directly
const runner = new MigrationRunner();
runner.run();







