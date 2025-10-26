export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null | Promise<string | null>;
  message?: string;
}

export interface ValidationRules {
  [key: string]: ValidationRule;
}

export interface ValidationErrors {
  [key: string]: string;
}

export class FormValidator {
  private rules: ValidationRules;

  constructor(rules: ValidationRules) {
    this.rules = rules;
  }

  validate(data: Record<string, any>): ValidationErrors {
    const errors: ValidationErrors = {};

    for (const [field, rule] of Object.entries(this.rules)) {
      const value = data[field];
      const error = this.validateField(field, value, rule);
      if (error) {
        errors[field] = error;
      }
    }

    return errors;
  }

  private validateField(field: string, value: any, rule: ValidationRule): string | null {
    // Required validation
    if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return rule.message || `${this.formatFieldName(field)} is required`;
    }

    // Skip other validations if value is empty and not required
    if (!value || (typeof value === 'string' && !value.trim())) {
      return null;
    }

    // Min length validation
    if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
      return rule.message || `${this.formatFieldName(field)} must be at least ${rule.minLength} characters`;
    }

    // Max length validation
    if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
      return rule.message || `${this.formatFieldName(field)} must be no more than ${rule.maxLength} characters`;
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      return rule.message || `${this.formatFieldName(field)} format is invalid`;
    }

    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value);
      if (customError instanceof Promise) {
        // Handle async validation - for now, we'll skip it in sync validation
        // In a real implementation, you'd handle this differently
        return null;
      }
      if (customError) {
        return customError;
      }
    }

    return null;
  }

  private formatFieldName(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/_/g, ' ');
  }

  isValid(data: Record<string, any>): boolean {
    const errors = this.validate(data);
    return Object.keys(errors).length === 0;
  }
}

// Common validation rules
export const commonRules = {
  required: (message?: string): ValidationRule => ({
    required: true,
    message
  }),
  
  email: (message?: string): ValidationRule => ({
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: message || 'Please enter a valid email address'
  }),
  
  phone: (message?: string): ValidationRule => ({
    pattern: /^[+]?[1-9][\d]{0,15}$/,
    message: message || 'Please enter a valid phone number'
  }),
  
  minLength: (length: number, message?: string): ValidationRule => ({
    minLength: length,
    message: message || `Must be at least ${length} characters`
  }),
  
  maxLength: (length: number, message?: string): ValidationRule => ({
    maxLength: length,
    message: message || `Must be no more than ${length} characters`
  }),
  
  numeric: (message?: string): ValidationRule => ({
    pattern: /^\d+$/,
    message: message || 'Must be a number'
  }),
  
  decimal: (message?: string): ValidationRule => ({
    pattern: /^\d+(\.\d{1,2})?$/,
    message: message || 'Must be a valid decimal number'
  }),
  
  positive: (message?: string): ValidationRule => ({
    custom: (value: any) => {
      const num = parseFloat(value);
      if (isNaN(num) || num <= 0) {
        return message || 'Must be a positive number';
      }
      return null;
    }
  }),
  
  unique: (checkFn: (value: any) => Promise<boolean>, message?: string): ValidationRule => ({
    custom: async (value: any) => {
      try {
        const isUnique = await checkFn(value);
        if (!isUnique) {
          return message || 'This value already exists';
        }
        return null;
      } catch (error) {
        return 'Validation error';
      }
    }
  })
};

// Hook for form validation
export function useFormValidation(rules: ValidationRules) {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const validator = new FormValidator(rules);

  const validate = (data: Record<string, any>) => {
    const newErrors = validator.validate(data);
    setErrors(newErrors);
    return newErrors;
  };

  const validateField = (field: string, value: any) => {
    const rule = rules[field];
    if (!rule) return null;

    const error = validator['validateField'](field, value, rule);
    setErrors(prev => ({
      ...prev,
      [field]: error || ''
    }));
    return error;
  };

  const touchField = (field: string) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
  };

  const reset = () => {
    setErrors({});
    setTouched({});
  };

  const hasError = (field: string) => {
    return touched[field] && errors[field];
  };

  const getError = (field: string) => {
    return touched[field] ? errors[field] : '';
  };

  const isValid = (data: Record<string, any>) => {
    return validator.isValid(data);
  };

  return {
    errors,
    touched,
    validate,
    validateField,
    touchField,
    reset,
    hasError,
    getError,
    isValid
  };
}

// Import useState for the hook
import { useState } from 'react';
