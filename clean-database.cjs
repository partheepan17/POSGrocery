#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

console.log('🧹 Starting Database Cleanup...');

// Database path
const dbPath = path.join(__dirname, 'server', 'data', 'pos.db');

// Check if database exists
if (!fs.existsSync(dbPath)) {
    console.log('❌ Database file not found at:', dbPath);
    console.log('Please make sure the backend server has been started at least once to create the database.');
    process.exit(1);
}

// Create backup
const backupPath = dbPath.replace('.db', `_backup_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.db`);
console.log('📦 Creating backup at:', backupPath);
fs.copyFileSync(dbPath, backupPath);

try {
    // Open database
    const db = new Database(dbPath);
    
    console.log('🔧 Running database cleanup...');
    
    // Disable foreign key constraints
    db.pragma('foreign_keys = OFF');
    
    // Get all tables
    const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
    `).all();
    
    console.log('📋 Found tables:', tables.map(t => t.name).join(', '));
    
    // Define tables to keep (user-related)
    const keepTables = ['users', 'user_preferences', 'audit_logs', 'system_config'];
    
    // Drop all non-user related tables
    for (const table of tables) {
        if (!keepTables.includes(table.name)) {
            console.log(`🗑️  Dropping table: ${table.name}`);
            db.prepare(`DROP TABLE IF EXISTS ${table.name}`).run();
        }
    }
    
    // Re-enable foreign key constraints
    db.pragma('foreign_keys = ON');
    
    // Reset user data to defaults
    console.log('👥 Resetting user data...');
    
    // Clear all users except default admin
    db.prepare('DELETE FROM users WHERE id > 1').run();
    
    // Reset admin user to default values
    db.prepare(`
        UPDATE users SET 
            username = 'admin',
            name = 'Administrator',
            role = 'admin',
            is_active = 1,
            pin = '9999',
            email = 'admin@posgrocery.com',
            phone = NULL,
            last_login = NULL,
            failed_login_attempts = 0,
            locked_until = NULL,
            created_at = CURRENT_TIMESTAMP
        WHERE id = 1
    `).run();
    
    // If admin user doesn't exist, create it
    db.prepare(`
        INSERT OR IGNORE INTO users (
            id, username, name, role, is_active, pin, email, 
            failed_login_attempts, created_at
        ) VALUES (
            1, 'admin', 'Administrator', 'admin', 1, '9999', 'admin@posgrocery.com',
            0, CURRENT_TIMESTAMP
        )
    `).run();
    
    // Add default manager and cashier users
    db.prepare(`
        INSERT OR IGNORE INTO users (
            username, name, role, is_active, pin, email, 
            failed_login_attempts, created_at
        ) VALUES 
        ('manager', 'Manager', 'manager', 1, '9999', 'manager@posgrocery.com', 0, CURRENT_TIMESTAMP),
        ('cashier1', 'Cashier 1', 'cashier', 1, '1234', 'cashier1@posgrocery.com', 0, CURRENT_TIMESTAMP),
        ('cashier2', 'Cashier 2', 'cashier', 1, '5678', 'cashier2@posgrocery.com', 0, CURRENT_TIMESTAMP)
    `).run();
    
    // Clear user preferences
    db.prepare('DELETE FROM user_preferences').run();
    
    // Clear audit logs
    db.prepare('DELETE FROM audit_logs').run();
    
    // Reset system configuration
    console.log('⚙️  Resetting system configuration...');
    db.prepare('DELETE FROM system_config').run();
    
    // Insert default system configuration
    const configData = [
        ['store_name', 'My Grocery Store', 'Store name displayed on receipts'],
        ['store_address', '123 Main Street\nColombo 01\nSri Lanka', 'Store address for receipts'],
        ['store_phone', '+94 11 234 5678', 'Store contact number'],
        ['tax_rate', '0.15', 'Default tax rate (15%)'],
        ['currency', 'LKR', 'Default currency code'],
        ['receipt_footer', 'Thank you for your business!', 'Footer text for receipts'],
        ['backup_enabled', 'true', 'Whether automated backups are enabled'],
        ['backup_retention_days', '30', 'Number of days to retain backups'],
        ['default_language', 'EN', 'Default system language'],
        ['theme', 'auto', 'Default theme setting'],
        ['auto_logout_minutes', '30', 'Auto logout after inactivity (minutes)']
    ];
    
    const insertConfig = db.prepare(`
        INSERT INTO system_config (config_key, config_value, description) 
        VALUES (?, ?, ?)
    `);
    
    for (const [key, value, description] of configData) {
        insertConfig.run(key, value, description);
    }
    
    // Verification
    console.log('🔍 Verifying cleanup...');
    
    const remainingTables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
    `).all();
    
    console.log('📋 Remaining tables:');
    remainingTables.forEach(table => {
        console.log(`  - ${table.name}`);
    });
    
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    console.log(`👥 Users in database: ${userCount.count}`);
    
    const users = db.prepare(`
        SELECT id, username, name, role, is_active, pin, email 
        FROM users 
        ORDER BY id
    `).all();
    
    console.log('\n👤 User details:');
    users.forEach(user => {
        console.log(`  - ${user.username} (PIN: ${user.pin}) - ${user.name} (${user.role})`);
    });
    
    // Integrity check
    const integrity = db.prepare('PRAGMA integrity_check').get();
    console.log(`\n🔍 Database integrity: ${integrity.integrity_check}`);
    
    db.close();
    
    console.log('\n🎉 Database cleanup completed!');
    console.log('📦 Backup saved at:', backupPath);
    console.log('\nDefault users created:');
    console.log('  - admin (PIN: 9999) - Administrator');
    console.log('  - manager (PIN: 9999) - Manager');
    console.log('  - cashier1 (PIN: 1234) - Cashier');
    console.log('  - cashier2 (PIN: 5678) - Cashier');
    console.log('\n⚠️  Note: All test data has been removed. Only user authentication and system configuration remain.');
    
} catch (error) {
    console.error('❌ Error during database cleanup:', error.message);
    process.exit(1);
}
