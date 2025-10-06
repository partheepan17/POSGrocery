import React from 'react';
import { cn } from '@/utils/cn';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  dot?: boolean;
  pulse?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ 
    className, 
    variant = 'default', 
    size = 'md', 
    children, 
    dot = false,
    pulse = false,
    ...props 
  }, ref) => {
    const baseClasses = 'inline-flex items-center font-medium transition-colors';
    
    const variants = {
      default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      primary: 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-300',
      secondary: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
      success: 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-300',
      warning: 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-300',
      danger: 'bg-danger-100 text-danger-800 dark:bg-danger-900 dark:text-danger-300',
      outline: 'border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300'
    };

    const sizes = {
      xs: 'px-2 py-0.5 text-xs rounded-full',
      sm: 'px-2.5 py-0.5 text-xs rounded-full',
      md: 'px-3 py-1 text-sm rounded-full',
      lg: 'px-4 py-1.5 text-sm rounded-full'
    };

    const dotSizes = {
      xs: 'w-1.5 h-1.5',
      sm: 'w-2 h-2',
      md: 'w-2 h-2',
      lg: 'w-2.5 h-2.5'
    };

    const dotColors = {
      default: 'bg-gray-500',
      primary: 'bg-primary-500',
      secondary: 'bg-gray-500',
      success: 'bg-success-500',
      warning: 'bg-warning-500',
      danger: 'bg-danger-500',
      outline: 'bg-gray-500'
    };

    return (
      <span
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      >
        {dot && (
          <span 
            className={cn(
              'rounded-full mr-1.5',
              dotSizes[size],
              dotColors[variant],
              pulse && 'animate-pulse'
            )}
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// Status Badge Component
interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'success' | 'error' | 'warning';
  children?: React.ReactNode;
  showDot?: boolean;
  pulse?: boolean;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  children, 
  showDot = true, 
  pulse = false,
  className 
}) => {
  const statusConfig = {
    active: {
      variant: 'success' as const,
      label: 'Active',
      ariaLabel: 'Status: Active'
    },
    inactive: {
      variant: 'secondary' as const,
      label: 'Inactive',
      ariaLabel: 'Status: Inactive'
    },
    pending: {
      variant: 'warning' as const,
      label: 'Pending',
      ariaLabel: 'Status: Pending'
    },
    success: {
      variant: 'success' as const,
      label: 'Success',
      ariaLabel: 'Status: Success'
    },
    error: {
      variant: 'danger' as const,
      label: 'Error',
      ariaLabel: 'Status: Error'
    },
    warning: {
      variant: 'warning' as const,
      label: 'Warning',
      ariaLabel: 'Status: Warning'
    }
  };

  const config = statusConfig[status];

  return (
    <Badge
      variant={config.variant}
      dot={showDot}
      pulse={pulse}
      className={className}
      aria-label={config.ariaLabel}
      role="status"
    >
      {children || config.label}
    </Badge>
  );
};

// Notification Badge Component
interface NotificationBadgeProps {
  count: number;
  max?: number;
  showZero?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({ 
  count, 
  max = 99, 
  showZero = false,
  className,
  children 
}) => {
  const displayCount = count > max ? `${max}+` : count.toString();
  const shouldShow = count > 0 || showZero;

  if (!shouldShow) {
    return <>{children}</>;
  }

  if (children) {
    return (
      <div className="relative inline-block">
        {children}
        <Badge
          variant="danger"
          size="xs"
          className={cn(
            'absolute -top-2 -right-2 min-w-5 h-5 flex items-center justify-center',
            'px-1 text-xs leading-none',
            className
          )}
        >
          {displayCount}
        </Badge>
      </div>
    );
  }

  return (
    <Badge
      variant="danger"
      size="xs"
      className={cn('min-w-5 h-5 flex items-center justify-center px-1', className)}
    >
      {displayCount}
    </Badge>
  );
};

// Priority Badge Component
interface PriorityBadgeProps {
  priority: 'low' | 'medium' | 'high' | 'urgent';
  className?: string;
}

const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, className }) => {
  const priorityConfig = {
    low: {
      variant: 'secondary' as const,
      label: 'Low Priority',
      pulse: false
    },
    medium: {
      variant: 'primary' as const,
      label: 'Medium Priority',
      pulse: false
    },
    high: {
      variant: 'warning' as const,
      label: 'High Priority',
      pulse: false
    },
    urgent: {
      variant: 'danger' as const,
      label: 'Urgent Priority',
      pulse: true
    }
  };

  const config = priorityConfig[priority];

  return (
    <Badge
      variant={config.variant}
      dot
      {...(config.pulse && { pulse: config.pulse })}
      size="sm"
      className={className}
      aria-label={config.label}
    >
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  );
};

export { 
  Badge, 
  StatusBadge, 
  NotificationBadge, 
  PriorityBadge 
};

export type { 
  BadgeProps, 
  StatusBadgeProps, 
  NotificationBadgeProps, 
  PriorityBadgeProps 
};

