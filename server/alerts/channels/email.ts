/**
 * Email Notification Channel
 * Sends alerts via SMTP
 */

import nodemailer from 'nodemailer';
import { createContextLogger } from '../../utils/logger';

export interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  from_email: string;
  to_emails: string[];
}

export class EmailChannel {
  private logger = createContextLogger({ operation: 'email_alert' });

  /**
   * Create SMTP transporter
   */
  private createTransporter(config: EmailConfig): nodemailer.Transporter {
    return nodemailer.createTransporter({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_port === 465, // true for 465, false for other ports
      auth: {
        user: config.smtp_user,
        pass: config.smtp_pass
      },
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates
      }
    });
  }

  /**
   * Send alert via email
   */
  async sendAlert(subject: string, message: string, config: EmailConfig): Promise<void> {
    try {
      const transporter = this.createTransporter(config);

      // Convert markdown-style message to HTML
      const htmlMessage = this.convertToHtml(message);

      const mailOptions = {
        from: config.from_email,
        to: config.to_emails.join(', '),
        subject: subject,
        text: message,
        html: htmlMessage,
        headers: {
          'X-Priority': '1', // High priority
          'X-MSMail-Priority': 'High',
          'Importance': 'high'
        }
      };

      const result = await transporter.sendMail(mailOptions);
      
      this.logger.info('Email alert sent successfully', { 
        messageId: result.messageId,
        recipients: config.to_emails.length
      });

    } catch (error) {
      this.logger.error('Failed to send email alert', { 
        error: error.message,
        smtpHost: config.smtp_host
      });
      throw error;
    }
  }

  /**
   * Convert markdown-style message to HTML
   */
  private convertToHtml(message: string): string {
    return message
      // Convert bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Convert italic text
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Convert line breaks
      .replace(/\n/g, '<br>')
      // Convert emojis to HTML entities (optional)
      .replace(/🚨/g, '&#128680;')
      .replace(/🔴/g, '&#128308;')
      .replace(/🟡/g, '&#128993;')
      .replace(/🟠/g, '&#128992;')
      .replace(/✅/g, '&#9989;')
      .replace(/📊/g, '&#128202;')
      .replace(/📦/g, '&#128230;')
      .replace(/🧪/g, '&#129514;');
  }

  /**
   * Send HTML email with styling
   */
  async sendStyledAlert(subject: string, message: string, config: EmailConfig): Promise<void> {
    try {
      const transporter = this.createTransporter(config);

      const htmlMessage = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background-color: white;
              border-radius: 8px;
              padding: 30px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #ff6b6b, #ffa500);
              color: white;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 20px;
              text-align: center;
            }
            .alert-content {
              background-color: #fff3cd;
              border: 1px solid #ffeaa7;
              border-radius: 6px;
              padding: 15px;
              margin: 20px 0;
            }
            .product-item {
              background-color: #f8f9fa;
              border-left: 4px solid #ff6b6b;
              padding: 15px;
              margin: 10px 0;
              border-radius: 4px;
            }
            .status-out { border-left-color: #dc3545; }
            .status-reorder { border-left-color: #ffc107; }
            .status-low { border-left-color: #fd7e14; }
            .summary {
              background-color: #e3f2fd;
              border: 1px solid #bbdefb;
              border-radius: 6px;
              padding: 15px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              color: #666;
              font-size: 12px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
            }
            .btn {
              display: inline-block;
              padding: 10px 20px;
              background-color: #007bff;
              color: white;
              text-decoration: none;
              border-radius: 4px;
              margin: 5px;
            }
            .btn:hover {
              background-color: #0056b3;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚨 Low Stock Alert</h1>
              <p>POS Grocery System - ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="alert-content">
              ${this.convertToHtml(message)}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_BASE_URL || 'http://localhost:3000'}/reports" class="btn">📊 View Dashboard</a>
              <a href="${process.env.APP_BASE_URL || 'http://localhost:3000'}/inventory" class="btn">📦 Manage Inventory</a>
            </div>
            
            <div class="footer">
              <p>This is an automated alert from POS Grocery System</p>
              <p>Please do not reply to this email</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: config.from_email,
        to: config.to_emails.join(', '),
        subject: subject,
        text: message,
        html: htmlMessage,
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high'
        }
      };

      const result = await transporter.sendMail(mailOptions);
      
      this.logger.info('Styled email alert sent successfully', { 
        messageId: result.messageId,
        recipients: config.to_emails.length
      });

    } catch (error) {
      this.logger.error('Failed to send styled email alert', { 
        error: error.message,
        smtpHost: config.smtp_host
      });
      throw error;
    }
  }

  /**
   * Test email configuration
   */
  async testConnection(config: EmailConfig): Promise<boolean> {
    try {
      const testSubject = '🧪 Test Alert from POS Grocery System';
      const testMessage = 'This is a test email to verify SMTP configuration.\n\nConnection successful! ✅';
      
      await this.sendAlert(testSubject, testMessage, config);
      return true;
    } catch (error) {
      this.logger.error('Email connection test failed', { error: error.message });
      return false;
    }
  }

  /**
   * Verify SMTP configuration
   */
  async verifyConfig(config: EmailConfig): Promise<boolean> {
    try {
      const transporter = this.createTransporter(config);
      await transporter.verify();
      return true;
    } catch (error) {
      this.logger.error('SMTP configuration verification failed', { error: error.message });
      return false;
    }
  }
}










