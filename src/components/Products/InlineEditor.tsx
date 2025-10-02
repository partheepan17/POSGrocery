import React, { useState, useEffect, useRef } from 'react';
import { Check, X } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  enum?: string[];
  unique?: boolean;
  pattern?: RegExp;
}

interface InlineEditorProps {
  value: any;
  field: string;
  rowId: string;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (value: any) => void;
  onCancel: () => void;
  type?: 'text' | 'number' | 'select' | 'checkbox' | 'textarea';
  options?: Option[];
  formatValue?: (value: any) => string;
  validation?: ValidationRule;
  placeholder?: string;
}

export function InlineEditor({
  value,
  field,
  rowId,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  type = 'text',
  options = [],
  formatValue,
  validation,
  placeholder
}: InlineEditorProps) {
  const [editValue, setEditValue] = useState<any>(value);
  const [error, setError] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing) {
      const currentRef = type === 'select' ? selectRef.current : 
                        type === 'textarea' ? textareaRef.current : 
                        inputRef.current;
      if (currentRef) {
        currentRef.focus();
        if ((type === 'text' || type === 'number') && 'select' in currentRef) {
          currentRef.select();
        }
      }
    }
  }, [isEditing, type]);

  const validateValue = (val: any): string => {
    if (!validation) return '';

    if (validation.required && (val === '' || val === null || val === undefined)) {
      return 'This field is required';
    }

    if (type === 'number') {
      const numValue = parseFloat(val);
      if (isNaN(numValue)) {
        return 'Must be a valid number';
      }
      if (validation.min !== undefined && numValue < validation.min) {
        return `Must be at least ${validation.min}`;
      }
      if (validation.max !== undefined && numValue > validation.max) {
        return `Must be at most ${validation.max}`;
      }
    }

    if (validation.enum && !validation.enum.includes(val)) {
      return `Must be one of: ${validation.enum.join(', ')}`;
    }

    if (validation.pattern && !validation.pattern.test(val)) {
      return 'Invalid format';
    }

    return '';
  };

  const handleSave = () => {
    const errorMsg = validateValue(editValue);
    if (errorMsg) {
      setError(errorMsg);
      return;
    }

    setError('');
    onSave(editValue);
  };

  const handleCancel = () => {
    setEditValue(value);
    setError('');
    onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    // Small delay to allow click on save/cancel buttons
    setTimeout(() => {
      if (!error) {
        handleSave();
      }
    }, 100);
  };

  const renderDisplayValue = () => {
    if (formatValue) {
      return formatValue(value);
    }

    switch (type) {
      case 'checkbox':
        return (
          <span className={`px-2 py-1 text-xs rounded-full ${
            value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {value ? 'Yes' : 'No'}
          </span>
        );
      case 'select':
        const option = options.find(opt => opt.value === value);
        return option ? option.label : value || '-';
      default:
        return value || '-';
    }
  };

  const renderInput = () => {
    const baseProps = {
      value: editValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
        setEditValue(newValue);
        setError(validateValue(newValue));
      },
      onKeyDown: handleKeyDown,
      onBlur: handleBlur,
      className: `w-full px-2 py-1 border rounded ${
        error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
      } focus:outline-none focus:ring-2`
    };

    switch (type) {
      case 'number':
        return (
          <input
            {...baseProps}
            ref={inputRef}
            type="number"
            step="0.01"
            min={validation?.min}
            max={validation?.max}
            placeholder={placeholder}
          />
        );
      case 'select':
        return (
          <select {...baseProps} ref={selectRef}>
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case 'checkbox':
        return (
          <input
            {...baseProps}
            ref={inputRef}
            type="checkbox"
            checked={editValue}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        );
      case 'textarea':
        return (
          <textarea
            {...baseProps}
            ref={textareaRef}
            rows={2}
            placeholder={placeholder}
          />
        );
      default:
        return (
          <input
            {...baseProps}
            ref={inputRef}
            type="text"
            placeholder={placeholder}
          />
        );
    }
  };

  if (!isEditing) {
    return (
      <div
        className="cursor-pointer hover:bg-gray-100 rounded px-1 py-1 min-h-[28px] flex items-center"
        onClick={onEdit}
      >
        {renderDisplayValue()}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center space-x-1">
        <div className="flex-1">
          {renderInput()}
          {error && (
            <div className="text-xs text-red-600 mt-1">
              {error}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={handleSave}
            className="p-1 text-green-600 hover:text-green-800 hover:bg-green-100 rounded"
            title="Save (Enter)"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={handleCancel}
            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
            title="Cancel (Esc)"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
