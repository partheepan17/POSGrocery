import React from 'react';
import { cn } from '@/utils/cn';
import { AlertTriangle, Info, CheckCircle, X, AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  description?: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  loading?: boolean;
  className?: string;
}

interface AlertBannerProps {
  type: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  children: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  type = 'info',
  confirmText = 'OK',
  cancelText = 'Cancel',
  showCancel = true,
  loading = false,
  className
}) => {
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, loading]);

  if (!isOpen) return null;

  const icons = {
    info: Info,
    warning: AlertTriangle,
    error: AlertCircle,
    success: CheckCircle
  };

  const Icon = icons[type];

  const iconColors = {
    info: 'text-blue-500',
    warning: 'text-warning-500',
    error: 'text-danger-500',
    success: 'text-success-500'
  };

  const buttonVariants = {
    info: 'primary' as const,
    warning: 'warning' as const,
    error: 'danger' as const,
    success: 'success' as const
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-title"
      aria-describedby={description ? "alert-description" : undefined}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        aria-hidden="true"
      />
      
      {/* Dialog */}
      <div 
        className={cn(
          'relative bg-white dark:bg-gray-800 rounded-xl shadow-xl transform transition-all',
          'max-w-md w-full mx-4 p-6',
          className
        )}
      >
        {/* Icon and Content */}
        <div className="flex items-start gap-4">
          <div className={cn('flex-shrink-0 mt-1', iconColors[type])}>
            <Icon className="w-6 h-6" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 
              id="alert-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2"
            >
              {title}
            </h3>
            
            {description && (
              <p 
                id="alert-description"
                className="text-sm text-gray-600 dark:text-gray-300"
              >
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          {showCancel && (
            <Button 
              variant="ghost" 
              onClick={onClose}
              disabled={loading}
            >
              {cancelText}
            </Button>
          )}
          
          {onConfirm && (
            <Button 
              variant={buttonVariants[type]}
              onClick={onConfirm}
              loading={loading}
              disabled={loading}
            >
              {confirmText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const AlertBanner: React.FC<AlertBannerProps> = ({
  type,
  title,
  children,
  dismissible = false,
  onDismiss,
  action,
  className
}) => {
  const icons = {
    info: Info,
    warning: AlertTriangle,
    error: AlertCircle,
    success: CheckCircle
  };

  const Icon = icons[type];

  const typeClasses = {
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300',
    warning: 'bg-warning-50 border-warning-200 text-warning-800 dark:bg-warning-900/20 dark:border-warning-800 dark:text-warning-300',
    error: 'bg-danger-50 border-danger-200 text-danger-800 dark:bg-danger-900/20 dark:border-danger-800 dark:text-danger-300',
    success: 'bg-success-50 border-success-200 text-success-800 dark:bg-success-900/20 dark:border-success-800 dark:text-success-300'
  };

  const iconColors = {
    info: 'text-blue-500',
    warning: 'text-warning-500',
    error: 'text-danger-500',
    success: 'text-success-500'
  };

  return (
    <div 
      className={cn(
        'p-4 border rounded-lg',
        typeClasses[type],
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', iconColors[type])} />
        
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="font-medium mb-1">
              {title}
            </h4>
          )}
          
          <div className="text-sm">
            {children}
          </div>
          
          {action && (
            <button
              onClick={action.onClick}
              className="mt-2 text-sm font-medium underline hover:no-underline"
            >
              {action.label}
            </button>
          )}
        </div>

        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className="text-current opacity-70 hover:opacity-100 p-1 -m-1"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

// Inline Alert Component
interface InlineAlertProps {
  type: 'info' | 'warning' | 'error' | 'success';
  children: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

const InlineAlert: React.FC<InlineAlertProps> = ({
  type,
  children,
  size = 'md',
  className
}) => {
  const icons = {
    info: Info,
    warning: AlertTriangle,
    error: AlertCircle,
    success: CheckCircle
  };

  const Icon = icons[type];

  const typeClasses = {
    info: 'text-blue-600 dark:text-blue-400',
    warning: 'text-warning-600 dark:text-warning-400',
    error: 'text-danger-600 dark:text-danger-400',
    success: 'text-success-600 dark:text-success-400'
  };

  const sizeClasses = {
    sm: 'text-xs gap-1',
    md: 'text-sm gap-2'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4'
  };

  return (
    <div 
      className={cn(
        'flex items-center font-medium',
        typeClasses[type],
        sizeClasses[size],
        className
      )}
      role="alert"
    >
      <Icon className={cn('flex-shrink-0', iconSizes[size])} />
      {children}
    </div>
  );
};

// Status Message Component
interface StatusMessageProps {
  status: 'loading' | 'success' | 'error' | 'idle';
  loadingText?: string;
  successText?: string;
  errorText?: string;
  className?: string;
}

const StatusMessage: React.FC<StatusMessageProps> = ({
  status,
  loadingText = 'Loading...',
  successText = 'Success!',
  errorText = 'An error occurred',
  className
}) => {
  if (status === 'idle') return null;

  const content = {
    loading: (
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        {loadingText}
      </div>
    ),
    success: (
      <InlineAlert type="success">
        {successText}
      </InlineAlert>
    ),
    error: (
      <InlineAlert type="error">
        {errorText}
      </InlineAlert>
    )
  };

  return (
    <div className={cn('', className)}>
      {content[status]}
    </div>
  );
};

export { 
  AlertDialog, 
  AlertBanner, 
  InlineAlert, 
  StatusMessage 
};

export type { 
  AlertDialogProps, 
  AlertBannerProps, 
  InlineAlertProps, 
  StatusMessageProps 
};



