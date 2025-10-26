/**
 * Performance Index Testing Script
 * Tests EXPLAIN plans for critical report queries before and after index creation
 */

const Database = require('better-sqlite3');
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'data', 'pos-grocery.db');

// Test queries for performance analysis
const testQueries = [
  {
    name: 'Stock Movements by Product and Date',
    query: `
      SELECT sm.*, p.name_en, p.sku
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      WHERE sm.product_id = 1 
        AND sm.created_at >= '2024-01-01'
        AND sm.created_at <= '2024-12-31'
      ORDER BY sm.created_at DESC
    `,
    description: 'Critical for stock ledger and product movement history'
  },
  {
    name: 'Sales by Date Range',
    query: `
      SELECT i.*, c.customer_name, u.username as cashier_name
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN users u ON i.cashier_id = u.id
      WHERE i.created_at >= '2024-01-01'
        AND i.created_at <= '2024-12-31'
      ORDER BY i.created_at DESC
    `,
    description: 'Critical for sales reports and date-based analysis'
  },
  {
    name: 'Product Sales Analysis',
    query: `
      SELECT il.product_id, p.name_en, p.sku,
             SUM(il.qty) as total_qty,
             SUM(il.total) as total_revenue,
             AVG(il.unit_price) as avg_price
      FROM invoice_lines il
      JOIN products p ON il.product_id = p.id
      WHERE il.created_at >= '2024-01-01'
        AND il.created_at <= '2024-12-31'
      GROUP BY il.product_id, p.name_en, p.sku
      ORDER BY total_revenue DESC
    `,
    description: 'Critical for product sales analysis and COGS calculations'
  },
  {
    name: 'Product Search by Barcode',
    query: `
      SELECT * FROM products 
      WHERE barcode = '1234567890123'
        AND is_active = 1
    `,
    description: 'Critical for POS barcode scanning performance'
  },
  {
    name: 'Product Search by Name',
    query: `
      SELECT * FROM products 
      WHERE name_en LIKE '%Coca%'
        AND is_active = 1
      ORDER BY name_en
    `,
    description: 'Critical for product search and autocomplete'
  },
  {
    name: 'Stock Movements with Movement Type',
    query: `
      SELECT sm.*, p.name_en
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      WHERE sm.movement_type = 'sale'
        AND sm.created_at >= '2024-01-01'
      ORDER BY sm.created_at DESC
    `,
    description: 'Critical for movement type filtering and analysis'
  },
  {
    name: 'Cashier Performance Report',
    query: `
      SELECT u.username, u.name,
             COUNT(*) as total_sales,
             SUM(i.net) as total_revenue,
             AVG(i.net) as avg_sale_amount
      FROM invoices i
      JOIN users u ON i.cashier_id = u.id
      WHERE i.created_at >= '2024-01-01'
        AND i.created_at <= '2024-12-31'
      GROUP BY u.id, u.username, u.name
      ORDER BY total_revenue DESC
    `,
    description: 'Critical for cashier performance analysis'
  },
  {
    name: 'Customer Analysis',
    query: `
      SELECT c.customer_name,
             COUNT(*) as total_purchases,
             SUM(i.net) as total_spent,
             AVG(i.net) as avg_purchase
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.created_at >= '2024-01-01'
        AND i.created_at <= '2024-12-31'
      GROUP BY c.id, c.customer_name
      ORDER BY total_spent DESC
    `,
    description: 'Critical for customer analysis and segmentation'
  },
  {
    name: 'Product Category Analysis',
    query: `
      SELECT cat.name as category_name,
             COUNT(DISTINCT p.id) as product_count,
             COUNT(il.id) as sales_count,
             SUM(il.qty) as total_qty_sold,
             SUM(il.total) as total_revenue
      FROM invoice_lines il
      JOIN products p ON il.product_id = p.id
      JOIN categories cat ON p.category_id = cat.id
      WHERE il.created_at >= '2024-01-01'
        AND il.created_at <= '2024-12-31'
      GROUP BY cat.id, cat.name
      ORDER BY total_revenue DESC
    `,
    description: 'Critical for category performance analysis'
  },
  {
    name: 'Scale Items Report',
    query: `
      SELECT p.name_en, p.sku, p.unit,
             SUM(il.qty) as total_qty_sold,
             SUM(il.total) as total_revenue
      FROM invoice_lines il
      JOIN products p ON il.product_id = p.id
      WHERE p.is_scale_item = 1
        AND il.created_at >= '2024-01-01'
        AND il.created_at <= '2024-12-31'
      GROUP BY p.id, p.name_en, p.sku, p.unit
      ORDER BY total_qty_sold DESC
    `,
    description: 'Critical for scale items analysis'
  }
];

