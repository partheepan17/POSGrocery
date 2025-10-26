/**
 * Product Deletion Test Script
 * Tests FK constraints and deletion prevention
 */

const Database = require('better-sqlite3');
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'data', 'pos-grocery.db');

function runDeletionTests() {
  console.log('🧪 Product Deletion Tests');
  console.log('=========================');
  
  const db = new Database(dbPath);
  
  try {
    // Test 1: Create test product
    console.log('\n1. Creating test product...');
    const productResult = db.prepare(`
      INSERT INTO products (sku, name_en, price_retail, cost, is_active)
      VALUES (?, ?, ?, ?, ?)
    `).run('TEST-DELETE-001', 'Test Delete Product', 10.00, 5.00, 1);
    
    const productId = productResult.lastInsertRowid;
    console.log(`   ✅ Product created with ID: ${productId}`);
    
    // Test 2: Try to delete product without dependencies (should succeed)
    console.log('\n2. Testing deletion of product without dependencies...');
    try {
      const deleteResult = db.prepare('DELETE FROM products WHERE id = ?').run(productId);
      if (deleteResult.changes > 0) {
        console.log('   ✅ Product deleted successfully (no dependencies)');
      } else {
        console.log('   ❌ Product deletion failed');
      }
    } catch (error) {
      console.log(`   ❌ Error deleting product: ${error.message}`);
    }
    
    // Test 3: Create product with dependencies
    console.log('\n3. Creating product with dependencies...');
    const productResult2 = db.prepare(`
      INSERT INTO products (sku, name_en, price_retail, cost, is_active)
      VALUES (?, ?, ?, ?, ?)
    `).run('TEST-DELETE-002', 'Test Delete Product 2', 10.00, 5.00, 1);
    
    const productId2 = productResult2.lastInsertRowid;
    
    // Create test customer
    const customerResult = db.prepare(`
      INSERT INTO customers (customer_name, phone, email)
      VALUES (?, ?, ?, ?)
    `).run('Test Customer', '1234567890', 'test@example.com', new Date().toISOString());
    
    const customerId = customerResult.lastInsertRowid;
    
    // Create test invoice
    const invoiceResult = db.prepare(`
      INSERT INTO invoices (receipt_no, customer_id, cashier_id, gross, discount, tax, net, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('TEST-INV-001', customerId, 1, 1000, 0, 0, 1000, new Date().toISOString());
    
    const invoiceId = invoiceResult.lastInsertRowid;
    
    // Create sales record
    db.prepare(`
      INSERT INTO invoice_lines (invoice_id, product_id, qty, unit_price, total, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(invoiceId, productId2, 1, 10.00, 10.00, new Date().toISOString());
    
    console.log(`   ✅ Product created with sales dependency`);
    
    // Test 4: Try to delete product with sales (should fail)
    console.log('\n4. Testing deletion of product with sales...');
    try {
      const deleteResult = db.prepare('DELETE FROM products WHERE id = ?').run(productId2);
      console.log('   ❌ Product deletion should have failed but succeeded');
    } catch (error) {
      if (error.message.includes('Cannot delete product')) {
        console.log('   ✅ Product deletion correctly prevented (has sales)');
      } else {
        console.log(`   ❌ Unexpected error: ${error.message}`);
      }
    }
    
    // Test 5: Test soft delete
    console.log('\n5. Testing soft delete...');
    try {
      const softDeleteResult = db.prepare(`
        UPDATE products 
        SET deleted_at = ?, deleted_by = ?, updated_at = ?
        WHERE id = ? AND deleted_at IS NULL
      `).run(new Date().toISOString(), 1, new Date().toISOString(), productId2);
      
      if (softDeleteResult.changes > 0) {
        console.log('   ✅ Product soft deleted successfully');
        
        // Verify soft delete
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId2);
        if (product.deleted_at) {
          console.log('   ✅ Product is marked as deleted');
        } else {
          console.log('   ❌ Product is not marked as deleted');
        }
      } else {
        console.log('   ❌ Soft delete failed');
      }
    } catch (error) {
      console.log(`   ❌ Error during soft delete: ${error.message}`);
    }
    
    // Test 6: Test deletion status view
    console.log('\n6. Testing deletion status view...');
    try {
      const status = db.prepare(`
        SELECT * FROM v_product_deletion_status 
        WHERE id = ?
      `).get(productId2);
      
      if (status) {
        console.log(`   ✅ Deletion status: ${status.deletion_status}`);
        console.log(`   ✅ Sales count: ${status.sales_count}`);
        console.log(`   ✅ Movements count: ${status.movements_count}`);
      } else {
        console.log('   ❌ Deletion status not found');
      }
    } catch (error) {
      console.log(`   ❌ Error checking deletion status: ${error.message}`);
    }
    
    // Test 7: Test FK constraint triggers
    console.log('\n7. Testing FK constraint triggers...');
    try {
      // Create another product
      const productResult3 = db.prepare(`
        INSERT INTO products (sku, name_en, price_retail, cost, is_active)
        VALUES (?, ?, ?, ?, ?)
      `).run('TEST-DELETE-003', 'Test Delete Product 3', 10.00, 5.00, 1);
      
      const productId3 = productResult3.lastInsertRowid;
      
      // Create stock movement
      db.prepare(`
        INSERT INTO stock_movements (product_id, movement_type, quantity, reference_id, reference_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(productId3, 'purchase', 10, 1, 'grn', new Date().toISOString());
      
      // Try to delete product with movements
      try {
        const deleteResult = db.prepare('DELETE FROM products WHERE id = ?').run(productId3);
        console.log('   ❌ Product deletion should have failed but succeeded');
      } catch (error) {
        if (error.message.includes('Cannot delete product')) {
          console.log('   ✅ Product deletion correctly prevented (has movements)');
        } else {
          console.log(`   ❌ Unexpected error: ${error.message}`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Error testing FK constraints: ${error.message}`);
    }
    
    // Cleanup
    console.log('\n8. Cleaning up test data...');
    db.prepare('DELETE FROM invoice_lines WHERE invoice_id = ?').run(invoiceId);
    db.prepare('DELETE FROM invoices WHERE id = ?').run(invoiceId);
    db.prepare('DELETE FROM customers WHERE id = ?').run(customerId);
    db.prepare('DELETE FROM products WHERE id IN (?, ?)').run(productId2, productId3);
    console.log('   ✅ Test data cleaned up');
    
    console.log('\n🎯 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    db.close();
  }
}

// Run the tests
runDeletionTests();










