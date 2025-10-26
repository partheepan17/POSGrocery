"use strict";
/**
 * Realtime Gateway
 * Provides Server-Sent Events (SSE) and WebSocket support for realtime updates
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSSEHandler = createSSEHandler;
exports.createStatusHandler = createStatusHandler;
exports.createBroadcastHandler = createBroadcastHandler;
exports.createWebSocketHandler = createWebSocketHandler;
exports.getConnectionStats = getConnectionStats;
exports.forceCleanup = forceCleanup;
exports.sendTestMessage = sendTestMessage;
const logger_1 = require("../utils/logger");
const events_1 = require("../lib/events");
const logger = (0, logger_1.createContextLogger)({ operation: 'realtime_gateway' });
// Store active SSE connections per tenant
const sseConnections = new Map();
const connectionStats = {
    totalConnections: 0,
    connectionsByTenant: new Map(),
    lastCleanup: Date.now()
};
/**
 * SSE Connection Management
 */
/**
 * Add SSE connection for a tenant
 */
function addSSEConnection(tenantId, res) {
    if (!sseConnections.has(tenantId)) {
        sseConnections.set(tenantId, new Set());
    }
    sseConnections.get(tenantId).add(res);
    connectionStats.totalConnections++;
    connectionStats.connectionsByTenant.set(tenantId, (connectionStats.connectionsByTenant.get(tenantId) || 0) + 1);
    logger.info('SSE connection added', {
        tenantId,
        totalConnections: connectionStats.totalConnections,
        tenantConnections: connectionStats.connectionsByTenant.get(tenantId)
    });
}
/**
 * Remove SSE connection for a tenant
 */
function removeSSEConnection(tenantId, res) {
    const tenantConnections = sseConnections.get(tenantId);
    if (tenantConnections) {
        tenantConnections.delete(res);
        connectionStats.totalConnections--;
        const tenantCount = connectionStats.connectionsByTenant.get(tenantId) || 0;
        connectionStats.connectionsByTenant.set(tenantId, Math.max(0, tenantCount - 1));
        if (tenantConnections.size === 0) {
            sseConnections.delete(tenantId);
        }
    }
    logger.info('SSE connection removed', {
        tenantId,
        totalConnections: connectionStats.totalConnections,
        tenantConnections: connectionStats.connectionsByTenant.get(tenantId)
    });
}
/**
 * Send SSE message to all connections for a tenant
 */
function sendSSEMessage(tenantId, event, data) {
    const tenantConnections = sseConnections.get(tenantId);
    if (!tenantConnections || tenantConnections.size === 0) {
        return;
    }
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const deadConnections = [];
    tenantConnections.forEach(res => {
        try {
            res.write(message);
        }
        catch (error) {
            logger.warn('Failed to send SSE message', {
                tenantId,
                error: error instanceof Error ? error.message : String(error)
            });
            deadConnections.push(res);
        }
    });
    // Remove dead connections
    deadConnections.forEach(res => {
        removeSSEConnection(tenantId, res);
    });
}
/**
 * Cleanup dead connections
 */
function cleanupDeadConnections() {
    const now = Date.now();
    if (now - connectionStats.lastCleanup < 60000) { // Cleanup every minute
        return;
    }
    connectionStats.lastCleanup = now;
    let cleanedCount = 0;
    sseConnections.forEach((connections, tenantId) => {
        const deadConnections = [];
        connections.forEach(res => {
            if (res.destroyed || res.writableEnded) {
                deadConnections.push(res);
            }
        });
        deadConnections.forEach(res => {
            removeSSEConnection(tenantId, res);
            cleanedCount++;
        });
    });
    if (cleanedCount > 0) {
        logger.info('Cleaned up dead SSE connections', { cleanedCount });
    }
}
/**
 * SSE Route Handlers
 */
/**
 * GET /api/realtime/events/:tenantId
 * Server-Sent Events endpoint for realtime updates
 */
function createSSEHandler() {
    return (req, res) => {
        const tenantId = req.params.tenantId;
        const userId = req.user?.id;
        const username = req.user?.username;
        if (!tenantId) {
            res.status(400).json({ error: 'Tenant ID is required' });
            return;
        }
        logger.info('SSE connection established', {
            tenantId,
            userId,
            username,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });
        // Set SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
        });
        // Send initial connection message
        res.write(`event: connected\ndata: ${JSON.stringify({
            tenantId,
            userId,
            username,
            timestamp: new Date().toISOString()
        })}\n\n`);
        // Add connection to tenant
        addSSEConnection(tenantId, res);
        // Set up event subscriptions
        const unsubscribeFeatureUpdates = (0, events_1.subscribeToFeatureUpdates)(tenantId, (data) => {
            sendSSEMessage(tenantId, 'features:update', {
                ...data,
                timestamp: new Date().toISOString()
            });
        });
        const unsubscribeTenantEvents = (0, events_1.subscribeToTenantEvents)(tenantId, (event, data) => {
            sendSSEMessage(tenantId, event, {
                ...data,
                timestamp: new Date().toISOString()
            });
        });
        // Handle client disconnect
        req.on('close', () => {
            logger.info('SSE connection closed', { tenantId, userId, username });
            removeSSEConnection(tenantId, res);
            unsubscribeFeatureUpdates();
            unsubscribeTenantEvents();
        });
        req.on('error', (error) => {
            logger.error('SSE connection error', {
                tenantId,
                userId,
                username,
                error: error.message
            });
            removeSSEConnection(tenantId, res);
            unsubscribeFeatureUpdates();
            unsubscribeTenantEvents();
        });
        // Send periodic heartbeat to keep connection alive
        const heartbeat = setInterval(() => {
            try {
                res.write(`event: heartbeat\ndata: ${JSON.stringify({
                    timestamp: new Date().toISOString()
                })}\n\n`);
            }
            catch (error) {
                clearInterval(heartbeat);
                removeSSEConnection(tenantId, res);
                unsubscribeFeatureUpdates();
                unsubscribeTenantEvents();
            }
        }, 60000); // 1 minute instead of 30 seconds
        // Cleanup heartbeat on disconnect
        req.on('close', () => {
            clearInterval(heartbeat);
        });
    };
}
/**
 * GET /api/realtime/status
 * Get realtime connection statistics
 */
