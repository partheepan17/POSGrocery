import { getDatabase } from '../db';

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail';
  message: string;
  duration?: number;
  details?: any;
}

export interface IntegrityCheck {
  name: string;
  status: 'pass' | 'fail';
  message: string;
  duration?: number;
  details?: any;
}

/**
 * Database health check utilities
 */
export class DatabaseHealthChecker {
  private get db() {
    return getDatabase();
  }

  /**
   * Basic database connectivity check
   */
  async checkConnectivity(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Simple query to test connectivity
      this.db.prepare('SELECT 1 as test').get();
      const duration = Date.now() - startTime;
      
      return {
        name: 'database_connectivity',
        status: 'pass',
        message: 'Database connection successful',
        duration,
        details: { responseTime: duration }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        name: 'database_connectivity',
        status: 'fail',
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Database readiness check (more comprehensive than basic connectivity)
   */
  async checkReadiness(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Check if database is not locked
      const lockCheck = this.db.prepare('PRAGMA database_list').all();
      if (!lockCheck || lockCheck.length === 0) {
        throw new Error('Database not accessible');
      }

      // Check if we can perform a simple write operation
      const testTable = 'health_check_test';
      this.db.prepare(`CREATE TEMPORARY TABLE IF NOT EXISTS ${testTable} (id INTEGER)`).run();
      this.db.prepare(`INSERT INTO ${testTable} (id) VALUES (1)`).run();
      this.db.prepare(`DELETE FROM ${testTable} WHERE id = 1`).run();
      this.db.prepare(`DROP TABLE ${testTable}`).run();

      const duration = Date.now() - startTime;
      
      return {
        name: 'database_readiness',
        status: 'pass',
        message: 'Database is ready for operations',
        duration,
        details: { 
          responseTime: duration,
          databases: lockCheck.length
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        name: 'database_readiness',
        status: 'fail',
        message: `Database not ready: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Comprehensive database integrity check
   */
  async checkIntegrity(): Promise<IntegrityCheck[]> {
    const checks: IntegrityCheck[] = [];
    
    // Check 1: Schema presence
    checks.push(await this.checkSchemaPresence());
    
    // Check 2: Table structure integrity
    checks.push(await this.checkTableStructure());
    
    // Check 3: Index integrity
    checks.push(await this.checkIndexIntegrity());
    
    // Check 4: Data consistency
    checks.push(await this.checkDataConsistency());
    
    // Check 5: Migration status
    checks.push(await this.checkMigrationStatus());
    
    return checks;
  }

  /**
   * Check if required tables exist
   */
  private async checkSchemaPresence(): Promise<IntegrityCheck> {
    const startTime = Date.now();
    
    try {
      const requiredTables = [
        'products', 'categories', 'suppliers', 'audit_logs'
      ];
      
      const existingTables = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all() as { name: string }[];
      
      const existingTableNames = existingTables.map(t => t.name);
      const missingTables = requiredTables.filter(table => !existingTableNames.includes(table));
      
      const duration = Date.now() - startTime;
      
      if (missingTables.length === 0) {
        return {
          name: 'schema_presence',
          status: 'pass',
          message: 'All required tables present',
          duration,
          details: { 
            requiredTables,
            existingTables: existingTableNames,
            totalTables: existingTableNames.length
          }
        };
      } else {
        return {
          name: 'schema_presence',
          status: 'fail',
          message: `Missing required tables: ${missingTables.join(', ')}`,
          duration,
          details: { 
            requiredTables,
            existingTables: existingTableNames,
            missingTables
          }
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        name: 'schema_presence',
        status: 'fail',
        message: `Schema check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Check table structure integrity
   */
  private async checkTableStructure(): Promise<IntegrityCheck> {
    const startTime = Date.now();
    
    try {
      const tableChecks = [];
      
      // Check products table structure
      const productsSchema = this.db.prepare(`
        PRAGMA table_info(products)
      `).all();
      
      const requiredProductColumns = ['id', 'name_en', 'price_retail', 'is_active'];
      const productColumns = productsSchema.map((col: any) => col.name);
      const missingProductColumns = requiredProductColumns.filter(col => !productColumns.includes(col));
      
      tableChecks.push({
        table: 'products',
        status: missingProductColumns.length === 0 ? 'pass' : 'fail',
        missingColumns: missingProductColumns
      });
      
      // Check audit_logs table structure
      const auditLogsSchema = this.db.prepare(`
        PRAGMA table_info(audit_logs)
      `).all();
      
      const requiredAuditColumns = ['id', 'timestamp', 'request_id', 'action'];
      const auditColumns = auditLogsSchema.map((col: any) => col.name);
      const missingAuditColumns = requiredAuditColumns.filter(col => !auditColumns.includes(col));
      
      tableChecks.push({
        table: 'audit_logs',
        status: missingAuditColumns.length === 0 ? 'pass' : 'fail',
        missingColumns: missingAuditColumns
      });
      
      const duration = Date.now() - startTime;
      const failedChecks = tableChecks.filter(check => check.status === 'fail');
      
      if (failedChecks.length === 0) {
        return {
          name: 'table_structure',
          status: 'pass',
          message: 'All table structures are valid',
          duration,
          details: { tableChecks }
        };
      } else {
        return {
          name: 'table_structure',
          status: 'fail',
          message: `Table structure issues found in: ${failedChecks.map(c => c.table).join(', ')}`,
          duration,
          details: { tableChecks, failedChecks }
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        name: 'table_structure',
        status: 'fail',
        message: `Table structure check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Check index integrity
   */
  private async checkIndexIntegrity(): Promise<IntegrityCheck> {
    const startTime = Date.now();
    
    try {
      const indexes = this.db.prepare(`
        SELECT name, tbl_name FROM sqlite_master 
        WHERE type='index' AND name NOT LIKE 'sqlite_%'
      `).all() as { name: string; tbl_name: string }[];
      
      const requiredIndexes = [
        'idx_audit_logs_timestamp',
        'idx_audit_logs_request_id',
        'idx_audit_logs_actor'
      ];
      
      const existingIndexNames = indexes.map(idx => idx.name);
      const missingIndexes = requiredIndexes.filter(idx => !existingIndexNames.includes(idx));
      
      const duration = Date.now() - startTime;
      
      if (missingIndexes.length === 0) {
        return {
          name: 'index_integrity',
          status: 'pass',
          message: 'All required indexes present',
          duration,
          details: { 
            requiredIndexes,
            existingIndexes: existingIndexNames,
            totalIndexes: existingIndexNames.length
          }
        };
      } else {
        return {
          name: 'index_integrity',
          status: 'fail',
          message: `Missing required indexes: ${missingIndexes.join(', ')}`,
          duration,
          details: { 
            requiredIndexes,
            existingIndexes: existingIndexNames,
            missingIndexes
          }
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        name: 'index_integrity',
        status: 'fail',
        message: `Index integrity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Check data consistency
   */
  private async checkDataConsistency(): Promise<IntegrityCheck> {
    const startTime = Date.now();
    
    try {
      const consistencyChecks = [];
      
      // Check for orphaned records
      const orphanedProducts = this.db.prepare(`
        SELECT COUNT(*) as count FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        WHERE p.category_id IS NOT NULL AND c.id IS NULL
      `).get() as { count: number };
      
      consistencyChecks.push({
        check: 'orphaned_products',
        status: orphanedProducts.count === 0 ? 'pass' : 'fail',
        count: orphanedProducts.count
      });
      
      // Check for invalid price data
      const invalidPrices = this.db.prepare(`
        SELECT COUNT(*) as count FROM products 
        WHERE price_retail < 0 OR price_wholesale < 0 OR price_credit < 0
      `).get() as { count: number };
      
      consistencyChecks.push({
        check: 'invalid_prices',
        status: invalidPrices.count === 0 ? 'pass' : 'fail',
        count: invalidPrices.count
      });
      
      // Check for duplicate barcodes
      const duplicateBarcodes = this.db.prepare(`
        SELECT barcode, COUNT(*) as count FROM products 
        WHERE barcode IS NOT NULL AND barcode != ''
        GROUP BY barcode HAVING COUNT(*) > 1
      `).all() as { barcode: string; count: number }[];
      
      consistencyChecks.push({
        check: 'duplicate_barcodes',
        status: duplicateBarcodes.length === 0 ? 'pass' : 'fail',
        count: duplicateBarcodes.length,
        duplicates: duplicateBarcodes
      });
      
      const duration = Date.now() - startTime;
      const failedChecks = consistencyChecks.filter(check => check.status === 'fail');
      
      if (failedChecks.length === 0) {
        return {
          name: 'data_consistency',
          status: 'pass',
          message: 'Data consistency checks passed',
          duration,
          details: { consistencyChecks }
        };
      } else {
        return {
          name: 'data_consistency',
          status: 'fail',
          message: `Data consistency issues found: ${failedChecks.map(c => c.check).join(', ')}`,
          duration,
          details: { consistencyChecks, failedChecks }
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        name: 'data_consistency',
        status: 'fail',
        message: `Data consistency check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Check migration status
   */
  private async checkMigrationStatus(): Promise<IntegrityCheck> {
    const startTime = Date.now();
    
    try {
      // Check if migrations table exists
      const migrationsTable = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='migrations'
      `).get() as { name: string } | undefined;
      
      if (!migrationsTable) {
        const duration = Date.now() - startTime;
        return {
          name: 'migration_status',
          status: 'fail',
          message: 'Migrations table not found',
          duration,
          details: { error: 'Migrations table missing' }
        };
      }
      
      // Check migration count
      const migrationCount = this.db.prepare(`
        SELECT COUNT(*) as count FROM migrations
      `).get() as { count: number };
      
      const duration = Date.now() - startTime;
      
      return {
        name: 'migration_status',
        status: 'pass',
        message: `Migrations table accessible with ${migrationCount.count} migrations`,
        duration,
        details: { 
          migrationCount: migrationCount.count,
          migrationsTableExists: true
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        name: 'migration_status',
        status: 'fail',
        message: `Migration status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }
}

// Singleton instance
export const dbHealthChecker = new DatabaseHealthChecker();
