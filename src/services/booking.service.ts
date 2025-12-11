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

import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: { target: 'pino-pretty', options: { colorize: true } }
});

/* ------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------ */
export type Booking = {
  id: string;
  show_id: string;
  user_id: string | null;
  seats: string[]; // array of seat IDs
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  created_at: string;
  updated_at: string;
};

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
export async function createBooking(
  showId: string,
  seatNumbers: string[],
  userId: string | null
): Promise<Booking> {
  if (!showId) throw new Error('showId is required');
  if (!Array.isArray(seatNumbers) || seatNumbers.length === 0) throw new Error('seatNumbers must be a non-empty array');

  const client = await db.getClient();
  const bookingId = uuidv4();

  try {
    await client.query('BEGIN');

    logger.info(
      { showId, seatNumbers, userId, bookingId },
      '🟦 Starting seat locking transaction'
    );

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
    const taken = seats.find((s: any) => s.status !== 'AVAILABLE');
    if (taken) {
      throw new Error(`Seat ${taken.seat_number} is already booked or unavailable.`);
    }

    const seatIds = seats.map((s: any) => s.id);

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
    await client.query(
      `UPDATE seats SET status = 'BOOKED' WHERE id = ANY($1)`,
      [seatIds]
    );

    /* ------------------------------------------------------------
     * 5) Commit
     * ------------------------------------------------------------ */
    await client.query('COMMIT');

    logger.info(
      { bookingId, seatCount: seatIds.length },
      '🟩 Booking created successfully'
    );

    return bookingRes.rows[0] as Booking;
  } catch (err: any) {
    await client.query('ROLLBACK');

    logger.error(
      { err, bookingId, showId, seatNumbers },
      '❌ Booking transaction failed, rolled back'
    );

    // Best-effort: mark booking as FAILED if it was partially created
    try {
      await db.query(`UPDATE bookings SET status = 'FAILED' WHERE id = $1`, [
        bookingId
      ]);
    } catch {
      // ignore DB failure here — the main transaction already rolled back
    }

    // Re-throw the original error for controllers to map to HTTP responses
    throw err;
  } finally {
    client.release();
  }
}

/* ------------------------------------------------------------------
 * getBooking — Fetch a booking
 * ------------------------------------------------------------------ */
export async function getBooking(bookingId: string): Promise<Booking | null> {
  if (!bookingId) throw new Error('bookingId is required');

  const query = `
    SELECT id, show_id, user_id, seats, status, created_at, updated_at
    FROM bookings
    WHERE id = $1
  `;

  const result = await db.query(query, [bookingId]);
  return (result.rows[0] as Booking) || null;
}
