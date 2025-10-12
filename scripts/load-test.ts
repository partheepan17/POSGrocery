#!/usr/bin/env tsx
// Load test script simulating multiple concurrent tills
// Target: 3 concurrent tills posting 1 invoice/sec for 2 minutes

import { performance } from 'perf_hooks';
import { initDatabase, getDatabase } from '../server/dist/db/index.js';
import { 
  getProductByBarcode, 
  searchProducts,
  performanceMonitor,
  clearCaches,
  initializePreparedStatements
} from '../server/dist/utils/performance.js';

interface TillSimulation {
  id: number;
  isRunning: boolean;
  invoicesCreated: number;
  errors: number;
  startTime: number;
  endTime?: number;
}

class LoadTester {
  private tills: TillSimulation[] = [];
  private db: any;
  private products: { id: number; barcode: string; price_retail: number }[] = [];
  private isRunning = false;
  private results: any[] = [];

  constructor(private tillCount: number = 3, private durationMs: number = 120000) {
    this.initializeDatabase();
    this.initializeProducts();
  }

  private initializeDatabase(): void {
    initDatabase();
    this.db = getDatabase();
    initializePreparedStatements();
  }

  private initializeProducts(): void {
    this.products = this.db.prepare(`
      SELECT id, barcode, price_retail 
      FROM products 
      WHERE barcode IS NOT NULL AND is_active = 1
      LIMIT 100
    `).all() as { id: number; barcode: string; price_retail: number }[];

    if (this.products.length === 0) {
      throw new Error('No products found for load testing');
    }
  }

