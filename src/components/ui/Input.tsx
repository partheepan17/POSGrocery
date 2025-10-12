import React from 'react';
import { cn } from '@/utils/cn';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  success?: boolean;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'pos' | 'search';
  'aria-describedby'?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className,
    type = 'text',
    label,
    error,
    success,
    helperText,
    leftIcon,
    rightIcon,
    inputSize = 'md',
    variant = 'default',
    'aria-describedby': ariaDescribedby,
    id,
    ...props 
  }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;
    const describedBy = [ariaDescribedby, errorId, helperId].filter(Boolean).join(' ');

    const baseClasses = 'w-full border transition-colors focus:outline-none focus:ring-1 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      default: 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-400 dark:focus:ring-primary-400',
      pos: 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:border-pos-info focus:ring-pos-info dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 dark:focus:border-pos-info dark:focus:ring-pos-info font-medium',
      search: 'border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-500 focus:border-primary-500 focus:ring-primary-500 focus:bg-white dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-400 dark:focus:ring-primary-400 dark:focus:bg-gray-800'
    };

    const sizes = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-3 text-sm',
      lg: 'h-12 px-4 text-base'
    };

    const roundedClasses = 'rounded-md';

    const stateClasses = error 
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-400 dark:focus:border-red-400 dark:focus:ring-red-400'
      : success
      ? 'border-green-500 focus:border-green-500 focus:ring-green-500 dark:border-green-400 dark:focus:border-green-400 dark:focus:ring-green-400'
      : '';

    const paddingClasses = leftIcon ? 'pl-10' : rightIcon ? 'pr-10' : '';

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className={cn(
                "text-gray-400",
                inputSize === 'sm' ? 'w-4 h-4' : inputSize === 'md' ? 'w-4 h-4' : 'w-5 h-5'
              )} aria-hidden="true">
                {leftIcon}
              </span>
            </div>
          )}
          <input
            ref={ref}
            type={type}
            id={inputId}
            className={cn(
              baseClasses,
              variants[variant],
              sizes[inputSize],
              roundedClasses,
              stateClasses,
              paddingClasses,
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={describedBy || undefined}
            {...props}
          />
          {rightIcon && !error && !success && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className={cn(
                "text-gray-400",
                inputSize === 'sm' ? 'w-4 h-4' : inputSize === 'md' ? 'w-4 h-4' : 'w-5 h-5'
              )} aria-hidden="true">
                {rightIcon}
              </span>
            </div>
          )}
          {error && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <AlertCircle className={cn(
                "text-red-500",
                inputSize === 'sm' ? 'w-4 h-4' : inputSize === 'md' ? 'w-4 h-4' : 'w-5 h-5'
              )} aria-hidden="true" />
            </div>
          )}
          {success && !error && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <CheckCircle className={cn(
                "text-green-500",
                inputSize === 'sm' ? 'w-4 h-4' : inputSize === 'md' ? 'w-4 h-4' : 'w-5 h-5'
              )} aria-hidden="true" />
            </div>
          )}
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

Input.displayName = 'Input';

export { Input };
export type { InputProps };
