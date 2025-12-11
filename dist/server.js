"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.app = void 0;
exports.start = start;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app_1 = require("./app");
const db_1 = require("./db");
const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const app = (0, app_1.createApp)();
exports.app = app;
let server = null;
exports.server = server;
/**
 * Check that DB is reachable before starting to accept traffic.
 * This is a lightweight sanity check; real readiness probes may be more thorough.
 */
async function checkDatabaseConnection() {
    try {
        // Simple query to validate connection
        await db_1.pool.query('SELECT 1');
        app_1.logger.info('✅ Database connection OK');
    }
    catch (err) {
        app_1.logger.error({ err }, '❌ Database connection failed during startup');
        throw err;
    }
}
/**
 * Start server
 */
async function start() {
    try {
        app_1.logger.info({ node_env: NODE_ENV, port: PORT }, 'Starting application');
        await checkDatabaseConnection();
        exports.server = server = app.listen(PORT, () => {
            app_1.logger.info(`Server listening on port ${PORT}`);
        });
        // Graceful shutdown handlers
        const shutdown = async (signal) => {
            try {
                app_1.logger.info({ signal }, 'Graceful shutdown initiated');
                if (server) {
                    // stop accepting new connections
                    server.close(() => {
                        app_1.logger.info('HTTP server closed');
                    });
                }
                // close DB pool
                await db_1.pool.end();
                app_1.logger.info('Postgres pool closed');
                // give process a moment to finish logs
                setTimeout(() => {
                    app_1.logger.info('Shutdown complete, exiting process');
                    process.exit(0);
                }, 500);
            }
            catch (err) {
                app_1.logger.error({ err }, 'Error during shutdown, forcing exit');
                process.exit(1);
            }
        };
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        // Catch unhandled rejections and uncaught exceptions to log them and exit
        process.on('unhandledRejection', (reason) => {
            app_1.logger.error({ reason }, 'Unhandled Rejection - shutting down');
            // Give logger a moment then exit
            setTimeout(() => process.exit(1), 500);
        });
        process.on('uncaughtException', (err) => {
            app_1.logger.fatal({ err }, 'Uncaught Exception - shutting down');
            setTimeout(() => process.exit(1), 500);
        });
    }
    catch (err) {
        app_1.logger.error({ err }, 'Failed to start application');
        process.exit(1);
    }
}
/* Start the server when this file is executed directly.
   Export server for testing if required (e.g., import into test runner). */
if (require.main === module) {
    start();
}
//# sourceMappingURL=server.js.map