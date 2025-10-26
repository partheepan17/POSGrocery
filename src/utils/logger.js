"use strict";
/**
 * Simple logger implementation for frontend
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContextLogger = createContextLogger;
function createContextLogger(context) {
    const prefix = `[${context.operation}]`;
    return {
        error: (message, data) => {
            console.error(`${prefix} ${message}`, data);
        },
        info: (message, data) => {
            console.info(`${prefix} ${message}`, data);
        },
        warn: (message, data) => {
            console.warn(`${prefix} ${message}`, data);
        },
        debug: (message, data) => {
            console.debug(`${prefix} ${message}`, data);
        }
    };
}
