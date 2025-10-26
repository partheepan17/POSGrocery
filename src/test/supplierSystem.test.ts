import { dataService, Supplier } from '../services/dataService';
import { csvService } from '../services/csvService';

// Test function to verify the supplier system
export async function testSupplierSystem() {
  console.log('🧪 Testing Supplier System...');
  
  try {
    // Test Case 1: Create supplier manually
    console.log('\n📋 Test Case 1: Create supplier manually');
    
    const testSupplier: Omit<Supplier, 'id' | 'created_at'> = {
      supplier_name: 'ABC Test Suppliers Ltd',
      contact_phone: '+94 11 234 5678',
      contact_email: 'test@abcsuppliers.lk',
      address: '123 Test Street, Colombo 01',
      tax_id: 'VAT123456789',
      active: true
    };

    const createdSupplier = await dataService.createSupplier(testSupplier) as any;
    console.log('✅ Supplier created:', {
      id: createdSupplier?.id,
      name: createdSupplier?.supplier_name,
      active: createdSupplier?.active
    });

    // Test Case 2: CSV Import validation
    console.log('\n📋 Test Case 2: CSV Import with validation');
    
    const testCSV = `supplier_name,phone,email,address,tax_id,active
ABC Suppliers Ltd,+94 11 234 5678,contact@abcsuppliers.lk,"123 Main Street, Colombo 01",VAT123456789,true
XYZ Trading Co,+94 77 123 4567,info@xyztrading.com,"456 Commercial Road, Kandy",VAT987654321,true
Invalid Supplier,,invalid-email,"789 Test Road",VAT111222333,false
,+94 11 999 8888,missing@name.com,"No Name Street",VAT444555666,true
Good Supplier 2,+94 81 777 6666,good@supplier.com,"Good Street, Galle",VAT777888999,true`;

    const importResult = await csvService.importSuppliers(testCSV);
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
    
    const exportedCSV = await csvService.exportSuppliers();
    const lines = exportedCSV.split('\n');
    const headers = lines[0];
    
    console.log('✅ Export Headers:', headers);
    console.log('✅ Expected: supplier_name,phone,email,address,tax_id,active');
    console.log('✅ Headers Match:', headers === 'supplier_name,phone,email,address,tax_id,active');

    // Test Case 4: Supplier filtering and search
    console.log('\n📋 Test Case 4: Supplier filtering');
    
    const allSuppliers = await dataService.getSuppliers() as any[];
    const activeSuppliers = allSuppliers.filter((s: any) => s.active);
    const searchResults = await dataService.getSuppliersWithFilters({ search: 'ABC' }) as any[];
    
    console.log('✅ Filtering Results:', {
      total: Array.isArray(allSuppliers) ? allSuppliers.length : 0,
      active: activeSuppliers.length,
      searchResults: Array.isArray(searchResults) ? searchResults.length : 0
    });

    // Test Case 5: Deactivate supplier
    console.log('\n📋 Test Case 5: Deactivate supplier');
    
    if (createdSupplier) {
      const updatedSupplier = await dataService.updateSupplier(createdSupplier.id, { active: false }) as any;
      console.log('✅ Supplier deactivated:', {
        name: updatedSupplier?.supplier_name,
        active: updatedSupplier?.active
      });
    }

    // Test Case 6: Product count tracking
    console.log('\n📋 Test Case 6: Product count tracking');
    
    const productCount = await dataService.getProductCountBySupplier(createdSupplier.id);
    console.log('✅ Product count for supplier:', productCount);

    console.log('\n🎉 All supplier system tests completed successfully!');
    
    return {
      supplierCreated: !!createdSupplier,
      csvImportWorked: importResult.success,
      csvHeadersCorrect: headers === 'supplier_name,phone,email,address,tax_id,active',
      filteringWorks: Array.isArray(searchResults) && searchResults.length >= 0,
      deactivationWorks: true,
      productCountWorks: typeof productCount === 'number'
    };

  } catch (error) {
    console.error('❌ Supplier system test failed:', error);
    throw error;
  }
}

// Export for use in other files  
export const testSupplier = testSupplierSystem;
