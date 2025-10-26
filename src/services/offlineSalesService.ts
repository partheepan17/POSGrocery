/**
 * Offline-Aware Sales Service
 * Handles sales with offline support and background sync
 */

import { dataService } from './dataService';
import { terminalService } from './terminalService';

interface SalePayload {
  customerId?: number;
  items: Array<{ 
    productId: number; 
    quantity: number; 
    unitPrice?: number; 
    lineDiscount?: number; 
    unit?: string; 
    nameEn?: string 
  }>;
  payments: Array<{ 
    method: string; 
    amount: number; 
    reference?: string;
  }>;
  cashierId?: number;
  shiftId?: number;
  terminalId?: number;
  terminalName?: string;
  idempotencyKey?: string;
}

interface QueuedSale {
  id: string;
  data: SalePayload;
  timestamp: number;
  retryCount: number;
}

class OfflineSalesService {
  private queuedSales: QueuedSale[] = [];
  private isOnline: boolean = navigator.onLine;

  constructor() {
    this.loadQueuedSales();
    this.setupOnlineOfflineListeners();
  }

  private loadQueuedSales() {
    const stored = localStorage.getItem('pos_queued_sales');
    if (stored) {
      try {
        this.queuedSales = JSON.parse(stored);
      } catch (error) {
        console.error('Failed to parse queued sales:', error);
        localStorage.removeItem('pos_queued_sales');
        this.queuedSales = [];
      }
    }
  }

  private saveQueuedSales() {
    localStorage.setItem('pos_queued_sales', JSON.stringify(this.queuedSales));
    
    // Notify service worker about queued sales count
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.active?.postMessage({
          type: 'QUEUED_SALES_UPDATE',
          count: this.queuedSales.length
        });
      });
    }
  }

  private setupOnlineOfflineListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncQueuedSales();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private async syncQueuedSales() {
    if (!this.isOnline || this.queuedSales.length === 0) return;

    console.log(`Syncing ${this.queuedSales.length} queued sales...`);

    const salesToProcess = [...this.queuedSales];
    
    for (const sale of salesToProcess) {
      try {
        const result = await dataService.createSaleWithIdempotency(sale.data);
        console.log('Successfully synced sale:', result?.receipt_no);
        
        // Remove from queue
        this.queuedSales = this.queuedSales.filter(s => s.id !== sale.id);
        this.saveQueuedSales();
      } catch (error) {
        console.error('Failed to sync sale:', error);
        
        // Increment retry count
        const saleIndex = this.queuedSales.findIndex(s => s.id === sale.id);
        if (saleIndex !== -1) {
          this.queuedSales[saleIndex].retryCount += 1;
          
          // Remove if too many retries
          if (this.queuedSales[saleIndex].retryCount > 5) {
            this.queuedSales.splice(saleIndex, 1);
            console.warn('Removed sale after too many retries:', sale.id);
          }
        }
        this.saveQueuedSales();
      }
    }
  }

  async createSale(payload: SalePayload): Promise<{ id: number; receipt_no: string; invoice: any; idempotency_key: string; queued: boolean }> {
    // Add terminal information if not provided
    const terminalData = terminalService.getTerminalData();
    const salePayload = {
      ...payload,
      terminalId: payload.terminalId || terminalData.terminalId || undefined,
      terminalName: payload.terminalName || terminalData.terminalName || undefined,
    };

    if (this.isOnline) {
      try {
        // Try to create sale online
        const result = await dataService.createSaleWithIdempotency(salePayload);
        return { ...result, queued: false } as any;
      } catch (error) {
        console.error('Online sale failed, queuing for offline sync:', error);
        // Fall through to queue the sale
      }
    }

    // Queue the sale for offline sync
    const queuedSale: QueuedSale = {
      id: `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      data: {
        ...salePayload,
        terminalId: Number(salePayload.terminalId) || undefined
      },
      timestamp: Date.now(),
      retryCount: 0
    };

    this.queuedSales.push(queuedSale);
    this.saveQueuedSales();

    // Return a mock result for queued sales
    return {
      id: 0, // Will be updated when synced
      receipt_no: `QUEUED-${queuedSale.id}`,
      invoice: null,
      idempotency_key: queuedSale.data.idempotencyKey || '',
      queued: true
    };
  }

  getQueuedSalesCount(): number {
    return this.queuedSales.length;
  }

  getQueuedSales(): QueuedSale[] {
    return [...this.queuedSales];
  }

  clearQueuedSales(): void {
    this.queuedSales = [];
    this.saveQueuedSales();
  }

  async retrySync(): Promise<void> {
    await this.syncQueuedSales();
  }

  isOnlineStatus(): boolean {
    return this.isOnline;
  }
}

export const offlineSalesService = new OfflineSalesService();


