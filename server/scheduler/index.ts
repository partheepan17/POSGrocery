/**
 * Cron Job Scheduler
 * Manages scheduled tasks for the POS system
 */

import * as cron from 'node-cron';
import { createContextLogger } from '../utils/logger';
import { lowStockAlertService } from '../alerts/lowStock';
import { expiryAlertService } from '../alerts/expiryAlerts';
import { dailySummaryService } from '../alerts/dailySummary';
import { shadowRecountService } from '../jobs/recount';
import { webhookService } from '../integrations/webhooks';

export class SchedulerService {
  private logger = createContextLogger({ operation: 'scheduler' });
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  constructor() {
    this.initializeJobs();
  }

  /**
   * Initialize all scheduled jobs
   */
  private initializeJobs(): void {
    this.logger.info('Initializing scheduled jobs');

    // Low stock alert - every hour
    this.scheduleJob('low-stock-alert', '0 * * * *', async () => {
      try {
        this.logger.info('Running low stock alert check');
        await lowStockAlertService.checkAndAlert();
      } catch (error) {
        this.logger.error('Low stock alert job failed', { error: error.message });
      }
    });

    // Daily stock snapshot - every day at 2 AM
    this.scheduleJob('daily-stock-snapshot', '0 2 * * *', async () => {
      try {
        this.logger.info('Running daily stock snapshot');
        await this.createDailyStockSnapshot();
      } catch (error) {
        this.logger.error('Daily stock snapshot job failed', { error: error.message });
      }
    });

    // Database cleanup - every Sunday at 3 AM
    this.scheduleJob('database-cleanup', '0 3 * * 0', async () => {
      try {
        this.logger.info('Running database cleanup');
        await this.cleanupOldData();
      } catch (error) {
        this.logger.error('Database cleanup job failed', { error: error.message });
      }
    });

    // Health check - every 15 minutes
    this.scheduleJob('health-check', '*/15 * * * *', async () => {
      try {
        this.logger.info('Running health check');
        await this.performHealthCheck();
      } catch (error) {
        this.logger.error('Health check job failed', { error: error.message });
      }
    });

    // Shadow recount - every night at 1 AM
    this.scheduleJob('shadow-recount', '0 1 * * *', async () => {
      try {
        this.logger.info('Running shadow recount');
        await shadowRecountService.performRecount();
      } catch (error) {
        this.logger.error('Shadow recount job failed', { error: error.message });
      }
    });

    // Expiry alerts - every day at 8 AM
    this.scheduleJob('expiry-alerts', '0 8 * * *', async () => {
      try {
        this.logger.info('Running expiry alerts check');
        await expiryAlertService.checkAndAlert();
      } catch (error) {
        this.logger.error('Expiry alerts job failed', { error: error.message });
      }
    });

    // Daily business summary - every day at 7:30 PM local time
    this.scheduleJob('daily-summary', '30 19 * * *', async () => {
      try {
        this.logger.info('Running daily business summary');
        await dailySummaryService.generateAndSendTodaysSummary();
      } catch (error) {
        this.logger.error('Daily summary job failed', { error: error.message });
      }
    });

    // Webhook processing - every 2 minutes
    this.scheduleJob('webhook-processing', '*/2 * * * *', async () => {
      try {
        this.logger.info('Processing pending webhooks');
        await webhookService.processPendingWebhooks();
      } catch (error) {
        this.logger.error('Webhook processing job failed', { error: error.message });
      }
    });

    // Webhook cleanup - every day at 3 AM
    this.scheduleJob('webhook-cleanup', '0 3 * * *', async () => {
      try {
        this.logger.info('Cleaning up old webhook dead letter queue entries');
        const deletedCount = await webhookService.cleanupDeadLetterQueue();
        if (deletedCount > 0) {
          this.logger.info({ deletedCount }, 'Cleaned up old webhook entries');
        }
      } catch (error) {
        this.logger.error('Webhook cleanup job failed', { error: error.message });
      }
    });

    this.logger.info(`Initialized ${this.jobs.size} scheduled jobs`);
  }

  /**
   * Schedule a new job
   */
  private scheduleJob(name: string, cronExpression: string, task: () => Promise<void>): void {
    if (this.jobs.has(name)) {
      this.logger.warn(`Job ${name} already exists, skipping`);
      return;
    }

    const job = cron.schedule(cronExpression, task, {
      scheduled: false, // Don't start immediately
      timezone: process.env.TZ || 'UTC'
    });

    this.jobs.set(name, job);
    this.logger.info(`Scheduled job: ${name} (${cronExpression})`);
  }

  /**
   * Start all scheduled jobs
   */
  startAll(): void {
    this.logger.info('Starting all scheduled jobs');
    
    for (const [name, job] of this.jobs) {
      job.start();
      this.logger.info(`Started job: ${name}`);
    }
  }

  /**
   * Stop all scheduled jobs
   */
  stopAll(): void {
    this.logger.info('Stopping all scheduled jobs');
    
    for (const [name, job] of this.jobs) {
      job.stop();
      this.logger.info(`Stopped job: ${name}`);
    }
  }

