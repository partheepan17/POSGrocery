/**
 * useNotify Hook
 * Provides notification functionality using react-hot-toast
 */

import { toast } from 'react-hot-toast';

export interface NotificationOptions {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  icon?: string;
  style?: React.CSSProperties;
  className?: string;
}

export function useNotify() {
  const success = (message: string, options?: NotificationOptions) => {
    return toast.success(message, {
      duration: options?.duration || 4000,
      position: options?.position || 'top-right',
      style: options?.style,
      className: options?.className,
    });
  };

  const error = (message: string, options?: NotificationOptions) => {
    return toast.error(message, {
      duration: options?.duration || 6000,
      position: options?.position || 'top-right',
      style: options?.style,
      className: options?.className,
    });
  };

  const info = (message: string, options?: NotificationOptions) => {
    return toast(message, {
      duration: options?.duration || 4000,
      position: options?.position || 'top-right',
      style: options?.style,
      className: options?.className,
      icon: options?.icon || 'ℹ️',
    });
  };

  const warning = (message: string, options?: NotificationOptions) => {
    return toast(message, {
      duration: options?.duration || 5000,
      position: options?.position || 'top-right',
      style: options?.style,
      className: options?.className,
      icon: options?.icon || '⚠️',
    });
  };

  const loading = (message: string, options?: NotificationOptions) => {
    return toast.loading(message, {
      duration: options?.duration || Infinity,
      position: options?.position || 'top-right',
      style: options?.style,
      className: options?.className,
    });
  };

  const dismiss = (toastId?: string) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  };

  const promise = <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    },
    options?: NotificationOptions
  ) => {
    return toast.promise(promise, messages, {
      duration: options?.duration,
      position: options?.position || 'top-right',
      style: options?.style,
      className: options?.className,
    });
  };

  return {
    success,
    error,
    info,
    warning,
    loading,
    dismiss,
    promise,
  };
}






