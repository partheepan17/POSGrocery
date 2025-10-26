/**
 * Webhook Integration Service
 * Handles webhook delivery with retry logic and dead letter queue
 */

import { getDatabase } from '../db';
import { createContextLogger } from '../utils/logger';

export interface WebhookPayload {
  id: string;
  event_type: 'sale_committed' | 'grn_created';
  timestamp: string;
  data: any;
  retry_count: number;
  max_retries: number;
  next_retry_at?: string;
  status: 'pending' | 'delivered' | 'failed' | 'dead_letter';
  created_at: string;
  updated_at: string;
}

export interface SaleWebhookData {
  id: number;
  ts: string;
  lines: Array<{
    product_id: number;
    sku: string;
    name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  total: number;
  tax: number;
  customer?: {
    id: number;
    name: string;
    phone?: string;
  };
  receipt_no: string;
  cashier_id?: number;
  terminal_name?: string;
}

export interface GRNWebhookData {
  id: number;
  supplier: {
    id: number;
    name: string;
    contact?: string;
  };
  lines: Array<{
    product_id: number;
    sku: string;
    name: string;
    quantity: number;
    unit_cost: number;
    line_total: number;
    batch_no?: string;
    expiry_date?: string;
  }>;
  total_cost: number;
  grn_no: string;
  received_by?: number;
  received_at: string;
}

export interface WebhookConfig {
  sale_webhook_url?: string;
  grn_webhook_url?: string;
  timeout_ms: number;
  max_retries: number;
  retry_delay_ms: number;
  retry_backoff_multiplier: number;
  max_retry_delay_ms: number;
  dead_letter_retention_days: number;
}

export class WebhookService {
  private logger = createContextLogger({ operation: 'webhook_service' });
  private config: WebhookConfig;

  constructor() {
    this.config = this.getConfig();
    this.initializeDatabase();
  }

  /**
   * Get webhook configuration from environment variables
   */
  private getConfig(): WebhookConfig {
    return {
      sale_webhook_url: process.env.WEBHOOK_SALE_URL,
      grn_webhook_url: process.env.WEBHOOK_GRN_URL,
      timeout_ms: parseInt(process.env.WEBHOOK_TIMEOUT_MS || '10000'),
      max_retries: parseInt(process.env.WEBHOOK_MAX_RETRIES || '3'),
      retry_delay_ms: parseInt(process.env.WEBHOOK_RETRY_DELAY_MS || '1000'),
      retry_backoff_multiplier: parseFloat(process.env.WEBHOOK_RETRY_BACKOFF_MULTIPLIER || '2'),
      max_retry_delay_ms: parseInt(process.env.WEBHOOK_MAX_RETRY_DELAY_MS || '300000'),
      dead_letter_retention_days: parseInt(process.env.WEBHOOK_DLQ_RETENTION_DAYS || '30')
    };
  }

