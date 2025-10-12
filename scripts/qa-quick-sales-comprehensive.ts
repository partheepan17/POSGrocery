import { initDatabase, getDatabase } from '../server/dist/db/index.js';
import {
  ensureTodayQuickSalesOpen,
  addQuickSalesLine,
  getTodayQuickSalesSession,
  getQuickSalesLines,
  removeQuickSalesLine,
  closeTodayQuickSalesSession
} from '../server/dist/utils/quickSales.js';
import { rbacService } from '../server/dist/utils/rbac.js';

const mockRequestId = 'qa-quick-sales-comprehensive';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

class QuickSalesQA {
  private results: TestResult[] = [];
  private db: any = null;
  private sessionId: number | null = null;
  private invoiceId: number | null = null;
  private initialStock: Map<number, number> = new Map();

  constructor() {
    // Database will be initialized in setupTestData
  }

  private addResult(name: string, passed: boolean, error?: string, details?: any) {
    this.results.push({ name, passed, error, details });
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${name}`);
    if (error) console.log(`   Error: ${error}`);
    if (details) console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
  }

  private async setupTestData() {
    console.log('🔧 Setting up test data...');
    
    // Initialize database
    initDatabase();
    this.db = getDatabase();
    
    // Clear existing data
    this.db.prepare('PRAGMA foreign_keys = OFF').run();
    this.db.prepare('DELETE FROM quick_sales_lines').run();
    this.db.prepare('DELETE FROM quick_sales_sessions').run();
    this.db.prepare('DELETE FROM invoice_lines WHERE invoice_id IN (SELECT id FROM invoices WHERE receipt_no LIKE \'INV-%\')').run();
    this.db.prepare('DELETE FROM invoice_payments WHERE invoice_id IN (SELECT id FROM invoices WHERE receipt_no LIKE \'INV-%\')').run();
    this.db.prepare('DELETE FROM invoices WHERE receipt_no LIKE \'INV-%\'').run();
    this.db.prepare('DELETE FROM stock_movements').run();
    this.db.prepare('DELETE FROM users WHERE id IN (1, 2)').run();
    this.db.prepare('PRAGMA foreign_keys = ON').run();

    // Create test users
    const users = [
      { id: 1, username: 'cashier1', name: 'Test Cashier', role: 'cashier', is_active: true, pin: '1234' },
      { id: 2, username: 'manager1', name: 'Test Manager', role: 'manager', is_active: true, pin: '5678' }
    ];

    const insertUser = this.db.prepare(`
      INSERT OR REPLACE INTO users (id, username, name, role, is_active, pin)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const user of users) {
      insertUser.run(user.id, user.username, user.name, user.role, user.is_active ? 1 : 0, user.pin);
    }

    // Get products and record initial stock
    const products = this.db.prepare('SELECT id, sku, name_en, price_retail, stock_qty FROM products WHERE is_active = 1 LIMIT 5').all() as any[];
    for (const product of products) {
      this.initialStock.set(product.id, product.stock_qty || 0);
    }

