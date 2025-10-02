import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { dataService, Category, Supplier } from '@/services/dataService';
import { useAppStore } from '@/store/appStore';

interface AddProductModalProps {
  categories: Category[];
  suppliers: Supplier[];
  onClose: () => void;
  onSave: () => void;
}

interface NewCategoryData {
  name: string;
}

interface NewSupplierData {
  supplier_name: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  tax_id: string;
}

interface ProductFormData {
  sku: string;
  barcode: string;
  name_en: string;
  name_si: string;
  name_ta: string;
  unit: 'pc' | 'kg';
  category_id: string;
  price_retail: number;
  price_wholesale: number;
  price_credit: number;
  price_other: number;
  tax_code: string;
  reorder_level: number;
  preferred_supplier_id: string;
  is_scale_item: boolean;
  is_active: boolean;
}

export function AddProductModal({ categories, suppliers, onClose, onSave }: AddProductModalProps) {
  const { settings } = useAppStore();
  const [formData, setFormData] = useState<ProductFormData>({
    sku: '',
    barcode: '',
    name_en: '',
    name_si: '',
    name_ta: '',
    unit: 'pc',
    category_id: '',
    price_retail: 0,
    price_wholesale: 0,
    price_credit: 0,
    price_other: 0,
    tax_code: '',
    reorder_level: 0,
    preferred_supplier_id: '',
    is_scale_item: false,
    is_active: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newCategoryData, setNewCategoryData] = useState<NewCategoryData>({ name: '' });
  const [newSupplierData, setNewSupplierData] = useState<NewSupplierData>({
    supplier_name: '',
    contact_phone: '',
    contact_email: '',
    address: '',
    tax_id: ''
  });
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [localSuppliers, setLocalSuppliers] = useState<Supplier[]>(suppliers);

  // Update local state when props change
  useEffect(() => {
    setLocalCategories(categories);
    setLocalSuppliers(suppliers);
  }, [categories, suppliers]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        if (!saving && Object.keys(errors).length === 0) {
          handleSubmit(e as any);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, saving, errors]);

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Auto-set unit to 'kg' when is_scale_item is checked
    if (field === 'is_scale_item' && value === true) {
      setFormData(prev => ({ ...prev, unit: 'kg' }));
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      const newCategory = await dataService.createCategory({ name: newCategoryData.name });
      setLocalCategories(prev => [...prev, newCategory]);
      setFormData(prev => ({ ...prev, category_id: newCategory.id.toString() }));
      setNewCategoryData({ name: '' });
      setShowNewCategory(false);
      toast.success('Category created successfully');
    } catch (error) {
      console.error('Failed to create category:', error);
      toast.error('Failed to create category');
    }
  };

  const handleCreateSupplier = async () => {
    if (!newSupplierData.supplier_name.trim()) {
      toast.error('Supplier name is required');
      return;
    }

    try {
      const newSupplier = await dataService.createSupplier({
        ...newSupplierData,
        active: true
      });
      setLocalSuppliers(prev => [...prev, newSupplier]);
      setFormData(prev => ({ ...prev, preferred_supplier_id: newSupplier.id.toString() }));
      setNewSupplierData({
        supplier_name: '',
        contact_phone: '',
        contact_email: '',
        address: '',
        tax_id: ''
      });
      setShowNewSupplier(false);
      toast.success('Supplier created successfully');
    } catch (error) {
      console.error('Failed to create supplier:', error);
      toast.error('Failed to create supplier');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU is required';
    }

    if (!formData.name_en.trim()) {
      newErrors.name_en = 'English name is required';
    }

    if (!formData.unit) {
      newErrors.unit = 'Unit is required';
    }

    if (!formData.category_id) {
      newErrors.category_id = 'Category is required';
    }

    if (formData.price_retail < 0) {
      newErrors.price_retail = 'Price must be non-negative';
    }

    if (formData.price_wholesale < 0) {
      newErrors.price_wholesale = 'Price must be non-negative';
    }

    if (formData.price_credit < 0) {
      newErrors.price_credit = 'Price must be non-negative';
    }

    if (formData.price_other < 0) {
      newErrors.price_other = 'Price must be non-negative';
    }

    if (formData.reorder_level < 0) {
      newErrors.reorder_level = 'Reorder level must be non-negative';
    }

    if (formData.is_scale_item && formData.unit !== 'kg') {
      newErrors.unit = 'Scale items must use kg unit';
    }

    // Check pricing policy
    const pricingSettings = settings.pricingSettings;
    if (pricingSettings?.missingPricePolicy === 'block') {
      const requiredTiers = pricingSettings.requiredTiers || ['retail'];
      
      if (requiredTiers.includes('retail') && formData.price_retail <= 0) {
        newErrors.price_retail = 'Retail price is required';
      }
      if (requiredTiers.includes('wholesale') && formData.price_wholesale <= 0) {
        newErrors.price_wholesale = 'Wholesale price is required';
      }
      if (requiredTiers.includes('credit') && formData.price_credit <= 0) {
        newErrors.price_credit = 'Credit price is required';
      }
      if (requiredTiers.includes('other') && formData.price_other <= 0) {
        newErrors.price_other = 'Other price is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      // Check if SKU already exists
      const existingProduct = await dataService.getProductBySku(formData.sku);
      if (existingProduct) {
        setErrors(prev => ({ ...prev, sku: 'SKU already exists' }));
        setSaving(false);
        return;
      }

      const productData = {
        ...formData,
        category_id: parseInt(formData.category_id),
        preferred_supplier_id: formData.preferred_supplier_id ? parseInt(formData.preferred_supplier_id) : undefined
      };
      
      await dataService.createProduct(productData);
      toast.success('Product created successfully');
      onSave();
    } catch (error) {
      console.error('Failed to create product:', error);
      toast.error(`Failed to create product: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Add New Product</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Pricing Policy Indicator */}
        <div className="px-6 py-3 bg-blue-50 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-blue-900">Missing Price Policy:</span>
            <span className={`px-2 py-1 text-xs rounded-full ${
              settings.pricingSettings?.missingPricePolicy === 'block' 
                ? 'bg-red-100 text-red-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {settings.pricingSettings?.missingPricePolicy === 'block' ? 'Block & Require' : 'Warn & Allow'}
            </span>
            {settings.pricingSettings?.missingPricePolicy === 'block' && (
              <span className="text-xs text-blue-700">
                Required tiers: {settings.pricingSettings?.requiredTiers?.join(', ') || 'retail'}
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU *
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.sku ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., RICE5"
                />
                {errors.sku && <p className="text-red-600 text-xs mt-1">{errors.sku}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Barcode
                </label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => handleInputChange('barcode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 4791234567890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name (English) *
                </label>
                <input
                  type="text"
                  value={formData.name_en}
                  onChange={(e) => handleInputChange('name_en', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.name_en ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Rice 5kg"
                />
                {errors.name_en && <p className="text-red-600 text-xs mt-1">{errors.name_en}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name (Sinhala)
                </label>
                <input
                  type="text"
                  value={formData.name_si}
                  onChange={(e) => handleInputChange('name_si', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., හාල් 5kg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name (Tamil)
                </label>
                <input
                  type="text"
                  value={formData.name_ta}
                  onChange={(e) => handleInputChange('name_ta', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., அரிசி 5kg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit *
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => handleInputChange('unit', e.target.value as 'pc' | 'kg')}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.unit ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="pc">Piece (pc)</option>
                  <option value="kg">Kilogram (kg)</option>
                </select>
                {errors.unit && <p className="text-red-600 text-xs mt-1">{errors.unit}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <div className="flex space-x-2">
                  <select
                    value={formData.category_id}
                    onChange={(e) => handleInputChange('category_id', e.target.value)}
                    className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.category_id ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Category</option>
                    {localCategories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewCategory(true)}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                    title="Add New Category"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {errors.category_id && <p className="text-red-600 text-xs mt-1">{errors.category_id}</p>}
              </div>
            </div>

            {/* Pricing & Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Pricing & Settings</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price Retail (රු) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price_retail}
                  onChange={(e) => handleInputChange('price_retail', parseFloat(e.target.value) || 0)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.price_retail ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {errors.price_retail && <p className="text-red-600 text-xs mt-1">{errors.price_retail}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price Wholesale (රු)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price_wholesale}
                  onChange={(e) => handleInputChange('price_wholesale', parseFloat(e.target.value) || 0)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.price_wholesale ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {errors.price_wholesale && <p className="text-red-600 text-xs mt-1">{errors.price_wholesale}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price Credit (රු)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price_credit}
                  onChange={(e) => handleInputChange('price_credit', parseFloat(e.target.value) || 0)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.price_credit ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {errors.price_credit && <p className="text-red-600 text-xs mt-1">{errors.price_credit}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price Other (රු)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price_other}
                  onChange={(e) => handleInputChange('price_other', parseFloat(e.target.value) || 0)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.price_other ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {errors.price_other && <p className="text-red-600 text-xs mt-1">{errors.price_other}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax Code
                </label>
                <input
                  type="text"
                  value={formData.tax_code}
                  onChange={(e) => handleInputChange('tax_code', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., TAX001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reorder Level
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.reorder_level}
                  onChange={(e) => handleInputChange('reorder_level', parseInt(e.target.value) || 0)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.reorder_level ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0"
                />
                {errors.reorder_level && <p className="text-red-600 text-xs mt-1">{errors.reorder_level}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Supplier
                </label>
                <div className="flex space-x-2">
                  <select
                    value={formData.preferred_supplier_id}
                    onChange={(e) => handleInputChange('preferred_supplier_id', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Supplier</option>
                    {localSuppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.supplier_name}{!supplier.active ? ' (inactive)' : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewSupplier(true)}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                    title="Add New Supplier"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_scale_item"
                    checked={formData.is_scale_item}
                    onChange={(e) => handleInputChange('is_scale_item', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_scale_item" className="ml-2 text-sm font-medium text-gray-700">
                    Scale Item (for weighing)
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => handleInputChange('is_active', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-700">
                    Active (available for sale)
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Creating...' : 'Create Product (Ctrl+Enter)'}
            </button>
          </div>
        </form>
      </div>

      {/* New Category Modal */}
      {showNewCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add New Category</h3>
              <button
                onClick={() => setShowNewCategory(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={newCategoryData.name}
                  onChange={(e) => setNewCategoryData({ name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Electronics"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowNewCategory(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCategory}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700"
                >
                  Create Category
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Supplier Modal */}
      {showNewSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add New Supplier</h3>
              <button
                onClick={() => setShowNewSupplier(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  value={newSupplierData.supplier_name}
                  onChange={(e) => setNewSupplierData(prev => ({ ...prev, supplier_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., ABC Suppliers"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={newSupplierData.contact_phone}
                  onChange={(e) => setNewSupplierData(prev => ({ ...prev, contact_phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., +94 11 1234567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={newSupplierData.contact_email}
                  onChange={(e) => setNewSupplierData(prev => ({ ...prev, contact_email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., contact@abcsuppliers.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={newSupplierData.address}
                  onChange={(e) => setNewSupplierData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder="e.g., 123 Main Street, Colombo 01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax ID
                </label>
                <input
                  type="text"
                  value={newSupplierData.tax_id}
                  onChange={(e) => setNewSupplierData(prev => ({ ...prev, tax_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 123456789V"
                />
              </div>
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowNewSupplier(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSupplier}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700"
                >
                  Create Supplier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
