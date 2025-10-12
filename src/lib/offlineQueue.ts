import Dexie, { Table } from 'dexie';

export interface QueuedOperation {
  id: string;
  type: 'sale' | 'return' | 'inventory' | 'customer' | 'product';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  lastAttempt?: number;
}

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}

class OfflineQueueDatabase extends Dexie {
  operations!: Table<QueuedOperation>;

  constructor() {
    super('OfflineQueueDB');
    this.version(1).stores({
      operations: 'id, type, action, timestamp, retryCount, priority, status, lastAttempt'
    });
  }
}

const db = new OfflineQueueDatabase();

export class OfflineQueue {
  private isOnline: boolean = navigator.onLine;
  private retryIntervals: Map<string, NodeJS.Timeout> = new Map();
  private processingQueue: Set<string> = new Set();
  private listeners: Set<(stats: QueueStats) => void> = new Set();

  constructor() {
    this.setupOnlineListener();
    this.startProcessing();
  }

  private setupOnlineListener() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.startProcessing();
      this.notifyListeners();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.stopProcessing();
      this.notifyListeners();
    });
  }

  private async notifyListeners() {
    const stats = await this.getStats();
    this.listeners.forEach(listener => listener(stats));
  }

  // Add operation to queue
  async addOperation(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<string> {
    const id = `${operation.type}-${operation.action}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const queuedOperation: QueuedOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    await db.operations.add(queuedOperation);
    await this.notifyListeners();

    // Start processing if online
    if (this.isOnline) {
      this.processOperation(id);
    }

    return id;
  }

  // Process a specific operation
  private async processOperation(id: string) {
    if (this.processingQueue.has(id)) return;

    const operation = await db.operations.get(id);
    if (!operation || operation.status !== 'pending') return;

    this.processingQueue.add(id);
    
    try {
      // Update status to processing
      await db.operations.update(id, { 
        status: 'processing',
        lastAttempt: Date.now()
      });

      // Execute the operation
      const result = await this.executeOperation(operation);

      // Mark as completed
      await db.operations.update(id, { 
        status: 'completed',
        error: undefined
      });

      console.log(`Operation ${id} completed successfully`);
    } catch (error) {
      console.error(`Operation ${id} failed:`, error);
      
      const newRetryCount = operation.retryCount + 1;
      const shouldRetry = newRetryCount < operation.maxRetries;

      if (shouldRetry) {
        // Schedule retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, newRetryCount), 30000); // Max 30 seconds
        
        await db.operations.update(id, {
          status: 'pending',
          retryCount: newRetryCount,
          error: error instanceof Error ? error.message : String(error)
        });

        const timeoutId = setTimeout(() => {
          this.retryIntervals.delete(id);
          this.processOperation(id);
        }, delay);

        this.retryIntervals.set(id, timeoutId);
      } else {
        // Mark as failed
        await db.operations.update(id, {
          status: 'failed',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    } finally {
      this.processingQueue.delete(id);
      await this.notifyListeners();
    }
  }

  // Execute the actual operation
  private async executeOperation(operation: QueuedOperation): Promise<any> {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8250';
    
    let url = '';
    let method = '';
    let body = operation.data;

    // Determine API endpoint based on operation type and action
    switch (operation.type) {
      case 'sale':
        if (operation.action === 'create') {
          url = `${apiBaseUrl}/api/invoices`;
          method = 'POST';
        } else if (operation.action === 'update') {
          url = `${apiBaseUrl}/api/invoices/${operation.data.id}`;
          method = 'PUT';
        }
        break;
      case 'return':
        if (operation.action === 'create') {
          url = `${apiBaseUrl}/api/returns`;
          method = 'POST';
        }
        break;
      case 'inventory':
        if (operation.action === 'update') {
          url = `${apiBaseUrl}/api/inventory/${operation.data.id}`;
          method = 'PUT';
        }
        break;
      case 'customer':
        if (operation.action === 'create') {
          url = `${apiBaseUrl}/api/customers`;
          method = 'POST';
        } else if (operation.action === 'update') {
          url = `${apiBaseUrl}/api/customers/${operation.data.id}`;
          method = 'PUT';
        }
        break;
      case 'product':
        if (operation.action === 'create') {
          url = `${apiBaseUrl}/api/products`;
          method = 'POST';
        } else if (operation.action === 'update') {
          url = `${apiBaseUrl}/api/products/${operation.data.id}`;
          method = 'PUT';
        }
        break;
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }

    if (!url || !method) {
      throw new Error(`No API endpoint defined for ${operation.type}:${operation.action}`);
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  // Start processing queue
  private async startProcessing() {
    if (!this.isOnline) return;

    const pendingOperations = await db.operations
      .where('status')
      .equals('pending')
      .sortBy('priority');

    for (const operation of pendingOperations) {
      this.processOperation(operation.id);
    }
  }

  // Stop processing queue
  private stopProcessing() {
    this.retryIntervals.forEach(timeout => clearTimeout(timeout));
    this.retryIntervals.clear();
  }

  // Get queue statistics
  async getStats(): Promise<QueueStats> {
    const operations = await db.operations.toArray();
    
    const stats: QueueStats = {
      total: operations.length,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      byType: {},
      byPriority: {},
    };

    operations.forEach(op => {
      stats[op.status]++;
      stats.byType[op.type] = (stats.byType[op.type] || 0) + 1;
      stats.byPriority[op.priority] = (stats.byPriority[op.priority] || 0) + 1;
    });

    return stats;
  }

  // Get operations by status
  async getOperationsByStatus(status: QueuedOperation['status']): Promise<QueuedOperation[]> {
    return await db.operations.where('status').equals(status).toArray();
  }

  // Retry failed operations
  async retryFailedOperations(): Promise<void> {
    const failedOperations = await this.getOperationsByStatus('failed');
    
    for (const operation of failedOperations) {
      await db.operations.update(operation.id, {
        status: 'pending',
        retryCount: 0,
        error: undefined
      });
    }

    await this.notifyListeners();
    this.startProcessing();
  }

  // Clear completed operations
  async clearCompletedOperations(): Promise<void> {
    await db.operations.where('status').equals('completed').delete();
    await this.notifyListeners();
  }

  // Clear all operations
  async clearAllOperations(): Promise<void> {
    await db.operations.clear();
    await this.notifyListeners();
  }

  // Remove specific operation
  async removeOperation(id: string): Promise<void> {
    await db.operations.delete(id);
    await this.notifyListeners();
  }

  // Subscribe to queue changes
  subscribe(listener: (stats: QueueStats) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Get online status
  isOnlineStatus(): boolean {
    return this.isOnline;
  }

  // Manual retry of specific operation
  async retryOperation(id: string): Promise<void> {
    const operation = await db.operations.get(id);
    if (!operation) return;

    await db.operations.update(id, {
      status: 'pending',
      retryCount: 0,
      error: undefined
    });

    await this.notifyListeners();
    this.processOperation(id);
  }

  // Get operation by ID
  async getOperation(id: string): Promise<QueuedOperation | undefined> {
    return await db.operations.get(id);
  }

  // Update operation data
  async updateOperationData(id: string, data: any): Promise<void> {
    await db.operations.update(id, { data });
    await this.notifyListeners();
  }
}

// Global offline queue instance
export const offlineQueue = new OfflineQueue();

// Convenience functions for common operations
export const queueOperations = {
  // Queue a sale
  async queueSale(saleData: any, priority: 'high' | 'medium' | 'low' = 'high'): Promise<string> {
    return await offlineQueue.addOperation({
      type: 'sale',
      action: 'create',
      data: saleData,
      priority,
      maxRetries: 3,
    });
  },

  // Queue a return
  async queueReturn(returnData: any, priority: 'high' | 'medium' | 'low' = 'high'): Promise<string> {
    return await offlineQueue.addOperation({
      type: 'return',
      action: 'create',
      data: returnData,
      priority,
      maxRetries: 3,
    });
  },

  // Queue inventory update
  async queueInventoryUpdate(inventoryData: any, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<string> {
    return await offlineQueue.addOperation({
      type: 'inventory',
      action: 'update',
      data: inventoryData,
      priority,
      maxRetries: 5,
    });
  },

  // Queue customer update
  async queueCustomerUpdate(customerData: any, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<string> {
    return await offlineQueue.addOperation({
      type: 'customer',
      action: 'update',
      data: customerData,
      priority,
      maxRetries: 3,
    });
  },

  // Queue product update
  async queueProductUpdate(productData: any, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<string> {
    return await offlineQueue.addOperation({
      type: 'product',
      action: 'update',
      data: productData,
      priority,
      maxRetries: 3,
    });
  },
};