  async startLoadTest(): Promise<void> {
    console.log(`🚀 Starting load test: ${this.tillCount} tills for ${this.durationMs / 1000}s`);
    console.log(`📊 Target: 1 invoice/sec per till = ${this.tillCount} invoices/sec total\n`);

    // Clear previous metrics
    performanceMonitor.clear();
    clearCaches();

    // Initialize tills
    this.tills = Array.from({ length: this.tillCount }, (_, i) => ({
      id: i + 1,
      isRunning: false,
      invoicesCreated: 0,
      errors: 0,
      startTime: 0
    }));

    this.isRunning = true;
    const startTime = Date.now();

    // Start all tills
    const tillPromises = this.tills.map(till => this.runTill(till));

    // Monitor progress
    const monitorInterval = setInterval(() => {
      this.printProgress();
    }, 5000);

    try {
      // Wait for all tills to complete
      await Promise.all(tillPromises);
    } finally {
      clearInterval(monitorInterval);
      this.isRunning = false;
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    this.printFinalResults(totalDuration);
  }

  private async runTill(till: TillSimulation): Promise<void> {
    till.isRunning = true;
    till.startTime = Date.now();

    const endTime = till.startTime + this.durationMs;

    while (Date.now() < endTime && this.isRunning) {
      try {
        await this.createInvoice(till);
        till.invoicesCreated++;
        
        // Target: 1 invoice per second
        await this.sleep(1000);
      } catch (error) {
        till.errors++;
        console.error(`Till ${till.id} error:`, error);
        
        // Brief pause on error
        await this.sleep(100);
      }
    }

    till.isRunning = false;
    till.endTime = Date.now();
  }

  private async createInvoice(till: TillSimulation): Promise<void> {
    const start = performance.now();

    // Generate random invoice
    const itemCount = Math.floor(Math.random() * 5) + 2; // 2-6 items
    const items = [];
    let subtotal = 0;

    for (let i = 0; i < itemCount; i++) {
      const product = this.products[Math.floor(Math.random() * this.products.length)];
      const quantity = Math.floor(Math.random() * 5) + 1;
      const lineTotal = product.price_retail * quantity;
      
      items.push({
        productId: product.id,
        quantity,
        unitPrice: product.price_retail,
        totalPrice: lineTotal
      });
      
      subtotal += lineTotal;
    }

    const taxAmount = subtotal * 0.15; // 15% tax
    const totalAmount = subtotal + taxAmount;

    // Create invoice in transaction using existing schema
    const transaction = this.db.transaction(() => {
      const receiptNo = `LOAD-${till.id}-${Date.now()}`;
      
      // Create invoice
      const createInvoice = this.db.prepare(`
        INSERT INTO invoices (
          receipt_no, customer_id, gross, discount, tax, net, cashier_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const invoiceResult = createInvoice.run(
        receiptNo,
        1, // customer_id
        subtotal,
        0, // discount
        taxAmount,
        totalAmount,
        1 // cashier_id - use actual user ID
      );
      
      const invoiceId = invoiceResult.lastInsertRowid;
      
      // Create invoice lines
      const createInvoiceLine = this.db.prepare(`
        INSERT INTO invoice_lines (
          invoice_id, product_id, qty, unit_price, total
        ) VALUES (?, ?, ?, ?, ?)
      `);
      
      for (const item of items) {
        createInvoiceLine.run(
          invoiceId,
          item.productId,
          item.quantity,
          item.unitPrice,
          item.totalPrice
        );
      }
    });

    transaction();

    const duration = performance.now() - start;
    performanceMonitor.record({
      operation: 'INVOICE_CREATE',
      duration,
      success: true,
      requestId: `load-test-${till.id}`
    });
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private printProgress(): void {
    const runningTills = this.tills.filter(t => t.isRunning).length;
    const totalInvoices = this.tills.reduce((sum, t) => sum + t.invoicesCreated, 0);
    const totalErrors = this.tills.reduce((sum, t) => sum + t.errors, 0);
    
    const elapsed = (Date.now() - this.tills[0].startTime) / 1000;
    const rate = totalInvoices / elapsed;
    
    console.log(`⏱️  ${elapsed.toFixed(0)}s | Tills: ${runningTills}/${this.tillCount} | Invoices: ${totalInvoices} | Rate: ${rate.toFixed(1)}/s | Errors: ${totalErrors}`);
  }

  private printFinalResults(totalDuration: number): void {
    console.log('\n📊 Load Test Results:');
    console.log('='.repeat(80));
    
    const totalInvoices = this.tills.reduce((sum, t) => sum + t.invoicesCreated, 0);
    const totalErrors = this.tills.reduce((sum, t) => sum + t.errors, 0);
    const avgRate = totalInvoices / (totalDuration / 1000);
    
    console.log(`Duration: ${(totalDuration / 1000).toFixed(1)}s`);
    console.log(`Total Invoices: ${totalInvoices}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Average Rate: ${avgRate.toFixed(1)} invoices/sec`);
    console.log(`Target Rate: ${this.tillCount} invoices/sec`);
    console.log(`Success Rate: ${((totalInvoices - totalErrors) / totalInvoices * 100).toFixed(1)}%`);
    
    console.log('\nPer-Till Results:');
    console.log('-'.repeat(40));
    for (const till of this.tills) {
      const duration = (till.endTime! - till.startTime) / 1000;
      const rate = till.invoicesCreated / duration;
      console.log(`Till ${till.id}: ${till.invoicesCreated} invoices, ${till.errors} errors, ${rate.toFixed(1)}/s`);
    }
    
    // Performance metrics
    console.log('\nPerformance Metrics:');
    console.log('-'.repeat(40));
    const invoiceStats = performanceMonitor.getStats('INVOICE_CREATE');
    console.log(`Invoice Creation P95: ${invoiceStats.p95.toFixed(1)}ms`);
    console.log(`Invoice Creation P99: ${invoiceStats.p99.toFixed(1)}ms`);
    
    // Check if targets were met
    const targetMet = avgRate >= this.tillCount * 0.9; // 90% of target
    const errorRate = totalErrors / totalInvoices;
    const lowErrorRate = errorRate < 0.01; // Less than 1% errors
    
    console.log('\n' + '='.repeat(80));
    console.log(`Load Test Status: ${targetMet && lowErrorRate ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (!targetMet) {
      console.log(`❌ Rate target not met: ${avgRate.toFixed(1)}/s < ${this.tillCount}/s`);
    }
    if (!lowErrorRate) {
      console.log(`❌ Error rate too high: ${(errorRate * 100).toFixed(1)}% > 1%`);
    }
  }
}

// Main execution
async function main() {
  try {
    const tillCount = parseInt(process.argv[2]) || 3;
    const duration = parseInt(process.argv[3]) || 120; // seconds
    
    const loadTester = new LoadTester(tillCount, duration * 1000);
    await loadTester.startLoadTest();
    
  } catch (error) {
    console.error('❌ Load test failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('load-test.ts')) {
  main();
}

export { LoadTester };
