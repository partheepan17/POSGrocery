/**
 * WhatsApp Alert Channel
 * Sends alerts via WhatsApp using Twilio API
 */

import { createContextLogger } from '../../utils/logger';

export interface TwilioConfig {
  account_sid: string;
  auth_token: string;
  from_number: string;
  to_numbers: string[];
}

export class WhatsAppChannel {
  private logger = createContextLogger({ operation: 'whatsapp_channel' });

  /**
   * Send alert via WhatsApp
   */
  async sendAlert(message: string, config: TwilioConfig): Promise<void> {
    if (!config.account_sid || !config.auth_token || !config.from_number) {
      throw new Error('Twilio configuration is incomplete');
    }

    if (!config.to_numbers || config.to_numbers.length === 0) {
      throw new Error('No WhatsApp numbers configured');
    }

    this.logger.info({ 
      toNumbers: config.to_numbers.length,
      messageLength: message.length
    }, 'Sending WhatsApp alert');

    try {
      // Import Twilio dynamically to avoid requiring it as a dependency
      const twilio = await import('twilio');
      const client = twilio.default(config.account_sid, config.auth_token);

      // Send to all configured numbers
      const sendPromises = config.to_numbers.map(toNumber => 
        this.sendToNumber(client, config.from_number, toNumber, message)
      );

      await Promise.all(sendPromises);

      this.logger.info({ 
        sentTo: config.to_numbers.length
      }, 'WhatsApp alert sent successfully');

    } catch (error) {
      this.logger.error('Failed to send WhatsApp alert', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Send message to a specific WhatsApp number
   */
  private async sendToNumber(
    client: any, 
    fromNumber: string, 
    toNumber: string, 
    message: string
  ): Promise<void> {
    try {
      // Ensure the number is in the correct format
      const formattedToNumber = this.formatWhatsAppNumber(toNumber);
      
      const result = await client.messages.create({
        from: `whatsapp:${fromNumber}`,
        to: `whatsapp:${formattedToNumber}`,
        body: message
      });

      this.logger.debug({ 
        toNumber: formattedToNumber,
        messageSid: result.sid
      }, 'WhatsApp message sent');

    } catch (error) {
      this.logger.error('Failed to send WhatsApp message to number', { 
        toNumber,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Format WhatsApp number to include country code if missing
   */
  private formatWhatsAppNumber(number: string): string {
    // Remove any non-digit characters
    const cleanNumber = number.replace(/\D/g, '');
    
    // If number doesn't start with country code, assume Sri Lanka (+94)
    if (cleanNumber.length === 9 && cleanNumber.startsWith('7')) {
      return `+94${cleanNumber}`;
    }
    
    // If number starts with 0, replace with +94
    if (cleanNumber.startsWith('0')) {
      return `+94${cleanNumber.substring(1)}`;
    }
    
    // If number doesn't start with +, add it
    if (!cleanNumber.startsWith('+')) {
      return `+${cleanNumber}`;
    }
    
    return cleanNumber;
  }

  /**
   * Test WhatsApp configuration
   */
  async testConfiguration(config: TwilioConfig): Promise<boolean> {
    try {
      const testMessage = `🧪 *Test Message*
      
This is a test message from your POS system to verify WhatsApp integration.

Time: ${new Date().toLocaleString('en-LK')}
Status: ✅ Configuration working correctly

If you receive this message, your WhatsApp alert system is properly configured!`;

      await this.sendAlert(testMessage, config);
      
      this.logger.info('WhatsApp test message sent successfully');
      return true;

    } catch (error) {
      this.logger.error('WhatsApp test failed', { 
        error: error.message 
      });
      return false;
    }
  }

  /**
   * Get Twilio account information
   */
  async getAccountInfo(config: TwilioConfig): Promise<any> {
    try {
      const twilio = await import('twilio');
      const client = twilio.default(config.account_sid, config.auth_token);
      
      const account = await client.api.accounts(config.account_sid).fetch();
      
      this.logger.info({ 
        accountSid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status
      }, 'Retrieved Twilio account info');

      return {
        sid: account.sid,
        friendly_name: account.friendlyName,
        status: account.status,
        type: account.type,
        created_at: account.dateCreated
      };

    } catch (error) {
      this.logger.error('Failed to get Twilio account info', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Validate WhatsApp number format
   */
  validateNumber(number: string): { valid: boolean; formatted?: string; error?: string } {
    try {
      const formatted = this.formatWhatsAppNumber(number);
      
      // Basic validation - should be 10-15 digits after country code
      const digitsOnly = formatted.replace(/\D/g, '');
      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        return {
          valid: false,
          error: 'Invalid number length'
        };
      }

      return {
        valid: true,
        formatted
      };

    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Send alert with retry logic
   */
  async sendAlertWithRetry(
    message: string, 
    config: TwilioConfig, 
    maxRetries: number = 3
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.sendAlert(message, config);
        return; // Success, exit retry loop

      } catch (error) {
        lastError = error as Error;
        
        this.logger.warn({ 
          attempt,
          maxRetries,
          error: error.message
        }, 'WhatsApp send attempt failed, retrying...');

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    // All retries failed
    this.logger.error({ 
      maxRetries,
      finalError: lastError?.message
    }, 'WhatsApp send failed after all retries');

    throw lastError || new Error('WhatsApp send failed after retries');
  }
}










