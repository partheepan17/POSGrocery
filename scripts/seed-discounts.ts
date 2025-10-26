export function seedDiscountSamples() {
  const sampleRules = [
    { id: 101, name: 'Fresh Milk 1L 10%', level: 'PRODUCT', target_id: 1, type: 'PERCENT', value: 10, channel: 'BOTH', stack_mode: 'EXCLUSIVE', apply_quantity_rule: true, active: true, priority: 10, active_from: new Date() },
    { id: 102, name: 'Basmati 80', level: 'PRODUCT', target_id: 2, type: 'AMOUNT', value: 80, channel: 'BOTH', stack_mode: 'EXCLUSIVE', apply_quantity_rule: true, active: true, priority: 20, active_from: new Date() },
    { id: 103, name: 'Dairy 5%', level: 'GROUP', target_id: 10, type: 'PERCENT', value: 5, channel: 'RETAIL', stack_mode: 'EXCLUSIVE', apply_quantity_rule: true, active: true, priority: 30, active_from: new Date() },
    { id: 104, name: 'Anchor Foods 7%', level: 'SUPPLIER', target_id: 100, type: 'PERCENT', value: 7, channel: 'WHOLESALE', stack_mode: 'EXCLUSIVE', apply_quantity_rule: true, active: true, priority: 40, active_from: new Date() },
    { id: 105, name: 'Bakery 5%', level: 'GROUP', target_id: 20, type: 'PERCENT', value: 5, channel: 'BOTH', stack_mode: 'ADDITIVE', apply_quantity_rule: true, active: true, priority: 50, active_from: new Date() },
    { id: 106, name: 'Bakers Co. 30', level: 'SUPPLIER', target_id: 200, type: 'AMOUNT', value: 30, channel: 'BOTH', stack_mode: 'ADDITIVE', apply_quantity_rule: true, active: true, priority: 60, active_from: new Date() },
    { id: 107, name: 'White Bread 5%', level: 'PRODUCT', target_id: 3, type: 'PERCENT', value: 5, channel: 'BOTH', stack_mode: 'EXCLUSIVE', apply_quantity_rule: true, active: true, priority: 70, active_from: new Date() },
    { id: 108, name: 'Grocery 3%', level: 'GROUP', target_id: 30, type: 'PERCENT', value: 3, channel: 'RETAIL', stack_mode: 'EXCLUSIVE', apply_quantity_rule: true, active: true, priority: 80, active_from: new Date() },
    { id: 109, name: 'Global Imports 5% Qty-Off', level: 'SUPPLIER', target_id: 300, type: 'PERCENT', value: 5, channel: 'BOTH', stack_mode: 'EXCLUSIVE', apply_quantity_rule: false, active: true, priority: 90, active_from: new Date() },
    { id: 110, name: 'Yogurt 15%', level: 'PRODUCT', target_id: 4, type: 'PERCENT', value: 15, channel: 'RETAIL', stack_mode: 'EXCLUSIVE', apply_quantity_rule: true, active: true, priority: 100, active_from: new Date() },
  ];

  const sampleInvoices = [
    { id: 5001, datetime: new Date().toISOString(), discounts_disabled: false, lines: [] },
  ];

  try {
    localStorage.setItem('discountSampleRules', JSON.stringify(sampleRules));
    localStorage.setItem('discountSampleInvoices', JSON.stringify(sampleInvoices));
  } catch {}
}

if (typeof window !== 'undefined') {
  // Optionally auto-seed in dev
  // seedDiscountSamples();
}










