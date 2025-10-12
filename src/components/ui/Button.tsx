import React from 'react';
import { cn } from '@/utils/cn';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'outline' | 'pos-primary' | 'pos-secondary' | 'pos-success' | 'pos-warning' | 'pos-danger';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  children: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  'aria-label'?: string;
  'aria-describedby'?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    loading = false,
    disabled,
    children,
    leftIcon,
    rightIcon,
    fullWidth = false,
    rounded = 'md',
    shadow = 'sm',
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedby,
    ...props 
  }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none';
    
    const variants = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 focus-visible:ring-primary-500 shadow-sm hover:shadow-md',
      secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:active:bg-gray-600 focus-visible:ring-gray-500 shadow-sm',
      success: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 focus-visible:ring-green-500 shadow-sm hover:shadow-md',
      warning: 'bg-yellow-600 text-white hover:bg-yellow-700 active:bg-yellow-800 focus-visible:ring-yellow-500 shadow-sm hover:shadow-md',
      danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500 shadow-sm hover:shadow-md',
      ghost: 'text-gray-700 hover:bg-gray-100 active:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800 dark:active:bg-gray-700 focus-visible:ring-gray-500',
      outline: 'border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:border-gray-500 dark:active:bg-gray-700 focus-visible:ring-gray-500 shadow-sm',
      'pos-primary': 'bg-pos-info text-white hover:bg-blue-700 active:bg-blue-800 focus-visible:ring-blue-500 shadow-pos hover:shadow-lg font-semibold',
      'pos-secondary': 'bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 dark:active:bg-gray-500 focus-visible:ring-gray-500 shadow-sm font-medium',
      'pos-success': 'bg-pos-success text-white hover:bg-green-700 active:bg-green-800 focus-visible:ring-green-500 shadow-pos hover:shadow-lg font-semibold',
      'pos-warning': 'bg-pos-warning text-white hover:bg-yellow-700 active:bg-yellow-800 focus-visible:ring-yellow-500 shadow-pos hover:shadow-lg font-semibold',
      'pos-danger': 'bg-pos-error text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500 shadow-pos hover:shadow-lg font-semibold',
    };

    const sizes = {
      xs: 'h-6 px-2 text-xs gap-1 min-w-[1.5rem]',
      sm: 'h-8 px-3 text-sm gap-1.5 min-w-[2rem]',
      md: 'h-10 px-4 text-sm gap-2 min-w-[2.5rem]',
      lg: 'h-12 px-6 text-base gap-2.5 min-w-[3rem]',
      xl: 'h-14 px-8 text-lg gap-3 min-w-[3.5rem]'
    };

    const roundedClasses = {
      none: 'rounded-none',
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      xl: 'rounded-xl',
      '2xl': 'rounded-2xl',
      '3xl': 'rounded-3xl',
      full: 'rounded-full'
    };

    const shadowClasses = {
      none: '',
      sm: 'shadow-sm',
      md: 'shadow-md',
      lg: 'shadow-lg',
      xl: 'shadow-xl'
    };

    const iconSize = {
      xs: 'w-3 h-3',
      sm: 'w-4 h-4',
      md: 'w-4 h-4',
      lg: 'w-5 h-5',
      xl: 'w-6 h-6'
    };

    return (
      <button
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          roundedClasses[rounded],
          shadowClasses[shadow],
          fullWidth && 'w-full',
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedby}
        aria-disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <Loader2 className={cn("animate-spin", iconSize[size])} aria-hidden="true" />
        )}
        {!loading && leftIcon && (
          <span className={cn("flex items-center", iconSize[size])} aria-hidden="true">
            {leftIcon}
          </span>
        )}
        <span className={cn(
          "truncate",
          (leftIcon || rightIcon || loading) && "flex-1"
        )}>
          {children}
        </span>
        {!loading && rightIcon && (
          <span className={cn("flex items-center", iconSize[size])} aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
export type { ButtonProps };
