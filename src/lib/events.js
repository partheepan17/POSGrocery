"use strict";
/**
 * Event System
 * Provides realtime event broadcasting for feature updates and system changes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.eventBus = exports.TypedEventEmitter = void 0;
exports.emitFeatureUpdate = emitFeatureUpdate;
exports.emitPermissionUpdate = emitPermissionUpdate;
exports.emitUserLogin = emitUserLogin;
exports.emitUserLogout = emitUserLogout;
exports.emitTenantUpdate = emitTenantUpdate;
exports.emitCacheInvalidation = emitCacheInvalidation;
exports.emitSystemMaintenance = emitSystemMaintenance;
exports.emitLowStockAlert = emitLowStockAlert;
exports.emitExpiryAlert = emitExpiryAlert;
exports.emitSaleCompleted = emitSaleCompleted;
exports.emitInventoryAdjusted = emitInventoryAdjusted;
exports.subscribeToFeatureUpdates = subscribeToFeatureUpdates;
exports.subscribeToPermissionUpdates = subscribeToPermissionUpdates;
exports.subscribeToTenantEvents = subscribeToTenantEvents;
exports.getEventStats = getEventStats;
exports.cleanupAllListeners = cleanupAllListeners;
const events_1 = require("events");
const logger_1 = require("../utils/logger");
class TypedEventEmitter extends events_1.EventEmitter {
    // Override emit to provide type safety
    emit(event, ...args) {
        return super.emit(event, ...args);
    }
    // Override on to provide type safety
    on(event, listener) {
        return super.on(event, listener);
    }
    // Override once to provide type safety
    once(event, listener) {
        return super.once(event, listener);
    }
    // Override off to provide type safety
    off(event, listener) {
        return super.off(event, listener);
    }
    // Override addListener to provide type safety
    addListener(event, listener) {
        return super.addListener(event, listener);
    }
    // Override removeListener to provide type safety
    removeListener(event, listener) {
        return super.removeListener(event, listener);
    }
}
exports.TypedEventEmitter = TypedEventEmitter;
// Create singleton event emitter
exports.eventBus = new TypedEventEmitter();
exports.default = exports.eventBus;
// Set max listeners to prevent memory leaks
exports.eventBus.setMaxListeners(100);
// Add logging for debugging
const logger = (0, logger_1.createContextLogger)({ operation: 'event_system' });
// Log all events for debugging (can be disabled in production)
if (globalThis.process?.env?.NODE_ENV === 'development') {
    exports.eventBus.on('features:update', (data) => {
        logger.debug('Features updated', data);
    });
    exports.eventBus.on('permissions:update', (data) => {
        logger.debug('Permissions updated', data);
    });
    exports.eventBus.on('user:login', (data) => {
        logger.info('User logged in', data);
    });
    exports.eventBus.on('user:logout', (data) => {
        logger.info('User logged out', data);
    });
    exports.eventBus.on('cache:invalidate', (data) => {
        logger.debug('Cache invalidated', data);
    });
}
/**
 * Event Helper Functions
 */
/**
 * Emit feature update event
 */
function emitFeatureUpdate(tenantId, featureCode, updatedBy) {
    exports.eventBus.emit('features:update', { tenantId, featureCode, updatedBy });
    logger.info('Feature update event emitted', { tenantId, featureCode, updatedBy });
}
/**
 * Emit permission update event
 */
function emitPermissionUpdate(tenantId, userId, updatedBy) {
    exports.eventBus.emit('permissions:update', { tenantId, userId, updatedBy });
    logger.info('Permission update event emitted', { tenantId, userId, updatedBy });
}
/**
 * Emit user login event
 */
function emitUserLogin(userId, username, tenantId) {
    exports.eventBus.emit('user:login', { userId, username, tenantId });
    logger.info('User login event emitted', { userId, username, tenantId });
}
/**
 * Emit user logout event
 */
function emitUserLogout(userId, username, tenantId) {
    exports.eventBus.emit('user:logout', { userId, username, tenantId });
    logger.info('User logout event emitted', { userId, username, tenantId });
}
/**
 * Emit tenant update event
 */
