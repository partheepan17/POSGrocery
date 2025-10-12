#!/usr/bin/env tsx
// Performance benchmark script for POS system
// Target: ≥500 invoices/day, ≥1,000 products, multiple concurrent tills

import { performance } from 'perf_hooks';
import { initDatabase, getDatabase } from '../server/dist/db/index.js';
import { 
  getProductByBarcode, 
  searchProducts, 
  performanceMonitor,
  clearCaches,
  initializePreparedStatements
} from '../server/dist/utils/performance.js';

interface BenchmarkResult {
  operation: string;
  p50: number;
  p95: number;
  p99: number;
  count: number;
  meetsTarget: boolean;
  target: number;
}

const TARGETS = {
  BARCODE_LOOKUP: 50,      // ms
  PRODUCT_SEARCH: 200,     // ms
  INVOICE_CREATE: 100,     // ms
  Z_REPORT: 500            // ms
};

async function runBenchmarks(): Promise<BenchmarkResult[]> {
  console.log('🚀 Starting POS Performance Benchmarks...\n');
  
  const results: BenchmarkResult[] = [];
  
  // Initialize database
  console.log('📊 Initializing database...');
  initDatabase();
  const db = getDatabase();
  console.log('✅ Database initialized');
  
  // Initialize prepared statements
  console.log('📊 Initializing prepared statements...');
  initializePreparedStatements();
  console.log('✅ Prepared statements initialized');
  
  // Clear any existing metrics
  performanceMonitor.clear();
  clearCaches();
  
  // Benchmark 1: Barcode Lookup (P95 ≤ 50ms)
  console.log('📊 Benchmarking barcode lookup...');
  await benchmarkBarcodeLookup();
  
  // Benchmark 2: Product Search (P95 ≤ 200ms)
  console.log('📊 Benchmarking product search...');
  await benchmarkProductSearch();
  
  // Benchmark 3: Invoice Creation (P95 ≤ 100ms)
  console.log('📊 Benchmarking invoice creation...');
  await benchmarkInvoiceCreation();
  
  // Benchmark 4: Z Report (P95 ≤ 500ms)
  console.log('📊 Benchmarking Z report...');
  await benchmarkZReport();
  
  // Collect results
  results.push(createResult('BARCODE_LOOKUP', TARGETS.BARCODE_LOOKUP));
  results.push(createResult('PRODUCT_SEARCH', TARGETS.PRODUCT_SEARCH));
  results.push(createResult('INVOICE_CREATE', TARGETS.INVOICE_CREATE));
  results.push(createResult('Z_REPORT', TARGETS.Z_REPORT));
  
  return results;
}

async function benchmarkBarcodeLookup(): Promise<void> {
  const db = getDatabase();
  
  // Get test barcodes
  const barcodes = db.prepare(`
    SELECT barcode FROM products 
    WHERE barcode IS NOT NULL 
    LIMIT 100
  `).all() as { barcode: string }[];
  
  if (barcodes.length === 0) {
    console.log('⚠️  No barcodes found, skipping barcode lookup benchmark');
    return;
  }
  
  // Warm up
  for (let i = 0; i < 10; i++) {
    const barcode = barcodes[i % barcodes.length].barcode;
    getProductByBarcode(barcode, 'benchmark');
  }
  
  // Benchmark
  for (let i = 0; i < 1000; i++) {
    const barcode = barcodes[i % barcodes.length].barcode;
    getProductByBarcode(barcode, 'benchmark');
  }
}

async function benchmarkProductSearch(): Promise<void> {
  const searchTerms = ['apple', 'milk', 'bread', 'rice', 'oil', 'sugar', 'salt', 'tea', 'coffee', 'water'];
  
  // Warm up
  for (let i = 0; i < 10; i++) {
    const term = searchTerms[i % searchTerms.length];
    searchProducts(term, 20, 'benchmark');
  }
  
  // Benchmark
  for (let i = 0; i < 500; i++) {
    const term = searchTerms[i % searchTerms.length];
    searchProducts(term, 20, 'benchmark');
  }
}

