"use strict";
/**
 * src/db/index.ts
 * Postgres pool + simple typed query wrapper
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = exports.db = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const pino_1 = __importDefault(require("pino"));
dotenv_1.default.config();
const logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || 'info',
    transport: { target: 'pino-pretty', options: { colorize: true } }
});
const sslEnabled = process.env.DB_SSL === 'true';
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 0,
    connectionTimeoutMillis: 10000
});
exports.pool = pool;
pool.on('connect', () => {
    logger.info('🟢 Connected to PostgreSQL database.');
});
pool.on('error', (err) => {
    logger.error({ err }, '🔴 Unexpected database error.');
});
exports.db = {
    query: async (text, params) => {
        try {
            return await pool.query(text, params);
        }
        catch (err) {
            logger.error({ err, text, params }, '❌ DB Query Error');
            throw err;
        }
    },
    getClient: async () => {
        try {
            return await pool.connect();
        }
        catch (err) {
            logger.error({ err }, '❌ Failed to acquire DB client');
            throw err;
        }
    }
};
process.on('SIGTERM', async () => {
    logger.info('🟡 SIGTERM received. Closing Postgres pool...');
    await pool.end();
    logger.info('🔵 Postgres pool closed.');
});
//# sourceMappingURL=index.js.map