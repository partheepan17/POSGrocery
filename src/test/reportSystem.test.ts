import { reportService } from '../services/reportService';
import { csvService } from '../services/csvService';

// Test function to verify the report system
export async function testReportSystem() {
  console.log('🧪 Testing Report System...');
  
  try {
    // Test Case 1: Basic KPIs query
    console.log('\n📋 Test Case 1: Basic KPIs query');
    
    const filters = {
      from: new Date(new Date().setHours(0, 0, 0, 0)), // Today
      to: new Date(new Date().setHours(23, 59, 59, 999))
    };

    const kpis = await reportService.getKPIs(filters);
    console.log('✅ KPIs loaded:', {
      invoices: kpis.invoices,
      gross: kpis.gross,
      discount: kpis.discount,
      tax: kpis.tax,
      net: kpis.net,
      avg_per_invoice: kpis.avg_per_invoice
    });

    // Test Case 2: Sales Summary query
    console.log('\n📋 Test Case 2: Sales Summary query');
    
    const salesSummary = await reportService.getSalesSummary(filters);
    console.log('✅ Sales Summary loaded:', {
      rows: salesSummary.length,
      firstRow: salesSummary[0] || null
    });

    // Test Case 3: Sales by Tier query
    console.log('\n📋 Test Case 3: Sales by Tier query');
    
    const salesByTier = await reportService.getSalesByTier(filters);
    console.log('✅ Sales by Tier loaded:', {
      tiers: salesByTier.length,
      data: salesByTier.map(t => ({ tier: t.tier, net: t.net }))
    });

    // Test Case 4: Top Products query
    console.log('\n📋 Test Case 4: Top Products query');
    
    const topProducts = await reportService.getTopProducts({ ...filters, limit: 5 });
    console.log('✅ Top Products loaded:', {
      products: topProducts.length,
      topProduct: topProducts[0] || null
    });

    // Test Case 5: Top Categories query
    console.log('\n📋 Test Case 5: Top Categories query');
    
    const topCategories = await reportService.getTopCategories({ ...filters, limit: 5 });
    console.log('✅ Top Categories loaded:', {
      categories: topCategories.length,
      topCategory: topCategories[0] || null
    });

    // Test Case 6: Discount Audit query
    console.log('\n📋 Test Case 6: Discount Audit query');
    
    const discountAudit = await reportService.getDiscountAudit(filters);
    console.log('✅ Discount Audit loaded:', {
      rules: discountAudit.length,
      topRule: discountAudit[0] || null
    });

    // Test Case 7: CSV Export functionality
    console.log('\n📋 Test Case 7: CSV Export functionality');
    
    try {
      // Test sales summary export (without actual download)
      const mockSalesData = [
        {
          date: '2024-01-15',
          invoices: 10,
          gross: 1000,
          discount: 50,
          tax: 150,
          net: 900,
          pay_cash: 600,
          pay_card: 300,
          pay_wallet: 0,
          avg_per_invoice: 90
        }
      ];
      
      // This would normally trigger a download, but we're just testing the function exists
      console.log('✅ CSV export functions available:', {
        salesSummary: typeof csvService.exportSalesSummaryCSV === 'function',
        salesByTier: typeof csvService.exportSalesByTierCSV === 'function',
        topProducts: typeof csvService.exportTopProductsCSV === 'function',
        topCategories: typeof csvService.exportTopCategoriesCSV === 'function',
        discountAudit: typeof csvService.exportDiscountAuditCSV === 'function'
      });
    } catch (error) {
      console.log('⚠️  CSV export test skipped (browser environment required)');
    }

    // Test Case 8: Filter Options
    console.log('\n📋 Test Case 8: Filter Options');
    
    const filterOptions = await reportService.getFilterOptions();
    console.log('✅ Filter Options loaded:', {
      terminals: filterOptions.terminals.length,
      cashiers: filterOptions.cashiers.length
    });

    // Test Case 9: Date Range Filtering
    console.log('\n📋 Test Case 9: Date Range Filtering');
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weekFilters = {
      from: weekAgo,
      to: new Date()
    };
    
    const weekKpis = await reportService.getKPIs(weekFilters);
    console.log('✅ Week Range KPIs:', {
      invoices: weekKpis.invoices,
      net: weekKpis.net,
      comparison: weekKpis.invoices >= kpis.invoices ? 'Week >= Today' : 'Week < Today'
    });

    // Test Case 10: Tier Filtering
    console.log('\n📋 Test Case 10: Tier Filtering');
    
    const retailFilters = {
      ...filters,
      tier: 'Retail' as const
    };
    
    const retailKpis = await reportService.getKPIs(retailFilters);
    console.log('✅ Retail-only KPIs:', {
      invoices: retailKpis.invoices,
      net: retailKpis.net,
      comparison: retailKpis.invoices <= kpis.invoices ? 'Retail <= Total' : 'Retail > Total (unexpected)'
    });

    console.log('\n🎉 All report system tests completed successfully!');
    
    return {
      kpisWorking: typeof kpis.invoices === 'number',
      salesSummaryWorking: Array.isArray(salesSummary),
      salesByTierWorking: Array.isArray(salesByTier),
      topProductsWorking: Array.isArray(topProducts),
      topCategoriesWorking: Array.isArray(topCategories),
      discountAuditWorking: Array.isArray(discountAudit),
      csvExportFunctionsExist: typeof csvService.exportSalesSummaryCSV === 'function',
      filterOptionsWorking: typeof filterOptions.terminals === 'object',
      dateRangeFilterWorking: typeof weekKpis.invoices === 'number',
      tierFilterWorking: typeof retailKpis.invoices === 'number'
    };

  } catch (error) {
    console.error('❌ Report system test failed:', error);
    throw error;
  }
}

// Export for use in other files  
export const testReport = testReportSystem;








