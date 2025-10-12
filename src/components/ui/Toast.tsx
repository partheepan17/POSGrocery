import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';

export interface Toast {
  id: string;
  title?: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  updateToast: (id: string, updates: Partial<Toast>) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
}

export function ToastProvider({ children, maxToasts = 5 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      id,
      duration: 5000,
      dismissible: true,
      ...toast,
    };

    setToasts(prev => {
      const updated = [newToast, ...prev];
      return updated.slice(0, maxToasts);
    });

    // Auto-remove toast after duration (except loading toasts)
    if (newToast.duration && newToast.duration > 0 && newToast.type !== 'loading') {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }

    return id;
  }, [maxToasts]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Toast>) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    ));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, updateToast, clearAll }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

function ToastContainer() {
  const { toasts } = useToast();

  if (typeof window === 'undefined') return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>,
    document.body
  );
}

interface ToastItemProps {
  toast: Toast;
}

function ToastItem({ toast }: ToastItemProps) {
  const { removeToast } = useToast();
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleRemove = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => removeToast(toast.id), 300);
  }, [toast.id, removeToast]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'loading':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const getVariantClasses = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-white dark:bg-gray-800 border-l-4 border-green-500 shadow-lg shadow-green-500/10';
      case 'error':
        return 'bg-white dark:bg-gray-800 border-l-4 border-red-500 shadow-lg shadow-red-500/10';
      case 'warning':
        return 'bg-white dark:bg-gray-800 border-l-4 border-yellow-500 shadow-lg shadow-yellow-500/10';
      case 'info':
        return 'bg-white dark:bg-gray-800 border-l-4 border-blue-500 shadow-lg shadow-blue-500/10';
      case 'loading':
        return 'bg-white dark:bg-gray-800 border-l-4 border-blue-500 shadow-lg shadow-blue-500/10';
      default:
        return 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg';
    }
  };

  return (
    <div
      className={cn(
        'relative flex items-start gap-3 p-4 rounded-lg backdrop-blur-sm transition-all duration-300 ease-out',
        getVariantClasses(),
        isVisible && !isExiting
          ? 'translate-x-0 opacity-100 scale-100'
          : 'translate-x-full opacity-0 scale-95',
        isExiting && 'translate-x-full opacity-0 scale-95'
      )}
      role="alert"
      aria-live="polite"
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {toast.title}
          </div>
        )}
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {toast.message}
        </div>
        
        {toast.action && (
          <div className="mt-3">
            <button
              onClick={toast.action.onClick}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              {toast.action.label}
            </button>
          </div>
        )}
      </div>

      {/* Close button */}
      {toast.dismissible && (
        <button
          onClick={handleRemove}
          className="flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Progress bar for timed toasts */}
      {toast.duration && toast.duration > 0 && toast.type !== 'loading' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-b-lg overflow-hidden">
          <div
            className={cn(
              'h-full transition-all ease-linear',
              toast.type === 'success' && 'bg-green-500',
              toast.type === 'error' && 'bg-red-500',
              toast.type === 'warning' && 'bg-yellow-500',
              toast.type === 'info' && 'bg-blue-500'
            )}
            style={{
              animation: `toast-progress ${toast.duration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
}

// Helper functions for common toast types
export const toast = {
  success: (message: string, options?: Partial<Toast>) => {
    const { addToast } = useToast();
    return addToast({ type: 'success', message, ...options });
  },
  error: (message: string, options?: Partial<Toast>) => {
    const { addToast } = useToast();
    return addToast({ type: 'error', message, duration: 7000, ...options });
  },
  warning: (message: string, options?: Partial<Toast>) => {
    const { addToast } = useToast();
    return addToast({ type: 'warning', message, ...options });
  },
  info: (message: string, options?: Partial<Toast>) => {
    const { addToast } = useToast();
    return addToast({ type: 'info', message, ...options });
  },
  loading: (message: string, options?: Partial<Toast>) => {
    const { addToast } = useToast();
    return addToast({ type: 'loading', message, duration: 0, dismissible: false, ...options });
  },
  promise: async <T,>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    const { addToast, updateToast } = useToast();
    const toastId = addToast({
      type: 'loading',
      message: loading,
      duration: 0,
      dismissible: false,
    });

    try {
      const data = await promise;
      const successMessage = typeof success === 'function' ? success(data) : success;
      updateToast(toastId, {
        type: 'success',
        message: successMessage,
        duration: 5000,
        dismissible: true,
      });
      return data;
    } catch (err) {
      const errorMessage = typeof error === 'function' ? error(err) : error;
      updateToast(toastId, {
        type: 'error',
        message: errorMessage,
        duration: 7000,
        dismissible: true,
      });
      throw err;
    }
  },
};

// CSS for progress bar animation (add to your global CSS)
export const toastStyles = `
@keyframes toast-progress {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}
`;
