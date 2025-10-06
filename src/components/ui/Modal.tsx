import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
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
}

interface ModalHeaderProps {
  children: React.ReactNode;
  onClose?: () => void;
  showCloseButton?: boolean;
  className?: string;
}

interface ModalContentProps {
  children: React.ReactNode;
  className?: string;
}

interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  size = 'md',
  closeOnBackdrop = true,
  showCloseButton = true,
  className,
  animation = 'scale',
  backdrop = 'blur',
  persistent = false,
  centered = true
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      setIsExiting(true);
      setTimeout(() => {
        setIsVisible(false);
        setIsExiting(false);
        document.body.style.overflow = 'unset';
      }, 300);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !persistent) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, persistent]);

  if (!isVisible) return null;

  const sizeClasses = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    full: 'max-w-full mx-4'
  };

  const backdropClasses = {
    blur: 'bg-black/50 backdrop-blur-sm',
    dark: 'bg-black/70',
    light: 'bg-white/70 backdrop-blur-sm'
  };

  const getAnimationClasses = () => {
    const entering = !isExiting;
    
    switch (animation) {
      case 'fade':
        return entering ? 'opacity-100' : 'opacity-0';
      case 'scale':
        return entering 
          ? 'opacity-100 scale-100' 
          : 'opacity-0 scale-95';
      case 'slide-up':
        return entering 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-4';
      case 'slide-down':
        return entering 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 -translate-y-4';
      case 'slide-left':
        return entering 
          ? 'opacity-100 translate-x-0' 
          : 'opacity-0 translate-x-4';
      case 'slide-right':
        return entering 
          ? 'opacity-100 translate-x-0' 
          : 'opacity-0 -translate-x-4';
      default:
        return entering ? 'opacity-100 scale-100' : 'opacity-0 scale-95';
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnBackdrop && !persistent) {
      onClose();
    }
  };

  const modalContent = (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex p-4 transition-all duration-300 ease-out",
        centered ? "items-center justify-center" : "items-start justify-center pt-16"
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div 
        className={cn(
          "absolute inset-0 transition-all duration-300",
          backdropClasses[backdrop],
          !isExiting ? 'opacity-100' : 'opacity-0'
        )}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div 
        className={cn(
          'relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl transform transition-all duration-300 ease-out',
          'max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700',
          sizeClasses[size],
          getAnimationClasses(),
          className
        )}
      >
        {/* Close button - positioned absolutely if no header */}
        {showCloseButton && !React.Children.toArray(children).some(child => 
          React.isValidElement(child) && child.type === ModalHeader
        ) && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        
        {children}
      </div>
    </div>
  );

  return typeof window !== 'undefined' 
    ? createPortal(modalContent, document.body)
    : null;
};

