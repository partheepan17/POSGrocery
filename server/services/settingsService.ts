import { Database } from 'better-sqlite3';

export interface Setting {
  id: number;
  key: string;
  value: string;
  type: string;
  description?: string;
  category: string;
  is_encrypted: boolean;
  updated_at: string;
  updated_by?: number;
}

export interface SettingsCategory {
  category: string;
  settings: Setting[];
}

export class SettingsService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async getSettings(category?: string): Promise<Setting[]> {
    let query = 'SELECT * FROM system_config WHERE 1=1';
    const params: any[] = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY category, key';

    const settings = this.db.prepare(query).all(...params) as Setting[];
    return settings;
  }

  async getSetting(key: string): Promise<Setting | null> {
    const setting = this.db.prepare(`
      SELECT * FROM system_config WHERE key = ?
    `).get(key) as Setting;

    return setting || null;
  }

  async updateSetting(key: string, value: string, updatedBy?: number): Promise<boolean> {
    try {
      const result = this.db.prepare(`
        UPDATE system_config 
        SET value = ?, updated_at = datetime('now'), updated_by = ?
        WHERE key = ?
      `).run(value, updatedBy || null, key);

      return result.changes > 0;
    } catch (error) {
      console.error('Update setting error:', error);
      return false;
    }
  }

  async updateSettings(settings: { [key: string]: string }, updatedBy?: number): Promise<boolean> {
    const transaction = this.db.transaction(() => {
      try {
        for (const [key, value] of Object.entries(settings)) {
          this.db.prepare(`
            UPDATE system_config 
            SET value = ?, updated_at = datetime('now'), updated_by = ?
            WHERE key = ?
          `).run(value, updatedBy || null, key);
        }
        return true;
      } catch (error) {
        throw error;
      }
    });

    return transaction();
  }

  async getSettingsByCategory(): Promise<SettingsCategory[]> {
    const settings = await this.getSettings();
    
    const categories = settings.reduce((acc, setting) => {
      const category = setting.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(setting);
      return acc;
    }, {} as { [key: string]: Setting[] });

    return Object.entries(categories).map(([category, settings]) => ({
      category,
      settings
    }));
  }

  async seedDefaultSettings(): Promise<void> {
    const defaultSettings = [
      // General settings
      { key: 'store_name', value: 'POS Grocery Store', type: 'string', description: 'Store name', category: 'general', is_encrypted: false },
      { key: 'store_address', value: '123 Main Street', type: 'string', description: 'Store address', category: 'general', is_encrypted: false },
      { key: 'store_phone', value: '+1-555-0123', type: 'string', description: 'Store phone number', category: 'general', is_encrypted: false },
      { key: 'store_email', value: 'info@posgrocery.com', type: 'string', description: 'Store email', category: 'general', is_encrypted: false },
      { key: 'currency', value: 'USD', type: 'string', description: 'Default currency', category: 'general', is_encrypted: false },
      { key: 'timezone', value: 'America/New_York', type: 'string', description: 'Store timezone', category: 'general', is_encrypted: false },
      
      // Sales settings
      { key: 'default_tax_rate', value: '8.5', type: 'number', description: 'Default tax rate (%)', category: 'sales', is_encrypted: false },
      { key: 'enable_discounts', value: 'true', type: 'boolean', description: 'Enable discount functionality', category: 'sales', is_encrypted: false },
      { key: 'max_discount_percentage', value: '50', type: 'number', description: 'Maximum discount percentage', category: 'sales', is_encrypted: false },
      { key: 'require_customer_info', value: 'false', type: 'boolean', description: 'Require customer information for sales', category: 'sales', is_encrypted: false },
      { key: 'auto_print_receipt', value: 'true', type: 'boolean', description: 'Automatically print receipt after sale', category: 'sales', is_encrypted: false },
      
      // Inventory settings
      { key: 'low_stock_threshold', value: '10', type: 'number', description: 'Low stock threshold', category: 'inventory', is_encrypted: false },
      { key: 'enable_barcode_scanning', value: 'true', type: 'boolean', description: 'Enable barcode scanning', category: 'inventory', is_encrypted: false },
      { key: 'auto_update_stock', value: 'true', type: 'boolean', description: 'Automatically update stock levels', category: 'inventory', is_encrypted: false },
      { key: 'enable_negative_stock', value: 'false', type: 'boolean', description: 'Allow negative stock levels', category: 'inventory', is_encrypted: false },
      
      // Receipt settings
      { key: 'receipt_header', value: 'Thank you for your business!', type: 'text', description: 'Receipt header text', category: 'receipt', is_encrypted: false },
      { key: 'receipt_footer', value: 'Please come again!', type: 'text', description: 'Receipt footer text', category: 'receipt', is_encrypted: false },
      { key: 'receipt_width', value: '48', type: 'number', description: 'Receipt width in characters', category: 'receipt', is_encrypted: false },
      { key: 'show_tax_breakdown', value: 'true', type: 'boolean', description: 'Show tax breakdown on receipt', category: 'receipt', is_encrypted: false },
      
      // Security settings
      { key: 'session_timeout', value: '30', type: 'number', description: 'Session timeout in minutes', category: 'security', is_encrypted: false },
      { key: 'max_login_attempts', value: '5', type: 'number', description: 'Maximum login attempts before lockout', category: 'security', is_encrypted: false },
      { key: 'lockout_duration', value: '15', type: 'number', description: 'Lockout duration in minutes', category: 'security', is_encrypted: false },
      { key: 'require_strong_passwords', value: 'true', type: 'boolean', description: 'Require strong passwords', category: 'security', is_encrypted: false },
      
      // Backup settings
      { key: 'auto_backup_enabled', value: 'true', type: 'boolean', description: 'Enable automatic backups', category: 'backup', is_encrypted: false },
      { key: 'backup_frequency', value: 'daily', type: 'string', description: 'Backup frequency', category: 'backup', is_encrypted: false },
      { key: 'backup_retention_days', value: '30', type: 'number', description: 'Backup retention period in days', category: 'backup', is_encrypted: false },
      { key: 'backup_encryption_key', value: '', type: 'string', description: 'Backup encryption key', category: 'backup', is_encrypted: true }
    ];

    for (const setting of defaultSettings) {
      this.db.prepare(`
        INSERT OR IGNORE INTO system_config (key, value, description)
        VALUES (?, ?, ?)
      `).run(
        setting.key,
        setting.value,
        setting.description
      );
    }

    console.log('✅ Default settings seeded successfully');
  }
}

