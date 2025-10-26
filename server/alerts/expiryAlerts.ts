/**
 * Expiry Alert Service
 * Monitors product expiry dates and sends alerts for near-expiry items
 */

import { getDatabase } from '../db';
import { createContextLogger } from '../utils/logger';
import { SlackChannel } from './channels/slack';
import { TelegramChannel } from './channels/telegram';
import { EmailChannel } from './channels/email';
import { fefoManager } from '../utils/fefoManager';

export interface ExpiryAlert {
  product_id: number;
  sku: string;
  name_en: string;
  name_si?: string;
  name_ta?: string;
  unit: string;
  category_name?: string;
  lot_id: number;
  lot_number: string;
  quantity_remaining: number;
  expiry_date: string;
  days_to_expiry: number;
  expiry_status: 'Critical' | 'Near Expiry' | 'Expired';
  unit_cost_cents: number;
  total_value_cents: number;
}

export interface ExpiryAlertConfig {
  expiry_days_threshold: number;
  critical_days_threshold: number;
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

export class ExpiryAlertService {
  private logger = createContextLogger({ operation: 'expiry_alert' });
  private slackChannel: SlackChannel;
  private telegramChannel: TelegramChannel;
  private emailChannel: EmailChannel;

  constructor() {
    this.slackChannel = new SlackChannel();
    this.telegramChannel = new TelegramChannel();
    this.emailChannel = new EmailChannel();
  }

