import { getLogger } from './logger';

const logger = getLogger();

export interface ScheduledJob {
  id: string;
  name: string;
  schedule: string; // cron-like expression or time
  job: () => Promise<void>;
  lastRun?: Date;
  nextRun?: Date;
  isRunning: boolean;
  errorCount: number;
  lastError?: string;
}

class Scheduler {
  private jobs: Map<string, ScheduledJob> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isShuttingDown = false;

  /**
   * Schedule a job to run at a specific time daily
   * @param id Unique identifier for the job
   * @param name Human-readable name for the job
   * @param time Time in HH:MM format (24-hour)
   * @param job Function to execute
   */
  scheduleDaily(id: string, name: string, time: string, job: () => Promise<void>): void {
    if (this.jobs.has(id)) {
      logger.warn(`Job ${id} already exists, replacing it`);
      this.unschedule(id);
    }

    const scheduledJob: ScheduledJob = {
      id,
      name,
      schedule: time,
      job,
      isRunning: false,
      errorCount: 0
    };

    this.jobs.set(id, scheduledJob);
    this.scheduleNextRun(id);
    
    logger.info(`Scheduled daily job: ${name} at ${time}`, { jobId: id });
  }

  /**
   * Schedule a job to run at intervals
   * @param id Unique identifier for the job
   * @param name Human-readable name for the job
   * @param intervalMs Interval in milliseconds
   * @param job Function to execute
   */
  scheduleInterval(id: string, name: string, intervalMs: number, job: () => Promise<void>): void {
    if (this.jobs.has(id)) {
      logger.warn(`Job ${id} already exists, replacing it`);
      this.unschedule(id);
    }

    const scheduledJob: ScheduledJob = {
      id,
      name,
      schedule: `${intervalMs}ms`,
      job,
      isRunning: false,
      errorCount: 0
    };

    this.jobs.set(id, scheduledJob);
    
    const interval = setInterval(async () => {
      if (!this.isShuttingDown) {
        await this.runJob(id);
      }
    }, intervalMs);

    this.intervals.set(id, interval);
    
    logger.info(`Scheduled interval job: ${name} every ${intervalMs}ms`, { jobId: id });
  }

  /**
   * Unschedule a job
   */
  unschedule(id: string): void {
    const job = this.jobs.get(id);
    if (!job) return;

    // Clear interval if it exists
    const interval = this.intervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(id);
    }

    this.jobs.delete(id);
    logger.info(`Unscheduled job: ${job.name}`, { jobId: id });
  }

  /**
   * Get all scheduled jobs
   */
  getJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get a specific job
   */
  getJob(id: string): ScheduledJob | undefined {
    return this.jobs.get(id);
  }

  /**
   * Run a job immediately
   */
  async runJob(id: string): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) {
      logger.warn(`Job ${id} not found`);
      return;
    }

    if (job.isRunning) {
      logger.warn(`Job ${job.name} is already running`, { jobId: id });
      return;
    }

    job.isRunning = true;
    job.lastRun = new Date();

    try {
      logger.info(`Running job: ${job.name}`, { jobId: id });
      await job.job();
      job.errorCount = 0; // Reset error count on success
      logger.info(`Job completed successfully: ${job.name}`, { jobId: id });
    } catch (error) {
      job.errorCount++;
      job.lastError = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Job failed: ${job.name}`, {
        jobId: id,
        error: job.lastError,
        errorCount: job.errorCount
      });
    } finally {
      job.isRunning = false;
    }
  }

  /**
   * Schedule the next run for a daily job
   */
  private scheduleNextRun(id: string): void {
    const job = this.jobs.get(id);
    if (!job) return;

    const [hours, minutes] = job.schedule.split(':').map(Number);
    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);

    // If the time has already passed today, schedule for tomorrow
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    job.nextRun = nextRun;

    const msUntilNext = nextRun.getTime() - now.getTime();
    
    const timeout = setTimeout(async () => {
      if (!this.isShuttingDown) {
        await this.runJob(id);
        // Schedule the next day's run
        this.scheduleNextRun(id);
      }
    }, msUntilNext);

    this.intervals.set(id, timeout);
    
    logger.info(`Next run scheduled for ${job.name} at ${nextRun.toISOString()}`, {
      jobId: id,
      nextRun: nextRun.toISOString(),
      msUntilNext
    });
  }

  /**
   * Shutdown the scheduler gracefully
   */
  shutdown(): void {
    logger.info('Shutting down scheduler...');
    this.isShuttingDown = true;
    
    // Clear all intervals
    for (const [id, interval] of this.intervals) {
      clearTimeout(interval);
      logger.debug(`Cleared interval for job: ${id}`);
    }
    
    this.intervals.clear();
    this.jobs.clear();
    
    logger.info('Scheduler shutdown complete');
  }
}

// Export singleton instance
export const scheduler = new Scheduler();

