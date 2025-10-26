/**
 * Event System
 * Provides realtime event broadcasting for feature updates and system changes
 */
import { EventEmitter } from 'events';
interface SystemEvents {
    'features:update': (data: {
        tenantId: string;
        featureCode?: string;
        updatedBy?: string;
    }) => void;
    'permissions:update': (data: {
        tenantId: string;
        userId?: number;
        updatedBy?: string;
    }) => void;
    'user:login': (data: {
        userId: number;
        username: string;
        tenantId: string;
    }) => void;
    'user:logout': (data: {
        userId: number;
        username: string;
        tenantId: string;
    }) => void;
    'tenant:update': (data: {
        tenantId: string;
        updatedBy?: string;
    }) => void;
    'cache:invalidate': (data: {
        tenantId: string;
        cacheType: 'features' | 'permissions' | 'all';
    }) => void;
    'system:maintenance': (data: {
        message: string;
        scheduledFor?: Date;
    }) => void;
    'alert:low_stock': (data: {
        tenantId: string;
        productId: number;
        currentStock: number;
        threshold: number;
    }) => void;
    'alert:expiry': (data: {
        tenantId: string;
        productId: number;
        expiryDate: string;
        daysUntilExpiry: number;
    }) => void;
    'sale:completed': (data: {
        tenantId: string;
        saleId: number;
        total: number;
        cashierId: number;
    }) => void;
    'inventory:adjusted': (data: {
        tenantId: string;
        productId: number;
        adjustment: number;
        reason: string;
    }) => void;
}
export declare class TypedEventEmitter extends EventEmitter {
    emit<K extends keyof SystemEvents>(event: K, ...args: Parameters<SystemEvents[K]>): boolean;
    on<K extends keyof SystemEvents>(event: K, listener: SystemEvents[K]): this;
    once<K extends keyof SystemEvents>(event: K, listener: SystemEvents[K]): this;
    off<K extends keyof SystemEvents>(event: K, listener: SystemEvents[K]): this;
    addListener<K extends keyof SystemEvents>(event: K, listener: SystemEvents[K]): this;
    removeListener<K extends keyof SystemEvents>(event: K, listener: SystemEvents[K]): this;
}
export declare const eventBus: TypedEventEmitter;
/**
 * Event Helper Functions
 */
/**
 * Emit feature update event
 */
export declare function emitFeatureUpdate(tenantId: string, featureCode?: string, updatedBy?: string): void;
/**
 * Emit permission update event
 */
export declare function emitPermissionUpdate(tenantId: string, userId?: number, updatedBy?: string): void;
/**
 * Emit user login event
 */
export declare function emitUserLogin(userId: number, username: string, tenantId: string): void;
/**
 * Emit user logout event
 */
export declare function emitUserLogout(userId: number, username: string, tenantId: string): void;
/**
 * Emit tenant update event
 */
export declare function emitTenantUpdate(tenantId: string, updatedBy?: string): void;
/**
 * Emit cache invalidation event
 */
export declare function emitCacheInvalidation(tenantId: string, cacheType: 'features' | 'permissions' | 'all'): void;
/**
 * Emit system maintenance event
 */
export declare function emitSystemMaintenance(message: string, scheduledFor?: Date): void;
/**
 * Emit low stock alert
 */
export declare function emitLowStockAlert(tenantId: string, productId: number, currentStock: number, threshold: number): void;
/**
 * Emit expiry alert
 */
export declare function emitExpiryAlert(tenantId: string, productId: number, expiryDate: string, daysUntilExpiry: number): void;
/**
 * Emit sale completed event
 */
export declare function emitSaleCompleted(tenantId: string, saleId: number, total: number, cashierId: number): void;
/**
 * Emit inventory adjustment event
 */
export declare function emitInventoryAdjusted(tenantId: string, productId: number, adjustment: number, reason: string): void;
/**
 * Event Subscription Helpers
 */
/**
 * Subscribe to feature updates for a specific tenant
 */
export declare function subscribeToFeatureUpdates(tenantId: string, callback: (data: {
    tenantId: string;
    featureCode?: string;
    updatedBy?: string;
}) => void): () => void;
/**
 * Subscribe to permission updates for a specific tenant
 */
export declare function subscribeToPermissionUpdates(tenantId: string, callback: (data: {
    tenantId: string;
    userId?: number;
    updatedBy?: string;
}) => void): () => void;
/**
 * Subscribe to all events for a specific tenant
 */
export declare function subscribeToTenantEvents(tenantId: string, callback: (event: string, data: any) => void): () => void;
/**
 * Get event statistics
 */
export declare function getEventStats(): {
    listenerCount: number;
    eventNames: string[];
    maxListeners: number;
};
/**
 * Cleanup all listeners (useful for testing)
 */
export declare function cleanupAllListeners(): void;
export { eventBus as default };
