/**
 * Offline Queue
 * Handles queuing operations when offline and replaying when online
 */

export interface QueuedOperation {
  id: string;
  endpoint: string;
  method: string;
  body?: any;
  timestamp: number;
  retryCount: number;
}

class OfflineQueue {
  private queue: QueuedOperation[] = [];
  private isOnline: boolean = navigator.onLine;
  private baseUrl: string = '';

  constructor() {
    this.loadQueue();
    this.setupEventListeners();
  }

  async enqueue(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const queuedOperation: QueuedOperation = {
      ...operation,
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(queuedOperation);
    this.saveQueue();

    console.log('Operation queued for offline processing:', queuedOperation);
  }

  async flush(baseUrl: string): Promise<void> {
    if (!this.isOnline || this.queue.length === 0) {
      return;
    }

    this.baseUrl = baseUrl;
    const operations = [...this.queue];
    this.queue = [];

    for (const operation of operations) {
      try {
        await this.executeOperation(operation);
        console.log('Queued operation executed successfully:', operation.id);
      } catch (error) {
        console.error('Failed to execute queued operation:', operation.id, error);
        
        // Retry logic
        if (operation.retryCount < 3) {
          operation.retryCount++;
          this.queue.push(operation);
        } else {
          console.error('Operation failed after 3 retries, removing from queue:', operation.id);
        }
      }
    }

    this.saveQueue();
  }

  private async executeOperation(operation: QueuedOperation): Promise<void> {
    const url = `${this.baseUrl}${operation.endpoint}`;
    
    const response = await fetch(url, {
      method: operation.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: operation.body ? JSON.stringify(operation.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('Connection restored, flushing queued operations...');
      if (this.baseUrl) {
        this.flush(this.baseUrl);
      }
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('Connection lost, operations will be queued');
    });
  }

  private loadQueue(): void {
    try {
      const stored = localStorage.getItem('offline-queue');
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load offline queue from storage:', error);
      this.queue = [];
    }
  }

  private saveQueue(): void {
    try {
      localStorage.setItem('offline-queue', JSON.stringify(this.queue));
    } catch (error) {
      console.warn('Failed to save offline queue to storage:', error);
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getQueue(): QueuedOperation[] {
    return [...this.queue];
  }

  clearQueue(): void {
    this.queue = [];
    this.saveQueue();
  }
}

// Singleton instance
const offlineQueue = new OfflineQueue();

export const enqueue = (operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>) => 
  offlineQueue.enqueue(operation);

export const flush = (baseUrl: string) => 
  offlineQueue.flush(baseUrl);

export const setupOnlineFlush = (baseUrl: string) => {
  offlineQueue.flush(baseUrl);
};

export const getQueueLength = () => 
  offlineQueue.getQueueLength();

export const getQueue = () => 
  offlineQueue.getQueue();

export const clearQueue = () => 
  offlineQueue.clearQueue();