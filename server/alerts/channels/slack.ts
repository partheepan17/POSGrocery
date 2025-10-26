/**
 * Slack Notification Channel
 * Sends alerts to Slack via webhook
 */

import axios from 'axios';
import { createContextLogger } from '../../utils/logger';

export class SlackChannel {
  private logger = createContextLogger({ operation: 'slack_alert' });

  /**
   * Send alert to Slack webhook
   */
  async sendAlert(message: string, webhookUrl: string): Promise<void> {
    try {
      const payload = {
        text: message,
        username: 'POS Alert Bot',
        icon_emoji: ':warning:',
        channel: '#alerts',
        attachments: [
          {
            color: 'warning',
            fields: [
              {
                title: 'System',
                value: 'POS Grocery System',
                short: true
              },
              {
                title: 'Alert Type',
                value: 'Low Stock',
                short: true
              },
              {
                title: 'Timestamp',
                value: new Date().toISOString(),
                short: true
              }
            ],
            footer: 'POS Grocery Alert System',
            ts: Math.floor(Date.now() / 1000)
          }
        ]
      };

      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });

      if (response.status === 200) {
        this.logger.info('Slack alert sent successfully');
      } else {
        throw new Error(`Slack webhook returned status ${response.status}`);
      }

    } catch (error) {
      this.logger.error('Failed to send Slack alert', { 
        error: error.message,
        webhookUrl: webhookUrl.substring(0, 50) + '...' // Log partial URL for security
      });
      throw error;
    }
  }

  /**
   * Test Slack webhook connection
   */
  async testConnection(webhookUrl: string): Promise<boolean> {
    try {
      const testMessage = '🧪 Test alert from POS Grocery System - Connection successful!';
      await this.sendAlert(testMessage, webhookUrl);
      return true;
    } catch (error) {
      this.logger.error('Slack connection test failed', { error: error.message });
      return false;
    }
  }
}










