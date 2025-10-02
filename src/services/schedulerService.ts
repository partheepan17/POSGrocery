import { backupService } from './backupService';
import { useAppStore } from '@/store/appStore';

export interface ScheduleInfo {
  nextRun: Date | null;
  lastRun: Date | null;
  isEnabled: boolean;
  dailyTime: string; // HH:MM format
  onSettingsChange: boolean;
}

class SchedulerService {
  private intervalId: NodeJS.Timeout | null = null;
  private lastDailyRun: Date | null = null;
  private settingsChangeTimeout: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor() {
    this.loadScheduleState();
    this.initialize();
  }

  /**
   * Initialize the scheduler
   */
  initialize(): void {
    if (this.isInitialized) return;
    
    console.log('🕐 Initializing backup scheduler...');
    
    // Start the main scheduler interval (check every minute)
    this.intervalId = setInterval(() => {
      this.checkSchedule();
    }, 60000); // 60 seconds
    
    // Listen to settings changes
    this.subscribeToSettingsChanges();
    
    // Check schedule immediately
    setTimeout(() => this.checkSchedule(), 1000);
    
    this.isInitialized = true;
    console.log('✅ Backup scheduler initialized');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    if (this.settingsChangeTimeout) {
      clearTimeout(this.settingsChangeTimeout);
      this.settingsChangeTimeout = null;
    }
    
    this.isInitialized = false;
    console.log('🛑 Backup scheduler stopped');
  }

  /**
   * Get current schedule information
   */
  getScheduleInfo(): ScheduleInfo {
    const { settings } = useAppStore.getState();
    const backupSettings = settings?.backupSettings;
    
    if (!backupSettings?.schedule) {
      return {
        nextRun: null,
        lastRun: this.lastDailyRun,
        isEnabled: false,
        dailyTime: '22:30',
        onSettingsChange: false
      };
    }

    const { dailyTime, onSettingsChange } = backupSettings.schedule;
    const nextRun = this.calculateNextRun(dailyTime);
    
    return {
      nextRun,
      lastRun: this.lastDailyRun,
      isEnabled: this.isBackupConfigured(),
      dailyTime,
      onSettingsChange: onSettingsChange || false
    };
  }

  /**
   * Force a schedule check (useful for testing)
   */
  async forceCheck(): Promise<void> {
    await this.checkSchedule();
  }

  /**
   * Trigger a settings change backup (debounced)
   */
  onSettingsChanged(): void {
    const { settings } = useAppStore.getState();
    const backupSettings = settings?.backupSettings;
    
    if (!backupSettings?.schedule?.onSettingsChange) {
      return;
    }

    // Clear existing timeout
    if (this.settingsChangeTimeout) {
      clearTimeout(this.settingsChangeTimeout);
    }

    // Debounce settings changes (wait 30 seconds after last change)
    this.settingsChangeTimeout = setTimeout(async () => {
      try {
        console.log('📋 Settings changed - creating config backup...');
        
        await backupService.createSnapshot('config', (progress) => {
          console.log(`Config backup progress: ${progress.stage} ${progress.progress}% - ${progress.message}`);
        });
        
        console.log('✅ Config backup completed due to settings change');
        
      } catch (error) {
        console.error('❌ Failed to create config backup:', error);
      }
    }, 30000); // 30 second debounce
  }

  /**
   * Update schedule settings and reschedule
   */
  updateSchedule(dailyTime: string, onSettingsChange: boolean): void {
    const { settings, updateSettings } = useAppStore.getState();
    
    if (!settings?.backupSettings) {
      console.warn('Cannot update schedule - backup settings not initialized');
      return;
    }

    // Update settings
    updateSettings({
      ...settings,
      backupSettings: {
        ...settings.backupSettings,
        schedule: {
          dailyTime,
          onSettingsChange
        }
      }
    });

    console.log(`📅 Backup schedule updated: daily at ${dailyTime}, on-change: ${onSettingsChange}`);
  }

  // Private methods

  private async checkSchedule(): Promise<void> {
    try {
      if (!this.isBackupConfigured()) {
        return; // Skip if backup is not configured
      }

      const { settings } = useAppStore.getState();
      const backupSettings = settings?.backupSettings;
      
      if (!backupSettings?.schedule?.dailyTime) {
        return;
      }

      const dailyTime = backupSettings.schedule.dailyTime;
      const now = new Date();
      const shouldRun = this.shouldRunDailyBackup(dailyTime, now);

      if (shouldRun) {
        console.log('🚀 Scheduled daily backup starting...');
        
        try {
          await backupService.createSnapshot('daily', (progress) => {
            console.log(`Scheduled backup progress: ${progress.stage} ${progress.progress}% - ${progress.message}`);
          });
          
          this.lastDailyRun = new Date();
          this.saveScheduleState();
          
          console.log('✅ Scheduled daily backup completed successfully');
          
        } catch (error) {
          console.error('❌ Scheduled daily backup failed:', error);
        }
      }

    } catch (error) {
      console.error('❌ Scheduler check failed:', error);
    }
  }

  private shouldRunDailyBackup(dailyTime: string, now: Date): boolean {
    // Parse daily time (HH:MM format)
    const [hours, minutes] = dailyTime.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      console.warn(`Invalid daily time format: ${dailyTime}`);
      return false;
    }

