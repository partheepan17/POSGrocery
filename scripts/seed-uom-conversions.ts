/**
 * Seed script for UOM conversions
 * Creates sample UOM conversions for testing
 */

import { getDatabase } from '../server/db';
import { uomService } from '../server/services/uomService';

async function seedUOMConversions() {
  console.log('🌱 Seeding UOM conversions...');
  
  const db = getDatabase();
  
  try {
    // Get some products to create conversions for
    const products = db.prepare(`
      SELECT id, name_en, sku, unit 
      FROM products 
      WHERE id IN (1, 2, 3, 4, 5)
      ORDER BY id
    `).all() as Array<{ id: number; name_en: string; sku: string; unit: string }>;
    
    if (products.length === 0) {
      console.log('❌ No products found. Please run the main seed script first.');
      return;
    }
    
    console.log(`📦 Found ${products.length} products to create UOM conversions for`);
    
    // Define UOM conversions based on product types
    const conversions = [
      // Product 1 - Pieces (pc)
      { productId: 1, baseUnit: 'pc', altUnit: 'carton', multiplier: 12.0, description: '1 carton = 12 pieces' },
      { productId: 1, baseUnit: 'pc', altUnit: 'box', multiplier: 24.0, description: '1 box = 24 pieces' },
      { productId: 1, baseUnit: 'pc', altUnit: 'dozen', multiplier: 12.0, description: '1 dozen = 12 pieces' },
      { productId: 1, baseUnit: 'pc', altUnit: 'gross', multiplier: 144.0, description: '1 gross = 144 pieces' },
      
      // Product 2 - Kilograms (kg)
      { productId: 2, baseUnit: 'kg', altUnit: 'g', multiplier: 1000.0, description: '1 kg = 1000 grams' },
      { productId: 2, baseUnit: 'kg', altUnit: 'lb', multiplier: 2.20462, description: '1 kg = 2.20462 pounds' },
      { productId: 2, baseUnit: 'kg', altUnit: 'ton', multiplier: 0.001, description: '1 kg = 0.001 tons' },
      
      // Product 3 - Grams (g)
      { productId: 3, baseUnit: 'g', altUnit: 'kg', multiplier: 0.001, description: '1 gram = 0.001 kg' },
      { productId: 3, baseUnit: 'g', altUnit: 'oz', multiplier: 0.035274, description: '1 gram = 0.035274 ounces' },
      
      // Product 4 - Liters (l)
      { productId: 4, baseUnit: 'l', altUnit: 'ml', multiplier: 1000.0, description: '1 liter = 1000 ml' },
      { productId: 4, baseUnit: 'l', altUnit: 'gal', multiplier: 0.264172, description: '1 liter = 0.264172 gallons' },
      
      // Product 5 - Meters (m)
      { productId: 5, baseUnit: 'm', altUnit: 'cm', multiplier: 100.0, description: '1 meter = 100 cm' },
      { productId: 5, baseUnit: 'm', altUnit: 'ft', multiplier: 3.28084, description: '1 meter = 3.28084 feet' },
      { productId: 5, baseUnit: 'm', altUnit: 'yd', multiplier: 1.09361, description: '1 yard = 1.09361 meters' }
    ];
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const conversion of conversions) {
      try {
        // Check if product exists
        const product = products.find(p => p.id === conversion.productId);
        if (!product) {
          console.log(`⚠️  Product ${conversion.productId} not found, skipping conversion`);
          skippedCount++;
          continue;
        }
        
        // Validate conversion
        const validation = uomService.validateConversion(
          conversion.productId,
          conversion.baseUnit,
          conversion.altUnit,
          conversion.multiplier
        );
        
        if (!validation.isValid) {
          console.log(`⚠️  Invalid conversion for product ${conversion.productId}: ${validation.errors.join(', ')}`);
          skippedCount++;
          continue;
        }
        
        // Create conversion
        const result = uomService.createConversion(
          conversion.productId,
          conversion.baseUnit,
          conversion.altUnit,
          conversion.multiplier
        );
        
        console.log(`✅ Created: ${product.name_en} (${product.sku}) - ${conversion.description}`);
        createdCount++;
        
      } catch (error: any) {
        if (error.message.includes('UNIQUE constraint failed')) {
          console.log(`⏭️  Conversion already exists for product ${conversion.productId}: ${conversion.description}`);
          skippedCount++;
        } else {
          console.log(`❌ Error creating conversion for product ${conversion.productId}: ${error.message}`);
          skippedCount++;
        }
      }
    }
    
    console.log(`\n📊 UOM Conversion Seeding Summary:`);
    console.log(`   ✅ Created: ${createdCount} conversions`);
    console.log(`   ⏭️  Skipped: ${skippedCount} conversions`);
    console.log(`   📦 Total products: ${products.length}`);
    
    // Display some examples
    console.log(`\n🔍 Example UOM Conversions:`);
    for (const product of products.slice(0, 3)) {
      const productConversions = uomService.getConversionsForProduct(product.id);
      const baseUnit = uomService.getBaseUnit(product.id);
      
      console.log(`\n   ${product.name_en} (${product.sku}) - Base Unit: ${baseUnit}`);
      for (const conv of productConversions) {
        console.log(`     • 1 ${conv.altUnit} = ${conv.multiplier} ${conv.baseUnit}`);
      }
    }
    
    // Test some conversions
    console.log(`\n🧪 Testing UOM Conversions:`);
    for (const product of products.slice(0, 2)) {
      const baseUnit = uomService.getBaseUnit(product.id);
      const conversions = uomService.getConversionsForProduct(product.id);
      
      if (conversions.length > 0) {
        const testConversion = conversions[0];
        const testQuantity = 5;
        
        const result = uomService.convertToBase(
          product.id,
          testQuantity,
          testConversion.altUnit
        );
        
        console.log(`   ${product.name_en}: ${testQuantity} ${testConversion.altUnit} = ${result.baseQuantity} ${baseUnit}`);
      }
    }
    
    console.log(`\n🎉 UOM conversion seeding completed!`);
    
  } catch (error) {
    console.error('❌ Error seeding UOM conversions:', error);
    throw error;
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedUOMConversions()
    .then(() => {
      console.log('✅ UOM conversion seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ UOM conversion seeding failed:', error);
      process.exit(1);
    });
}

export { seedUOMConversions };











