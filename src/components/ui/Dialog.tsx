import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
  className?: string;
  animation?: 'fade' | 'scale' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right';
  backdrop?: 'blur' | 'dark' | 'light';
  persistent?: boolean;
  centered?: boolean;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

const Dialog = React.forwardRef<HTMLDivElement, DialogProps>(
  ({ 
    isOpen,
    onClose,
    children,
    size = 'md',
    closeOnBackdrop = true,
    showCloseButton = true,
    className,
    animation = 'scale',
    backdrop = 'dark',
    persistent = false,
    centered = true,
    'aria-labelledby': ariaLabelledby,
    'aria-describedby': ariaDescribedby,
    ...props 
  }, ref) => {
    const dialogRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);

    useEffect(() => {
      if (isOpen) {
        previousActiveElement.current = document.activeElement as HTMLElement;
        document.body.style.overflow = 'hidden';
        
        // Focus management
        const focusableElements = dialogRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements?.[0] as HTMLElement;
        firstElement?.focus();
      } else {
        document.body.style.overflow = '';
        previousActiveElement.current?.focus();
      }

      return () => {
        document.body.style.overflow = '';
      };
    }, [isOpen]);

    useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !persistent && isOpen) {
          onClose();
        }
      };

      if (isOpen) {
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
      }
    }, [isOpen, onClose, persistent]);

    const handleBackdropClick = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && closeOnBackdrop && !persistent) {
        onClose();
      }
    };

    const sizes = {
      xs: 'max-w-xs',
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      '2xl': 'max-w-2xl',
      '3xl': 'max-w-3xl',
      full: 'max-w-full mx-4'
    };

    const animations = {
      fade: 'animate-fade-in',
      scale: 'animate-bounce-in',
      'slide-up': 'animate-slide-in',
      'slide-down': 'animate-slide-in',
      'slide-left': 'animate-slide-in',
      'slide-right': 'animate-slide-in'
    };

    const backdropClasses = {
      blur: 'backdrop-blur-sm bg-black/20',
      dark: 'bg-black/50',
      light: 'bg-white/20'
    };

    if (!isOpen) return null;

    return createPortal(
      <div
        className={cn(
          'fixed inset-0 z-modal flex items-center justify-center p-4',
          backdropClasses[backdrop],
          centered ? 'items-center' : 'items-start pt-16'
        )}
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledby}
        aria-describedby={ariaDescribedby}
      >
        <div
          ref={dialogRef}
          className={cn(
            'relative w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl',
            sizes[size],
            animations[animation],
            className
          )}
          {...props}
        >
          {showCloseButton && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          {children}
        </div>
      </div>,
      document.body
    );
  }
);

Dialog.displayName = 'Dialog';

interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

const DialogHeader = React.forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-6 py-4 border-b border-gray-200 dark:border-gray-700', className)}
      {...props}
    >
      {children}
    </div>
  )
);

DialogHeader.displayName = 'DialogHeader';

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, noPadding = false, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(noPadding ? '' : 'px-6 py-4', className)}
      {...props}
    >
      {children}
    </div>
  )
);

DialogContent.displayName = 'DialogContent';

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right' | 'between';
}

const DialogFooter = React.forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ className, align = 'right', children, ...props }, ref) => {
    const alignClasses = {
      left: 'justify-start',
      center: 'justify-center',
      right: 'justify-end',
      between: 'justify-between'
    };

    return (
      <div
        ref={ref}
        className={cn(
          'px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3',
          alignClasses[align],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

DialogFooter.displayName = 'DialogFooter';

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ className, children, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn('text-lg font-semibold text-gray-900 dark:text-white', className)}
      {...props}
    >
      {children}
    </h2>
  )
);

DialogTitle.displayName = 'DialogTitle';

interface DialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

const DialogDescription = React.forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  ({ className, children, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-gray-500 dark:text-gray-400', className)}
      {...props}
    >
      {children}
    </p>
  )
);

DialogDescription.displayName = 'DialogDescription';

// Pre-built dialog variants
interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  persistent?: boolean;
}

const AlertDialog = ({
  isOpen,
  onClose,
  title,
  description,
  type = 'info',
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  persistent = false
}: AlertDialogProps) => {
  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertCircle
  };

  const colors = {
    info: 'text-blue-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600'
  };

  const Icon = icons[type];

  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  const handleCancel = () => {
    onCancel?.();
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      persistent={persistent}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogContent className="text-center">
        <div className="flex justify-center mb-4">
          <Icon className={cn('w-12 h-12', colors[type])} />
        </div>
        <DialogTitle id="alert-dialog-title" className="mb-2">
          {title}
        </DialogTitle>
        {description && (
          <DialogDescription id="alert-dialog-description">
            {description}
          </DialogDescription>
        )}
      </DialogContent>
      <DialogFooter align="center">
        {onCancel && (
          <Button variant="outline" onClick={handleCancel}>
            {cancelText}
          </Button>
        )}
        <Button 
          variant={type === 'error' ? 'danger' : type === 'warning' ? 'warning' : 'primary'} 
          onClick={handleConfirm}
        >
          {confirmText}
        </Button>
      </DialogFooter>
    </Dialog>
  );
};

export { 
  Dialog, 
  DialogHeader, 
  DialogContent, 
  DialogFooter, 
  DialogTitle, 
  DialogDescription,
  AlertDialog 
};
export type { 
  DialogProps, 
  DialogHeaderProps, 
  DialogContentProps, 
  DialogFooterProps, 
  DialogTitleProps, 
  DialogDescriptionProps,
  AlertDialogProps 
};


