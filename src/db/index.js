"use strict";
/**
 * Mock database implementation for frontend
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabase = exports.db = void 0;
class MockDatabase {
    async query(sql, params) {
        console.log('Mock DB Query:', sql, params);
        return [];
    }
    async run(sql, params) {
        console.log('Mock DB Run:', sql, params);
        return { lastInsertRowid: 1, changes: 1 };
    }
    async transaction(callback) {
        console.log('Mock DB Transaction started');
        await callback(this);
        console.log('Mock DB Transaction committed');
    }
    prepare(sql) {
        console.log('Mock DB Prepare:', sql);
        return {
            all: (...params) => {
                console.log('Mock DB Prepared All:', sql, params);
                return [];
            },
            get: (...params) => {
                console.log('Mock DB Prepared Get:', sql, params);
                return null;
            },
            run: (...params) => {
                console.log('Mock DB Prepared Run:', sql, params);
                return { lastInsertRowid: 1, changes: 1 };
            }
        };
    }
}
exports.db = new MockDatabase();
// Export getDatabase function for compatibility
const getDatabase = () => exports.db;
exports.getDatabase = getDatabase;
exports.default = exports.db;