function emitTenantUpdate(tenantId, updatedBy) {
    exports.eventBus.emit('tenant:update', { tenantId, updatedBy });
    logger.info('Tenant update event emitted', { tenantId, updatedBy });
}
/**
 * Emit cache invalidation event
 */
function emitCacheInvalidation(tenantId, cacheType) {
    exports.eventBus.emit('cache:invalidate', { tenantId, cacheType });
    logger.info('Cache invalidation event emitted', { tenantId, cacheType });
}
/**
 * Emit system maintenance event
 */
function emitSystemMaintenance(message, scheduledFor) {
    exports.eventBus.emit('system:maintenance', { message, scheduledFor });
    logger.warn('System maintenance event emitted', { message, scheduledFor });
}
/**
 * Emit low stock alert
 */
function emitLowStockAlert(tenantId, productId, currentStock, threshold) {
    exports.eventBus.emit('alert:low_stock', { tenantId, productId, currentStock, threshold });
    logger.warn('Low stock alert emitted', { tenantId, productId, currentStock, threshold });
}
/**
 * Emit expiry alert
 */
function emitExpiryAlert(tenantId, productId, expiryDate, daysUntilExpiry) {
    exports.eventBus.emit('alert:expiry', { tenantId, productId, expiryDate, daysUntilExpiry });
    logger.warn('Expiry alert emitted', { tenantId, productId, expiryDate, daysUntilExpiry });
}
/**
 * Emit sale completed event
 */
function emitSaleCompleted(tenantId, saleId, total, cashierId) {
    exports.eventBus.emit('sale:completed', { tenantId, saleId, total, cashierId });
    logger.info('Sale completed event emitted', { tenantId, saleId, total, cashierId });
}
/**
 * Emit inventory adjustment event
 */
function emitInventoryAdjusted(tenantId, productId, adjustment, reason) {
    exports.eventBus.emit('inventory:adjusted', { tenantId, productId, adjustment, reason });
    logger.info('Inventory adjustment event emitted', { tenantId, productId, adjustment, reason });
}
/**
 * Event Subscription Helpers
 */
/**
 * Subscribe to feature updates for a specific tenant
 */
function subscribeToFeatureUpdates(tenantId, callback) {
    const listener = (data) => {
        if (data.tenantId === tenantId) {
            callback(data);
        }
    };
    exports.eventBus.on('features:update', listener);
    // Return unsubscribe function
    return () => {
        exports.eventBus.off('features:update', listener);
    };
}
/**
 * Subscribe to permission updates for a specific tenant
 */
function subscribeToPermissionUpdates(tenantId, callback) {
    const listener = (data) => {
        if (data.tenantId === tenantId) {
            callback(data);
        }
    };
    exports.eventBus.on('permissions:update', listener);
    // Return unsubscribe function
    return () => {
        exports.eventBus.off('permissions:update', listener);
    };
}
/**
 * Subscribe to all events for a specific tenant
 */
function subscribeToTenantEvents(tenantId, callback) {
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
    const listeners = [];
    events.forEach(event => {
        const listener = (data) => {
            if (data.tenantId === tenantId) {
                callback(event, data);
            }
        };
        exports.eventBus.on(event, listener);
        listeners.push({ event, listener });
    });
    // Return unsubscribe function
    return () => {
        listeners.forEach(({ event, listener }) => {
            exports.eventBus.off(event, listener);
        });
    };
}
/**
 * Get event statistics
 */
function getEventStats() {
    const eventNames = exports.eventBus.eventNames();
    const listenerCount = eventNames.reduce((total, eventName) => {
        return total + exports.eventBus.listenerCount(eventName);
    }, 0);
    return {
        listenerCount,
        eventNames,
        maxListeners: exports.eventBus.getMaxListeners()
    };
}
/**
 * Cleanup all listeners (useful for testing)
 */
function cleanupAllListeners() {
    exports.eventBus.removeAllListeners();
    logger.info('All event listeners cleaned up');
}
