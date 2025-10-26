/**
 * Event System
 * Provides realtime event broadcasting for feature updates and system changes
 */

import { EventEmitter } from 'events';
import { createContextLogger } from '../utils/logger';

// Extend EventEmitter with typed events
interface SystemEvents {
  'features:update': (data: { tenantId: string; featureCode?: string; updatedBy?: string }) => void;
  'permissions:update': (data: { tenantId: string; userId?: number; updatedBy?: string }) => void;
  'user:login': (data: { userId: number; username: string; tenantId: string }) => void;
  'user:logout': (data: { userId: number; username: string; tenantId: string }) => void;
  'tenant:update': (data: { tenantId: string; updatedBy?: string }) => void;
  'cache:invalidate': (data: { tenantId: string; cacheType: 'features' | 'permissions' | 'all' }) => void;
  'system:maintenance': (data: { message: string; scheduledFor?: Date }) => void;
  'alert:low_stock': (data: { tenantId: string; productId: number; currentStock: number; threshold: number }) => void;
  'alert:expiry': (data: { tenantId: string; productId: number; expiryDate: string; daysUntilExpiry: number }) => void;
  'sale:completed': (data: { tenantId: string; saleId: number; total: number; cashierId: number }) => void;
  'inventory:adjusted': (data: { tenantId: string; productId: number; adjustment: number; reason: string }) => void;
}

export class TypedEventEmitter extends EventEmitter {
  // Override emit to provide type safety
  emit<K extends keyof SystemEvents>(event: K, ...args: Parameters<SystemEvents[K]>): boolean {
    return super.emit(event as string, ...args);
  }

  // Override on to provide type safety
  on<K extends keyof SystemEvents>(event: K, listener: SystemEvents[K]): this {
    return super.on(event as string, listener);
  }

  // Override once to provide type safety
  once<K extends keyof SystemEvents>(event: K, listener: SystemEvents[K]): this {
    return super.once(event as string, listener);
  }

  // Override off to provide type safety
  off<K extends keyof SystemEvents>(event: K, listener: SystemEvents[K]): this {
    return super.off(event as string, listener);
  }

  // Override addListener to provide type safety
  addListener<K extends keyof SystemEvents>(event: K, listener: SystemEvents[K]): this {
    return super.addListener(event as string, listener);
  }

  // Override removeListener to provide type safety
  removeListener<K extends keyof SystemEvents>(event: K, listener: SystemEvents[K]): this {
    return super.removeListener(event as string, listener);
  }
}

// Create singleton event emitter
export const eventBus = new TypedEventEmitter();

// Set max listeners to prevent memory leaks
eventBus.setMaxListeners(100);

// Add logging for debugging
const logger = createContextLogger({ operation: 'event_system' });

// Log all events for debugging (can be disabled in production)
if ((globalThis as any).process?.env?.NODE_ENV === 'development') {
  eventBus.on('features:update', (data) => {
    logger.debug('Features updated', data);
  });

  eventBus.on('permissions:update', (data) => {
    logger.debug('Permissions updated', data);
  });

  eventBus.on('user:login', (data) => {
    logger.info('User logged in', data);
  });

  eventBus.on('user:logout', (data) => {
    logger.info('User logged out', data);
  });

  eventBus.on('cache:invalidate', (data) => {
    logger.debug('Cache invalidated', data);
  });
}

/**
 * Event Helper Functions
 */

/**
 * Emit feature update event
 */
export function emitFeatureUpdate(tenantId: string, featureCode?: string, updatedBy?: string): void {
  eventBus.emit('features:update', { tenantId, featureCode, updatedBy });
  logger.info('Feature update event emitted', { tenantId, featureCode, updatedBy });
}

/**
 * Emit permission update event
 */
export function emitPermissionUpdate(tenantId: string, userId?: number, updatedBy?: string): void {
  eventBus.emit('permissions:update', { tenantId, userId, updatedBy });
  logger.info('Permission update event emitted', { tenantId, userId, updatedBy });
}

/**
 * Emit user login event
 */
export function emitUserLogin(userId: number, username: string, tenantId: string): void {
  eventBus.emit('user:login', { userId, username, tenantId });
  logger.info('User login event emitted', { userId, username, tenantId });
}

/**
 * Emit user logout event
 */
export function emitUserLogout(userId: number, username: string, tenantId: string): void {
  eventBus.emit('user:logout', { userId, username, tenantId });
  logger.info('User logout event emitted', { userId, username, tenantId });
}

/**
 * Emit tenant update event
 */
export function emitTenantUpdate(tenantId: string, updatedBy?: string): void {
  eventBus.emit('tenant:update', { tenantId, updatedBy });
  logger.info('Tenant update event emitted', { tenantId, updatedBy });
}

/**
 * Emit cache invalidation event
 */
