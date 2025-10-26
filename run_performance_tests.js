/**
 * Performance Testing Script
 * Runs EXPLAIN plans and generates performance reports
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'data', 'pos-grocery.db');

// Test queries with expected index usage
const testQueries = [
  {
    name: 'Stock Movements by Product and Date',
    query: `SELECT sm.*, p.name_en, p.sku FROM stock_movements sm JOIN products p ON sm.product_id = p.id WHERE sm.product_id = 1 AND sm.created_at >= '2024-01-01' AND sm.created_at <= '2024-12-31' ORDER BY sm.created_at DESC`,
    expectedIndex: 'idx_stock_movements_product_created_at',
    critical: true
  },
  {
    name: 'Sales by Date Range',
    query: `SELECT i.*, c.customer_name, u.username as cashier_name FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id LEFT JOIN users u ON i.cashier_id = u.id WHERE i.created_at >= '2024-01-01' AND i.created_at <= '2024-12-31' ORDER BY i.created_at DESC`,
    expectedIndex: 'idx_invoices_created_at',
    critical: true
  },
  {
    name: 'Product Sales Analysis',
    query: `SELECT il.product_id, p.name_en, p.sku, SUM(il.qty) as total_qty, SUM(il.total) as total_revenue, AVG(il.unit_price) as avg_price FROM invoice_lines il JOIN products p ON il.product_id = p.id WHERE il.created_at >= '2024-01-01' AND il.created_at <= '2024-12-31' GROUP BY il.product_id, p.name_en, p.sku ORDER BY total_revenue DESC`,
    expectedIndex: 'idx_invoice_lines_product_id',
    critical: true
  },
  {
    name: 'Product Search by Barcode',
    query: `SELECT * FROM products WHERE barcode = '1234567890123' AND is_active = 1`,
    expectedIndex: 'idx_products_barcode',
    critical: true
  },
  {
    name: 'Product Search by Name',
    query: `SELECT * FROM products WHERE name_en LIKE '%Coca%' AND is_active = 1 ORDER BY name_en`,
    expectedIndex: 'idx_products_name_en',
    critical: true
  },
  {
    name: 'Stock Movements with Movement Type',
    query: `SELECT sm.*, p.name_en FROM stock_movements sm JOIN products p ON sm.product_id = p.id WHERE sm.movement_type = 'sale' AND sm.created_at >= '2024-01-01' ORDER BY sm.created_at DESC`,
    expectedIndex: 'idx_stock_movements_product_type_created',
    critical: false
  },
  {
    name: 'Cashier Performance Report',
    query: `SELECT u.username, u.name, COUNT(*) as total_sales, SUM(i.net) as total_revenue, AVG(i.net) as avg_sale_amount FROM invoices i JOIN users u ON i.cashier_id = u.id WHERE i.created_at >= '2024-01-01' AND i.created_at <= '2024-12-31' GROUP BY u.id, u.username, u.name ORDER BY total_revenue DESC`,
    expectedIndex: 'idx_invoices_cashier_created_at',
    critical: false
  },
  {
    name: 'Customer Analysis',
    query: `SELECT c.customer_name, COUNT(*) as total_purchases, SUM(i.net) as total_spent, AVG(i.net) as avg_purchase FROM invoices i JOIN customers c ON i.customer_id = c.id WHERE i.created_at >= '2024-01-01' AND i.created_at <= '2024-12-31' GROUP BY c.id, c.customer_name ORDER BY total_spent DESC`,
    expectedIndex: 'idx_invoices_customer_created_at',
    critical: false
  },
  {
    name: 'Product Category Analysis',
    query: `SELECT cat.name as category_name, COUNT(DISTINCT p.id) as product_count, COUNT(il.id) as sales_count, SUM(il.qty) as total_qty_sold, SUM(il.total) as total_revenue FROM invoice_lines il JOIN products p ON il.product_id = p.id JOIN categories cat ON p.category_id = cat.id WHERE il.created_at >= '2024-01-01' AND il.created_at <= '2024-12-31' GROUP BY cat.id, cat.name ORDER BY total_revenue DESC`,
    expectedIndex: 'idx_products_category_active',
    critical: false
  },
  {
    name: 'Scale Items Report',
    query: `SELECT p.name_en, p.sku, p.unit, SUM(il.qty) as total_qty_sold, SUM(il.total) as total_revenue FROM invoice_lines il JOIN products p ON il.product_id = p.id WHERE p.is_scale_item = 1 AND il.created_at >= '2024-01-01' AND il.created_at <= '2024-12-31' GROUP BY p.id, p.name_en, p.sku, p.unit ORDER BY total_qty_sold DESC`,
    expectedIndex: 'idx_products_scale_active',
    critical: false
  }
];

function runExplainPlan(db, query, queryName) {
  try {
    const explainQuery = `EXPLAIN QUERY PLAN ${query}`;
    const plan = db.prepare(explainQuery).all();
    
    return {
      queryName,
      plan: plan.map(row => row.detail),
      success: true
    };
  } catch (error) {
    return {
      queryName,
      error: error.message,
      success: false
    };
  }
}

function analyzeIndexUsage(plan, expectedIndex) {
  const planText = plan.join(' ').toLowerCase();
  
  // Check for index usage
  const usesIndex = planText.includes('index') || planText.includes('scan');
  const usesExpectedIndex = expectedIndex ? planText.includes(expectedIndex.toLowerCase()) : false;
  
  // Check for table scans (bad)
  const hasTableScan = planText.includes('scan table') && !planText.includes('index');
  
  // Check for sorting (can be expensive)
  const hasSort = planText.includes('sort');
  
  return {
    usesIndex,
    usesExpectedIndex,
    hasTableScan,
    hasSort,
    planText
  };
}

function generateReport(results) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = `performance_report_${timestamp}.md`;
  
  let report = `# Performance Index Analysis Report\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  
  // Summary
  const totalQueries = results.length;
  const successfulQueries = results.filter(r => r.success).length;
  const criticalQueries = results.filter(r => r.critical && r.success).length;
  
  report += `## Summary\n\n`;
  report += `- **Total Queries Tested:** ${totalQueries}\n`;
  report += `- **Successful Queries:** ${successfulQueries}\n`;
  report += `- **Critical Queries:** ${criticalQueries}\n\n`;
  
  // Detailed Results
  report += `## Detailed Results\n\n`;
  
  results.forEach((result, index) => {
    report += `### ${index + 1}. ${result.queryName}\n\n`;
    
    if (!result.success) {
      report += `❌ **Error:** ${result.error}\n\n`;
      return;
    }
    
    const analysis = analyzeIndexUsage(result.plan, result.expectedIndex);
    
    report += `**Expected Index:** ${result.expectedIndex || 'N/A'}\n\n`;
    report += `**Index Usage Analysis:**\n`;
    report += `- ✅ Uses Index: ${analysis.usesIndex ? 'Yes' : 'No'}\n`;
    report += `- 🎯 Uses Expected Index: ${analysis.usesExpectedIndex ? 'Yes' : 'No'}\n`;
    report += `- ⚠️  Has Table Scan: ${analysis.hasTableScan ? 'Yes' : 'No'}\n`;
    report += `- 🔄 Has Sort Operation: ${analysis.hasSort ? 'Yes' : 'No'}\n\n`;
    
    report += `**Execution Plan:**\n`;
    report += `\`\`\`\n`;
    result.plan.forEach((step, stepIndex) => {
      report += `${stepIndex + 1}. ${step}\n`;
    });
    report += `\`\`\`\n\n`;
    
    // Performance recommendations
    if (!analysis.usesIndex) {
      report += `⚠️  **Recommendation:** This query may benefit from additional indexing.\n\n`;
    } else if (analysis.hasTableScan) {
      report += `⚠️  **Recommendation:** Query uses table scan, consider adding composite indexes.\n\n`;
    } else {
      report += `✅ **Status:** Query appears to be well-optimized.\n\n`;
    }
  });
  
  // Overall Recommendations
  report += `## Overall Recommendations\n\n`;
  
  const queriesWithoutIndex = results.filter(r => 
    r.success && !analyzeIndexUsage(r.plan, r.expectedIndex).usesIndex
  );
  
  const queriesWithTableScan = results.filter(r => 
    r.success && analyzeIndexUsage(r.plan, r.expectedIndex).hasTableScan
  );
  
  if (queriesWithoutIndex.length > 0) {
    report += `### Index Optimization Needed\n\n`;
    report += `The following queries are not using indexes effectively:\n\n`;
    queriesWithoutIndex.forEach(q => {
      report += `- ${q.queryName}\n`;
    });
    report += `\n`;
  }
  
  if (queriesWithTableScan.length > 0) {
    report += `### Table Scan Issues\n\n`;
    report += `The following queries are performing table scans:\n\n`;
    queriesWithTableScan.forEach(q => {
      report += `- ${q.queryName}\n`;
    });
    report += `\n`;
  }
  
  // Index Status
  report += `## Index Status\n\n`;
  report += `### Critical Indexes (Required)\n\n`;
  report += `- \`idx_stock_movements_product_created_at\` - Stock movements by product and date\n`;
  report += `- \`idx_invoices_created_at\` - Sales by date range\n`;
  report += `- \`idx_invoice_lines_product_id\` - Product sales analysis\n`;
  report += `- \`idx_products_barcode\` - Product barcode lookups\n`;
  report += `- \`idx_products_name_en\` - Product name searches\n\n`;
  
  report += `### Performance Indexes (Recommended)\n\n`;
  report += `- \`idx_stock_movements_product_type_created\` - Movement type filtering\n`;
  report += `- \`idx_invoices_cashier_created_at\` - Cashier performance\n`;
  report += `- \`idx_invoices_customer_created_at\` - Customer analysis\n`;
  report += `- \`idx_products_category_active\` - Category analysis\n`;
  report += `- \`idx_products_scale_active\` - Scale items analysis\n\n`;
  
  report += `## Next Steps\n\n`;
  report += `1. Review the detailed results above\n`;
  report += `2. Address any queries showing table scans\n`;
  report += `3. Consider adding composite indexes for complex queries\n`;
  report += `4. Monitor query performance in production\n`;
  report += `5. Run this analysis regularly to track performance trends\n\n`;
  
  return report;
}

function runPerformanceTests() {
  console.log('🚀 Starting Performance Index Analysis');
  console.log('=====================================');
  
  // Check if database exists
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Database not found at: ${dbPath}`);
    console.log('Please ensure the database exists and run migrations first.');
    return;
  }
  
  const db = new Database(dbPath);
  
  console.log('📊 Running EXPLAIN plans for all test queries...\n');
  
  const results = [];
  
  // Run all test queries
  testQueries.forEach((testQuery, index) => {
    console.log(`${index + 1}. Testing: ${testQuery.name}`);
    
    const result = runExplainPlan(db, testQuery.query, testQuery.name);
    result.expectedIndex = testQuery.expectedIndex;
    result.critical = testQuery.critical;
    results.push(result);
    
    if (result.success) {
      const analysis = analyzeIndexUsage(result.plan, testQuery.expectedIndex);
      const status = analysis.usesIndex ? '✅' : '⚠️';
      console.log(`   ${status} Index Usage: ${analysis.usesIndex ? 'Yes' : 'No'}`);
      if (testQuery.expectedIndex) {
        console.log(`   🎯 Expected Index: ${analysis.usesExpectedIndex ? 'Used' : 'Not Used'}`);
      }
    } else {
      console.log(`   ❌ Error: ${result.error}`);
    }
    console.log('');
  });
  
  // Generate report
  console.log('📝 Generating performance report...');
  const report = generateReport(results);
  
  // Save report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = `performance_report_${timestamp}.md`;
  fs.writeFileSync(reportPath, report);
  
  console.log(`✅ Performance report saved to: ${reportPath}`);
  
  // Summary
  const successfulResults = results.filter(r => r.success);
  const criticalResults = results.filter(r => r.critical && r.success);
  const optimizedQueries = successfulResults.filter(r => 
    analyzeIndexUsage(r.plan, r.expectedIndex).usesIndex
  );
  
  console.log('\n📈 SUMMARY');
  console.log('==========');
  console.log(`Total Queries: ${results.length}`);
  console.log(`Successful: ${successfulResults.length}`);
  console.log(`Critical: ${criticalResults.length}`);
  console.log(`Using Indexes: ${optimizedQueries.length}`);
  console.log(`Optimization Rate: ${successfulResults.length > 0 ? (optimizedQueries.length / successfulResults.length * 100).toFixed(1) : 0}%`);
  
  db.close();
  
  console.log('\n🎯 Performance analysis completed!');
  console.log(`Check ${reportPath} for detailed results and recommendations.`);
}

// Run the tests
runPerformanceTests();










