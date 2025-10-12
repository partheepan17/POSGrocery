// Notification Service for Real-time POS Notifications
import React from 'react';
import { toast } from 'react-hot-toast';

export interface NotificationData {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  category: 'sales' | 'inventory' | 'system' | 'security' | 'maintenance';
  actions?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }[];
  persistent?: boolean;
  autoHide?: boolean;
}

class NotificationService {
  private listeners: ((notifications: NotificationData[]) => void)[] = [];
  private notifications: NotificationData[] = [];
  private maxNotifications = 100;

  // Subscribe to notification changes
  subscribe(listener: (notifications: NotificationData[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners
  private notify() {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  // Add a new notification
  addNotification(notification: Omit<NotificationData, 'id' | 'timestamp' | 'read'>): string {
    const id = Math.random().toString(36).substring(7);
    const newNotification: NotificationData = {
      ...notification,
      id,
      timestamp: new Date(),
      read: false
    };

    // Add to beginning of array
    this.notifications.unshift(newNotification);

    // Limit notifications
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }

    // Show toast for immediate feedback
    if (notification.autoHide !== false) {
      this.showToast(newNotification);
    }

    this.notify();
    return id;
  }

  // Show toast notification
  private showToast(notification: NotificationData) {
    const toastOptions = {
      duration: notification.persistent ? Infinity : 4000,
      position: 'top-right' as const,
    };

    switch (notification.type) {
      case 'success':
        toast.success(notification.message, toastOptions);
        break;
      case 'error':
        toast.error(notification.message, toastOptions);
        break;
      case 'warning':
        toast(notification.message, {
          ...toastOptions,
          icon: '⚠️',
          style: {
            background: '#fbbf24',
            color: '#1f2937',
          },
        });
        break;
      case 'info':
      default:
        toast(notification.message, {
          ...toastOptions,
          icon: 'ℹ️',
        });
        break;
    }
  }

  // Mark notification as read
  markAsRead(id: string) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification && !notification.read) {
      notification.read = true;
      this.notify();
    }
  }

  // Mark all notifications as read
  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.notify();
  }

  // Dismiss notification
  dismiss(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notify();
  }

  // Clear all notifications
  clearAll() {
    this.notifications = [];
    this.notify();
  }

  // Get all notifications
  getNotifications(): NotificationData[] {
    return [...this.notifications];
  }

  // Get unread count
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  // POS-specific notification methods
  saleCompleted(invoiceNumber: string, amount: number) {
    return this.addNotification({
      type: 'success',
      title: 'Sale Completed',
      message: `Invoice #${invoiceNumber} - ${amount.toFixed(2)} LKR`,
      priority: 'medium',
      category: 'sales',
      actions: [
        {
          label: 'Print Receipt',
          onClick: () => {
            // Trigger print functionality
            console.log('Print receipt for invoice:', invoiceNumber);
          },
          variant: 'primary'
        }
      ]
    });
  }

  lowStockAlert(productName: string, currentStock: number, reorderLevel: number) {
    return this.addNotification({
      type: 'warning',
      title: 'Low Stock Alert',
      message: `${productName} - Only ${currentStock} units left (Reorder at ${reorderLevel})`,
      priority: 'high',
      category: 'inventory',
      actions: [
        {
          label: 'View Product',
          onClick: () => {
            // Navigate to product details
            console.log('Navigate to product:', productName);
          },
          variant: 'primary'
        }
      ]
    });
  }

  systemError(error: string, context?: string) {
    return this.addNotification({
      type: 'error',
      title: 'System Error',
      message: context ? `${context}: ${error}` : error,
      priority: 'high',
      category: 'system',
      persistent: true
    });
  }

  securityAlert(action: string, user?: string) {
    return this.addNotification({
      type: 'warning',
      title: 'Security Alert',
      message: user ? `${action} by ${user}` : action,
      priority: 'high',
      category: 'security',
      persistent: true
    });
  }

  maintenanceScheduled(time: string, duration: string) {
    return this.addNotification({
      type: 'info',
      title: 'Maintenance Scheduled',
      message: `System maintenance scheduled for ${time} (${duration})`,
      priority: 'medium',
      category: 'maintenance',
      persistent: true
    });
  }

  // Clear notifications by category
  clearByCategory(category: NotificationData['category']) {
    this.notifications = this.notifications.filter(n => n.category !== category);
    this.notify();
  }

  // Get notifications by category
  getByCategory(category: NotificationData['category']): NotificationData[] {
    return this.notifications.filter(n => n.category === category);
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

// Hook for React components
export const useNotificationService = () => {
  const [notifications, setNotifications] = React.useState<NotificationData[]>([]);

  React.useEffect(() => {
    const unsubscribe = notificationService.subscribe(setNotifications);
    return unsubscribe;
  }, []);

  return {
    notifications,
    addNotification: notificationService.addNotification.bind(notificationService),
    markAsRead: notificationService.markAsRead.bind(notificationService),
    markAllAsRead: notificationService.markAllAsRead.bind(notificationService),
    dismiss: notificationService.dismiss.bind(notificationService),
    clearAll: notificationService.clearAll.bind(notificationService),
    unreadCount: notificationService.getUnreadCount(),
    // POS-specific methods
    saleCompleted: notificationService.saleCompleted.bind(notificationService),
    lowStockAlert: notificationService.lowStockAlert.bind(notificationService),
    systemError: notificationService.systemError.bind(notificationService),
    securityAlert: notificationService.securityAlert.bind(notificationService),
    maintenanceScheduled: notificationService.maintenanceScheduled.bind(notificationService),
  };
};
