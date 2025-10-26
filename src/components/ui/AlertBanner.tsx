import React from 'react';
import { cn } from '@/utils/cn';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

interface AlertBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error' | 'danger';
  title?: string;
  message?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  onClose?: () => void;
  children?: React.ReactNode;
}

const AlertBanner = React.forwardRef<HTMLDivElement, AlertBannerProps>(
  ({ 
    className,
    variant = 'info',
    title,
    message,
    dismissible = false,
    onDismiss,
    onClose,
    children,
    ...props 
  }, ref) => {
    const variants = {
      info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200',
      success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
      error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
      danger: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
    };

    const icons = {
      info: Info,
      success: CheckCircle,
      warning: AlertCircle,
      error: AlertCircle,
      danger: AlertCircle
    };

    const Icon = icons[variant];

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-start gap-3 p-4 border rounded-lg',
          variants[variant],
          className
        )}
        role="alert"
        {...props}
      >
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="font-medium text-sm mb-1">
              {title}
            </h3>
          )}
          {message && (
            <p className="text-sm">
              {message}
            </p>
          )}
          {children}
        </div>
        {dismissible && (onDismiss || onClose) && (
          <button
            type="button"
            onClick={onDismiss || onClose}
            className="flex-shrink-0 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }
);

AlertBanner.displayName = 'AlertBanner';

export { AlertBanner };
export type { AlertBannerProps };
