import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, TestTube } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { dataService, DiscountRule, Product, Category } from '@/services/dataService';
import { discountEngine } from '@/services/discountEngine';
import ManagerPinDialog from '@/components/Security/ManagerPinDialog';
import { authService } from '@/services/authService';
import { auditService, AUDIT_ACTIONS } from '@/services/auditService';

interface DiscountModalProps {
  rule?: DiscountRule | null;
  products: Product[];
  categories: Category[];
  onClose: () => void;
  onSave: () => void;
}

interface FormData {
  name: string;
  applies_to: 'PRODUCT' | 'CATEGORY';
  target_id: number;
  type: 'PERCENT' | 'AMOUNT';
  value: number;
  max_qty_or_weight?: number;
  active_from: string;
  active_to: string;
  priority: number;
  reason_required: boolean;
  active: boolean;
}

interface ValidationErrors {
  name?: string;
  target_id?: string;
  value?: string;
  max_qty_or_weight?: string;
  active_from?: string;
  active_to?: string;
  priority?: string;
}

export function DiscountModal({ rule, products, categories, onClose, onSave }: DiscountModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    applies_to: 'PRODUCT',
    target_id: 0,
    type: 'PERCENT',
    value: 0,
    max_qty_or_weight: undefined,
    active_from: new Date().toISOString().split('T')[0],
    active_to: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
    priority: 10,
    reason_required: false,
    active: true
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [conflictingRules, setConflictingRules] = useState<DiscountRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [showManagerPin, setShowManagerPin] = useState(false);
  const [pendingOverrideReason, setPendingOverrideReason] = useState('');

  // Initialize form data when rule prop changes
  useEffect(() => {
    if (rule && rule.id) {
      setFormData({
        name: rule.name,
        applies_to: rule.applies_to,
        target_id: rule.target_id,
        type: rule.type,
        value: rule.value,
        max_qty_or_weight: rule.max_qty_or_weight,
        active_from: new Date(rule.active_from).toISOString().split('T')[0],
        active_to: new Date(rule.active_to).toISOString().split('T')[0],
        priority: rule.priority,
        reason_required: rule.reason_required,
        active: rule.active
      });
    }
  }, [rule]);

  // Check for conflicts when target or dates change
  useEffect(() => {
    checkConflicts();
  }, [formData.applies_to, formData.target_id, formData.active_from, formData.active_to]);

  const checkConflicts = async () => {
    if (formData.target_id && formData.active_from && formData.active_to) {
      try {
        const conflicts = await dataService.checkDiscountRuleConflicts({
          id: rule?.id,
          applies_to: formData.applies_to,
          target_id: formData.target_id,
          active_from: new Date(formData.active_from),
          active_to: new Date(formData.active_to)
        });
        setConflictingRules(conflicts);
      } catch (error) {
        console.error('Error checking conflicts:', error);
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    // Target validation
    if (!formData.target_id) {
      newErrors.target_id = 'Please select a target';
    }

    // Value validation
    if (formData.value < 0) {
      newErrors.value = 'Value must be non-negative';
    }
    if (formData.type === 'PERCENT' && formData.value > 100) {
      newErrors.value = 'Percentage cannot exceed 100%';
    }

    // Max quantity validation
    if (formData.max_qty_or_weight !== undefined && formData.max_qty_or_weight < 0) {
      newErrors.max_qty_or_weight = 'Max quantity/weight must be non-negative';
    }

    // Date validation
    const fromDate = new Date(formData.active_from);
    const toDate = new Date(formData.active_to);
    
    if (fromDate >= toDate) {
      newErrors.active_from = 'Active from must be before active to';
    }

    // Priority validation
    if (formData.priority < 1) {
      newErrors.priority = 'Priority must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Enforce manager override when discount percent exceeds cap (example cap: 10%)
    const cashierCapPct = 10;
    if (formData.type === 'PERCENT' && formData.value > cashierCapPct) {
      setPendingOverrideReason(`Discount ${formData.value}% exceeds cap ${cashierCapPct}%`);
      setShowManagerPin(true);
      return;
    }

    setLoading(true);
    try {
      const ruleData: Omit<DiscountRule, 'id'> = {
        name: formData.name.trim(),
        applies_to: formData.applies_to,
        target_id: formData.target_id,
        type: formData.type,
        value: formData.value,
        max_qty_or_weight: formData.max_qty_or_weight,
        active_from: new Date(formData.active_from),
        active_to: new Date(formData.active_to),
        priority: formData.priority,
        reason_required: formData.reason_required,
        active: formData.active
      };

      if (rule?.id) {
        await dataService.updateDiscountRule(rule.id, ruleData);
        toast.success('Discount rule updated successfully');
      } else {
        await dataService.createDiscountRule(ruleData);
        toast.success('Discount rule created successfully');
      }

      onSave();
    } catch (error) {
      console.error('Error saving discount rule:', error);
      toast.error('Failed to save discount rule');
    } finally {
      setLoading(false);
    }
  };

  const handleTestRule = async () => {
    if (!validateForm()) {
      toast.error('Please fix validation errors before testing');
      return;
    }

    try {
      // Create a mock cart for testing
      const targetProduct = formData.applies_to === 'PRODUCT' 
        ? products.find(p => p.id === formData.target_id)
        : products.find(p => p.category_id === formData.target_id);

      if (!targetProduct) {
        toast.error('Cannot test rule: no matching product found');
        return;
      }

      const mockRule: DiscountRule = {
        id: rule?.id || 999999,
        name: formData.name,
        applies_to: formData.applies_to,
        target_id: formData.target_id,
        type: formData.type,
        value: formData.value,
        max_qty_or_weight: formData.max_qty_or_weight,
        active_from: new Date(formData.active_from),
        active_to: new Date(formData.active_to),
        priority: formData.priority,
        reason_required: formData.reason_required,
        active: formData.active
      };

      const mockLines = [{
        id: 1,
        product_id: targetProduct.id,
        product: targetProduct,
        qty: formData.max_qty_or_weight ? Math.min(5, formData.max_qty_or_weight + 2) : 3, // Test quantity that might exceed cap
        unit_price: targetProduct.price_retail,
        line_discount: 0,
        tax: targetProduct.price_retail * 3 * 0.15,
        total: targetProduct.price_retail * 3 * 1.15
      }];

      const result = await discountEngine.applyRulesToCart({
        lines: mockLines as any,
        rules: [mockRule]
      });

      setTestResult(result);
      toast.success('Rule test completed');
    } catch (error) {
      console.error('Error testing rule:', error);
      toast.error('Failed to test rule');
    }
  };

  const getTargetOptions = () => {
    if (formData.applies_to === 'PRODUCT') {
      return products.map(product => ({
        value: product.id,
        label: `${product.sku} - ${product.name_en}`
      }));
    } else {
      return categories.map(category => ({
        value: category.id,
        label: category.name
      }));
    }
  };

  const getTargetName = (applies_to: string, target_id: number) => {
    if (applies_to === 'PRODUCT') {
      const product = products.find(p => p.id === target_id);
      return product ? `${product.sku} - ${product.name_en}` : 'Unknown Product';
    } else {
      const category = categories.find(c => c.id === target_id);
      return category ? category.name : 'Unknown Category';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {rule?.id ? 'Edit Discount Rule' : 'Create Discount Rule'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white placeholder-gray-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Sugar Discount 10/kg"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* Applies To */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Applies To <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.applies_to}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  applies_to: e.target.value as 'PRODUCT' | 'CATEGORY',
                  target_id: 0 // Reset target when changing applies_to
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              >
                <option value="PRODUCT">Product</option>
                <option value="CATEGORY">Category</option>
              </select>
            </div>

            {/* Target */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.target_id}
                onChange={(e) => setFormData(prev => ({ ...prev, target_id: parseInt(e.target.value) }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white ${
                  errors.target_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="0">Select {formData.applies_to.toLowerCase()}...</option>
                {getTargetOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.target_id && <p className="text-red-500 text-sm mt-1">{errors.target_id}</p>}
            </div>
          </div>

          {/* Type and Value */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'PERCENT' | 'AMOUNT' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              >
                <option value="PERCENT">Percentage</option>
                <option value="AMOUNT">Fixed Amount</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Value <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={formData.type === 'PERCENT' ? '100' : undefined}
                  value={formData.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white placeholder-gray-500 ${
                    errors.value ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-500 text-sm">
                    {formData.type === 'PERCENT' ? '%' : 'රු'}
                  </span>
                </div>
              </div>
              {errors.value && <p className="text-red-500 text-sm mt-1">{errors.value}</p>}
            </div>
          </div>

          {/* Max Qty/Weight */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Quantity/Weight (Optional)
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={formData.max_qty_or_weight || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                max_qty_or_weight: e.target.value ? parseFloat(e.target.value) : undefined 
              }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white placeholder-gray-500 ${
                errors.max_qty_or_weight ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Leave empty for no limit"
            />
            <p className="text-sm text-gray-500 mt-1">
              Maximum quantity or weight this discount applies to per sale
            </p>
            {errors.max_qty_or_weight && <p className="text-red-500 text-sm mt-1">{errors.max_qty_or_weight}</p>}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Active From <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.active_from}
                onChange={(e) => setFormData(prev => ({ ...prev, active_from: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white ${
                  errors.active_from ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.active_from && <p className="text-red-500 text-sm mt-1">{errors.active_from}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Active To <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.active_to}
                onChange={(e) => setFormData(prev => ({ ...prev, active_to: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <input
              type="number"
              min="1"
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 10 }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white ${
                errors.priority ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            <p className="text-sm text-gray-500 mt-1">
              Lower numbers have higher priority (execute first)
            </p>
            {errors.priority && <p className="text-red-500 text-sm mt-1">{errors.priority}</p>}
          </div>

          {/* Checkboxes */}
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.reason_required}
                onChange={(e) => setFormData(prev => ({ ...prev, reason_required: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Require reason for manual discounts</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Active</span>
            </label>
          </div>

          {/* Conflict Warning */}
          {conflictingRules.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">Overlapping Rules Detected</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    The following rules overlap with this rule's target and date range:
                  </p>
                  <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                    {conflictingRules.map(conflict => (
                      <li key={conflict.id} className="flex items-center justify-between">
                        <span>
                          {conflict.name} (Priority: {conflict.priority})
                        </span>
                        <span className="text-xs">
                          {getTargetName(conflict.applies_to, conflict.target_id)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-yellow-700 mt-2">
                    Priority determines execution order. Lower numbers execute first.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Test Result */}
          {testResult && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Test Result</h4>
              <div className="text-sm text-blue-700">
                <p>Mock cart total: රු {testResult.totals.subtotal.toFixed(2)}</p>
                <p>Discount applied: රු {testResult.totals.discount.toFixed(2)}</p>
                <p>Final total: රු {testResult.totals.total.toFixed(2)}</p>
                {testResult.warnings.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium">Warnings:</p>
                    <ul className="list-disc list-inside">
                      {testResult.warnings.map((warning: string, index: number) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t">
            <button
              type="button"
              onClick={handleTestRule}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              disabled={loading}
            >
              <TestTube className="w-4 h-4 mr-2" />
              Test Rule
            </button>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Saving...' : rule?.id ? 'Update Rule' : 'Create Rule'}
              </button>
            </div>
          </div>
        </form>

        {/* Manager PIN Dialog */}
        <ManagerPinDialog
          isOpen={showManagerPin}
          onClose={() => setShowManagerPin(false)}
          permissions={[ 'DISCOUNT_OVERRIDE' as any ]}
          reason={pendingOverrideReason}
          requiredRole={'MANAGER' as any}
          onSuccess={async (manager) => {
            setShowManagerPin(false);
            setLoading(true);
            try {
              const ruleData: Omit<DiscountRule, 'id'> = {
                name: formData.name.trim(),
                applies_to: formData.applies_to,
                target_id: formData.target_id,
                type: formData.type,
                value: formData.value,
                max_qty_or_weight: formData.max_qty_or_weight,
                active_from: new Date(formData.active_from),
                active_to: new Date(formData.active_to),
                priority: formData.priority,
                reason_required: formData.reason_required,
                active: formData.active
              };

              if (rule?.id) {
                await dataService.updateDiscountRule(rule.id, ruleData);
              } else {
                await dataService.createDiscountRule(ruleData);
              }

              await auditService.log({
                action: AUDIT_ACTIONS.DISCOUNT_OVERRIDE,
                payload: {
                  cashier_id: authService.getCurrentUser()?.id || null,
                  manager_id: manager?.id || null,
                  reason: pendingOverrideReason,
                  rule_preview: { name: formData.name, type: formData.type, value: formData.value }
                }
              });

              toast.success('Discount rule saved with manager override');
              onSave();
            } catch (error) {
              console.error('Error saving discount rule with override:', error);
              toast.error('Failed to save rule');
            } finally {
              setLoading(false);
            }
          }}
          onError={() => {
            setShowManagerPin(false);
            toast.error('Manager authorization required');
          }}
        />
      </div>
    </div>
  );
}








