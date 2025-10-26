/**
 * Realtime Gateway
 * Provides Server-Sent Events (SSE) and WebSocket support for realtime updates
 */
import { Request, Response } from 'express';
/**
 * SSE Route Handlers
 */
/**
 * GET /api/realtime/events/:tenantId
 * Server-Sent Events endpoint for realtime updates
 */
export declare function createSSEHandler(): (req: Request, res: Response) => void;
/**
 * GET /api/realtime/status
 * Get realtime connection statistics
 */
export declare function createStatusHandler(): (req: Request, res: Response) => void;
/**
 * POST /api/realtime/broadcast
 * Broadcast message to all connections for a tenant (admin only)
 */
export declare function createBroadcastHandler(): (req: Request, res: Response) => void;
/**
 * WebSocket Support (Optional)
 */
/**
 * WebSocket connection handler
 */
export declare function createWebSocketHandler(): (ws: any, req: Request) => void;
/**
 * Utility Functions
 */
/**
 * Get connection statistics
 */
export declare function getConnectionStats(): {
    totalConnections: number;
    connectionsByTenant: Array<{
        tenantId: string;
        count: number;
    }>;
    activeTenants: number;
    lastCleanup: string;
};
/**
 * Force cleanup of all connections
 */
export declare function forceCleanup(): void;
/**
 * Send test message to all connections for a tenant
 */
export declare function sendTestMessage(tenantId: string, message: string): void;
declare const _default: {
    createSSEHandler: typeof createSSEHandler;
    createStatusHandler: typeof createStatusHandler;
    createBroadcastHandler: typeof createBroadcastHandler;
    createWebSocketHandler: typeof createWebSocketHandler;
    getConnectionStats: typeof getConnectionStats;
    forceCleanup: typeof forceCleanup;
    sendTestMessage: typeof sendTestMessage;
};
export default _default;
