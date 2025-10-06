import React from 'react';
import { cn } from '@/utils/cn';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'underlined';
  inputSize?: 'sm' | 'md' | 'lg';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    type = 'text',
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    variant = 'default',
    inputSize = 'md',
    id,
    disabled,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const inputId = id || React.useId();
    const isPassword = type === 'password';
    const actualType = isPassword && showPassword ? 'text' : type;

    const baseClasses = 'w-full transition-all duration-200 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50';
    
    const variants = {
      default: cn(
        'border-2 border-gray-300 bg-white px-4 text-gray-900 shadow-sm',
        'focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:shadow-lg',
        'hover:border-gray-400 hover:shadow-md',
        'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100',
        'dark:focus:border-blue-400 dark:focus:ring-blue-400/20',
        'dark:hover:border-gray-500',
        error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20 hover:border-red-400'
      ),
      filled: cn(
        'border-0 bg-gray-100 px-4 text-gray-900',
        'focus:bg-white focus:ring-4 focus:ring-blue-500/20 focus:shadow-lg',
        'hover:bg-gray-50',
        'dark:bg-gray-700 dark:text-gray-100 dark:focus:bg-gray-800',
        'dark:hover:bg-gray-600',
        error && 'bg-red-50 focus:bg-red-50 focus:ring-red-500/20 dark:bg-red-900/20'
      ),
      underlined: cn(
        'border-0 border-b-2 border-gray-300 bg-transparent px-0 rounded-none',
        'focus:border-blue-500 focus:ring-0 focus:shadow-sm',
        'hover:border-gray-400',
        'dark:border-gray-600 dark:focus:border-blue-400',
        'dark:hover:border-gray-500',
        error && 'border-red-500 focus:border-red-500 hover:border-red-400'
      )
    };

    const sizes = {
      sm: 'h-8 text-sm rounded-md',
      md: 'h-10 text-sm rounded-lg',
      lg: 'h-12 text-base rounded-lg'
    };

    const iconSizes = {
      sm: 'w-4 h-4',
      md: 'w-4 h-4',
      lg: 'w-5 h-5'
    };

    return (
      <div className="space-y-1">
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <div className={iconSizes[inputSize]}>
                {leftIcon}
              </div>
            </div>
          )}
          
          <input
            type={actualType}
            id={inputId}
            className={cn(
              baseClasses,
              variants[variant],
              sizes[inputSize],
              leftIcon && 'pl-10',
              (rightIcon || isPassword) && 'pr-10',
              className
            )}
            ref={ref}
            disabled={disabled}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            {...props}
          />
          
          {isPassword && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className={iconSizes[inputSize]} />
              ) : (
                <Eye className={iconSizes[inputSize]} />
              )}
            </button>
          )}
          
          {!isPassword && rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <div className={iconSizes[inputSize]}>
                {rightIcon}
              </div>
            </div>
          )}
        </div>
        
        {error && (
          <div 
            id={`${inputId}-error`}
            className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        
        {hint && !error && (
          <div 
            id={`${inputId}-hint`}
            className="text-sm text-gray-500 dark:text-gray-400"
          >
            {hint}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
export type { InputProps };