  /**
   * Start a specific job
   */
  startJob(name: string): boolean {
    const job = this.jobs.get(name);
    if (job) {
      job.start();
      this.logger.info(`Started job: ${name}`);
      return true;
    }
    this.logger.warn(`Job not found: ${name}`);
    return false;
  }

  /**
   * Stop a specific job
   */
  stopJob(name: string): boolean {
    const job = this.jobs.get(name);
    if (job) {
      job.stop();
      this.logger.info(`Stopped job: ${name}`);
      return true;
    }
    this.logger.warn(`Job not found: ${name}`);
    return false;
  }

  /**
   * Get job status
   */
  getJobStatus(name: string): { running: boolean; nextRun?: Date } | null {
    const job = this.jobs.get(name);
    if (job) {
      return {
        running: job.getStatus() === 'scheduled',
        nextRun: job.nextDate()?.toDate()
      };
    }
    return null;
  }

  /**
   * Get all jobs status
   */
  getAllJobsStatus(): Record<string, { running: boolean; nextRun?: Date }> {
    const status: Record<string, { running: boolean; nextRun?: Date }> = {};
    
    for (const [name, job] of this.jobs) {
      status[name] = {
        running: job.getStatus() === 'scheduled',
        nextRun: job.nextDate()?.toDate()
      };
    }
    
    return status;
  }

  /**
   * Create daily stock snapshot
   */
  private async createDailyStockSnapshot(): Promise<void> {
    const { getDatabase } = await import('../db');
    const db = getDatabase();
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Check if snapshot already exists for today
      const existingSnapshot = db.prepare(`
        SELECT COUNT(*) as count FROM stock_snapshots 
        WHERE snapshot_date = ?
      `).get(today) as { count: number };
      
      if (existingSnapshot.count > 0) {
        this.logger.info('Daily stock snapshot already exists for today');
        return;
      }

      // Create snapshot
      const snapshotQuery = `
        INSERT INTO stock_snapshots (
          snapshot_date, product_id, sku, name_en, name_si, name_ta, unit,
          category_id, category_name, qty_on_hand, value_cents, valuation_method,
          has_unknown_cost
        )
        SELECT 
          ? as snapshot_date,
          p.id as product_id,
          p.sku,
          p.name_en,
          p.name_si,
          p.name_ta,
          p.unit,
          p.category_id,
          c.name as category_name,
          COALESCE(ps.current_quantity, 0) as qty_on_hand,
          COALESCE(ps.total_value * 100, 0) as value_cents,
          'AVERAGE' as valuation_method,
          CASE WHEN COALESCE(ps.average_cost, 0) = 0 THEN 1 ELSE 0 END as has_unknown_cost
        FROM products p
        LEFT JOIN product_stock ps ON p.id = ps.product_id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_active = 1
      `;

      const result = db.prepare(snapshotQuery).run(today);
      
      this.logger.info('Daily stock snapshot created', { 
        snapshotDate: today,
        recordsCreated: result.changes
      });

    } catch (error) {
      this.logger.error('Failed to create daily stock snapshot', { error: error.message });
      throw error;
    }
  }

  /**
   * Cleanup old data
   */
  private async cleanupOldData(): Promise<void> {
    const { getDatabase } = await import('../db');
    const db = getDatabase();
    
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoffDate = thirtyDaysAgo.toISOString();

      // Clean up old audit logs (keep last 30 days)
      const auditCleanup = db.prepare(`
        DELETE FROM audit_logs 
        WHERE created_at < ?
      `).run(cutoffDate);

      // Clean up old stock snapshots (keep last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const snapshotCutoff = ninetyDaysAgo.toISOString().split('T')[0];

      const snapshotCleanup = db.prepare(`
        DELETE FROM stock_snapshots 
        WHERE snapshot_date < ?
      `).run(snapshotCutoff);

      this.logger.info('Database cleanup completed', {
        auditLogsDeleted: auditCleanup.changes,
        snapshotsDeleted: snapshotCleanup.changes
      });

    } catch (error) {
      this.logger.error('Failed to cleanup old data', { error: error.message });
      throw error;
    }
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const { getDatabase } = await import('../db');
      const db = getDatabase();
      
      // Check database connection
      db.prepare('SELECT 1').get();
      
      // Check if any jobs are running
      const runningJobs = Array.from(this.jobs.entries())
        .filter(([_, job]) => job.getStatus() === 'scheduled')
        .map(([name, _]) => name);

      this.logger.info('Health check completed', {
        databaseConnected: true,
        runningJobs: runningJobs.length,
        totalJobs: this.jobs.size
      });

    } catch (error) {
      this.logger.error('Health check failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Run a job immediately (for testing)
   */
  async runJobNow(name: string): Promise<boolean> {
    const job = this.jobs.get(name);
    if (job) {
      try {
        this.logger.info(`Running job immediately: ${name}`);
        await job.getTask()();
        return true;
      } catch (error) {
        this.logger.error(`Job ${name} failed`, { error: error.message });
        return false;
      }
    }
    this.logger.warn(`Job not found: ${name}`);
    return false;
  }
}

// Export singleton instance
export const schedulerService = new SchedulerService();