export class CashDrawerService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async openDrawer(terminalId: string, openedBy: number): Promise<boolean> {
    try {
      // Log drawer open event
      this.db.prepare(`
        INSERT INTO drawer_events (terminal_id, event_type, opened_by, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `).run(terminalId, 'OPEN', openedBy);

      // Here you would typically send a signal to the physical cash drawer
      // For now, we'll just log the event
      console.log(`Cash drawer opened on terminal ${terminalId} by user ${openedBy}`);
      
      return true;
    } catch (error) {
      console.error('Open drawer error:', error);
      return false;
    }
  }

  async closeDrawer(terminalId: string, closedBy: number): Promise<boolean> {
    try {
      // Log drawer close event
      this.db.prepare(`
        INSERT INTO drawer_events (terminal_id, event_type, closed_by, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `).run(terminalId, 'CLOSE', closedBy);

      console.log(`Cash drawer closed on terminal ${terminalId} by user ${closedBy}`);
      
      return true;
    } catch (error) {
      console.error('Close drawer error:', error);
      return false;
    }
  }

  async getDrawerStatus(terminalId: string): Promise<{
    isOpen: boolean;
    lastOpened?: string;
    lastClosed?: string;
    currentAmount?: number;
  }> {
    try {
      const lastEvent = this.db.prepare(`
        SELECT event_type, created_at
        FROM drawer_events 
        WHERE terminal_id = ? 
        ORDER BY created_at DESC 
        LIMIT 1
      `).get(terminalId) as any;

      const isOpen = lastEvent ? lastEvent.event_type === 'OPEN' : false;

      return {
        isOpen,
        lastOpened: lastEvent && lastEvent.event_type === 'OPEN' ? lastEvent.created_at : undefined,
        lastClosed: lastEvent && lastEvent.event_type === 'CLOSE' ? lastEvent.created_at : undefined,
        currentAmount: 0 // This would be calculated from transactions
      };
    } catch (error) {
      console.error('Get drawer status error:', error);
      return { isOpen: false };
    }
  }
}

