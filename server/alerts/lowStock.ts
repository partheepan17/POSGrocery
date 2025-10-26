/**
 * Low Stock Alert Service
 * Monitors inventory levels and sends alerts when products fall below threshold
 */

import { getDatabase } from '../db';
import { createContextLogger } from '../utils/logger';
import { SlackChannel } from './channels/slack';
import { TelegramChannel } from './channels/telegram';
import { EmailChannel } from './channels/email';

export interface LowStockAlert {
  product_id: number;
  sku: string;
  name_en: string;
  name_si?: string;
  name_ta?: string;
  unit: string;
  current_stock: number;
  reorder_level: number;
  threshold: number;
  category_name?: string;
  last_movement_date?: string;
  stock_value: number;
  unit_cost?: number;
}

export interface AlertConfig {
  low_stock_threshold: number;
  channels: {
    slack: {
      enabled: boolean;
      webhook_url?: string;
    };
    telegram: {
      enabled: boolean;
      bot_token?: string;
      chat_id?: string;
    };
    email: {
      enabled: boolean;
      smtp_host?: string;
      smtp_port?: number;
      smtp_user?: string;
      smtp_pass?: string;
      from_email?: string;
      to_emails?: string[];
    };
  };
}

export class LowStockAlertService {
  private logger = createContextLogger({ operation: 'low_stock_alert' });
  private slackChannel: SlackChannel;
  private telegramChannel: TelegramChannel;
  private emailChannel: EmailChannel;

  constructor() {
    this.slackChannel = new SlackChannel();
    this.telegramChannel = new TelegramChannel();
    this.emailChannel = new EmailChannel();
  }

  /**
   * Get alert configuration from environment variables
   */
  private getAlertConfig(): AlertConfig {
    return {
      low_stock_threshold: parseInt(process.env.ALERTS_LOW_STOCK_THRESHOLD || '10'),
      channels: {
        slack: {
          enabled: process.env.ALERTS_SLACK_ENABLED === 'true',
          webhook_url: process.env.ALERTS_SLACK_WEBHOOK_URL
        },
        telegram: {
          enabled: process.env.ALERTS_TELEGRAM_ENABLED === 'true',
          bot_token: process.env.ALERTS_TELEGRAM_BOT_TOKEN,
          chat_id: process.env.ALERTS_TELEGRAM_CHAT_ID
        },
        email: {
          enabled: process.env.ALERTS_EMAIL_ENABLED === 'true',
          smtp_host: process.env.ALERTS_EMAIL_SMTP_HOST,
          smtp_port: parseInt(process.env.ALERTS_EMAIL_SMTP_PORT || '587'),
          smtp_user: process.env.ALERTS_EMAIL_SMTP_USER,
          smtp_pass: process.env.ALERTS_EMAIL_SMTP_PASS,
          from_email: process.env.ALERTS_EMAIL_FROM,
          to_emails: process.env.ALERTS_EMAIL_TO?.split(',').map(email => email.trim()) || []
        }
      }
    };
  }

  /**
   * Query products with low stock levels
   */
  private async getLowStockProducts(threshold: number): Promise<LowStockAlert[]> {
    const db = getDatabase();
    
    try {
      // Query using product_stock table for current stock levels
      const query = `
        SELECT 
          p.id as product_id,
          p.sku,
          p.name_en,
          p.name_si,
          p.name_ta,
          p.unit,
          COALESCE(ps.current_quantity, 0) as current_stock,
          COALESCE(p.reorder_level, 0) as reorder_level,
          ? as threshold,
          c.name as category_name,
          ps.last_movement_date,
          COALESCE(ps.total_value, 0) as stock_value,
          COALESCE(ps.average_cost, 0) as unit_cost
        FROM products p
        LEFT JOIN product_stock ps ON p.id = ps.product_id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_active = 1
          AND COALESCE(ps.current_quantity, 0) <= ?
          AND (p.reorder_level IS NULL OR COALESCE(ps.current_quantity, 0) <= p.reorder_level)
        ORDER BY COALESCE(ps.current_quantity, 0) ASC, p.name_en ASC
      `;

      const products = db.prepare(query).all(threshold, threshold) as LowStockAlert[];
      
      this.logger.info({ 
        threshold, 
        lowStockCount: products.length 
      }, 'Low stock products queried');

      return products;
    } catch (error) {
      this.logger.error('Failed to query low stock products', { error: error.message });
      throw error;
    }
  }

