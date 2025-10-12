/**
 * Scheduled Daily Snapshots
 * Automatically creates daily stock snapshots at 23:59 every day
 */

import { createRequestLogger } from '../utils/logger';
import { dailySnapshotService } from './dailySnapshot';

const logger = createRequestLogger({} as any);

export class ScheduledSnapshotService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start the scheduled snapshot service
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Scheduled snapshot service is already running');
      return;
    }

    logger.info('Starting scheduled snapshot service');

    // Calculate time until next 23:59
    const now = new Date();
    const nextSnapshot = new Date();
    nextSnapshot.setHours(23, 59, 0, 0);
    
    // If it's already past 23:59 today, schedule for tomorrow
    if (now >= nextSnapshot) {
      nextSnapshot.setDate(nextSnapshot.getDate() + 1);
    }

    const msUntilNext = nextSnapshot.getTime() - now.getTime();
    
    logger.info({
      nextSnapshot: nextSnapshot.toISOString(),
      msUntilNext
    }, 'Scheduled next snapshot');

    // Set timeout for the first snapshot
    setTimeout(() => {
      this.runSnapshot();
      this.scheduleRecurring();
    }, msUntilNext);

    this.isRunning = true;
  }

  /**
   * Stop the scheduled snapshot service
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('Scheduled snapshot service stopped');
  }

  /**
   * Schedule recurring snapshots every 24 hours
   */
  private scheduleRecurring(): void {
    // Run every 24 hours (86400000 ms)
    this.intervalId = setInterval(() => {
      this.runSnapshot();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Run the snapshot process
   */
  private async runSnapshot(): Promise<void> {
    try {
      logger.info('Starting scheduled daily snapshot');
      
      const summary = await dailySnapshotService.createDailySnapshot('AVERAGE');
      
      logger.info({
        date: summary.snapshot_date,
        totalProducts: summary.total_products,
        totalValue: summary.total_value_cents,
        productsWithStock: summary.products_with_stock,
        productsOutOfStock: summary.products_out_of_stock,
        productsLowStock: summary.products_low_stock
      }, 'Scheduled daily snapshot completed successfully');

      // Clean up old snapshots (keep last 90 days)
      const deletedCount = dailySnapshotService.cleanupOldSnapshots(90);
      if (deletedCount > 0) {
        logger.info({ deletedCount }, 'Cleaned up old snapshots');
      }

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Failed to create scheduled daily snapshot');
    }
  }

  /**
   * Manually trigger a snapshot (for testing or immediate needs)
   */
  async triggerSnapshot(method: 'FIFO' | 'AVERAGE' | 'LIFO' = 'AVERAGE'): Promise<void> {
    try {
      logger.info({ method }, 'Manually triggering snapshot');
      await this.runSnapshot();
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Failed to trigger manual snapshot');
      throw error;
    }
  }

  /**
   * Get service status
   */
  getStatus(): { isRunning: boolean; nextSnapshot?: string } {
    const status: { isRunning: boolean; nextSnapshot?: string } = {
      isRunning: this.isRunning
    };

    if (this.isRunning) {
      const now = new Date();
      const nextSnapshot = new Date();
      nextSnapshot.setHours(23, 59, 0, 0);
      
      if (now >= nextSnapshot) {
        nextSnapshot.setDate(nextSnapshot.getDate() + 1);
      }
      
      status.nextSnapshot = nextSnapshot.toISOString();
    }

    return status;
  }
}

export const scheduledSnapshotService = new ScheduledSnapshotService();
