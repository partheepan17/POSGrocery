"use strict";
/**
 * Event system for access control and feature management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitFeatureUpdate = emitFeatureUpdate;
exports.emitCacheInvalidation = emitCacheInvalidation;
exports.onFeatureUpdate = onFeatureUpdate;
exports.onCacheInvalidation = onCacheInvalidation;
// Simple event emitter for feature updates
class EventEmitter {
    constructor() {
        this.listeners = new Map();
    }
    on(event, listener) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(listener);
    }
    off(event, listener) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            const index = eventListeners.indexOf(listener);
            if (index > -1) {
                eventListeners.splice(index, 1);
            }
        }
    }
    emit(event, data) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.forEach(listener => {
                try {
                    listener(data);
                }
                catch (error) {
                    console.error('Error in event listener:', error);
                }
            });
        }
    }
}
const eventEmitter = new EventEmitter();
function emitFeatureUpdate(event) {
    eventEmitter.emit('feature:update', event);
}
function emitCacheInvalidation(event) {
    eventEmitter.emit('cache:invalidation', event);
}
function onFeatureUpdate(listener) {
    eventEmitter.on('feature:update', listener);
}
function onCacheInvalidation(listener) {
    eventEmitter.on('cache:invalidation', listener);
}
