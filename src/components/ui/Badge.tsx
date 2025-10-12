import React from 'react';
import { cn } from '@/utils/cn';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'outline' | 'destructive' | 'primary' | 'pos-success' | 'pos-warning' | 'pos-danger' | 'pos-info' | 'pos-accent';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  dot?: boolean;
  'aria-label'?: string;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ 
    className,
    variant = 'default',
    size = 'md',
    rounded = 'md',
    dot = false,
    children,
    'aria-label': ariaLabel,
    ...props 
  }, ref) => {
    const baseClasses = 'inline-flex items-center font-medium';
    
    const variants = {
      default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      secondary: 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200',
      outline: 'border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300',
      destructive: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      primary: 'bg-blue-600 text-white dark:bg-blue-700',
      'pos-success': 'bg-pos-success text-white font-semibold',
      'pos-warning': 'bg-pos-warning text-white font-semibold',
      'pos-danger': 'bg-pos-error text-white font-semibold',
      'pos-info': 'bg-pos-info text-white font-semibold',
      'pos-accent': 'bg-pos-accent text-white font-semibold'
    };

    const sizes = {
      xs: 'px-1.5 py-0.5 text-xs',
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
      lg: 'px-3 py-1.5 text-base'
    };

    const roundedClasses = {
      none: 'rounded-none',
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      full: 'rounded-full'
    };

    const dotSize = {
      xs: 'w-1 h-1',
      sm: 'w-1.5 h-1.5',
      md: 'w-2 h-2',
      lg: 'w-2.5 h-2.5'
    };

    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          roundedClasses[rounded],
          className
        )}
        aria-label={ariaLabel}
        {...props}
      >
        {dot && (
          <div className={cn(
            "rounded-full mr-1.5",
            dotSize[size],
            variant.includes('pos-') ? 'bg-white/30' : 'bg-current opacity-60'
          )} aria-hidden="true" />
        )}
        {children}
      </div>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };
export type { BadgeProps };

// Additional badge components for compatibility
export const StatusBadge = Badge;
export const NotificationBadge = Badge;
export const PriorityBadge = Badge;

export type StatusBadgeProps = BadgeProps;
export type NotificationBadgeProps = BadgeProps;
export type PriorityBadgeProps = BadgeProps;