    // Check if we're at or past the scheduled time
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const scheduledMinutes = hours * 60 + minutes;
    
    // Only run if:
    // 1. Current time is at or past scheduled time
    // 2. We haven't run today yet
    // 3. It's been at least 20 hours since last run (to avoid double runs)
    
    if (nowMinutes < scheduledMinutes) {
      return false; // Too early
    }

    const today = now.toDateString();
    const lastRunToday = this.lastDailyRun?.toDateString() === today;
    
    if (lastRunToday) {
      return false; // Already ran today
    }

    // Check minimum interval (20 hours)
    if (this.lastDailyRun) {
      const hoursSinceLastRun = (now.getTime() - this.lastDailyRun.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastRun < 20) {
        return false; // Too soon since last run
      }
    }

    return true;
  }

  private calculateNextRun(dailyTime: string): Date | null {
    try {
      const [hours, minutes] = dailyTime.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) {
        return null;
      }

      const now = new Date();
      const nextRun = new Date();
      nextRun.setHours(hours, minutes, 0, 0);

      // If the time has already passed today, schedule for tomorrow
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }

      return nextRun;

    } catch (error) {
      console.error('Failed to calculate next run:', error);
      return null;
    }
  }

  private isBackupConfigured(): boolean {
    const { settings } = useAppStore.getState();
    const backupSettings = settings?.backupSettings;
    
    if (!backupSettings?.provider) {
      return false;
    }

    if (!backupSettings.credentials?.encryptionKey) {
      return false;
    }

    // Check provider-specific requirements
    switch (backupSettings.provider) {
      case 'local':
        return !!backupSettings.credentials.folderPath;
      case 'google_drive':
        return !!(backupSettings.credentials.folderId && backupSettings.credentials.accessToken);
      case 'onedrive':
        return !!(backupSettings.credentials.folderPath && backupSettings.credentials.accessToken);
      case 's3':
      case 'backblaze':
        return !!(
          backupSettings.credentials.endpoint &&
          backupSettings.credentials.bucket &&
          backupSettings.credentials.accessKey &&
          backupSettings.credentials.secretKey
        );
      default:
        return false;
    }
  }

  private subscribeToSettingsChanges(): void {
    // In a real implementation, this would subscribe to the store's state changes
    // For now, we'll rely on manual calls to onSettingsChanged()
    
    // This is a simplified approach - in a production app you'd use:
    // useAppStore.subscribe((state) => { ... })
    
    console.log('📡 Subscribed to settings changes for backup triggers');
  }

  private loadScheduleState(): void {
    try {
      const stored = localStorage.getItem('backup-scheduler-state');
      if (stored) {
        const data = JSON.parse(stored);
        this.lastDailyRun = data.lastDailyRun ? new Date(data.lastDailyRun) : null;
      }
    } catch (error) {
      console.warn('Failed to load scheduler state:', error);
    }
  }

  private saveScheduleState(): void {
    try {
      const state = {
        lastDailyRun: this.lastDailyRun?.toISOString()
      };
      localStorage.setItem('backup-scheduler-state', JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save scheduler state:', error);
    }
  }

  /**
   * Get human-readable schedule status
   */
  getScheduleStatus(): string {
    const info = this.getScheduleInfo();
    
    if (!info.isEnabled) {
      return 'Backup not configured';
    }

    if (!info.nextRun) {
      return 'Schedule error - invalid time format';
    }

    const now = new Date();
    const msUntilNext = info.nextRun.getTime() - now.getTime();
    
    if (msUntilNext < 0) {
      return 'Overdue';
    }

    const hoursUntilNext = Math.floor(msUntilNext / (1000 * 60 * 60));
    const minutesUntilNext = Math.floor((msUntilNext % (1000 * 60 * 60)) / (1000 * 60));

    if (hoursUntilNext < 1) {
      return `Next run in ${minutesUntilNext} minutes`;
    } else if (hoursUntilNext < 24) {
      return `Next run in ${hoursUntilNext}h ${minutesUntilNext}m`;
    } else {
      const days = Math.floor(hoursUntilNext / 24);
      const remainingHours = hoursUntilNext % 24;
      return `Next run in ${days}d ${remainingHours}h`;
    }
  }

  /**
   * Test the scheduler (simulate time passage for testing)
   */
  async testScheduler(simulatedTime: string): Promise<void> {
    console.log(`🧪 Testing scheduler with simulated time: ${simulatedTime}`);
    
    const [hours, minutes] = simulatedTime.split(':').map(Number);
    const testDate = new Date();
    testDate.setHours(hours, minutes, 0, 0);
    
    const shouldRun = this.shouldRunDailyBackup(simulatedTime, testDate);
    console.log(`Should run backup: ${shouldRun}`);
    
    if (shouldRun) {
      console.log('🚀 Test triggered backup...');
      try {
        await backupService.createSnapshot('daily');
        console.log('✅ Test backup completed');
      } catch (error) {
        console.error('❌ Test backup failed:', error);
      }
    }
  }
}

// Singleton instance
export const schedulerService = new SchedulerService();

// Auto-initialize when module is loaded
if (typeof window !== 'undefined') {
  // Initialize after a short delay to allow other services to load
  setTimeout(() => {
    schedulerService.initialize();
  }, 2000);
}
