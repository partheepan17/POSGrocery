import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { dataService, DiscountRule, Product, Category } from '@/services/dataService';

interface DiscountRuleModalProps {
  rule: DiscountRule | null;
  products: Product[];
  categories: Category[];
  onClose: () => void;
  onSave: () => void;
}

interface RuleFormData {
  name: string;
  applies_to: 'PRODUCT' | 'CATEGORY';
  target_id: string;
  type: 'PERCENT' | 'AMOUNT';
  value: string;
  max_qty_or_weight: string;
  active_from: string;
  active_to: string;
  priority: string;
  reason_required: boolean;
  active: boolean;
}

interface ValidationError {
  field: string;
  message: string;
}

interface ConflictWarning {
  message: string;
  conflictingRules: string[];
}

export function DiscountRuleModal({ rule, products, categories, onClose, onSave }: DiscountRuleModalProps) {
  const [activeTab, setActiveTab] = useState<'basics' | 'eligibility'>('basics');
  const [formData, setFormData] = useState<RuleFormData>({
    name: '',
    applies_to: 'PRODUCT',
    target_id: '',
    type: 'PERCENT',
    value: '',
    max_qty_or_weight: '',
    active_from: '',
    active_to: '',
    priority: '1',
    reason_required: false,
    active: true
  });

  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [conflicts, setConflicts] = useState<ConflictWarning | null>(null);
  const [saving, setSaving] = useState(false);

  // Initialize form data
  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name,
        applies_to: rule.applies_to,
        target_id: rule.target_id.toString(),
        type: rule.type,
        value: rule.value.toString(),
        max_qty_or_weight: rule.max_qty_or_weight?.toString() || '',
        active_from: rule.active_from ? new Date(rule.active_from).toISOString().split('T')[0] : '',
        active_to: rule.active_to ? new Date(rule.active_to).toISOString().split('T')[0] : '',
        priority: rule.priority.toString(),
        reason_required: rule.reason_required,
        active: rule.active
      });
    } else {
      // Reset form for new rule
      setFormData({
        name: '',
        applies_to: 'PRODUCT',
        target_id: '',
        type: 'PERCENT',
        value: '',
        max_qty_or_weight: '',
        active_from: '',
        active_to: '',
        priority: '1',
        reason_required: false,
        active: true
      });
    }
    setErrors([]);
    setConflicts(null);
  }, [rule]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        if (!saving && errors.length === 0) {
          handleSubmit(e as any);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, saving, errors]);

  const handleInputChange = (field: keyof RuleFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors.some(e => e.field === field)) {
      setErrors(prev => prev.filter(e => e.field !== field));
    }

    // Clear conflicts when form changes
    if (conflicts) {
      setConflicts(null);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationError[] = [];

    // Name validation
    if (!formData.name.trim()) {
      newErrors.push({ field: 'name', message: 'Rule name is required' });
    }

    // Target validation
    if (!formData.target_id) {
      newErrors.push({ 
        field: 'target_id', 
        message: formData.applies_to === 'PRODUCT' ? 'Please select a product' : 'Please select a category'
      });
    }

    // Value validation
    const valueNum = parseFloat(formData.value);
    if (isNaN(valueNum) || valueNum < 0) {
      newErrors.push({ field: 'value', message: 'Value must be a positive number' });
    }

    if (formData.type === 'PERCENT' && valueNum > 100) {
      newErrors.push({ field: 'value', message: 'Percentage cannot exceed 100%' });
    }

    // Max qty/weight validation
    if (formData.max_qty_or_weight) {
      const maxNum = parseFloat(formData.max_qty_or_weight);
      if (isNaN(maxNum) || maxNum <= 0) {
        newErrors.push({ field: 'max_qty_or_weight', message: 'Max qty/weight must be a positive number' });
      }
    }

    // Priority validation
    const priorityNum = parseInt(formData.priority);
    if (isNaN(priorityNum) || priorityNum < 1) {
      newErrors.push({ field: 'priority', message: 'Priority must be a positive integer' });
    }

    // Date validation
    if (formData.active_from && formData.active_to) {
      const fromDate = new Date(formData.active_from);
      const toDate = new Date(formData.active_to);
      if (fromDate >= toDate) {
        newErrors.push({ field: 'active_to', message: 'Active To date must be after Active From date' });
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const checkConflicts = async (): Promise<ConflictWarning | null> => {
    try {
      // Get all existing rules for the same target
      const allRules = await dataService.getDiscountRules();
      const targetId = parseInt(formData.target_id);
      const currentPriority = parseInt(formData.priority);
      
      const conflictingRules = allRules.filter(existingRule => {
        // Skip the current rule being edited
        if (rule && existingRule.id === rule.id) return false;
        
        // Check if same target
        if (existingRule.target_id !== targetId) return false;
        
        // Check if active
        if (!existingRule.active) return false;
        
        // Check date overlap
        const existingFrom = new Date(existingRule.active_from);
        const existingTo = new Date(existingRule.active_to);
        const newFrom = formData.active_from ? new Date(formData.active_from) : new Date();
        const newTo = formData.active_to ? new Date(formData.active_to) : new Date('2099-12-31');
        
        const hasOverlap = (newFrom <= existingTo && newTo >= existingFrom);
        if (!hasOverlap) return false;
        
        // Check priority conflict (same priority)
        if (existingRule.priority === currentPriority) return true;
        
        return false;
      });

      if (conflictingRules.length > 0) {
        return {
          message: `Found ${conflictingRules.length} conflicting rule(s) with overlapping dates and same priority`,
          conflictingRules: conflictingRules.map(r => r.name)
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to check conflicts:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      // Check for conflicts
      const conflictWarning = await checkConflicts();
      if (conflictWarning) {
        setConflicts(conflictWarning);
        setSaving(false);
        return;
      }

      const ruleData = {
        name: formData.name.trim(),
        applies_to: formData.applies_to,
        target_id: parseInt(formData.target_id),
        type: formData.type,
        value: parseFloat(formData.value),
        max_qty_or_weight: formData.max_qty_or_weight ? parseFloat(formData.max_qty_or_weight) : undefined,
        active_from: formData.active_from ? new Date(formData.active_from) : new Date(),
        active_to: formData.active_to ? new Date(formData.active_to) : new Date('2099-12-31'),
        priority: parseInt(formData.priority),
        reason_required: formData.reason_required,
        active: formData.active
      };

      if (rule) {
        await dataService.updateDiscountRule(rule.id, ruleData);
        toast.success('Discount rule updated successfully');
      } else {
        await dataService.createDiscountRule(ruleData);
        toast.success('Discount rule created successfully');
      }

      onSave();
    } catch (error) {
      console.error('Failed to save discount rule:', error);
      toast.error(`Failed to save discount rule: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const getTargetName = (targetId: string): string => {
    if (formData.applies_to === 'PRODUCT') {
      const product = products.find(p => p.id === parseInt(targetId));
      return product ? `${product.sku} - ${product.name_en}` : '';
    } else {
      const category = categories.find(c => c.id === parseInt(targetId));
      return category ? category.name : '';
    }
  };

  const getError = (field: string): string | undefined => {
    return errors.find(e => e.field === field)?.message;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {rule ? 'Edit Discount Rule' : 'New Discount Rule'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('basics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'basics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Basics
            </button>
            <button
              onClick={() => setActiveTab('eligibility')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'eligibility'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Eligibility & Window
            </button>
          </nav>
        </div>

        {/* Conflict Warning */}
        {conflicts && (
          <div className="mx-6 mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800">Potential Conflict Detected</h3>
                <p className="text-sm text-yellow-700 mt-1">{conflicts.message}</p>
                <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside">
                  {conflicts.conflictingRules.map((ruleName, index) => (
                    <li key={index}>{ruleName}</li>
                  ))}
                </ul>
                <p className="text-sm text-yellow-700 mt-2">
                  The rule with higher priority (lower number) will take precedence.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6">
          {activeTab === 'basics' && (
            <div className="space-y-6">
              {/* Rule Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rule Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    getError('name') ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Sugar Bulk Discount"
                />
                {getError('name') && <p className="text-red-600 text-xs mt-1">{getError('name')}</p>}
              </div>

              {/* Applies To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Applies To *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="PRODUCT"
                      checked={formData.applies_to === 'PRODUCT'}
                      onChange={(e) => {
                        handleInputChange('applies_to', e.target.value);
                        handleInputChange('target_id', ''); // Clear target when switching
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">Product</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="CATEGORY"
                      checked={formData.applies_to === 'CATEGORY'}
                      onChange={(e) => {
                        handleInputChange('applies_to', e.target.value);
                        handleInputChange('target_id', ''); // Clear target when switching
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">Category</span>
                  </label>
                </div>
              </div>

              {/* Target Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.applies_to === 'PRODUCT' ? 'Product *' : 'Category *'}
                </label>
                <select
                  value={formData.target_id}
                  onChange={(e) => handleInputChange('target_id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    getError('target_id') ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select {formData.applies_to === 'PRODUCT' ? 'Product' : 'Category'}</option>
                  {formData.applies_to === 'PRODUCT' ? (
                    products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.sku} - {product.name_en}
                      </option>
                    ))
                  ) : (
                    categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))
                  )}
                </select>
                {getError('target_id') && <p className="text-red-600 text-xs mt-1">{getError('target_id')}</p>}
                {formData.target_id && (
                  <p className="text-sm text-gray-600 mt-1">
                    Selected: {getTargetName(formData.target_id)}
                  </p>
                )}
              </div>

              {/* Discount Type and Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="PERCENT">Percentage (%)</option>
                    <option value="AMOUNT">Fixed Amount (රු)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Value *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={formData.type === 'PERCENT' ? '100' : undefined}
                      value={formData.value}
                      onChange={(e) => handleInputChange('value', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                        getError('value') ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder={formData.type === 'PERCENT' ? '10' : '50.00'}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 text-sm">
                        {formData.type === 'PERCENT' ? '%' : 'රු'}
                      </span>
                    </div>
                  </div>
                  {getError('value') && <p className="text-red-600 text-xs mt-1">{getError('value')}</p>}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    getError('priority') ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="1"
                />
                {getError('priority') && <p className="text-red-600 text-xs mt-1">{getError('priority')}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  Lower numbers have higher priority (1 = highest priority)
                </p>
              </div>
            </div>
          )}

          {activeTab === 'eligibility' && (
            <div className="space-y-6">
              {/* Max Qty/Weight */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Quantity/Weight (Optional)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={formData.max_qty_or_weight}
                  onChange={(e) => handleInputChange('max_qty_or_weight', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    getError('max_qty_or_weight') ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., 3.000 (for 3kg limit)"
                />
                {getError('max_qty_or_weight') && <p className="text-red-600 text-xs mt-1">{getError('max_qty_or_weight')}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for no limit. Use decimals for weight (kg), integers for pieces.
                </p>
              </div>

              {/* Active From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Active From (Optional)
                </label>
                <input
                  type="date"
                  value={formData.active_from}
                  onChange={(e) => handleInputChange('active_from', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to start immediately
                </p>
              </div>

              {/* Active To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Active To (Optional)
                </label>
                <input
                  type="date"
                  value={formData.active_to}
                  onChange={(e) => handleInputChange('active_to', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                    getError('active_to') ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {getError('active_to') && <p className="text-red-600 text-xs mt-1">{getError('active_to')}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for no end date
                </p>
              </div>

              {/* Options */}
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="reason_required"
                    checked={formData.reason_required}
                    onChange={(e) => handleInputChange('reason_required', e.target.checked)}
                    className="mr-3"
                  />
                  <label htmlFor="reason_required" className="text-sm font-medium text-gray-700">
                    Require reason when applying this discount
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => handleInputChange('active', e.target.checked)}
                    className="mr-3"
                  />
                  <label htmlFor="active" className="text-sm font-medium text-gray-700">
                    Active (rule will be applied during sales)
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || errors.length > 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : `${rule ? 'Update' : 'Create'} Rule (Ctrl+Enter)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}









