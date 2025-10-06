import React from 'react';
import { cn } from '@/utils/cn';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'outline' | 'gradient' | 'glass';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  children: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
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
    ...props 
  }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md';
    
    const variants = {
      primary: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 active:from-blue-800 active:to-blue-900 focus-visible:ring-blue-500/50 shadow-lg hover:shadow-xl',
      secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:active:bg-gray-600 focus-visible:ring-gray-500/50 shadow-md',
      success: 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 active:from-green-800 active:to-green-900 focus-visible:ring-green-500/50 shadow-lg hover:shadow-xl',
      warning: 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white hover:from-yellow-700 hover:to-orange-700 active:from-yellow-800 active:to-orange-800 focus-visible:ring-yellow-500/50 shadow-lg hover:shadow-xl',
      danger: 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 active:from-red-800 active:to-red-900 focus-visible:ring-red-500/50 shadow-lg hover:shadow-xl',
      ghost: 'text-gray-700 hover:bg-gray-100/90 active:bg-gray-200/90 dark:text-gray-300 dark:hover:bg-gray-800/90 dark:active:bg-gray-700/90 focus-visible:ring-gray-500/50 backdrop-blur-sm',
      outline: 'border-2 border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800/50 dark:hover:border-gray-500 dark:active:bg-gray-700/50 focus-visible:ring-gray-500/50 shadow-md',
      gradient: 'bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white hover:from-purple-700 hover:via-pink-700 hover:to-blue-700 active:from-purple-800 active:via-pink-800 active:to-blue-800 focus-visible:ring-purple-500/50 shadow-lg hover:shadow-xl',
      glass: 'bg-white/10 backdrop-blur-md border border-white/20 text-gray-900 dark:text-white hover:bg-white/20 active:bg-white/30 focus-visible:ring-white/50 shadow-lg'
    };

    const sizes = {
      xs: 'h-7 px-2.5 text-xs gap-1',
      sm: 'h-8 px-3 text-sm gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2.5',
      xl: 'h-14 px-8 text-lg gap-3'
    };

    const roundedClasses = {
      none: 'rounded-none',
      sm: 'rounded-sm',
      md: 'rounded-lg',
      lg: 'rounded-xl',
      xl: 'rounded-2xl',
      full: 'rounded-full'
    };

    const shadowClasses = {
      none: '',
      sm: 'shadow-sm',
      md: 'shadow-md',
      lg: 'shadow-lg',
      xl: 'shadow-xl'
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
        {...props}
      >
        {loading && (
          <Loader2 className={cn(
            "animate-spin",
            size === 'xs' ? 'w-3 h-3' : 
            size === 'sm' ? 'w-4 h-4' :
            size === 'md' ? 'w-4 h-4' :
            size === 'lg' ? 'w-5 h-5' : 'w-6 h-6'
          )} />
        )}
        {!loading && leftIcon && (
          <span className={cn(
            "flex items-center",
            size === 'xs' ? '[&>*]:w-3 [&>*]:h-3' : 
            size === 'sm' ? '[&>*]:w-4 [&>*]:h-4' :
            size === 'md' ? '[&>*]:w-4 [&>*]:h-4' :
            size === 'lg' ? '[&>*]:w-5 [&>*]:h-5' : '[&>*]:w-6 [&>*]:h-6'
          )}>
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
          <span className={cn(
            "flex items-center",
            size === 'xs' ? '[&>*]:w-3 [&>*]:h-3' : 
            size === 'sm' ? '[&>*]:w-4 [&>*]:h-4' :
            size === 'md' ? '[&>*]:w-4 [&>*]:h-4' :
            size === 'lg' ? '[&>*]:w-5 [&>*]:h-5' : '[&>*]:w-6 [&>*]:h-6'
          )}>
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