async function benchmarkInvoiceCreation(): Promise<void> {
  const db = getDatabase();
  
  // Get test products
  const products = db.prepare(`
    SELECT id, price_retail FROM products 
    WHERE is_active = 1 
    LIMIT 50
  `).all() as { id: number; price_retail: number }[];
  
  if (products.length === 0) {
    console.log('⚠️  No products found, skipping invoice creation benchmark');
    return;
  }
  
  // Create test invoices
  for (let i = 0; i < 100; i++) {
    const start = performance.now();
    
    const transaction = db.transaction(() => {
      // Generate receipt number
      const receiptNo = `BENCH-${Date.now()}-${i}`;
      
      // Create invoice using existing schema
      const createInvoice = db.prepare(`
        INSERT INTO invoices (
          receipt_no, customer_id, gross, discount, tax, net, cashier_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const invoiceResult = createInvoice.run(
        receiptNo,
        1, // customer_id
        100.00, // gross
        0.00,   // discount
        15.00,  // tax
        115.00, // net
        1       // cashier_id
      );
      
      const invoiceId = invoiceResult.lastInsertRowid;
      
      // Create invoice lines
      const createInvoiceLine = db.prepare(`
        INSERT INTO invoice_lines (
          invoice_id, product_id, qty, unit_price, total
        ) VALUES (?, ?, ?, ?, ?)
      `);
      
      // Add 2-6 random items
      const itemCount = Math.floor(Math.random() * 5) + 2;
      for (let j = 0; j < itemCount; j++) {
        const product = products[Math.floor(Math.random() * products.length)];
        const quantity = Math.floor(Math.random() * 5) + 1;
        
        createInvoiceLine.run(
          invoiceId,
          product.id,
          quantity,
          product.price_retail,
          product.price_retail * quantity
        );
      }
    });
    
    transaction();
    
    const duration = performance.now() - start;
    performanceMonitor.record({
      operation: 'INVOICE_CREATE',
      duration,
      success: true,
      requestId: 'benchmark'
    });
  }
}

async function benchmarkZReport(): Promise<void> {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];
  
  // Warm up
  for (let i = 0; i < 5; i++) {
    const start = performance.now();
    
        const zReport = db.prepare(`
          SELECT 
            COUNT(*) as invoice_count,
            COALESCE(SUM(net), 0) as total_sales,
            COALESCE(SUM(tax), 0) as total_tax
          FROM invoices 
          WHERE DATE(created_at) = ?
        `).get(today);
    
    const duration = performance.now() - start;
    performanceMonitor.record({
      operation: 'Z_REPORT',
      duration,
      success: true,
      requestId: 'benchmark'
    });
  }
  
  // Benchmark
  for (let i = 0; i < 50; i++) {
    const start = performance.now();
    
    const zReport = db.prepare(`
      SELECT 
        COUNT(*) as invoice_count,
        COALESCE(SUM(net), 0) as total_sales,
        COALESCE(SUM(tax), 0) as total_tax,
        COALESCE(SUM(net), 0) as cash_sales,
        0 as card_sales
      FROM invoices 
      WHERE DATE(created_at) = ?
    `).get(today);
    
    const duration = performance.now() - start;
    performanceMonitor.record({
      operation: 'Z_REPORT',
      duration,
      success: true,
      requestId: 'benchmark'
    });
  }
}

function createResult(operation: string, target: number): BenchmarkResult {
  const stats = performanceMonitor.getStats(operation);
  
  return {
    operation,
    p50: stats.p50,
    p95: stats.p95,
    p99: stats.p99,
    count: stats.count,
    meetsTarget: stats.p95 <= target,
    target
  };
}

function printResults(results: BenchmarkResult[]): void {
  console.log('\n📈 Benchmark Results:');
  console.log('='.repeat(80));
  console.log('Operation'.padEnd(20) + 'P50'.padEnd(10) + 'P95'.padEnd(10) + 'P99'.padEnd(10) + 'Target'.padEnd(10) + 'Status');
  console.log('-'.repeat(80));
  
  let allPassed = true;
  
  for (const result of results) {
    const status = result.meetsTarget ? '✅ PASS' : '❌ FAIL';
    if (!result.meetsTarget) allPassed = false;
    
    console.log(
      result.operation.padEnd(20) +
      `${result.p50.toFixed(1)}ms`.padEnd(10) +
      `${result.p95.toFixed(1)}ms`.padEnd(10) +
      `${result.p99.toFixed(1)}ms`.padEnd(10) +
      `${result.target}ms`.padEnd(10) +
      status
    );
  }
  
  console.log('='.repeat(80));
  console.log(`Overall Status: ${allPassed ? '✅ ALL TARGETS MET' : '❌ SOME TARGETS FAILED'}`);
  
  if (allPassed) {
    console.log('\n🎉 Performance benchmarks passed! System ready for production load.');
  } else {
    console.log('\n⚠️  Some performance targets not met. Review and optimize before production.');
  }
}

// Main execution
async function main() {
  try {
    console.log('🚀 Starting POS Performance Benchmarks...\n');
    
    const results = await runBenchmarks();
    printResults(results);
    
    // Exit with appropriate code
    const allPassed = results.every(r => r.meetsTarget);
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('benchmark.ts')) {
  main();
}

export { runBenchmarks, printResults };
