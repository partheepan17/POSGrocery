/**
 * Telegram Notification Channel
 * Sends alerts to Telegram via Bot API
 */

import axios from 'axios';
import { createContextLogger } from '../../utils/logger';

export class TelegramChannel {
  private logger = createContextLogger({ operation: 'telegram_alert' });

  /**
   * Send alert to Telegram bot
   */
  async sendAlert(message: string, botToken: string, chatId: string): Promise<void> {
    try {
      const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      
      const payload = {
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        disable_notification: false
      };

      const response = await axios.post(telegramApiUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });

      if (response.data.ok) {
        this.logger.info('Telegram alert sent successfully');
      } else {
        throw new Error(`Telegram API error: ${response.data.description}`);
      }

    } catch (error) {
      this.logger.error('Failed to send Telegram alert', { 
        error: error.message,
        chatId: chatId
      });
      throw error;
    }
  }

  /**
   * Send alert with inline keyboard for actions
   */
  async sendAlertWithActions(message: string, botToken: string, chatId: string): Promise<void> {
    try {
      const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      
      const payload = {
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        disable_notification: false,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '📊 View Dashboard',
                url: `${process.env.APP_BASE_URL || 'http://localhost:3000'}/reports`
              },
              {
                text: '📦 Manage Inventory',
                url: `${process.env.APP_BASE_URL || 'http://localhost:3000'}/inventory`
              }
            ],
            [
              {
                text: '✅ Mark as Read',
                callback_data: 'alert_read'
              }
            ]
          ]
        }
      };

      const response = await axios.post(telegramApiUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.data.ok) {
        this.logger.info('Telegram alert with actions sent successfully');
      } else {
        throw new Error(`Telegram API error: ${response.data.description}`);
      }

    } catch (error) {
      this.logger.error('Failed to send Telegram alert with actions', { 
        error: error.message,
        chatId: chatId
      });
      throw error;
    }
  }

  /**
   * Test Telegram bot connection
   */
  async testConnection(botToken: string, chatId: string): Promise<boolean> {
    try {
      const testMessage = '🧪 *Test Alert from POS Grocery System*\n\nConnection successful! ✅';
      await this.sendAlert(testMessage, botToken, chatId);
      return true;
    } catch (error) {
      this.logger.error('Telegram connection test failed', { error: error.message });
      return false;
    }
  }

  /**
   * Get bot information
   */
  async getBotInfo(botToken: string): Promise<any> {
    try {
      const response = await axios.get(`https://api.telegram.org/bot${botToken}/getMe`, {
        timeout: 5000
      });

      if (response.data.ok) {
        return response.data.result;
      } else {
        throw new Error(`Telegram API error: ${response.data.description}`);
      }
    } catch (error) {
      this.logger.error('Failed to get Telegram bot info', { error: error.message });
      throw error;
    }
  }
}