function createStatusHandler() {
    return (req, res) => {
        cleanupDeadConnections();
        const stats = {
            totalConnections: connectionStats.totalConnections,
            tenants: Array.from(connectionStats.connectionsByTenant.entries()).map(([tenantId, count]) => ({
                tenantId,
                connectionCount: count
            })),
            activeTenants: sseConnections.size,
            lastCleanup: new Date(connectionStats.lastCleanup).toISOString()
        };
        res.json({
            ok: true,
            data: stats
        });
    };
}
/**
 * POST /api/realtime/broadcast
 * Broadcast message to all connections for a tenant (admin only)
 */
function createBroadcastHandler() {
    return (req, res) => {
        const { tenantId, event, data } = req.body;
        const userId = req.user?.id;
        if (!tenantId || !event) {
            res.status(400).json({
                error: 'Tenant ID and event are required'
            });
            return;
        }
        logger.info('Broadcasting message', {
            tenantId,
            event,
            userId,
            data
        });
        sendSSEMessage(tenantId, event, {
            ...data,
            broadcastBy: userId,
            timestamp: new Date().toISOString()
        });
        res.json({
            ok: true,
            message: 'Message broadcasted successfully'
        });
    };
}
/**
 * WebSocket Support (Optional)
 */
/**
 * WebSocket connection handler
 */
function createWebSocketHandler() {
    return (ws, req) => {
        const tenantId = req.query.tenantId;
        const userId = req.user?.id;
        const username = req.user?.username;
        if (!tenantId) {
            ws.close(1008, 'Tenant ID is required');
            return;
        }
        logger.info('WebSocket connection established', {
            tenantId,
            userId,
            username
        });
        // Send initial connection message
        ws.send(JSON.stringify({
            type: 'connected',
            data: {
                tenantId,
                userId,
                username,
                timestamp: new Date().toISOString()
            }
        }));
        // Set up event subscriptions
        const unsubscribeFeatureUpdates = (0, events_1.subscribeToFeatureUpdates)(tenantId, (data) => {
            ws.send(JSON.stringify({
                type: 'features:update',
                data: {
                    ...data,
                    timestamp: new Date().toISOString()
                }
            }));
        });
        const unsubscribeTenantEvents = (0, events_1.subscribeToTenantEvents)(tenantId, (event, data) => {
            ws.send(JSON.stringify({
                type: event,
                data: {
                    ...data,
                    timestamp: new Date().toISOString()
                }
            }));
        });
        // Handle WebSocket close
        ws.on('close', () => {
            logger.info('WebSocket connection closed', { tenantId, userId, username });
            unsubscribeFeatureUpdates();
            unsubscribeTenantEvents();
        });
        // Handle WebSocket error
        ws.on('error', (error) => {
            logger.error('WebSocket connection error', {
                tenantId,
                userId,
                username,
                error: error.message
            });
            unsubscribeFeatureUpdates();
            unsubscribeTenantEvents();
        });
        // Handle incoming messages
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                logger.debug('WebSocket message received', {
                    tenantId,
                    userId,
                    data
                });
                // Echo back with timestamp
                ws.send(JSON.stringify({
                    type: 'pong',
                    data: {
                        ...data,
                        timestamp: new Date().toISOString()
                    }
                }));
            }
            catch (error) {
                logger.warn('Invalid WebSocket message', {
                    tenantId,
                    userId,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    };
}
/**
 * Utility Functions
 */
/**
 * Get connection statistics
 */
function getConnectionStats() {
    cleanupDeadConnections();
    return {
        totalConnections: connectionStats.totalConnections,
        connectionsByTenant: Array.from(connectionStats.connectionsByTenant.entries()).map(([tenantId, count]) => ({ tenantId, count })),
        activeTenants: sseConnections.size,
        lastCleanup: new Date(connectionStats.lastCleanup).toISOString()
    };
}
/**
 * Force cleanup of all connections
 */
function forceCleanup() {
    sseConnections.clear();
    connectionStats.totalConnections = 0;
    connectionStats.connectionsByTenant.clear();
    connectionStats.lastCleanup = Date.now();
    logger.info('Forced cleanup of all SSE connections');
}
/**
 * Send test message to all connections for a tenant
 */
function sendTestMessage(tenantId, message) {
    sendSSEMessage(tenantId, 'test', {
        message,
        timestamp: new Date().toISOString()
    });
}
// Cleanup dead connections every 10 minutes (less frequent)
setInterval(cleanupDeadConnections, 10 * 60 * 1000);
exports.default = {
    createSSEHandler,
    createStatusHandler,
    createBroadcastHandler,
    createWebSocketHandler,
    getConnectionStats,
    forceCleanup,
    sendTestMessage
};
