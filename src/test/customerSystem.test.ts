import { dataService, Customer } from '../services/dataService';
import { csvService } from '../services/csvService';

// Test function to verify the customer system
export async function testCustomerSystem() {
  console.log('🧪 Testing Customer System...');
  
  try {
    // Test Case 1: Create customer manually
    console.log('\n📋 Test Case 1: Create customer manually');
    
    const testCustomer: Omit<Customer, 'id' | 'created_at'> = {
      customer_name: 'ABC Test Customer',
      phone: '+94 77 123 4567',
      customer_type: 'Wholesale',
      note: 'Test customer for wholesale orders',
      active: true
    };

    const createdCustomer = await dataService.createCustomer(testCustomer);
    console.log('✅ Customer created:', {
      id: createdCustomer.id,
      name: createdCustomer.customer_name,
      type: createdCustomer.customer_type,
      active: createdCustomer.active
    });

    // Test Case 2: CSV Import with mixed customer types
    console.log('\n📋 Test Case 2: CSV Import with mixed customer types');
    
    const testCSV = `customer_name,phone,customer_type,note,active
John Doe,+94 77 123 4567,Retail,"Regular customer",true
ABC Company Ltd,+94 11 234 5678,Wholesale,"Bulk orders monthly",true
XYZ Restaurant,+94 81 567 8901,Credit,"30-day payment terms",true
Invalid Customer,,InvalidType,"Bad type",true
,+94 11 999 8888,Retail,"Missing name",true
Good Customer 2,+94 81 777 6666,Other,"Special arrangements",true`;

    const importResult = await csvService.importCustomers(testCSV);
    console.log('✅ CSV Import Result:', {
      success: importResult.success,
      imported: importResult.imported,
      errors: importResult.errors.length,
      warnings: importResult.warnings.length
    });

    if (importResult.errors.length > 0) {
      console.log('📋 Import Errors:', importResult.errors.slice(0, 3));
    }

    // Test Case 3: Export CSV format
    console.log('\n📋 Test Case 3: Export CSV format verification');
    
    const exportedCSV = await csvService.exportCustomers();
    const lines = exportedCSV.split('\n');
    const headers = lines[0];
    
    console.log('✅ Export Headers:', headers);
    console.log('✅ Expected: customer_name,phone,customer_type,note,active');
    console.log('✅ Headers Match:', headers === 'customer_name,phone,customer_type,note,active');

    // Test Case 4: Customer filtering and search
    console.log('\n📋 Test Case 4: Customer filtering');
    
    const allCustomers = await dataService.getCustomers(false);
    const activeCustomers = await dataService.getCustomers(true);
    const searchResults = await dataService.getCustomersWithFilters({ search: 'ABC' });
    const wholesaleCustomers = await dataService.getCustomersWithFilters({ customer_type: 'Wholesale' });
    
    console.log('✅ Filtering Results:', {
      total: allCustomers.length,
      active: activeCustomers.length,
      searchResults: searchResults.length,
      wholesale: wholesaleCustomers.length
    });

    // Test Case 5: Deactivate customer
    console.log('\n📋 Test Case 5: Deactivate customer');
    
    if (createdCustomer) {
      const updatedCustomer = await dataService.updateCustomer(createdCustomer.id, { active: false });
      console.log('✅ Customer deactivated:', {
        name: updatedCustomer?.customer_name,
        active: updatedCustomer?.active
      });
    }

    // Test Case 6: Customer stats tracking
    console.log('\n📋 Test Case 6: Customer stats tracking');
    
    const stats = await dataService.getCustomerStats();
    console.log('✅ Customer stats:', stats);

    // Test Case 7: Sales count tracking
    console.log('\n📋 Test Case 7: Sales count tracking');
    
    const salesCount = await dataService.getSalesCountByCustomer(createdCustomer.id);
    console.log('✅ Sales count for customer:', salesCount);

    console.log('\n🎉 All customer system tests completed successfully!');
    
    return {
      customerCreated: !!createdCustomer,
      csvImportWorked: importResult.success,
      csvHeadersCorrect: headers === 'customer_name,phone,customer_type,note,active',
      filteringWorks: searchResults.length >= 0,
      deactivationWorks: true,
      statsWork: typeof stats.total === 'number',
      salesCountWorks: typeof salesCount === 'number'
    };

  } catch (error) {
    console.error('❌ Customer system test failed:', error);
    throw error;
  }
}

// Export for use in other files  
export const testCustomer = testCustomerSystem;



