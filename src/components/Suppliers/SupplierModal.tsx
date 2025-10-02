import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { dataService, Supplier } from '@/services/dataService';

interface SupplierModalProps {
  supplier?: Supplier | null;
  onClose: () => void;
  onSave: () => void;
}

interface FormData {
  supplier_name: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  tax_id: string;
  active: boolean;
}

interface ValidationErrors {
  supplier_name?: string;
  contact_email?: string;
}

export function SupplierModal({ supplier, onClose, onSave }: SupplierModalProps) {
  const [formData, setFormData] = useState<FormData>({
    supplier_name: '',
    contact_phone: '',
    contact_email: '',
    address: '',
    tax_id: '',
    active: true
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);

  // Initialize form data when supplier prop changes
  useEffect(() => {
    if (supplier) {
      setFormData({
        supplier_name: supplier.supplier_name,
        contact_phone: supplier.contact_phone || '',
        contact_email: supplier.contact_email || '',
        address: supplier.address || '',
        tax_id: supplier.tax_id || '',
        active: supplier.active
      });
    }
  }, [supplier]);

  const validateForm = async (): Promise<boolean> => {
    const newErrors: ValidationErrors = {};

    // Supplier name validation
    if (!formData.supplier_name.trim()) {
      newErrors.supplier_name = 'Supplier name is required';
    } else {
      // Check for duplicate name (case-insensitive)
      const existingSupplier = await dataService.getSupplierByName(formData.supplier_name.trim());
      if (existingSupplier && existingSupplier.id !== supplier?.id) {
        newErrors.supplier_name = 'A supplier with this name already exists';
      }
    }

    // Email validation
    if (formData.contact_email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.contact_email.trim())) {
        newErrors.contact_email = 'Please enter a valid email address';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!(await validateForm())) {
      return;
    }

    setLoading(true);
    try {
      const supplierData: Omit<Supplier, 'id' | 'created_at'> = {
        supplier_name: formData.supplier_name.trim(),
        contact_phone: formData.contact_phone.trim() || undefined,
        contact_email: formData.contact_email.trim() || undefined,
        address: formData.address.trim() || undefined,
        tax_id: formData.tax_id.trim() || undefined,
        active: formData.active
      };

      if (supplier?.id) {
        await dataService.updateSupplier(supplier.id, supplierData);
        toast.success('Supplier updated successfully');
      } else {
        await dataService.createSupplier(supplierData);
        toast.success('Supplier created successfully');
      }

      onSave();
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error('Failed to save supplier');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {supplier?.id ? 'Edit Supplier' : 'Create Supplier'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Supplier Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.supplier_name}
              onChange={(e) => handleInputChange('supplier_name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.supplier_name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter supplier name"
              autoFocus
            />
            {errors.supplier_name && (
              <p className="text-red-500 text-sm mt-1">{errors.supplier_name}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={formData.contact_phone}
              onChange={(e) => handleInputChange('contact_phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter phone number"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.contact_email}
              onChange={(e) => handleInputChange('contact_email', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.contact_email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter email address"
            />
            {errors.contact_email && (
              <p className="text-red-500 text-sm mt-1">{errors.contact_email}</p>
            )}
          </div>

          {/* Tax ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tax ID
            </label>
            <input
              type="text"
              value={formData.tax_id}
              onChange={(e) => handleInputChange('tax_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter tax identification number"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter supplier address"
            />
          </div>

          {/* Active Status */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => handleInputChange('active', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Active</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Inactive suppliers can still be selected in products but are marked as inactive
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t">
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
              {loading ? 'Saving...' : supplier?.id ? 'Update Supplier' : 'Create Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



