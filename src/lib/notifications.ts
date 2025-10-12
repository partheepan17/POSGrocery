import { toast } from 'react-hot-toast';

export interface NotificationOptions {
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  requestId?: string;
}

export interface ErrorDetails {
  message: string;
  code?: string;
  requestId?: string;
  stack?: string;
  timestamp: string;
  url: string;
  userAgent: string;
}

class NotificationService {
  private requestId: string | null = null;

  setRequestId(id: string) {
    this.requestId = id;
  }

  getRequestId(): string | null {
    return this.requestId;
  }

  success(message: string, options: NotificationOptions = {}) {
    const toastOptions = this.buildToastOptions(options);
    return toast.success(this.formatMessage(message, options), toastOptions);
  }

  error(message: string, options: NotificationOptions = {}) {
    const toastOptions = this.buildToastOptions(options);
    return toast.error(this.formatMessage(message, options), toastOptions);
  }

  warning(message: string, options: NotificationOptions = {}) {
    const toastOptions = this.buildToastOptions(options);
    return toast(this.formatMessage(message, options), {
      ...toastOptions,
      icon: '⚠️',
      style: {
        background: '#f59e0b',
        color: '#fff',
      },
    });
  }

  info(message: string, options: NotificationOptions = {}) {
    const toastOptions = this.buildToastOptions(options);
    return toast(this.formatMessage(message, options), {
      ...toastOptions,
      icon: 'ℹ️',
      style: {
        background: '#3b82f6',
        color: '#fff',
      },
    });
  }

  private formatMessage(message: string, options: NotificationOptions): string {
    let formattedMessage = message;
    
    if (options.requestId || this.requestId) {
      const requestId = options.requestId || this.requestId;
      formattedMessage += `\n\nRequest ID: ${requestId}`;
    }
    
    return formattedMessage;
  }

  private buildToastOptions(options: NotificationOptions) {
    const defaultDuration = options.persistent ? Infinity : 4000;
    
    return {
      duration: options.duration || defaultDuration,
      position: 'top-right' as const,
      style: {
        background: this.getBackgroundColor(options.type),
        color: '#fff',
        padding: '12px 16px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        maxWidth: '400px',
        wordBreak: 'break-word' as const,
      },
      className: 'notification-toast',
      ...(options.action && {
        action: {
          label: options.action.label,
          onClick: options.action.onClick,
        },
      }),
    };
  }

  private getBackgroundColor(type?: string): string {
    switch (type) {
      case 'success':
        return '#22c55e';
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'info':
        return '#3b82f6';
      default:
        return '#374151';
    }
  }

  // Convenience methods for common POS operations
  saleCompleted(invoiceNumber: string, options: NotificationOptions = {}) {
    return this.success(`Sale completed! Invoice: ${invoiceNumber}`, {
      ...options,
      persistent: true,
      action: {
        label: 'Print Receipt',
        onClick: () => {
          // This would trigger print functionality
          console.log('Print receipt requested');
        },
      },
    });
  }

  returnProcessed(returnId: string, amount: number, options: NotificationOptions = {}) {
    return this.success(`Return processed! ID: ${returnId}, Amount: LKR ${amount.toFixed(2)}`, {
      ...options,
      persistent: true,
    });
  }

  paymentFailed(error: string, options: NotificationOptions = {}) {
    return this.error(`Payment failed: ${error}`, {
      ...options,
      persistent: true,
      action: {
        label: 'Retry',
        onClick: () => {
          // This would trigger retry functionality
          console.log('Retry payment requested');
        },
      },
    });
  }

  networkError(options: NotificationOptions = {}) {
    return this.error('Network connection lost. Some features may be limited.', {
      ...options,
      persistent: true,
      action: {
        label: 'Check Connection',
        onClick: () => {
          window.location.reload();
        },
      },
    });
  }

  validationError(field: string, message: string, options: NotificationOptions = {}) {
    return this.warning(`${field}: ${message}`, options);
  }

  // Clear all notifications
  clear() {
    toast.dismiss();
  }

  // Clear specific notification
  dismiss(id: string) {
    toast.dismiss(id);
  }
}

// Global notification service instance
export const notify = new NotificationService();

// Hook for React components
export function useNotify() {
  return {
    success: notify.success.bind(notify),
    error: notify.error.bind(notify),
    warning: notify.warning.bind(notify),
    info: notify.info.bind(notify),
    saleCompleted: notify.saleCompleted.bind(notify),
    returnProcessed: notify.returnProcessed.bind(notify),
    paymentFailed: notify.paymentFailed.bind(notify),
    networkError: notify.networkError.bind(notify),
    validationError: notify.validationError.bind(notify),
    clear: notify.clear.bind(notify),
    dismiss: notify.dismiss.bind(notify),
  };
}

// Error details formatter
export function formatErrorDetails(error: Error, requestId?: string): ErrorDetails {
  return {
    message: error.message,
    code: (error as any).code || 'UNKNOWN_ERROR',
    requestId: requestId || notify.getRequestId() || undefined,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
  };
}

// Copy error details to clipboard
export async function copyErrorDetails(errorDetails: ErrorDetails): Promise<boolean> {
  try {
    const errorText = `Error Details:
Message: ${errorDetails.message}
Code: ${errorDetails.code}
Request ID: ${errorDetails.requestId}
Timestamp: ${errorDetails.timestamp}
URL: ${errorDetails.url}

Stack Trace:
${errorDetails.stack}`;

    await navigator.clipboard.writeText(errorText);
    return true;
  } catch (err) {
    console.error('Failed to copy error details:', err);
    return false;
  }
}