export function emitCacheInvalidation(tenantId: string, cacheType: 'features' | 'permissions' | 'all'): void {
  eventBus.emit('cache:invalidate', { tenantId, cacheType });
  logger.info('Cache invalidation event emitted', { tenantId, cacheType });
}

/**
 * Emit system maintenance event
 */
export function emitSystemMaintenance(message: string, scheduledFor?: Date): void {
  eventBus.emit('system:maintenance', { message, scheduledFor });
  logger.warn('System maintenance event emitted', { message, scheduledFor });
}

/**
 * Emit low stock alert
 */
export function emitLowStockAlert(
  tenantId: string, 
  productId: number, 
  currentStock: number, 
  threshold: number
): void {
  eventBus.emit('alert:low_stock', { tenantId, productId, currentStock, threshold });
  logger.warn('Low stock alert emitted', { tenantId, productId, currentStock, threshold });
}

/**
 * Emit expiry alert
 */
export function emitExpiryAlert(
  tenantId: string, 
  productId: number, 
  expiryDate: string, 
  daysUntilExpiry: number
): void {
  eventBus.emit('alert:expiry', { tenantId, productId, expiryDate, daysUntilExpiry });
  logger.warn('Expiry alert emitted', { tenantId, productId, expiryDate, daysUntilExpiry });
}

/**
 * Emit sale completed event
 */
export function emitSaleCompleted(
  tenantId: string, 
  saleId: number, 
  total: number, 
  cashierId: number
): void {
  eventBus.emit('sale:completed', { tenantId, saleId, total, cashierId });
  logger.info('Sale completed event emitted', { tenantId, saleId, total, cashierId });
}

/**
 * Emit inventory adjustment event
 */
export function emitInventoryAdjusted(
  tenantId: string, 
  productId: number, 
  adjustment: number, 
  reason: string
): void {
  eventBus.emit('inventory:adjusted', { tenantId, productId, adjustment, reason });
  logger.info('Inventory adjustment event emitted', { tenantId, productId, adjustment, reason });
}

/**
 * Event Subscription Helpers
 */

/**
 * Subscribe to feature updates for a specific tenant
 */
export function subscribeToFeatureUpdates(
  tenantId: string, 
  callback: (data: { tenantId: string; featureCode?: string; updatedBy?: string }) => void
): () => void {
  const listener = (data: { tenantId: string; featureCode?: string; updatedBy?: string }) => {
    if (data.tenantId === tenantId) {
      callback(data);
    }
  };

  eventBus.on('features:update', listener);

  // Return unsubscribe function
  return () => {
    eventBus.off('features:update', listener);
  };
}

/**
 * Subscribe to permission updates for a specific tenant
 */
export function subscribeToPermissionUpdates(
  tenantId: string, 
  callback: (data: { tenantId: string; userId?: number; updatedBy?: string }) => void
): () => void {
  const listener = (data: { tenantId: string; userId?: number; updatedBy?: string }) => {
    if (data.tenantId === tenantId) {
      callback(data);
    }
  };

  eventBus.on('permissions:update', listener);

  // Return unsubscribe function
  return () => {
    eventBus.off('permissions:update', listener);
  };
}

/**
 * Subscribe to all events for a specific tenant
 */
export function subscribeToTenantEvents(
  tenantId: string, 
  callback: (event: string, data: any) => void
): () => void {
  const events = [
    'features:update',
    'permissions:update',
    'user:login',
    'user:logout',
    'tenant:update',
    'cache:invalidate',
    'alert:low_stock',
    'alert:expiry',
    'sale:completed',
    'inventory:adjusted'
  ];

  const listeners: Array<{ event: string; listener: Function }> = [];

  events.forEach(event => {
    const listener = (data: any) => {
      if (data.tenantId === tenantId) {
        callback(event, data);
      }
    };

    eventBus.on(event as keyof SystemEvents, listener);
    listeners.push({ event, listener });
  });

  // Return unsubscribe function
  return () => {
    listeners.forEach(({ event, listener }) => {
      eventBus.off(event as keyof SystemEvents, listener as any);
    });
  };
}

/**
 * Get event statistics
 */
export function getEventStats(): {
  listenerCount: number;
  eventNames: string[];
  maxListeners: number;
} {
  const eventNames = eventBus.eventNames() as string[];
  const listenerCount = eventNames.reduce((total, eventName) => {
    return total + eventBus.listenerCount(eventName);
  }, 0);

  return {
    listenerCount,
    eventNames,
    maxListeners: eventBus.getMaxListeners()
  };
}

/**
 * Cleanup all listeners (useful for testing)
 */
export function cleanupAllListeners(): void {
  eventBus.removeAllListeners();
  logger.info('All event listeners cleaned up');
}

// Export the event bus for direct access if needed
export { eventBus as default };