function runExplainPlan(db, query, queryName) {
  console.log(`\n=== EXPLAIN PLAN: ${queryName} ===`);
  console.log('Query:', query.replace(/\s+/g, ' ').trim());
  console.log('\nExecution Plan:');
  
  try {
    const explainQuery = `EXPLAIN QUERY PLAN ${query}`;
    const plan = db.prepare(explainQuery).all();
    
    plan.forEach((row, index) => {
      console.log(`${index + 1}. ${row.detail}`);
    });
    
    // Get query execution time
    const start = Date.now();
    const result = db.prepare(query).all();
    const end = Date.now();
    const executionTime = end - start;
    
    console.log(`\nExecution Time: ${executionTime}ms`);
    console.log(`Rows Returned: ${result.length}`);
    
    return {
      queryName,
      executionTime,
      rowCount: result.length,
      plan: plan.map(row => row.detail)
    };
    
  } catch (error) {
    console.error(`Error executing query: ${error.message}`);
    return {
      queryName,
      error: error.message,
      executionTime: null,
      rowCount: 0,
      plan: []
    };
  }
}

function testPerformance() {
  console.log('🚀 Performance Index Testing');
  console.log('============================');
  
  // Check if database exists
  const fs = require('fs');
  if (!fs.existsSync(dbPath)) {
    console.error(`Database not found at: ${dbPath}`);
    console.log('Please ensure the database exists and run migrations first.');
    return;
  }
  
  const db = new Database(dbPath);
  
  console.log('\n📊 Running EXPLAIN plans for critical report queries...');
  
  const results = [];
  
  // Run all test queries
  testQueries.forEach((testQuery, index) => {
    console.log(`\n${index + 1}. Testing: ${testQuery.name}`);
    console.log(`Description: ${testQuery.description}`);
    
    const result = runExplainPlan(db, testQuery.query, testQuery.name);
    results.push(result);
  });
  
  // Summary
  console.log('\n📈 PERFORMANCE SUMMARY');
  console.log('======================');
  
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.queryName}`);
    if (result.error) {
      console.log(`   ❌ Error: ${result.error}`);
    } else {
      console.log(`   ⏱️  Execution Time: ${result.executionTime}ms`);
      console.log(`   📊 Rows Returned: ${result.rowCount}`);
      
      // Check if indexes are being used
      const planText = result.plan.join(' ').toLowerCase();
      const usesIndex = planText.includes('index') || planText.includes('scan');
      
      if (usesIndex) {
        console.log(`   ✅ Uses Index: Yes`);
      } else {
        console.log(`   ⚠️  Uses Index: No (may need optimization)`);
      }
    }
  });
  
  // Overall statistics
  const successfulResults = results.filter(r => !r.error);
  const totalTime = successfulResults.reduce((sum, r) => sum + (r.executionTime || 0), 0);
  const avgTime = successfulResults.length > 0 ? totalTime / successfulResults.length : 0;
  
  console.log('\n📊 OVERALL STATISTICS');
  console.log('=====================');
  console.log(`Total Queries: ${results.length}`);
  console.log(`Successful: ${successfulResults.length}`);
  console.log(`Failed: ${results.length - successfulResults.length}`);
  console.log(`Total Execution Time: ${totalTime}ms`);
  console.log(`Average Execution Time: ${avgTime.toFixed(2)}ms`);
  
  // Performance recommendations
  console.log('\n💡 PERFORMANCE RECOMMENDATIONS');
  console.log('===============================');
  
  const slowQueries = successfulResults.filter(r => (r.executionTime || 0) > 100);
  if (slowQueries.length > 0) {
    console.log(`⚠️  ${slowQueries.length} queries took longer than 100ms:`);
    slowQueries.forEach(q => {
      console.log(`   - ${q.queryName}: ${q.executionTime}ms`);
    });
  } else {
    console.log('✅ All queries executed in under 100ms');
  }
  
  const noIndexQueries = successfulResults.filter(r => {
    const planText = r.plan.join(' ').toLowerCase();
    return !planText.includes('index') && !planText.includes('scan');
  });
  
  if (noIndexQueries.length > 0) {
    console.log(`⚠️  ${noIndexQueries.length} queries may not be using indexes:`);
    noIndexQueries.forEach(q => {
      console.log(`   - ${q.queryName}`);
    });
  } else {
    console.log('✅ All queries appear to be using indexes');
  }
  
  db.close();
  
  console.log('\n🎯 Testing completed!');
  console.log('Check the results above to verify index usage and performance.');
}

// Run the test
testPerformance();










