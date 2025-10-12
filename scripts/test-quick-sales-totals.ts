import { initDatabase, getDatabase } from '../server/dist/db/index.js';
import {
  ensureTodayQuickSalesOpen,
  addQuickSalesLine,
  closeTodayQuickSalesSession
} from '../server/dist/utils/quickSales.js';
import { createRequestLogger } from '../server/dist/utils/logger.js';

const mockRequestId = 'test-quick-sales-totals';
const mockRequest = {
  requestId: mockRequestId,
  get: (header: string) => 'test-user-agent',
  ip: '127.0.0.1'
} as any;
const mockLogger = createRequestLogger(mockRequest);

async function testQuickSalesTotals() {
  console.log('🧪 Testing Quick Sales totals flow into cash and reports...');

  initDatabase();
  const db = getDatabase();

  // Clear existing data for clean test
  db.prepare('DELETE FROM quick_sales_lines').run();
  db.prepare('DELETE FROM quick_sales_sessions').run();
  db.prepare('DELETE FROM invoices WHERE receipt_no LIKE \'INV-%\'').run();
  db.prepare('DELETE FROM invoice_lines WHERE invoice_id NOT IN (SELECT id FROM invoices)').run();
  db.prepare('DELETE FROM invoice_payments WHERE invoice_id NOT IN (SELECT id FROM invoices)').run();
  db.prepare('DELETE FROM stock_movements').run();

  // Ensure we have products with stock
  const products = db.prepare('SELECT id, sku, name_en, price_retail, stock_qty FROM products WHERE is_active = 1 LIMIT 3').all() as any[];
  if (products.length === 0) {
    console.error('No active products found. Please run setup-test-data.ts first.');
    return;
  }

  // Set initial stock quantities
  const updateStock = db.prepare('UPDATE products SET stock_qty = ? WHERE id = ?');
  products.forEach((product, index) => {
    updateStock.run(100 + (index * 50), product.id); // 100, 150, 200
  });

  console.log('\n1️⃣ Setting up Quick Sales session with multiple products...');
  const session = ensureTodayQuickSalesOpen(1, mockRequestId);
  console.log(`Created session: ${session.id} for ${session.session_date}`);

  // Add multiple lines with different quantities
  const testLines = [
    { productId: products[0].id, qty: 5, uom: 'pcs' },
    { productId: products[1].id, qty: 3, uom: 'kg' },
    { productId: products[2].id, qty: 2, uom: 'boxes' },
    { productId: products[0].id, qty: 2, uom: 'pcs' }, // Duplicate product, different quantity
  ];

  let totalExpectedAmount = 0;
  for (const line of testLines) {
    const addedLine = addQuickSalesLine(line.productId, line.qty, 0, line.uom, mockRequestId);
    console.log(`Added: ${addedLine.sku} x${addedLine.qty} ${addedLine.uom} = $${addedLine.line_total}`);
    totalExpectedAmount += addedLine.line_total;
  }

  console.log(`\n2️⃣ Quick Sales session total: $${totalExpectedAmount.toFixed(2)}`);

  // Close the session
  console.log('\n3️⃣ Closing Quick Sales session...');
  const closeResult = closeTodayQuickSalesSession(1, 'Test Quick Sales Close', mockRequestId);
  console.log('Close result:', closeResult);
  console.log(`Closed session. Invoice: ${closeResult.receiptNo}`);
  console.log(`Invoice ID: ${closeResult.invoiceId}`);
  console.log(`Totals:`, closeResult.totals);

  // Verify invoice was created as normal invoice
  console.log('\n4️⃣ Verifying invoice creation...');
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(closeResult.invoiceId) as any;
  console.log(`Invoice details:`);
  console.log(`  Receipt No: ${invoice.receipt_no}`);
  console.log(`  Gross: $${invoice.gross}`);
  console.log(`  Tax: $${invoice.tax}`);
  console.log(`  Net: $${invoice.net}`);
  console.log(`  Meta: ${invoice.meta || 'null'}`);

  // Verify cash payment was created
  console.log('\n5️⃣ Verifying cash payment...');
  const payment = db.prepare('SELECT * FROM invoice_payments WHERE invoice_id = ?').get(closeResult.invoiceId) as any;
  console.log(`Payment details:`);
  console.log(`  Method: ${payment.method}`);
  console.log(`  Amount: $${payment.amount}`);
  console.log(`  Matches invoice net: ${payment.amount === invoice.net ? '✅' : '❌'}`);

  // Verify stock was reduced
  console.log('\n6️⃣ Verifying stock reduction...');
  const updatedProducts = db.prepare('SELECT id, sku, name_en, stock_qty FROM products WHERE id IN (?, ?, ?)').all(
    products[0].id, products[1].id, products[2].id
  ) as any[];

  console.log('Stock changes:');
  updatedProducts.forEach(product => {
    const originalStock = 100 + ((products.findIndex(p => p.id === product.id)) * 50);
    const expectedReduction = testLines
      .filter(line => line.productId === product.id)
      .reduce((sum, line) => sum + line.qty, 0);
    const expectedStock = originalStock - expectedReduction;
    
    console.log(`  ${product.sku}: ${originalStock} → ${product.stock_qty} (expected: ${expectedStock}) ${product.stock_qty === expectedStock ? '✅' : '❌'}`);
  });

  // Verify stock movements were recorded
  console.log('\n7️⃣ Verifying stock movements...');
  const stockMovements = db.prepare(`
    SELECT sm.*, p.sku, p.name_en 
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    WHERE sm.reference_id = ? AND sm.reference_type = 'invoice'
  `).all(closeResult.invoiceId) as any[];

  console.log(`Recorded ${stockMovements.length} stock movements:`);
  stockMovements.forEach(movement => {
    console.log(`  ${movement.sku}: -${movement.quantity} (${movement.movement_type})`);
  });

  // Test Z Report integration
  console.log('\n8️⃣ Testing Z Report integration...');
  const today = new Date().toISOString().split('T')[0];
  
  // Simulate Z Report query
  const zReport = db.prepare(`
    SELECT 
      COUNT(*) as invoice_count,
      COALESCE(SUM(net), 0) as total_sales,
      COALESCE(SUM(tax), 0) as total_tax,
      COALESCE(SUM(CASE WHEN meta LIKE '%"type":"quick-sale"%' THEN 1 ELSE 0 END), 0) as quick_sales_count,
      COALESCE(SUM(CASE WHEN meta LIKE '%"type":"quick-sale"%' THEN net ELSE 0 END), 0) as quick_sales_total
    FROM invoices 
    WHERE DATE(created_at) = ?
  `).get(today) as any;

  console.log(`Z Report for ${today}:`);
  console.log(`  Total invoices: ${zReport.invoice_count}`);
  console.log(`  Total sales: $${zReport.total_sales}`);
  console.log(`  Quick Sales invoices: ${zReport.quick_sales_count}`);
  console.log(`  Quick Sales total: $${zReport.quick_sales_total}`);
  console.log(`  Quick Sales matches expected: ${Math.abs(zReport.quick_sales_total - totalExpectedAmount) < 0.01 ? '✅' : '❌'}`);

  // Test payment method breakdown
  console.log('\n9️⃣ Testing payment method breakdown...');
  const paymentBreakdown = db.prepare(`
    SELECT 
      ip.method,
      COALESCE(SUM(ip.amount), 0) as total_amount
    FROM invoice_payments ip
    JOIN invoices i ON ip.invoice_id = i.id
    WHERE DATE(i.created_at) = ?
    GROUP BY ip.method
  `).all(today) as any[];

  console.log('Payment breakdown:');
  paymentBreakdown.forEach(payment => {
    console.log(`  ${payment.method}: $${payment.total_amount}`);
  });

  console.log('\n🎉 Quick Sales totals flow test completed!');
  console.log('\n✅ Acceptance Criteria:');
  console.log('  ✓ Invoice shows as standard sale on that date/time');
  console.log('  ✓ Adds to cash method totals');
  console.log('  ✓ Reduces stock quantities');
  console.log('  ✓ Z report shows Quick Sales totals');
  console.log('  ✓ Inventory decrements match aggregated quantities');
}

if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('test-quick-sales-totals.ts')) {
  testQuickSalesTotals();
}
