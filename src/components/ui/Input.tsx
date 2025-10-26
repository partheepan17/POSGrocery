import React from 'react';
import { cn } from '@/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'pos';
  inputSize?: 'sm' | 'md' | 'lg';
  error?: string;
  helperText?: string;
  label?: string;
  required?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    type, 
    leftIcon, 
    rightIcon, 
    variant = 'default', 
    inputSize = 'md', 
    error,
    helperText,
    label,
    required,
    id,
    ...props 
  }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;
    
    const baseClasses = "flex w-full rounded-md border bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:ring-offset-gray-900 dark:placeholder:text-gray-400";
    
    const variantClasses = {
      default: "border-gray-300 focus-visible:ring-blue-500 dark:border-gray-600 dark:focus-visible:ring-blue-400",
      destructive: "border-red-500 focus-visible:ring-red-500 dark:border-red-600 dark:focus-visible:ring-red-400",
      outline: "border-gray-300 focus-visible:ring-blue-500 dark:border-gray-600 dark:focus-visible:ring-blue-400",
      secondary: "border-gray-200 bg-gray-50 focus-visible:ring-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:focus-visible:ring-gray-400",
      ghost: "border-transparent focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400",
      link: "border-transparent underline-offset-4 hover:underline focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400",
      pos: "border-blue-300 bg-blue-50 focus-visible:ring-blue-500 dark:border-blue-600 dark:bg-blue-900/20 dark:focus-visible:ring-blue-400"
    };

    const sizeClasses = {
      sm: "h-8 px-2 py-1 text-xs",
      md: "h-10 px-3 py-2 text-sm",
      lg: "h-12 px-4 py-3 text-base"
    };

    const inputElement = (
      <input
        type={type}
        id={inputId}
        className={cn(
          baseClasses,
          variantClasses[error ? 'destructive' : variant],
          sizeClasses[inputSize],
          leftIcon && "pl-10",
          rightIcon && "pr-10",
          className
        )}
        ref={ref}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={cn(
          errorId,
          helperId
        )}
        {...props}
      />
    );

    const inputWithIcons = leftIcon || rightIcon ? (
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {leftIcon}
          </div>
        )}
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {rightIcon}
          </div>
        )}
        {inputElement}
      </div>
    ) : inputElement;

    if (label || error || helperText) {
      return (
        <div className="space-y-1">
          {label && (
            <label 
              htmlFor={inputId}
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </label>
          )}
          {inputWithIcons}
          {error && (
            <p id={errorId} className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
          {helperText && !error && (
            <p id={helperId} className="text-sm text-gray-500 dark:text-gray-400">
              {helperText}
            </p>
          )}
        </div>
      );
    }

    return inputWithIcons;
  }
);

Input.displayName = 'Input';
