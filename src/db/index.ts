/**
 * src/db/index.ts
 * Postgres pool + simple typed query wrapper
 */

import { Pool, QueryResult } from 'pg';
import dotenv from 'dotenv';
import pino from 'pino';

dotenv.config();

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: { target: 'pino-pretty', options: { colorize: true } }
});

const sslEnabled = process.env.DB_SSL === 'true';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslEnabled ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 0,
  connectionTimeoutMillis: 10000
});

pool.on('connect', () => {
  logger.info('🟢 Connected to PostgreSQL database.');
});

pool.on('error', (err) => {
  logger.error({ err }, '🔴 Unexpected database error.');
});

export const db = {
  query: async (text: string, params?: any[]): Promise<QueryResult<any>> => {
    try {
      return await pool.query(text, params);
    } catch (err: any) {
      logger.error({ err, text, params }, '❌ DB Query Error');
      throw err;
    }
  },

  getClient: async () => {
    try {
      return await pool.connect();
    } catch (err: any) {
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

export { pool };