  /**
   * Format alert message for different channels
   */
  private formatAlertMessage(alerts: LowStockAlert[]): string {
    if (alerts.length === 0) {
      return '✅ No low stock alerts at this time.';
    }

    const timestamp = new Date().toLocaleString();
    let message = `🚨 *LOW STOCK ALERT* - ${timestamp}\n\n`;
    message += `Found ${alerts.length} product(s) below threshold:\n\n`;

    alerts.forEach((alert, index) => {
      const stockStatus = alert.current_stock === 0 ? '🔴 OUT OF STOCK' : 
                         alert.current_stock <= alert.reorder_level ? '🟡 BELOW REORDER' : 
                         '🟠 LOW STOCK';

      message += `${index + 1}. *${alert.name_en}* (${alert.sku})\n`;
      message += `   ${stockStatus}: ${alert.current_stock} ${alert.unit}\n`;
      if (alert.reorder_level > 0) {
        message += `   Reorder Level: ${alert.reorder_level} ${alert.unit}\n`;
      }
      if (alert.category_name) {
        message += `   Category: ${alert.category_name}\n`;
      }
      if (alert.unit_cost && alert.unit_cost > 0) {
        message += `   Unit Cost: LKR ${alert.unit_cost.toFixed(2)}\n`;
      }
      message += `   Stock Value: LKR ${alert.stock_value.toFixed(2)}\n`;
      if (alert.last_movement_date) {
        message += `   Last Movement: ${new Date(alert.last_movement_date).toLocaleDateString()}\n`;
      }
      message += '\n';
    });

    message += `\n📊 *Summary:*\n`;
    message += `• Total Products: ${alerts.length}\n`;
    message += `• Out of Stock: ${alerts.filter(a => a.current_stock === 0).length}\n`;
    message += `• Below Reorder: ${alerts.filter(a => a.current_stock > 0 && a.current_stock <= a.reorder_level).length}\n`;
    message += `• Low Stock: ${alerts.filter(a => a.current_stock > a.reorder_level).length}\n`;

    return message;
  }

  /**
   * Send alerts through configured channels
   */
  private async sendAlerts(alerts: LowStockAlert[], config: AlertConfig): Promise<void> {
    const message = this.formatAlertMessage(alerts);
    const promises: Promise<void>[] = [];

    // Send Slack alert
    if (config.channels.slack.enabled && config.channels.slack.webhook_url) {
      promises.push(
        this.slackChannel.sendAlert(message, config.channels.slack.webhook_url)
          .catch(error => {
            this.logger.error('Failed to send Slack alert', { error: error.message });
          })
      );
    }

    // Send Telegram alert
    if (config.channels.telegram.enabled && config.channels.telegram.bot_token && config.channels.telegram.chat_id) {
      promises.push(
        this.telegramChannel.sendAlert(message, config.channels.telegram.bot_token, config.channels.telegram.chat_id)
          .catch(error => {
            this.logger.error('Failed to send Telegram alert', { error: error.message });
          })
      );
    }

    // Send Email alert
    if (config.channels.email.enabled && config.channels.email.smtp_host && config.channels.email.to_emails?.length) {
      const emailSubject = `Low Stock Alert - ${alerts.length} products below threshold`;
      promises.push(
        this.emailChannel.sendAlert(emailSubject, message, config.channels.email)
          .catch(error => {
            this.logger.error('Failed to send Email alert', { error: error.message });
          })
      );
    }

    // Wait for all alerts to complete
    await Promise.allSettled(promises);
  }

  /**
   * Check for low stock and send alerts
   */
  async checkAndAlert(): Promise<void> {
    const config = this.getAlertConfig();
    
    this.logger.info({ 
      threshold: config.low_stock_threshold,
      channels: Object.keys(config.channels).filter(key => config.channels[key as keyof typeof config.channels].enabled)
    }, 'Starting low stock check');

    try {
      // Get low stock products
      const lowStockProducts = await this.getLowStockProducts(config.low_stock_threshold);
      
      if (lowStockProducts.length === 0) {
        this.logger.info('No low stock products found');
        return;
      }

      // Send alerts through configured channels
      await this.sendAlerts(lowStockProducts, config);
      
      this.logger.info({ 
        alertCount: lowStockProducts.length 
      }, 'Low stock alerts sent successfully');

    } catch (error) {
      this.logger.error('Failed to check and send low stock alerts', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get low stock products for API endpoint
   */
  async getLowStockProducts(threshold?: number): Promise<LowStockAlert[]> {
    const config = this.getAlertConfig();
    const alertThreshold = threshold || config.low_stock_threshold;
    
    return await this.getLowStockProducts(alertThreshold);
  }

  /**
   * Test alert configuration
   */
  async testAlert(): Promise<void> {
    const config = this.getAlertConfig();
    
    const testAlert: LowStockAlert = {
      product_id: 999999,
      sku: 'TEST-001',
      name_en: 'Test Product',
      name_si: 'පරීක්ෂණ නිෂ්පාදනය',
      name_ta: 'சோதனை தயாரிப்பு',
      unit: 'pcs',
      current_stock: 5,
      reorder_level: 10,
      threshold: config.low_stock_threshold,
      category_name: 'Test Category',
      last_movement_date: new Date().toISOString(),
      stock_value: 100.00,
      unit_cost: 20.00
    };

    await this.sendAlerts([testAlert], config);
    this.logger.info('Test alert sent');
  }
}

// Export singleton instance
export const lowStockAlertService = new LowStockAlertService();










