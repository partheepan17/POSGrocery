// Offline queue using IndexedDB for durability
interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body?: any;
  headers?: Record<string, string>;
  createdAt: number;
  retryCount: number;
  lastAttempt?: number;
}

class OfflineQueue {
  private dbName = 'pos-offline-queue';
  private dbVersion = 1;
  private storeName = 'requests';
  private db: IDBDatabase | null = null;
  private isOnline = navigator.onLine;
  private retryDelay = 1000; // Start with 1 second
  private maxRetries = 5;
  private isProcessing = false;

  constructor() {
    this.initDB();
    this.setupOnlineListener();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
          store.createIndex('retryCount', 'retryCount');
        }
      };
    });
  }

  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  async queueRequest(request: Omit<QueuedRequest, 'id' | 'createdAt' | 'retryCount'>): Promise<string> {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const queuedRequest: QueuedRequest = {
      ...request,
      id,
      createdAt: Date.now(),
      retryCount: 0
    };

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(queuedRequest);

      request.onsuccess = () => {
        resolve(id);
        if (this.isOnline) {
          this.processQueue();
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || !this.isOnline || !this.db) {
      return;
    }

    this.isProcessing = true;

    try {
      const requests = await this.getPendingRequests();
      
      for (const request of requests) {
        try {
          await this.executeRequest(request);
          await this.removeRequest(request.id);
        } catch (error) {
          console.error('Failed to execute queued request:', error);
          await this.incrementRetryCount(request.id);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async getPendingRequests(): Promise<QueuedRequest[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve([]);
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('retryCount');
      const request = index.getAll(IDBKeyRange.upperBound(this.maxRetries));

      request.onsuccess = () => {
        const requests = request.result as QueuedRequest[];
        // Sort by creation time, oldest first
        requests.sort((a, b) => a.createdAt - b.createdAt);
        resolve(requests);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  private async executeRequest(request: QueuedRequest): Promise<Response> {
    const headers = new Headers(request.headers);
    headers.set('Content-Type', 'application/json');
    headers.set('X-Request-ID', request.id);

    const response = await fetch(request.url, {
      method: request.method,
      headers,
      body: request.body ? JSON.stringify(request.body) : undefined
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  }

  private async removeRequest(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async incrementRetryCount(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const request = getRequest.result as QueuedRequest;
        if (request) {
          request.retryCount++;
          request.lastAttempt = Date.now();
          
          const putRequest = store.put(request);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async getQueueStatus(): Promise<{ count: number; oldestRequest?: number }> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve({ count: 0 });
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const countRequest = store.count();
      const getAllRequest = store.index('createdAt').getAll(IDBKeyRange.upperBound(Infinity), 1);

      let count = 0;
      let oldestRequest: number | undefined;

      countRequest.onsuccess = () => {
        count = countRequest.result;
      };

      getAllRequest.onsuccess = () => {
        const requests = getAllRequest.result as QueuedRequest[];
        oldestRequest = requests[0]?.createdAt;
      };

      const transactionComplete = () => {
        resolve({ count, oldestRequest });
      };

      transaction.oncomplete = transactionComplete;
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async clearQueue(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const offlineQueue = new OfflineQueue();

// Enhanced fetch with offline support
export async function fetchWithOffline(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  if (navigator.onLine) {
    try {
      return await fetch(url, options);
    } catch (error) {
      // Network error, queue the request
      await offlineQueue.queueRequest({
        url,
        method: options.method || 'GET',
        body: options.body,
        headers: options.headers as Record<string, string>
      });
      
      // Return a mock response for offline mode
      return new Response(JSON.stringify({
        ok: false,
        error: 'Request queued for offline processing',
        offline: true
      }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } else {
    // Offline, queue the request
    await offlineQueue.queueRequest({
      url,
      method: options.method || 'GET',
      body: options.body,
      headers: options.headers as Record<string, string>
    });
    
    // Return a mock response for offline mode
    return new Response(JSON.stringify({
      ok: false,
      error: 'Request queued for offline processing',
      offline: true
    }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}


