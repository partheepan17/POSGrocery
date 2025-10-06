/**
 * Hold Create Modal
 * Modal for creating a new hold with name, customer, note, and expiry options
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, Clock, User, FileText, Save } from 'lucide-react';
import { cn } from '@/utils/cn';
import { holdService } from '@/services/holdService';

interface Customer {
  id: number;
  customer_name: string;
  customer_type: string;
}

interface HoldCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    hold_name: string;
    customer_id?: number;
    note?: string;
    expiry_minutes?: number;
  }) => void;
  suggestedName: string;
  customers: Customer[];
}

const HoldCreateModal: React.FC<HoldCreateModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  suggestedName,
  customers
}) => {
  const [formData, setFormData] = useState({
    hold_name: '',
    customer_id: '',
    note: '',
    expiry_minutes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      const settings = holdService.getHoldSettings();
      setFormData({
        hold_name: suggestedName,
        customer_id: '',
        note: '',
        expiry_minutes: settings.expiryMinutes > 0 ? settings.expiryMinutes.toString() : ''
      });
      setErrors({});
    }
  }, [isOpen, suggestedName]);

  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    
    if (!formData.hold_name.trim()) {
      newErrors.hold_name = 'Hold name is required';
    }

    const settings = holdService.getHoldSettings();
    if (settings.requireCustomerForHold && !formData.customer_id) {
      newErrors.customer_id = 'Customer is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onConfirm({
      hold_name: formData.hold_name.trim(),
      customer_id: formData.customer_id ? parseInt(formData.customer_id) : undefined,
      note: formData.note.trim() || undefined,
      expiry_minutes: formData.expiry_minutes ? parseInt(formData.expiry_minutes) : undefined
    });
  }, [formData, onConfirm]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        // Create a synthetic form event for the submit handler
        handleSubmit({ preventDefault: () => {} } as unknown as React.FormEvent);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, formData, handleSubmit]);

  if (!isOpen) return null;

  const settings = holdService.getHoldSettings();
  const expiryMinutes = formData.expiry_minutes ? parseInt(formData.expiry_minutes) : settings.expiryMinutes;
  const expiryPreview = holdService.getExpiryPreview(expiryMinutes);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Save className="h-5 w-5 text-blue-600" />
            Create Hold
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Hold Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Hold Name *
            </label>
            <input
              type="text"
              value={formData.hold_name}
              onChange={(e) => setFormData(prev => ({ ...prev, hold_name: e.target.value }))}
              className={cn(
                "w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white",
                errors.hold_name 
                  ? "border-red-300 dark:border-red-600" 
                  : "border-gray-300 dark:border-gray-600 focus:border-blue-500"
              )}
              placeholder="Enter hold name"
              autoFocus
            />
            {errors.hold_name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.hold_name}</p>
            )}
          </div>

          {/* Customer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Customer {settings.requireCustomerForHold && '*'}
            </label>
            <select
              value={formData.customer_id}
              onChange={(e) => setFormData(prev => ({ ...prev, customer_id: e.target.value }))}
              className={cn(
                "w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white",
                errors.customer_id 
                  ? "border-red-300 dark:border-red-600" 
                  : "border-gray-300 dark:border-gray-600 focus:border-blue-500"
              )}
            >
              <option value="">Select customer (optional)</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.customer_name} ({customer.customer_type})
                </option>
              ))}
            </select>
            {errors.customer_id && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.customer_id}</p>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Note
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500"
              placeholder="Optional note about this hold"
              rows={2}
            />
          </div>

          {/* Expiry */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Expiry (minutes)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="1440"
                value={formData.expiry_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, expiry_minutes: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500"
                placeholder="0 = no expiry"
              />
              <Clock className="h-4 w-4 text-gray-400" />
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {expiryPreview}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-gray-500/50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Save className="h-4 w-4" />
              Create Hold (Ctrl+Enter)
            </button>
          </div>
        </form>

        {/* Help */}
        <div className="px-6 pb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">Hold Tips:</p>
                <ul className="text-xs space-y-1">
                  <li>• Use descriptive names for easy identification</li>
                  <li>• Customer helps with organization and lookup</li>
                  <li>• Set expiry to prevent old holds accumulating</li>
                  <li>• Notes help remember special instructions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HoldCreateModal;







