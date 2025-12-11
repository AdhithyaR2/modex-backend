/**
 * src/services/show.service.ts
 *
 * Business logic for shows:
 */

import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info', transport: { target: 'pino-pretty', options: { colorize: true } } });

export type Show = {
  id: string;
  name: string;
  start_time: string;
  total_seats: number;
  created_at?: string;
};

export type SeatRow = {
  id: string;
  show_id: string;
  seat_number: string;
  status: 'AVAILABLE' | 'BOOKED';
  created_at?: string;
};

export async function createShow(name: string, start_time: string, totalSeats: number): Promise<Show> {
  if (!name || typeof name !== 'string') throw new Error('Invalid name');
  if (!start_time || isNaN(new Date(start_time).getTime())) throw new Error('Invalid start_time');
  if (!Number.isInteger(totalSeats) || totalSeats <= 0) throw new Error('totalSeats must be a positive integer');

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const showId = uuidv4();
    const insertShowSql = `INSERT INTO shows (id, name, start_time, total_seats) VALUES ($1, $2, $3, $4)`;
    await client.query(insertShowSql, [showId, name, start_time, totalSeats]);

    const values: string[] = [];
    const params: any[] = [];

    for (let i = 1; i <= totalSeats; i++) {
      const seatId = uuidv4();
      const seatNumber = i.toString();
      params.push(seatId, showId, seatNumber);
      const baseIndex = params.length - 2;
      values.push(`($${baseIndex}, $${baseIndex + 1}, $${baseIndex + 2}, 'AVAILABLE')`);
    }

    if (values.length > 0) {
      const insertSeatsSql = `
        INSERT INTO seats (id, show_id, seat_number, status)
        VALUES ${values.join(', ')}
      `;
      await client.query(insertSeatsSql, params);
    }

    await client.query('COMMIT');

    logger.info({ showId, name, totalSeats }, 'show_created');
    return { id: showId, name, start_time, total_seats: totalSeats };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'createShow transaction failed');
    throw err;
  } finally {
    client.release();
  }
}

export async function listShows(): Promise<Show[]> {
  const sql = `
    SELECT id, name, start_time, total_seats
    FROM shows
    ORDER BY start_time ASC
    LIMIT 200
  `;
  const res = await db.query(sql);
  return res.rows;
}

export async function getShow(showId: string): Promise<(Show & { seats: SeatRow[] }) | null> {
  const showRes = await db.query('SELECT id, name, start_time, total_seats FROM shows WHERE id = $1', [showId]);
  if (showRes.rowCount === 0) return null;
  const show = showRes.rows[0];

  const seatsRes = await db.query('SELECT id, show_id, seat_number, status, created_at FROM seats WHERE show_id = $1 ORDER BY seat_number::int NULLS LAST, seat_number ASC', [showId]);
  const seats = seatsRes.rows.map((r: any) => ({
    id: r.id,
    show_id: r.show_id,
    seat_number: r.seat_number,
    status: r.status as 'AVAILABLE' | 'BOOKED',
    created_at: r.created_at
  }));

  return { ...show, seats };
}
