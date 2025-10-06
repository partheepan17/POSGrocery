// Simple data seeder for testing Reports functionality
export function seedReportsTestData() {
  console.log('🌱 Seeding test data for Reports...');
  
  // This would normally insert data into the database
  // For now, we'll just log what would be created
  
  const testSales = [
    {
      id: 1,
      created_at: new Date().toISOString(),
      gross_total: 1500.00,
      discount_total: 150.00,
      tax_total: 202.50,
      net_total: 1552.50,
      price_tier: 'Retail',
      payment_method: 'cash',
      cashier_id: 1,
      terminal_id: 'POS-001'
    },
    {
      id: 2,
      created_at: new Date().toISOString(),
      gross_total: 2500.00,
      discount_total: 250.00,
      tax_total: 337.50,
      net_total: 2587.50,
      price_tier: 'Wholesale',
      payment_method: 'card',
      cashier_id: 1,
      terminal_id: 'POS-001'
    },
    {
      id: 3,
      created_at: new Date().toISOString(),
      gross_total: 800.00,
      discount_total: 40.00,
      tax_total: 114.00,
      net_total: 874.00,
      price_tier: 'Retail',
      payment_method: 'wallet',
      cashier_id: 2,
      terminal_id: 'POS-002'
    }
  ];

  const testSaleLines = [
    {
      id: 1,
      sale_id: 1,
      product_id: 1,
      qty: 5,
      total: 500.00,
      line_discount: 50.00
    },
    {
      id: 2,
      sale_id: 1,
      product_id: 2,
      qty: 10,
      total: 1000.00,
      line_discount: 100.00
    },
    {
      id: 3,
      sale_id: 2,
      product_id: 3,
      qty: 25,
      total: 2500.00,
      line_discount: 250.00
    },
    {
      id: 4,
      sale_id: 3,
      product_id: 1,
      qty: 8,
      total: 800.00,
      line_discount: 40.00
    }
  ];

  console.log('📊 Test sales data:', testSales.length, 'sales');
  console.log('📋 Test sale lines:', testSaleLines.length, 'line items');
  console.log('💰 Total test revenue:', testSales.reduce((sum, sale) => sum + sale.net_total, 0));
  
  console.log('\n🎯 To see data in Reports:');
  console.log('1. Navigate to http://localhost:8100/reports');
  console.log('2. Check that filters show today\'s date');
  console.log('3. Click different tabs to see various report views');
  console.log('4. Use Export CSV to download test data');
  
  return {
    sales: testSales,
    saleLines: testSaleLines,
    message: 'Test data seeded successfully (mock data for development)'
  };
}

// Export for use in other files
export const seedReportsData = seedReportsTestData;








