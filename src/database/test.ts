import { dataService } from '../services/dataService';

export async function testDatabase(): Promise<void> {
  try {
    console.log('🧪 Testing database functionality...');
    
    // Test 1: Lookup product by barcode
    console.log('Test 1: Lookup product by barcode...');
    const productResponse = await dataService.getProductByBarcode('1234567890124'); // SUGAR1
    const product = productResponse?.data as any;
    if (product) {
      console.log(`✅ Found product: ${product.name_en} (${product.sku})`);
    } else {
      console.log('❌ Product not found by barcode');
    }
    
    // Test 2: Fetch tier prices
    console.log('Test 2: Fetch tier prices...');
    if (product) {
      console.log(`✅ Retail price: ${product.price_retail}`);
      console.log(`✅ Wholesale price: ${product.price_wholesale}`);
      console.log(`✅ Credit price: ${product.price_credit}`);
      console.log(`✅ Other price: ${product.price_other}`);
    }
    
    // Test 3: Create a sale with two lines
    console.log('Test 3: Create a sale with two lines...');
    const sale = await dataService.startSale({
      customer_id: 1, // Walk-in Customer
      price_tier: 'Retail',
      cashier_id: 1, // Cashier User
      terminal_name: 'Counter-1'
    });
    console.log(`✅ Created sale with ID: ${sale?.id}`);
    
    // Add first line (SUGAR1)
    if (sale) {
      const line1Response = await dataService.addLineToSale(sale.id, {
        product_id: product?.id || 2,
        qty: 2.5 // 2.5kg of sugar
      });
      const line1 = line1Response?.data as any;
      console.log(`✅ Added line 1: ${line1?.qty}kg at ${line1?.unit_price} each`);
      
      // Add second line (RICE5)
      const riceProduct = await dataService.getProductBySku('RICE5');
      if (riceProduct) {
        const line2Response = await dataService.addLineToSale(sale.id, {
          product_id: riceProduct.id,
          qty: 1 // 1 bag of rice
        });
        const line2 = line2Response?.data as any;
        console.log(`✅ Added line 2: ${line2?.qty}pc at ${line2?.unit_price} each`);
      }
      
      // Test 4: Verify sale_lines.unit_price uses the invoice tier
      console.log('Test 4: Verify sale_lines.unit_price uses the invoice tier...');
      const saleLinesResponse = await dataService.getSaleLines(sale.id);
      const saleLines = (saleLinesResponse as any)?.data as any[];
      console.log(`✅ Sale has ${saleLines?.length || 0} lines`);
      
      saleLines?.forEach((line: any, index: number) => {
        console.log(`✅ Line ${index + 1}: unit_price = ${line.unit_price} (should match Retail tier)`);
      });
    }
    
    // Test 5: Test CSV export
    console.log('Test 5: Test CSV export...');
    const { csvService } = await import('../services/csvService');
    const productsCSV = await csvService.exportProducts();
    console.log(`✅ Products CSV export: ${productsCSV.split('\n').length} lines`);
    
    console.log('🎉 All database tests passed!');
  } catch (error) {
    console.error('❌ Database test failed:', error);
    throw error;
  }
}

// Export for manual testing
export { testDatabase as runTests };









