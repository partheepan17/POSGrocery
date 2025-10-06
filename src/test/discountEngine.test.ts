import { discountEngine } from '../services/discountEngine';
import { dataService, DiscountRule, Product } from '../services/dataService';

// Mock data for testing
const mockProducts: Product[] = [
  {
    id: 1,
    sku: 'SUGAR001',
    name_en: 'Sugar 1kg',
    unit: 'kg' as const,
    category_id: 1,
    price_retail: 100,
    price_wholesale: 90,
    price_credit: 95,
    price_other: 100,
    is_scale_item: false,
    is_active: true,
    created_at: new Date(),
    barcode: undefined,
    name_si: undefined,
    name_ta: undefined,
    tax_code: undefined,
    cost: undefined,
    reorder_level: undefined,
    preferred_supplier_id: undefined,
    updated_at: undefined
  },
  {
    id: 2,
    sku: 'RICE001', 
    name_en: 'Rice 1kg',
    unit: 'kg' as const,
    category_id: 2,
    price_retail: 200,
    price_wholesale: 180,
    price_credit: 190,
    price_other: 200,
    is_scale_item: false,
    is_active: true,
    created_at: new Date(),
    barcode: undefined,
    name_si: undefined,
    name_ta: undefined,
    tax_code: undefined,
    cost: undefined,
    reorder_level: undefined,
    preferred_supplier_id: undefined,
    updated_at: undefined
  }
];

const mockRules: DiscountRule[] = [
  {
    id: 1,
    name: 'Sugar Cap 3kg → Rs.10/kg',
    applies_to: 'PRODUCT',
    target_id: 1, // Sugar
    type: 'AMOUNT',
    value: 10,
    max_qty_or_weight: 3,
    active_from: new Date('2024-01-01'),
    active_to: new Date('2024-12-31'),
    priority: 10,
    reason_required: false,
    active: true
  },
  {
    id: 2,
    name: 'Produce 5%',
    applies_to: 'CATEGORY',
    target_id: 2, // Rice category
    type: 'PERCENT',
    value: 5,
    max_qty_or_weight: undefined,
    active_from: new Date('2024-01-01'),
    active_to: new Date('2024-12-31'),
    priority: 20,
    reason_required: false,
    active: true
  }
];

// Test function to simulate the discount engine
export async function testDiscountSystem() {
  console.log('🧪 Testing Discount System...');
  
  try {
    // Test Case 1: Sugar Cap Rule - 2.5kg should get Rs.25 off
    console.log('\n📋 Test Case 1: Sugar 2.5kg → Should get Rs.25 off (within cap)');
    
    const mockLines1 = [{
      id: 1,
      product_id: 1,
      product: mockProducts[0],
      qty: 2.5,
      unit_price: 100,
      line_discount: 0,
      tax: 0,
      total: 250
    }];

    const result1 = await discountEngine.applyRulesToCart({
      lines: mockLines1,
      rules: mockRules
    });

    console.log('✅ Result:', {
      originalTotal: 250,
      discountApplied: result1.totals.discount,
      finalTotal: result1.totals.total,
      appliedRules: result1.appliedRules.map(r => r.rule_name)
    });

    // Test Case 2: Sugar Cap Rule - 4.0kg should get Rs.30 off max (cap reached)
    console.log('\n📋 Test Case 2: Sugar 4.0kg → Should get Rs.30 off max (cap reached)');
    
    const mockLines2 = [{
      id: 1,
      product_id: 1,
      product: mockProducts[0],
      qty: 4.0,
      unit_price: 100,
      line_discount: 0,
      tax: 0,
      total: 400
    }];

    const result2 = await discountEngine.applyRulesToCart({
      lines: mockLines2,
      rules: mockRules
    });

    console.log('✅ Result:', {
      originalTotal: 400,
      discountApplied: result2.totals.discount,
      finalTotal: result2.totals.total,
      appliedRules: result2.appliedRules.map(r => r.rule_name),
      warnings: result2.warnings
    });

    // Test Case 3: Multiple rules - Sugar + Rice with both rules applying
    console.log('\n📋 Test Case 3: Sugar 2kg + Rice 1kg → Both rules should apply');
    
    const mockLines3 = [
      {
        id: 1,
        product_id: 1,
        product: mockProducts[0],
        qty: 2,
        unit_price: 100,
        line_discount: 0,
        tax: 0,
        total: 200
      },
      {
        id: 2,
        product_id: 2,
        product: mockProducts[1],
        qty: 1,
        unit_price: 200,
        line_discount: 0,
        tax: 0,
        total: 200
      }
    ];

    const result3 = await discountEngine.applyRulesToCart({
      lines: mockLines3,
      rules: mockRules
    });

    console.log('✅ Result:', {
      originalTotal: 400,
      discountApplied: result3.totals.discount,
      finalTotal: result3.totals.total,
      appliedRules: result3.appliedRules.map(r => `${r.rule_name}: Rs.${r.discount_amount}`)
    });

    console.log('\n🎉 All tests completed successfully!');
    
    return {
      test1: result1,
      test2: result2,
      test3: result3
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Export for use in other files
export { mockProducts, mockRules };








