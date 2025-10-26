/**
 * Database seeding script for test data
 * Creates test users, roles, and feature configurations
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = process.env.DATABASE_URL?.replace('file:', '') || 'pos-grocery.db';
const db = new sqlite3.Database(dbPath);

async function seedDatabase() {
  console.log('🌱 Seeding database with test data...');

  try {
    // Hash passwords
    const adminPassword = await bcrypt.hash('admin123', 10);
    const cashierPassword = await bcrypt.hash('cashier123', 10);
    const managerPassword = await bcrypt.hash('manager123', 10);

    // Create test users
    console.log('👥 Creating test users...');
    
    const users = [
      {
        username: 'admin',
        email: 'admin@test.com',
        password: adminPassword,
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        is_active: 1
      },
      {
        username: 'cashier',
        email: 'cashier@test.com',
        password: cashierPassword,
        first_name: 'Cashier',
        last_name: 'User',
        role: 'cashier',
        is_active: 1
      },
      {
        username: 'manager',
        email: 'manager@test.com',
        password: managerPassword,
        first_name: 'Manager',
        last_name: 'User',
        role: 'manager',
        is_active: 1
      }
    ];

    for (const user of users) {
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT OR REPLACE INTO users (username, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [user.username, user.email, user.password, user.first_name, user.last_name, user.role, user.is_active], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Create test tenant
    console.log('🏢 Creating test tenant...');
    
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT OR REPLACE INTO tenants (id, name, created_at, updated_at)
        VALUES (?, ?, datetime('now'), datetime('now'))
      `, ['test-tenant-1', 'Test Tenant'], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });

    // Enable some features for testing
    console.log('⚙️ Configuring test features...');
    
    const testFeatures = [
      'auth.login',
      'sales.view',
      'inventory.view',
      'reports.sales'
    ];

    for (const featureCode of testFeatures) {
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT OR REPLACE INTO tenant_feature_flags (tenant_id, feature_code, is_enabled, updated_by, updated_at)
          VALUES (?, ?, ?, ?, datetime('now'))
        `, ['test-tenant-1', featureCode, 1, 'admin'], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Create some audit logs for testing
    console.log('📝 Creating test audit logs...');
    
    const auditLogs = [
      {
        actor_id: 1, // admin
        action: 'FEATURE_TOGGLE',
        payload_json: JSON.stringify({
          featureCode: 'inventory.view',
          tenantId: 'test-tenant-1',
          previousState: false,
          newState: true,
          updatedBy: 'admin'
        })
      },
      {
        actor_id: 1, // admin
        action: 'USER_CREATE',
        payload_json: JSON.stringify({
          username: 'testuser',
          email: 'test@example.com',
          role: 'cashier',
          tenantId: 'test-tenant-1'
        })
      },
      {
        actor_id: 2, // cashier
        action: 'LOGIN',
        payload_json: JSON.stringify({
          username: 'cashier',
          tenantId: 'test-tenant-1',
          ipAddress: '127.0.0.1'
        })
      }
    ];

    for (const log of auditLogs) {
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO audit_logs (actor_id, action, payload_json, created_at)
          VALUES (?, ?, ?, datetime('now'))
        `, [log.actor_id, log.action, log.payload_json], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    console.log('✅ Database seeding completed successfully!');
    
    // Display summary
    const userCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    const featureCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM tenant_feature_flags', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    const auditCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM audit_logs', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    console.log(`📊 Summary:`);
    console.log(`   Users: ${userCount}`);
    console.log(`   Feature flags: ${featureCount}`);
    console.log(`   Audit logs: ${auditCount}`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run seeding if this script is executed directly
if (require.main === module) {
  seedDatabase().catch(console.error);
}

module.exports = { seedDatabase };