    console.log(`✅ Setup complete: ${users.length} users, ${products.length} products`);
  }

  private getRBACContext(userId: number) {
    const user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    return {
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      },
      requestId: mockRequestId
    };
  }

  async runAllTests() {
    console.log('🧪 Starting Quick Sales Comprehensive QA Tests...\n');

    await this.setupTestData();

    // Test 1: Ensure open → add 3 lines → list → totals correct
    await this.testBasicFlow();

    // Test 2: Remove a line (PIN) → list shrinks; totals adjust
    await this.testLineRemoval();

    // Test 3: Close (PIN) → returns invoice_id; fetching the invoice shows one cash payment; Z includes it; stock moved
    await this.testSessionClose();

    // Test 4: Double close → CONFLICT
    await this.testDoubleClose();

    // Test 5: Close without PIN (if required) → PIN_REQUIRED
    await this.testCloseWithoutPin();

    // Test 6: Verify no stock or cash moves before close
    await this.testNoMovesBeforeClose();

    this.printSummary();
  }

  private async testBasicFlow() {
    console.log('\n📋 Test 1: Basic Flow (Ensure open → add 3 lines → list → totals correct)');
    
    try {
      // Ensure session is open
      const session = ensureTodayQuickSalesOpen(1, mockRequestId);
      this.sessionId = session.id;
      this.addResult('Session opened', true, undefined, { sessionId: session.id });

      // Add 3 lines
      const products = this.db.prepare('SELECT id, sku, name_en, price_retail FROM products WHERE is_active = 1 LIMIT 3').all() as any[];
      const context = this.getRBACContext(1); // Cashier context

      for (let i = 0; i < 3; i++) {
        const product = products[i];
        const line = addQuickSalesLine(product.id, i + 1, 0, 'pcs', mockRequestId, context);
        this.addResult(`Line ${i + 1} added`, true, undefined, { 
          productId: product.id, 
          sku: product.sku, 
          qty: i + 1,
          lineTotal: line.line_total
        });
      }

      // List lines and verify totals
      const linesResult = getQuickSalesLines(undefined, 10, mockRequestId);
      const expectedTotal = linesResult.lines.reduce((sum, line) => sum + line.line_total, 0);
      
      this.addResult('Lines retrieved', linesResult.lines.length === 3, undefined, {
        lineCount: linesResult.lines.length,
        expectedCount: 3,
        totalAmount: expectedTotal
      });

      // Verify session totals
      const sessionData = getTodayQuickSalesSession(mockRequestId);
      this.addResult('Session totals correct', 
        Math.abs(sessionData.total_amount - expectedTotal) < 0.01, 
        undefined, {
          sessionTotal: sessionData.total_amount,
          calculatedTotal: expectedTotal
        });

    } catch (error) {
      this.addResult('Basic flow test', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testLineRemoval() {
    console.log('\n📋 Test 2: Line Removal (Remove a line (PIN) → list shrinks; totals adjust)');
    
    try {
      const context = this.getRBACContext(2); // Manager context
      const linesResult = getQuickSalesLines(undefined, 10, mockRequestId);
      
      if (linesResult.lines.length === 0) {
        this.addResult('Line removal test', false, 'No lines to remove');
        return;
      }

      const lineToRemove = linesResult.lines[0];
      const initialTotal = linesResult.lines.reduce((sum, line) => sum + line.line_total, 0);
      
      // Remove line with PIN
      const removed = removeQuickSalesLine(lineToRemove.id, mockRequestId, context, '5678', 'QA test removal');
      this.addResult('Line removed with PIN', removed, undefined, { lineId: lineToRemove.id });

      // Verify list shrunk
      const newLinesResult = getQuickSalesLines(undefined, 10, mockRequestId);
      this.addResult('List shrunk after removal', 
        newLinesResult.lines.length === linesResult.lines.length - 1, 
        undefined, {
          beforeCount: linesResult.lines.length,
          afterCount: newLinesResult.lines.length
        });

      // Verify totals adjusted
      const newTotal = newLinesResult.lines.reduce((sum, line) => sum + line.line_total, 0);
      const expectedTotal = initialTotal - lineToRemove.line_total;
      
      this.addResult('Totals adjusted correctly', 
        Math.abs(newTotal - expectedTotal) < 0.01, 
        undefined, {
          beforeTotal: initialTotal,
          afterTotal: newTotal,
          expectedTotal: expectedTotal,
          removedAmount: lineToRemove.line_total
        });

    } catch (error) {
      this.addResult('Line removal test', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testSessionClose() {
    console.log('\n📋 Test 3: Session Close (Close (PIN) → returns invoice_id; fetching the invoice shows one cash payment; Z includes it; stock moved)');
    
    try {
      const context = this.getRBACContext(2); // Manager context
      
      // Close session
      const closeResult = closeTodayQuickSalesSession(1, 'QA test close', mockRequestId, context, '5678');
      this.invoiceId = closeResult.invoiceId;
      
      this.addResult('Session closed with PIN', true, undefined, {
        invoiceId: closeResult.invoiceId,
        receiptNo: closeResult.receiptNo,
        totals: closeResult.totals
      });

      // Verify invoice exists
      const invoice = this.db.prepare('SELECT * FROM invoices WHERE id = ?').get(closeResult.invoiceId) as any;
      this.addResult('Invoice created', !!invoice, undefined, {
        invoiceId: invoice?.id,
        receiptNo: invoice?.receipt_no,
        net: invoice?.net
      });

      // Verify one cash payment
      const payments = this.db.prepare('SELECT * FROM invoice_payments WHERE invoice_id = ?').all(closeResult.invoiceId) as any[];
      this.addResult('One cash payment created', 
        payments.length === 1 && payments[0].method === 'cash', 
        undefined, {
          paymentCount: payments.length,
          paymentMethod: payments[0]?.method,
          paymentAmount: payments[0]?.amount
        });

      // Verify payment amount matches invoice
      if (payments.length === 1) {
        this.addResult('Payment amount matches invoice', 
          Math.abs(payments[0].amount - invoice.net) < 0.01, 
          undefined, {
            paymentAmount: payments[0].amount,
            invoiceNet: invoice.net
          });
      }

      // Verify Z report includes it
      const zReport = this.db.prepare(`
        SELECT 
          COUNT(*) as invoice_count,
          COALESCE(SUM(net), 0) as total_sales,
          COALESCE(SUM(CASE WHEN meta LIKE '%"type":"quick-sale"%' THEN 1 ELSE 0 END), 0) as quick_sales_count,
          COALESCE(SUM(CASE WHEN meta LIKE '%"type":"quick-sale"%' THEN net ELSE 0 END), 0) as quick_sales_total
        FROM invoices
        WHERE DATE(created_at) = ?
      `).get(new Date().toISOString().split('T')[0]) as any;

      this.addResult('Z report includes Quick Sales', 
        zReport.quick_sales_count > 0 && zReport.quick_sales_total > 0, 
        undefined, {
          quickSalesCount: zReport.quick_sales_count,
          quickSalesTotal: zReport.quick_sales_total
        });

      // Verify stock moved
      const stockMovements = this.db.prepare(`
        SELECT sm.*, p.sku, p.name_en
        FROM stock_movements sm
        JOIN products p ON sm.product_id = p.id
        WHERE sm.reference_id = ? AND sm.reference_type = 'invoice'
      `).all(closeResult.invoiceId) as any[];

      this.addResult('Stock movements recorded', 
        stockMovements.length > 0, 
        undefined, {
          movementCount: stockMovements.length,
          movements: stockMovements.map(m => ({ sku: m.sku, qty: m.quantity }))
        });

    } catch (error) {
      this.addResult('Session close test', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testDoubleClose() {
    console.log('\n📋 Test 4: Double Close (Double close → CONFLICT)');
    
    try {
      const context = this.getRBACContext(2); // Manager context
      
      // Try to close again (should fail)
      try {
        closeTodayQuickSalesSession(1, 'Second close attempt', mockRequestId, context, '5678');
        this.addResult('Double close prevented', false, 'Expected CONFLICT error but close succeeded');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.addResult('Double close prevented', 
          errorMessage.includes('CONFLICT') || errorMessage.includes('closed'), 
          undefined, { error: errorMessage });
      }

    } catch (error) {
      this.addResult('Double close test', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testCloseWithoutPin() {
    console.log('\n📋 Test 5: Close Without PIN (Close without PIN (if required) → PIN_REQUIRED)');
    
    try {
      // Create a new session for this test
      const newSession = ensureTodayQuickSalesOpen(1, mockRequestId);
      const context = this.getRBACContext(1); // Cashier context (no close permission)
      
      // Try to close without PIN (should fail)
      try {
        closeTodayQuickSalesSession(1, 'No PIN test', mockRequestId, context, '');
        this.addResult('Close without PIN prevented', false, 'Expected PIN_REQUIRED error but close succeeded');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.addResult('Close without PIN prevented', 
          errorMessage.includes('PIN_REQUIRED') || errorMessage.includes('FORBIDDEN'), 
          undefined, { error: errorMessage });
      }

    } catch (error) {
      this.addResult('Close without PIN test', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testNoMovesBeforeClose() {
    console.log('\n📋 Test 6: No Moves Before Close (Verify no stock or cash moves before close)');
    
    try {
      // Create a new session
      const newSession = ensureTodayQuickSalesOpen(1, mockRequestId);
      const context = this.getRBACContext(1); // Cashier context
      
      // Add some lines
      const products = this.db.prepare('SELECT id, sku, name_en, price_retail FROM products WHERE is_active = 1 LIMIT 2').all() as any[];
      for (const product of products) {
        addQuickSalesLine(product.id, 1, 0, 'pcs', mockRequestId, context);
      }

      // Check that no stock movements occurred
      const stockMovementsBefore = this.db.prepare(`
        SELECT COUNT(*) as count FROM stock_movements 
        WHERE reference_type = 'invoice' AND created_at > ?
      `).get(new Date(Date.now() - 60000).toISOString()) as { count: number };

      this.addResult('No stock moves before close', 
        stockMovementsBefore.count === 0, 
        undefined, {
          stockMovementsCount: stockMovementsBefore.count
        });

      // Check that no payments occurred
      const paymentsBefore = this.db.prepare(`
        SELECT COUNT(*) as count FROM invoice_payments 
        WHERE created_at > ?
      `).get(new Date(Date.now() - 60000).toISOString()) as { count: number };

      this.addResult('No payments before close', 
        paymentsBefore.count === 0, 
        undefined, {
          paymentsCount: paymentsBefore.count
        });

      // Check that no invoices were created
      const invoicesBefore = this.db.prepare(`
        SELECT COUNT(*) as count FROM invoices 
        WHERE created_at > ? AND receipt_no LIKE 'INV-%'
      `).get(new Date(Date.now() - 60000).toISOString()) as { count: number };

      this.addResult('No invoices before close', 
        invoicesBefore.count === 0, 
        undefined, {
          invoicesCount: invoicesBefore.count
        });

    } catch (error) {
      this.addResult('No moves before close test', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private printSummary() {
    console.log('\n📊 QA Test Summary');
    console.log('='.repeat(50));
    
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const percentage = Math.round((passed / total) * 100);
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Success Rate: ${percentage}%`);
    
    if (total - passed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => !r.passed).forEach(result => {
        console.log(`  - ${result.name}: ${result.error}`);
      });
    }
    
    console.log('\n🎯 Quick Sales QA Status:');
    if (percentage === 100) {
      console.log('✅ ALL TESTS PASSED - System ready for production!');
    } else if (percentage >= 80) {
      console.log('⚠️  MOSTLY PASSED - Review failed tests before production');
    } else {
      console.log('❌ MULTIPLE FAILURES - System needs fixes before production');
    }
  }
}

// Run the comprehensive QA test
async function runQuickSalesQA() {
  const qa = new QuickSalesQA();
  await qa.runAllTests();
}

if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('qa-quick-sales-comprehensive.ts')) {
  runQuickSalesQA();
}
