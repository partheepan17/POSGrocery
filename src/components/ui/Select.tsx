import React from 'react';
import { cn } from '@/utils/cn';
import { ChevronDown, AlertCircle, CheckCircle } from 'lucide-react';

interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  success?: boolean;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'pos';
  'aria-describedby'?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ 
    className,
    label,
    error,
    success,
    helperText,
    options,
    placeholder,
    size = 'md',
    variant = 'default',
    'aria-describedby': ariaDescribedby,
    id,
    ...props 
  }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = error ? `${selectId}-error` : undefined;
    const helperId = helperText ? `${selectId}-helper` : undefined;
    const describedBy = [ariaDescribedby, errorId, helperId].filter(Boolean).join(' ');

    const baseClasses = 'w-full border transition-colors focus:outline-none focus:ring-1 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer';
    
    const variants = {
      default: 'border-gray-300 bg-white text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-primary-400 dark:focus:ring-primary-400',
      pos: 'border-gray-300 bg-white text-gray-900 focus:border-pos-info focus:ring-pos-info dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-pos-info dark:focus:ring-pos-info font-medium'
    };

    const sizes = {
      sm: 'h-8 px-3 text-sm pr-8',
      md: 'h-10 px-3 text-sm pr-10',
      lg: 'h-12 px-4 text-base pr-12'
    };

    const roundedClasses = 'rounded-md';

    const stateClasses = error 
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-400 dark:focus:border-red-400 dark:focus:ring-red-400'
      : success
      ? 'border-green-500 focus:border-green-500 focus:ring-green-500 dark:border-green-400 dark:focus:border-green-400 dark:focus:ring-green-400'
      : '';

    const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5';

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              baseClasses,
              variants[variant],
              sizes[size],
              roundedClasses,
              stateClasses,
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={describedBy || undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option 
                key={option.value} 
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {error ? (
              <AlertCircle className={cn("text-red-500", iconSize)} aria-hidden="true" />
            ) : success ? (
              <CheckCircle className={cn("text-green-500", iconSize)} aria-hidden="true" />
            ) : (
              <ChevronDown className={cn("text-gray-400", iconSize)} aria-hidden="true" />
            )}
          </div>
        </div>
        {error && (
          <p id={errorId} className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
export type { SelectProps, SelectOption };


