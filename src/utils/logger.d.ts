/**
 * Simple logger implementation for frontend
 */
export interface Logger {
    error: (message: string, data?: any) => void;
    info: (message: string, data?: any) => void;
    warn: (message: string, data?: any) => void;
    debug: (message: string, data?: any) => void;
}
export declare function createContextLogger(context: {
    operation: string;
}): Logger;