  /**
   * Get expiry alert configuration from environment variables
   */
  private getExpiryAlertConfig(): ExpiryAlertConfig {
    return {
      expiry_days_threshold: parseInt(process.env.ALERTS_EXPIRY_DAYS_THRESHOLD || '30'),
      critical_days_threshold: parseInt(process.env.ALERTS_CRITICAL_EXPIRY_DAYS || '7'),
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
   * Query products with near-expiry lots
   */
  private async getNearExpiryProducts(threshold: number): Promise<ExpiryAlert[]> {
    const db = getDatabase();
    
    try {
      const query = `
        SELECT 
          p.id as product_id,
          p.sku,
          p.name_en,
          p.name_si,
          p.name_ta,
          p.unit,
          c.name as category_name,
          sl.id as lot_id,
          sl.lot_number,
          sl.quantity_remaining,
          sl.expiry_date,
          sl.unit_cost_cents,
          CAST((julianday(sl.expiry_date) - julianday('now')) AS INTEGER) as days_to_expiry,
          CASE 
            WHEN julianday(sl.expiry_date) < julianday('now') THEN 'Expired'
            WHEN julianday(sl.expiry_date) <= julianday('now', '+7 days') THEN 'Critical'
            WHEN julianday(sl.expiry_date) <= julianday('now', '+30 days') THEN 'Near Expiry'
            ELSE 'Fresh'
          END as expiry_status
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN stock_lots sl ON p.id = sl.product_id
        WHERE p.is_active = 1
          AND sl.quantity_remaining > 0
          AND sl.expiry_date IS NOT NULL
          AND julianday(sl.expiry_date) <= julianday('now', '+${threshold} days')
        ORDER BY 
          CASE 
            WHEN julianday(sl.expiry_date) < julianday('now') THEN 0
            WHEN julianday(sl.expiry_date) <= julianday('now', '+7 days') THEN 1
            WHEN julianday(sl.expiry_date) <= julianday('now', '+30 days') THEN 2
            ELSE 3
          END,
          sl.expiry_date ASC,
          p.name_en ASC
      `;

      const products = db.prepare(query).all() as Array<ExpiryAlert & {
        unit_cost_cents: number;
      }>;

      // Calculate total value for each lot
      const alerts: ExpiryAlert[] = products.map(product => ({
        ...product,
        total_value_cents: product.quantity_remaining * product.unit_cost_cents
      }));

      this.logger.info({ 
        threshold, 
        nearExpiryCount: alerts.length 
      }, 'Near expiry products queried');

      return alerts;
    } catch (error) {
      this.logger.error('Failed to query near expiry products', { error: error.message });
      throw error;
    }
  }

  /**
   * Format expiry alert message for different channels
   */
  private formatExpiryAlertMessage(alerts: ExpiryAlert[]): string {
    if (alerts.length === 0) {
      return '✅ No expiry alerts at this time.';
    }

    const timestamp = new Date().toLocaleString();
    let message = `⏰ *EXPIRY ALERT* - ${timestamp}\n\n`;
    message += `Found ${alerts.length} lot(s) with expiry issues:\n\n`;

    // Group by status
    const expired = alerts.filter(a => a.expiry_status === 'Expired');
    const critical = alerts.filter(a => a.expiry_status === 'Critical');
    const nearExpiry = alerts.filter(a => a.expiry_status === 'Near Expiry');

    if (expired.length > 0) {
      message += `🔴 *EXPIRED ITEMS (${expired.length}):*\n`;
      expired.forEach((alert, index) => {
        message += `${index + 1}. *${alert.name_en}* (${alert.sku})\n`;
        message += `   Lot: ${alert.lot_number}\n`;
        message += `   Quantity: ${alert.quantity_remaining} ${alert.unit}\n`;
        message += `   Expired: ${alert.days_to_expiry} days ago\n`;
        message += `   Value: LKR ${(alert.total_value_cents / 100).toFixed(2)}\n\n`;
      });
    }

    if (critical.length > 0) {
      message += `🟠 *CRITICAL EXPIRY (${critical.length}):*\n`;
      critical.forEach((alert, index) => {
        message += `${index + 1}. *${alert.name_en}* (${alert.sku})\n`;
        message += `   Lot: ${alert.lot_number}\n`;
        message += `   Quantity: ${alert.quantity_remaining} ${alert.unit}\n`;
        message += `   Expires in: ${alert.days_to_expiry} days\n`;
        message += `   Value: LKR ${(alert.total_value_cents / 100).toFixed(2)}\n\n`;
      });
    }

    if (nearExpiry.length > 0) {
      message += `🟡 *NEAR EXPIRY (${nearExpiry.length}):*\n`;
      nearExpiry.forEach((alert, index) => {
        message += `${index + 1}. *${alert.name_en}* (${alert.sku})\n`;
        message += `   Lot: ${alert.lot_number}\n`;
        message += `   Quantity: ${alert.quantity_remaining} ${alert.unit}\n`;
        message += `   Expires in: ${alert.days_to_expiry} days\n`;
        message += `   Value: LKR ${(alert.total_value_cents / 100).toFixed(2)}\n\n`;
      });
    }

    message += `📊 *Summary:*\n`;
    message += `• Total Lots: ${alerts.length}\n`;
    message += `• Expired: ${expired.length}\n`;
    message += `• Critical: ${critical.length}\n`;
    message += `• Near Expiry: ${nearExpiry.length}\n`;
    message += `• Total Value at Risk: LKR ${(alerts.reduce((sum, a) => sum + a.total_value_cents, 0) / 100).toFixed(2)}\n`;

    return message;
  }

  /**
   * Send expiry alerts through configured channels
   */
  private async sendExpiryAlerts(alerts: ExpiryAlert[], config: ExpiryAlertConfig): Promise<void> {
    const message = this.formatExpiryAlertMessage(alerts);
    const promises: Promise<void>[] = [];

    // Send Slack alert
    if (config.channels.slack.enabled && config.channels.slack.webhook_url) {
      promises.push(
        this.slackChannel.sendAlert(message, config.channels.slack.webhook_url)
          .catch(error => {
            this.logger.error('Failed to send Slack expiry alert', { error: error.message });
          })
      );
    }

    // Send Telegram alert
    if (config.channels.telegram.enabled && config.channels.telegram.bot_token && config.channels.telegram.chat_id) {
      promises.push(
        this.telegramChannel.sendAlertWithActions(message, config.channels.telegram.bot_token, config.channels.telegram.chat_id)
          .catch(error => {
            this.logger.error('Failed to send Telegram expiry alert', { error: error.message });
          })
      );
    }

    // Send Email alert
    if (config.channels.email.enabled && config.channels.email.smtp_host && config.channels.email.to_emails?.length) {
      const emailSubject = `Expiry Alert - ${alerts.length} lots near expiry`;
      promises.push(
        this.emailChannel.sendStyledAlert(emailSubject, message, config.channels.email)
          .catch(error => {
            this.logger.error('Failed to send Email expiry alert', { error: error.message });
          })
      );
    }

    // Wait for all alerts to complete
    await Promise.allSettled(promises);
  }

  /**
   * Check for near-expiry products and send alerts
   */
  async checkAndAlert(): Promise<void> {
    const config = this.getExpiryAlertConfig();
    
    this.logger.info({ 
      threshold: config.expiry_days_threshold,
      channels: Object.keys(config.channels).filter(key => config.channels[key as keyof typeof config.channels].enabled)
    }, 'Starting expiry check');

    try {
      // Get near expiry products
      const nearExpiryProducts = await this.getNearExpiryProducts(config.expiry_days_threshold);
      
      if (nearExpiryProducts.length === 0) {
        this.logger.info('No near expiry products found');
        return;
      }

      // Send alerts through configured channels
      await this.sendExpiryAlerts(nearExpiryProducts, config);
      
      this.logger.info({ 
        alertCount: nearExpiryProducts.length 
      }, 'Expiry alerts sent successfully');

    } catch (error) {
      this.logger.error('Failed to check and send expiry alerts', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get near expiry products for API endpoint
   */
  async getNearExpiryProducts(threshold?: number): Promise<ExpiryAlert[]> {
    const config = this.getExpiryAlertConfig();
    const alertThreshold = threshold || config.expiry_days_threshold;
    
    return await this.getNearExpiryProducts(alertThreshold);
  }

  /**
   * Test expiry alert configuration
   */
  async testAlert(): Promise<void> {
    const config = this.getExpiryAlertConfig();
    
    const testAlert: ExpiryAlert = {
      product_id: 999999,
      sku: 'TEST-EXP-001',
      name_en: 'Test Expiry Product',
      name_si: 'පරීක්ෂණ කල් ඉකුත් නිෂ්පාදනය',
      name_ta: 'சோதனை காலாவதி தயாரிப்பு',
      unit: 'pcs',
      category_name: 'Test Category',
      lot_id: 999999,
      lot_number: 'TEST-LOT-001',
      quantity_remaining: 10,
      expiry_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days from now
      days_to_expiry: 5,
      expiry_status: 'Critical',
      unit_cost_cents: 2000, // LKR 20.00
      total_value_cents: 20000 // LKR 200.00
    };

    await this.sendExpiryAlerts([testAlert], config);
    this.logger.info('Test expiry alert sent');
  }

  /**
   * Get expiry summary for dashboard
   */
  async getExpirySummary(): Promise<{
    total_lots: number;
    expired_lots: number;
    critical_lots: number;
    near_expiry_lots: number;
    total_value_at_risk: number;
  }> {
    const db = getDatabase();
    
    try {
      const summary = db.prepare(`
        SELECT 
          COUNT(*) as total_lots,
          SUM(CASE WHEN julianday(expiry_date) < julianday('now') THEN 1 ELSE 0 END) as expired_lots,
          SUM(CASE WHEN julianday(expiry_date) <= julianday('now', '+7 days') AND julianday(expiry_date) > julianday('now') THEN 1 ELSE 0 END) as critical_lots,
          SUM(CASE WHEN julianday(expiry_date) <= julianday('now', '+30 days') AND julianday(expiry_date) > julianday('now', '+7 days') THEN 1 ELSE 0 END) as near_expiry_lots,
          SUM(quantity_remaining * unit_cost_cents) as total_value_at_risk
        FROM stock_lots sl
        JOIN products p ON sl.product_id = p.id
        WHERE p.is_active = 1 
          AND sl.quantity_remaining > 0
          AND sl.expiry_date IS NOT NULL
          AND julianday(sl.expiry_date) <= julianday('now', '+30 days')
      `).get() as {
        total_lots: number;
        expired_lots: number;
        critical_lots: number;
        near_expiry_lots: number;
        total_value_at_risk: number;
      };

      return {
        total_lots: summary.total_lots || 0,
        expired_lots: summary.expired_lots || 0,
        critical_lots: summary.critical_lots || 0,
        near_expiry_lots: summary.near_expiry_lots || 0,
        total_value_at_risk: summary.total_value_at_risk || 0
      };
    } catch (error) {
      this.logger.error('Failed to get expiry summary', { error: error.message });
      return {
        total_lots: 0,
        expired_lots: 0,
        critical_lots: 0,
        near_expiry_lots: 0,
        total_value_at_risk: 0
      };
    }
  }
}

// Export singleton instance
export const expiryAlertService = new ExpiryAlertService();










