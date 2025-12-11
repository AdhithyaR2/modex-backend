"use strict";
/**
 * src/services/booking.service.ts
 *
 * Core business logic for ticket bookings:
 * ---------------------------------------------------------
 * createBooking():
 *   - Locks requested seats using SELECT ... FOR UPDATE
 *   - Prevents race conditions & overbooking
 *   - Inserts a PENDING booking
 *   - Marks seats as BOOKED atomically inside the same transaction
 *
 * getBooking():
 *   - Fetches booking details
 *
 * This file is the concurrency engine of the entire system.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBooking = createBooking;
exports.getBooking = getBooking;
const db_1 = require("../db");
const uuid_1 = require("uuid");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || 'info',
    transport: { target: 'pino-pretty', options: { colorize: true } }
});
/* ------------------------------------------------------------------
 * createBooking — High-Security, Concurrency-Safe Algorithm
 * ------------------------------------------------------------------
 *
 * Steps:
 * 1. Begin transaction
 * 2. SELECT seats FOR UPDATE  → row-level lock
 * 3. Validate seat availability
 * 4. Insert booking as PENDING
 * 5. Mark seats as BOOKED
 * 6. Commit
 *
 * If ANY step fails → rollback automatically → no partial booking.
 * ------------------------------------------------------------------
 */
async function createBooking(showId, seatNumbers, userId) {
    if (!showId)
        throw new Error('showId is required');
    if (!Array.isArray(seatNumbers) || seatNumbers.length === 0)
        throw new Error('seatNumbers must be a non-empty array');
    const client = await db_1.db.getClient();
    const bookingId = (0, uuid_1.v4)();
    try {
        await client.query('BEGIN');
        logger.info({ showId, seatNumbers, userId, bookingId }, '🟦 Starting seat locking transaction');
        /* ------------------------------------------------------------
         * 1) Lock seats
         * ------------------------------------------------------------ */
        const lockQuery = `
      SELECT id, seat_number, status
      FROM seats
      WHERE show_id = $1 AND seat_number = ANY($2)
      FOR UPDATE
    `;
        const seatRes = await client.query(lockQuery, [showId, seatNumbers]);
        if (seatRes.rowCount !== seatNumbers.length) {
            throw new Error('One or more seats do not exist for this show.');
        }
        const seats = seatRes.rows;
        /* ------------------------------------------------------------
         * 2) Check all seats are AVAILABLE
         * ------------------------------------------------------------ */
        const taken = seats.find((s) => s.status !== 'AVAILABLE');
        if (taken) {
            throw new Error(`Seat ${taken.seat_number} is already booked or unavailable.`);
        }
        const seatIds = seats.map((s) => s.id);
        /* ------------------------------------------------------------
         * 3) Insert booking (PENDING)
         * ------------------------------------------------------------ */
        const insertBookingQuery = `
      INSERT INTO bookings (id, show_id, user_id, seats, status)
      VALUES ($1, $2, $3, $4, 'PENDING')
      RETURNING id, show_id, user_id, seats, status, created_at, updated_at
    `;
        const bookingRes = await client.query(insertBookingQuery, [
            bookingId,
            showId,
            userId,
            seatIds
        ]);
        /* ------------------------------------------------------------
         * 4) Mark seats as BOOKED
         * ------------------------------------------------------------ */
        await client.query(`UPDATE seats SET status = 'BOOKED' WHERE id = ANY($1)`, [seatIds]);
        /* ------------------------------------------------------------
         * 5) Commit
         * ------------------------------------------------------------ */
        await client.query('COMMIT');
        logger.info({ bookingId, seatCount: seatIds.length }, '🟩 Booking created successfully');
        return bookingRes.rows[0];
    }
    catch (err) {
        await client.query('ROLLBACK');
        logger.error({ err, bookingId, showId, seatNumbers }, '❌ Booking transaction failed, rolled back');
        // Best-effort: mark booking as FAILED if it was partially created
        try {
            await db_1.db.query(`UPDATE bookings SET status = 'FAILED' WHERE id = $1`, [
                bookingId
            ]);
        }
        catch {
            // ignore DB failure here — the main transaction already rolled back
        }
        // Re-throw the original error for controllers to map to HTTP responses
        throw err;
    }
    finally {
        client.release();
    }
}
/* ------------------------------------------------------------------
 * getBooking — Fetch a booking
 * ------------------------------------------------------------------ */
async function getBooking(bookingId) {
    if (!bookingId)
        throw new Error('bookingId is required');
    const query = `
    SELECT id, show_id, user_id, seats, status, created_at, updated_at
    FROM bookings
    WHERE id = $1
  `;
    const result = await db_1.db.query(query, [bookingId]);
    return result.rows[0] || null;
}
//# sourceMappingURL=booking.service.js.map