/**
 * Event system for access control and feature management
 */

export interface FeatureUpdateEvent {
  tenantId: string;
  featureCode: string;
  enabled: boolean;
  timestamp: number;
}

export interface CacheInvalidationEvent {
  tenantId: string;
  cacheKey: string;
  timestamp: number;
}

// Simple event emitter for feature updates
class EventEmitter {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, listener: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: string, listener: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }
}

const eventEmitter = new EventEmitter();

export function emitFeatureUpdate(event: FeatureUpdateEvent) {
  eventEmitter.emit('feature:update', event);
}

export function emitCacheInvalidation(event: CacheInvalidationEvent) {
  eventEmitter.emit('cache:invalidation', event);
}

export function onFeatureUpdate(listener: (event: FeatureUpdateEvent) => void) {
  eventEmitter.on('feature:update', listener);
}

export function onCacheInvalidation(listener: (event: CacheInvalidationEvent) => void) {
  eventEmitter.on('cache:invalidation', listener);
}