  /**
   * Initialize database tables for webhook management
   */
  private initializeDatabase(): void {
    const db = getDatabase();
    
    // Create webhook_payloads table
    db.exec(`
      CREATE TABLE IF NOT EXISTS webhook_payloads (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL CHECK (event_type IN ('sale_committed', 'grn_created')),
        timestamp TEXT NOT NULL,
        data TEXT NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        next_retry_at TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'dead_letter')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Create webhook_delivery_logs table
    db.exec(`
      CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        webhook_id TEXT NOT NULL,
        attempt_number INTEGER NOT NULL,
        status_code INTEGER,
        response_body TEXT,
        error_message TEXT,
        delivered_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (webhook_id) REFERENCES webhook_payloads(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_webhook_payloads_status ON webhook_payloads(status);
      CREATE INDEX IF NOT EXISTS idx_webhook_payloads_event_type ON webhook_payloads(event_type);
      CREATE INDEX IF NOT EXISTS idx_webhook_payloads_next_retry ON webhook_payloads(next_retry_at);
      CREATE INDEX IF NOT EXISTS idx_webhook_delivery_logs_webhook_id ON webhook_delivery_logs(webhook_id);
    `);

    this.logger.info('Webhook database tables initialized');
  }

  /**
   * Send sale committed webhook
   */
  async sendSaleCommitted(saleData: SaleWebhookData): Promise<void> {
    if (!this.config.sale_webhook_url) {
      this.logger.debug('Sale webhook URL not configured, skipping');
      return;
    }

    const payload: WebhookPayload = {
      id: `sale_${saleData.id}_${Date.now()}`,
      event_type: 'sale_committed',
      timestamp: saleData.ts,
      data: saleData,
      retry_count: 0,
      max_retries: this.config.max_retries,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await this.queueWebhook(payload);
    this.logger.info({ saleId: saleData.id, webhookId: payload.id }, 'Sale webhook queued');
  }

  /**
   * Send GRN created webhook
   */
  async sendGRNCreated(grnData: GRNWebhookData): Promise<void> {
    if (!this.config.grn_webhook_url) {
      this.logger.debug('GRN webhook URL not configured, skipping');
      return;
    }

    const payload: WebhookPayload = {
      id: `grn_${grnData.id}_${Date.now()}`,
      event_type: 'grn_created',
      timestamp: grnData.received_at,
      data: grnData,
      retry_count: 0,
      max_retries: this.config.max_retries,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await this.queueWebhook(payload);
    this.logger.info({ grnId: grnData.id, webhookId: payload.id }, 'GRN webhook queued');
  }

  /**
   * Queue webhook for delivery
   */
  private async queueWebhook(payload: WebhookPayload): Promise<void> {
    const db = getDatabase();
    
    db.prepare(`
      INSERT INTO webhook_payloads (
        id, event_type, timestamp, data, retry_count, max_retries, 
        next_retry_at, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      payload.id,
      payload.event_type,
      payload.timestamp,
      JSON.stringify(payload.data),
      payload.retry_count,
      payload.max_retries,
      new Date().toISOString(),
      payload.status,
      payload.created_at,
      payload.updated_at
    );
  }

  /**
   * Process pending webhooks
   */
  async processPendingWebhooks(): Promise<void> {
    const db = getDatabase();
    
    const pendingWebhooks = db.prepare(`
      SELECT * FROM webhook_payloads 
      WHERE status = 'pending' 
        AND (next_retry_at IS NULL OR next_retry_at <= datetime('now'))
      ORDER BY created_at ASC
      LIMIT 10
    `).all() as WebhookPayload[];

    this.logger.info({ count: pendingWebhooks.length }, 'Processing pending webhooks');

    for (const webhook of pendingWebhooks) {
      try {
        await this.deliverWebhook(webhook);
      } catch (error) {
        this.logger.error('Failed to process webhook', { 
          webhookId: webhook.id,
          error: error.message 
        });
      }
    }
  }

  /**
   * Deliver a single webhook
   */
  private async deliverWebhook(webhook: WebhookPayload): Promise<void> {
    const db = getDatabase();
    
    try {
      const webhookUrl = this.getWebhookUrl(webhook.event_type);
      if (!webhookUrl) {
        throw new Error(`No webhook URL configured for event type: ${webhook.event_type}`);
      }

      const response = await this.sendHttpRequest(webhookUrl, webhook.data);
      
      // Update webhook status to delivered
      db.prepare(`
        UPDATE webhook_payloads 
        SET status = 'delivered', updated_at = datetime('now')
        WHERE id = ?
      `).run(webhook.id);

      // Log successful delivery
      db.prepare(`
        INSERT INTO webhook_delivery_logs (webhook_id, attempt_number, status_code, response_body)
        VALUES (?, ?, ?, ?)
      `).run(webhook.id, webhook.retry_count + 1, response.status, response.body);

      this.logger.info({ 
        webhookId: webhook.id,
        eventType: webhook.event_type,
        attempt: webhook.retry_count + 1
      }, 'Webhook delivered successfully');

    } catch (error) {
      await this.handleWebhookFailure(webhook, error);
    }
  }

  /**
   * Handle webhook delivery failure
   */
  private async handleWebhookFailure(webhook: WebhookPayload, error: any): Promise<void> {
    const db = getDatabase();
    const newRetryCount = webhook.retry_count + 1;
    
    if (newRetryCount >= webhook.max_retries) {
      // Move to dead letter queue
      db.prepare(`
        UPDATE webhook_payloads 
        SET status = 'dead_letter', updated_at = datetime('now')
        WHERE id = ?
      `).run(webhook.id);

      this.logger.error({ 
        webhookId: webhook.id,
        eventType: webhook.event_type,
        retryCount: newRetryCount
      }, 'Webhook moved to dead letter queue');

    } else {
      // Schedule retry with exponential backoff
      const delayMs = Math.min(
        this.config.retry_delay_ms * Math.pow(this.config.retry_backoff_multiplier, newRetryCount - 1),
        this.config.max_retry_delay_ms
      );
      
      const nextRetryAt = new Date(Date.now() + delayMs).toISOString();

      db.prepare(`
        UPDATE webhook_payloads 
        SET retry_count = ?, next_retry_at = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(newRetryCount, nextRetryAt, webhook.id);

      this.logger.warn({ 
        webhookId: webhook.id,
        eventType: webhook.event_type,
        retryCount: newRetryCount,
        nextRetryAt,
        delayMs
      }, 'Webhook delivery failed, scheduled retry');
    }

    // Log failed delivery
    db.prepare(`
      INSERT INTO webhook_delivery_logs (webhook_id, attempt_number, error_message)
      VALUES (?, ?, ?)
    `).run(webhook.id, newRetryCount, error.message);
  }

  /**
   * Send HTTP request to webhook URL
   */
  private async sendHttpRequest(url: string, data: any): Promise<{ status: number; body: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout_ms);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'POS-System-Webhook/1.0',
          'X-Webhook-Event': 'sale_committed' // or grn_created
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseBody = await response.text();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseBody}`);
      }

      return {
        status: response.status,
        body: responseBody
      };

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.timeout_ms}ms`);
      }
      
      throw error;
    }
  }

  /**
   * Get webhook URL for event type
   */
  private getWebhookUrl(eventType: string): string | undefined {
    switch (eventType) {
      case 'sale_committed':
        return this.config.sale_webhook_url;
      case 'grn_created':
        return this.config.grn_webhook_url;
      default:
        return undefined;
    }
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(): Promise<{
    total: number;
    pending: number;
    delivered: number;
    failed: number;
    dead_letter: number;
    by_event_type: Record<string, number>;
  }> {
    const db = getDatabase();
    
    const stats = db.prepare(`
      SELECT 
        status,
        event_type,
        COUNT(*) as count
      FROM webhook_payloads
      GROUP BY status, event_type
    `).all() as Array<{
      status: string;
      event_type: string;
      count: number;
    }>;

    const result = {
      total: 0,
      pending: 0,
      delivered: 0,
      failed: 0,
      dead_letter: 0,
      by_event_type: {} as Record<string, number>
    };

    stats.forEach(stat => {
      result.total += stat.count;
      result[stat.status as keyof typeof result] += stat.count;
      
      if (!result.by_event_type[stat.event_type]) {
        result.by_event_type[stat.event_type] = 0;
      }
      result.by_event_type[stat.event_type] += stat.count;
    });

    return result;
  }

  /**
   * Get webhook delivery logs
   */
  async getWebhookLogs(webhookId: string): Promise<Array<{
    attempt_number: number;
    status_code?: number;
    response_body?: string;
    error_message?: string;
    delivered_at: string;
  }>> {
    const db = getDatabase();
    
    return db.prepare(`
      SELECT attempt_number, status_code, response_body, error_message, delivered_at
      FROM webhook_delivery_logs
      WHERE webhook_id = ?
      ORDER BY attempt_number ASC
    `).all(webhookId) as Array<{
      attempt_number: number;
      status_code?: number;
      response_body?: string;
      error_message?: string;
      delivered_at: string;
    }>;
  }

  /**
   * Clean up old dead letter queue entries
   */
  async cleanupDeadLetterQueue(): Promise<number> {
    const db = getDatabase();
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.dead_letter_retention_days);
    
    const result = db.prepare(`
      DELETE FROM webhook_payloads 
      WHERE status = 'dead_letter' 
        AND created_at < ?
    `).run(cutoffDate.toISOString());

    const deletedCount = result.changes;
    
    if (deletedCount > 0) {
      this.logger.info({ deletedCount }, 'Cleaned up old dead letter queue entries');
    }

    return deletedCount;
  }

  /**
   * Retry failed webhooks manually
   */
  async retryFailedWebhooks(): Promise<number> {
    const db = getDatabase();
    
    const result = db.prepare(`
      UPDATE webhook_payloads 
      SET status = 'pending', retry_count = 0, next_retry_at = datetime('now'), updated_at = datetime('now')
      WHERE status = 'failed'
    `).run();

    const retriedCount = result.changes;
    
    if (retriedCount > 0) {
      this.logger.info({ retriedCount }, 'Retried failed webhooks');
    }

    return retriedCount;
  }

  /**
   * Test webhook configuration
   */
  async testWebhook(eventType: 'sale_committed' | 'grn_created'): Promise<boolean> {
    const webhookUrl = this.getWebhookUrl(eventType);
    
    if (!webhookUrl) {
      throw new Error(`No webhook URL configured for event type: ${eventType}`);
    }

    const testData = eventType === 'sale_committed' 
      ? {
          id: 999999,
          ts: new Date().toISOString(),
          lines: [{
            product_id: 1,
            sku: 'TEST-001',
            name: 'Test Product',
            quantity: 1,
            unit_price: 100,
            line_total: 100
          }],
          total: 100,
          tax: 0,
          receipt_no: 'TEST-001'
        }
      : {
          id: 999999,
          supplier: {
            id: 1,
            name: 'Test Supplier'
          },
          lines: [{
            product_id: 1,
            sku: 'TEST-001',
            name: 'Test Product',
            quantity: 1,
            unit_cost: 50,
            line_total: 50
          }],
          total_cost: 50,
          grn_no: 'TEST-GRN-001',
          received_at: new Date().toISOString()
        };

    try {
      await this.sendHttpRequest(webhookUrl, testData);
      this.logger.info({ eventType, webhookUrl }, 'Webhook test successful');
      return true;
    } catch (error) {
      this.logger.error({ eventType, webhookUrl, error: error.message }, 'Webhook test failed');
      return false;
    }
  }
}

// Export singleton instance
export const webhookService = new WebhookService();










