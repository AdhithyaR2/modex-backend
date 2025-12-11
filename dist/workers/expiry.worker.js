"use strict";
/**
 * src/workers/expiry.worker.ts
 *
 * Background worker that expires PENDING bookings older than EXPIRE_MINUTES.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processExpiryCycle = processExpiryCycle;
exports.startWorkerLoop = startWorkerLoop;
exports.shutdown = shutdown;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pino_1 = __importDefault(require("pino"));
const db_1 = require("../db");
const logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || 'info',
    transport: { target: 'pino-pretty', options: { colorize: true } }
});
const INTERVAL_SECONDS = Number(process.env.WORKER_INTERVAL_SECONDS || 30);
const EXPIRE_MINUTES = Number(process.env.EXPIRE_MINUTES || 2);
const ADVISORY_LOCK_KEY_1 = 123456;
const ADVISORY_LOCK_KEY_2 = 654321;
async function tryAcquireAdvisoryLock(client) {
    try {
        const res = await client.query('SELECT pg_try_advisory_lock($1, $2) AS locked', [ADVISORY_LOCK_KEY_1, ADVISORY_LOCK_KEY_2]);
        return res.rows[0]?.locked === true;
    }
    catch (err) {
        logger.error({ err }, 'advisory_lock_error');
        return false;
    }
}
async function releaseAdvisoryLock(client) {
    try {
        await client.query('SELECT pg_advisory_unlock($1, $2)', [ADVISORY_LOCK_KEY_1, ADVISORY_LOCK_KEY_2]);
    }
    catch (err) {
        logger.warn({ err }, 'advisory_unlock_failed');
    }
}
async function processExpiryCycle() {
    const client = await db_1.pool.connect();
    let gotLock = false;
    try {
        gotLock = await tryAcquireAdvisoryLock(client);
        if (!gotLock) {
            logger.info('Another worker holds the advisory lock; skipping this cycle.');
            return;
        }
        logger.info({ expireMinutes: EXPIRE_MINUTES }, 'Starting expiry cycle (locked)');
        const fetchCandidatesSql = `
      SELECT id
      FROM bookings
      WHERE status = 'PENDING'
        AND created_at < now() - ($1 || ' minutes')::interval
      ORDER BY created_at ASC
      LIMIT 100
    `;
        const candidatesRes = await client.query(fetchCandidatesSql, [EXPIRE_MINUTES]);
        const bookingsToExpire = candidatesRes.rows.map((r) => r.id);
        if (bookingsToExpire.length === 0) {
            logger.debug('No pending bookings to expire this cycle.');
            return;
        }
        logger.info({ count: bookingsToExpire.length }, 'Found pending bookings to expire');
        for (const bookingId of bookingsToExpire) {
            const txClient = await db_1.pool.connect();
            try {
                await txClient.query('BEGIN');
                const lockBookingSql = `SELECT id, seats, status FROM bookings WHERE id = $1 FOR UPDATE`;
                const lockRes = await txClient.query(lockBookingSql, [bookingId]);
                if (lockRes.rowCount === 0) {
                    await txClient.query('ROLLBACK');
                    logger.warn({ bookingId }, 'Booking not found during expiry');
                    txClient.release();
                    continue;
                }
                const booking = lockRes.rows[0];
                if (booking.status !== 'PENDING') {
                    await txClient.query('ROLLBACK');
                    logger.info({ bookingId, status: booking.status }, 'Booking no longer pending; skipping');
                    txClient.release();
                    continue;
                }
                const seatIds = booking.seats || [];
                await txClient.query(`UPDATE bookings SET status = 'FAILED', updated_at = now() WHERE id = $1`, [bookingId]);
                if (seatIds.length > 0) {
                    await txClient.query(`UPDATE seats SET status = 'AVAILABLE' WHERE id = ANY($1)`, [seatIds]);
                }
                await txClient.query('COMMIT');
                logger.info({ bookingId, freedSeats: seatIds.length }, 'Expired booking and freed seats');
            }
            catch (err) {
                await txClient.query('ROLLBACK');
                logger.error({ err, bookingId }, 'Failed to expire booking (rolled back)');
            }
            finally {
                txClient.release();
            }
        }
    }
    catch (err) {
        logger.error({ err }, 'Error in expiry worker main loop');
    }
    finally {
        if (gotLock) {
            try {
                await releaseAdvisoryLock(client);
            }
            catch (err) {
                logger.warn({ err }, 'Error releasing advisory lock');
            }
        }
        client.release();
    }
}
let intervalHandle = null;
let shuttingDown = false;
async function startWorkerLoop() {
    logger.info({ intervalSec: INTERVAL_SECONDS, expireMin: EXPIRE_MINUTES }, 'Starting expiry worker loop');
    try {
        await processExpiryCycle();
    }
    catch (err) {
        logger.error({ err }, 'Initial expiry cycle failed');
    }
    intervalHandle = setInterval(async () => {
        if (shuttingDown)
            return;
        try {
            await processExpiryCycle();
        }
        catch (err) {
            logger.error({ err }, 'Scheduled expiry cycle failed');
        }
    }, INTERVAL_SECONDS * 1000);
}
async function shutdown() {
    if (shuttingDown)
        return;
    shuttingDown = true;
    logger.info('Shutting down expiry worker...');
    if (intervalHandle) {
        clearInterval(intervalHandle);
        intervalHandle = null;
    }
    try {
        await db_1.pool.end();
        logger.info('Postgres pool closed, worker stopped.');
        process.exit(0);
    }
    catch (err) {
        logger.error({ err }, 'Error during worker shutdown');
        process.exit(1);
    }
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled Rejection in expiry worker');
});
process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught Exception in expiry worker');
    shutdown().catch(() => process.exit(1));
});
if (require.main === module) {
    startWorkerLoop().catch(err => {
        logger.error({ err }, 'Failed to start expiry worker loop');
        process.exit(1);
    });
}
//# sourceMappingURL=expiry.worker.js.map