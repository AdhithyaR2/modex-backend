/**
 * src/server.ts
 *
 * Application entrypoint:
 * - Boots the Express app
 * - Performs a DB connectivity check
 * - Configures graceful shutdown for SIGINT/SIGTERM
 * - Handles unhandledRejection and uncaughtException
 *
 * This file is intentionally small — the app factory lives in src/app.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { createApp, logger as appLogger } from './app';
import { pool } from './db';

const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

const app = createApp();
let server: ReturnType<typeof app.listen> | null = null;

/**
 * Check that DB is reachable before starting to accept traffic.
 * This is a lightweight sanity check; real readiness probes may be more thorough.
 */
async function checkDatabaseConnection() {
  try {
    // Simple query to validate connection
    await pool.query('SELECT 1');
    appLogger.info('✅ Database connection OK');
  } catch (err) {
    appLogger.error({ err }, '❌ Database connection failed during startup');
    throw err;
  }
}

/**
 * Start server
 */
async function start() {
  try {
    appLogger.info({ node_env: NODE_ENV, port: PORT }, 'Starting application');

    await checkDatabaseConnection();

    server = app.listen(PORT, () => {
      appLogger.info(`Server listening on port ${PORT}`);
    });

    // Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      try {
        appLogger.info({ signal }, 'Graceful shutdown initiated');
        if (server) {
          // stop accepting new connections
          server.close(() => {
            appLogger.info('HTTP server closed');
          });
        }

        // close DB pool
        await pool.end();
        appLogger.info('Postgres pool closed');

        // give process a moment to finish logs
        setTimeout(() => {
          appLogger.info('Shutdown complete, exiting process');
          process.exit(0);
        }, 500);
      } catch (err: any) {
        appLogger.error({ err }, 'Error during shutdown, forcing exit');
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Catch unhandled rejections and uncaught exceptions to log them and exit
    process.on('unhandledRejection', (reason: any) => {
      appLogger.error({ reason }, 'Unhandled Rejection - shutting down');
      // Give logger a moment then exit
      setTimeout(() => process.exit(1), 500);
    });

    process.on('uncaughtException', (err: any) => {
      appLogger.fatal({ err }, 'Uncaught Exception - shutting down');
      setTimeout(() => process.exit(1), 500);
    });
  } catch (err) {
    appLogger.error({ err }, 'Failed to start application');
    process.exit(1);
  }
}

/* Start the server when this file is executed directly.
   Export server for testing if required (e.g., import into test runner). */
if (require.main === module) {
  start();
}

export { start, app, server };