const ModalHeader: React.FC<ModalHeaderProps> = ({ 
  children, 
  onClose, 
  showCloseButton = true,
  className 
}) => {
  return (
    <div className={cn(
      'flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50',
      className
    )}>
      <div className="flex-1">
        {children}
      </div>
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className="ml-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-110"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

const ModalContent: React.FC<ModalContentProps> = ({ children, className }) => {
  return (
    <div className={cn('flex-1 overflow-y-auto p-6', className)}>
      {children}
    </div>
  );
};

const ModalFooter: React.FC<ModalFooterProps> = ({ children, className }) => {
  return (
    <div className={cn(
      'flex items-center justify-end gap-3 p-6 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/30 dark:bg-gray-800/30',
      className
    )}>
      {children}
    </div>
  );
};

interface ModalTitleProps {
  children: React.ReactNode;
  className?: string;
}

const ModalTitle: React.FC<ModalTitleProps> = ({ children, className }) => {
  return (
    <h2 
      id="modal-title" 
      className={cn(
        'text-xl font-semibold text-gray-900 dark:text-gray-100',
        className
      )}
    >
      {children}
    </h2>
  );
};

interface ModalDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

const ModalDescription: React.FC<ModalDescriptionProps> = ({ children, className }) => {
  return (
    <p className={cn('text-sm text-gray-500 dark:text-gray-400 mt-1', className)}>
      {children}
    </p>
  );
};

// Enhanced Confirmation Modal Component
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'success';
  loading?: boolean;
  icon?: 'warning' | 'danger' | 'success' | 'info';
  persistent?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  loading = false,
  icon,
  persistent = false
}) => {
  const getIcon = () => {
    switch (icon || variant) {
      case 'danger':
        return <AlertTriangle className="w-6 h-6 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'info':
      case 'primary':
        return <Info className="w-6 h-6 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="sm" 
      animation="scale"
      persistent={persistent}
    >
      <ModalContent className="text-center">
        {getIcon() && (
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>
        )}
        <ModalTitle className="mb-2">{title}</ModalTitle>
        {description && (
          <ModalDescription className="mb-6 text-center">
            {description}
          </ModalDescription>
        )}
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button 
            variant={variant} 
            onClick={onConfirm} 
            loading={loading}
            disabled={loading}
          >
            {confirmText}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
};

// Alert Modal Component
interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  buttonText?: string;
  variant?: 'info' | 'success' | 'warning' | 'danger';
}

const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  buttonText = 'OK',
  variant = 'info'
}) => {
  const getIcon = () => {
    switch (variant) {
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-8 h-8 text-yellow-500" />;
      case 'danger':
        return <AlertTriangle className="w-8 h-8 text-red-500" />;
      case 'info':
      default:
        return <Info className="w-8 h-8 text-blue-500" />;
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="sm" 
      animation="slide-up"
    >
      <ModalContent className="text-center py-8">
        <div className="flex justify-center mb-4">
          {getIcon()}
        </div>
        <ModalTitle className="mb-3 text-xl">{title}</ModalTitle>
        {description && (
          <ModalDescription className="mb-6 text-base">
            {description}
          </ModalDescription>
        )}
        <Button 
          variant={variant === 'danger' ? 'danger' : 'primary'} 
          onClick={onClose}
          className="min-w-[100px]"
        >
          {buttonText}
        </Button>
      </ModalContent>
    </Modal>
  );
};

// Drawer Modal Component (Side panel)
interface DrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  side?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const DrawerModal: React.FC<DrawerModalProps> = ({
  isOpen,
  onClose,
  children,
  side = 'right',
  size = 'md',
  className
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      setIsExiting(true);
      setTimeout(() => {
        setIsVisible(false);
        setIsExiting(false);
        document.body.style.overflow = 'unset';
      }, 300);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isVisible) return null;

  const sizeClasses = {
    sm: 'w-80',
    md: 'w-96',
    lg: 'w-[32rem]',
    xl: 'w-[40rem]'
  };

  const slideClasses = side === 'right' 
    ? (!isExiting ? 'translate-x-0' : 'translate-x-full')
    : (!isExiting ? 'translate-x-0' : '-translate-x-full');

  const drawerContent = (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className={cn(
          "absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300",
          !isExiting ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className={cn(
          'relative bg-white dark:bg-gray-800 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col',
          'h-full border-l border-gray-200 dark:border-gray-700',
          side === 'right' ? 'ml-auto' : 'mr-auto',
          sizeClasses[size],
          slideClasses,
          className
        )}
      >
        {children}
      </div>
    </div>
  );

  return typeof window !== 'undefined' 
    ? createPortal(drawerContent, document.body)
    : null;
};

export { 
  Modal, 
  ModalHeader, 
  ModalContent, 
  ModalFooter, 
  ModalTitle, 
  ModalDescription,
  ConfirmModal,
  AlertModal,
  DrawerModal
};

export type { 
  ModalProps, 
  ModalHeaderProps, 
  ModalContentProps, 
  ModalFooterProps,
  ConfirmModalProps,
  AlertModalProps,
  DrawerModalProps
};
