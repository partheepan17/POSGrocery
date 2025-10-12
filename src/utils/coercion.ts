// Utility functions for coercing form data types

export const coerceProductData = (formData: any) => ({
  ...formData,
  category_id: parseInt(formData.category_id) || null,
  preferred_supplier_id: formData.preferred_supplier_id ? parseInt(formData.preferred_supplier_id) : null,
  price_retail: parseFloat(formData.price_retail) || 0,
  price_wholesale: parseFloat(formData.price_wholesale) || 0,
  price_credit: parseFloat(formData.price_credit) || 0,
  price_other: parseFloat(formData.price_other) || 0,
  reorder_level: parseInt(formData.reorder_level) || 0,
  is_scale_item: Boolean(formData.is_scale_item),
  is_active: Boolean(formData.is_active)
});

export const coerceProductUpdateData = (formData: any) => {
  const toNum = (v: any, d = 0) => (v === null || v === undefined || v === '') ? d : Number(v);
  
  return {
    name_en: formData.name_en?.trim() || undefined,
    name_si: formData.name_si?.trim() || undefined,
    name_ta: formData.name_ta?.trim() || undefined,
    sku: formData.sku?.trim() || undefined,
    barcode: formData.barcode?.trim() || undefined,
    category_id: formData.category_id ? toNum(formData.category_id) : undefined,
    preferred_supplier_id: formData.preferred_supplier_id ? toNum(formData.preferred_supplier_id) : undefined,
    cost: formData.cost !== undefined ? toNum(formData.cost) : undefined,
    price_retail: formData.price_retail !== undefined ? toNum(formData.price_retail) : undefined,
    price_wholesale: formData.price_wholesale !== undefined ? toNum(formData.price_wholesale) : undefined,
    price_credit: formData.price_credit !== undefined ? toNum(formData.price_credit) : undefined,
    price_other: formData.price_other !== undefined ? toNum(formData.price_other) : undefined,
    unit: formData.unit || undefined,
    is_scale_item: formData.is_scale_item !== undefined ? Boolean(formData.is_scale_item) : undefined,
    tax_code: formData.tax_code?.trim() || undefined,
    reorder_level: formData.reorder_level !== undefined ? (Number.isFinite(Number(formData.reorder_level)) ? Number(formData.reorder_level) : null) : undefined,
    is_active: formData.is_active !== undefined ? Boolean(formData.is_active) : undefined
  };
};
