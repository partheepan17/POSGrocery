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
export declare function emitFeatureUpdate(event: FeatureUpdateEvent): void;
export declare function emitCacheInvalidation(event: CacheInvalidationEvent): void;
export declare function onFeatureUpdate(listener: (event: FeatureUpdateEvent) => void): void;
export declare function onCacheInvalidation(listener: (event: CacheInvalidationEvent) => void): void;
