/**
 * Mock database implementation for frontend
 */
export interface Database {
    query: (sql: string, params?: any[]) => Promise<any[]>;
    run: (sql: string, params?: any[]) => Promise<{
        lastInsertRowid: number;
        changes: number;
    }>;
    transaction: (callback: (db: Database) => Promise<void>) => Promise<void>;
    prepare: (sql: string) => {
        all: (...params: any[]) => any[];
        get: (...params: any[]) => any;
        run: (...params: any[]) => {
            lastInsertRowid: number;
            changes: number;
        };
    };
}
declare class MockDatabase implements Database {
    query(sql: string, params?: any[]): Promise<any[]>;
    run(sql: string, params?: any[]): Promise<{
        lastInsertRowid: number;
        changes: number;
    }>;
    transaction(callback: (db: Database) => Promise<void>): Promise<void>;
    prepare(sql: string): {
        all: (...params: any[]) => never[];
        get: (...params: any[]) => null;
        run: (...params: any[]) => {
            lastInsertRowid: number;
            changes: number;
        };
    };
}
export declare const db: MockDatabase;
export declare const getDatabase: () => MockDatabase;
export default db;
