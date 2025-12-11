"use strict";
/**
 * src/services/show.service.ts
 *
 * Business logic for shows:
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createShow = createShow;
exports.listShows = listShows;
exports.getShow = getShow;
const db_1 = require("../db");
const uuid_1 = require("uuid");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ level: process.env.LOG_LEVEL || 'info', transport: { target: 'pino-pretty', options: { colorize: true } } });
async function createShow(name, start_time, totalSeats) {
    if (!name || typeof name !== 'string')
        throw new Error('Invalid name');
    if (!start_time || isNaN(new Date(start_time).getTime()))
        throw new Error('Invalid start_time');
    if (!Number.isInteger(totalSeats) || totalSeats <= 0)
        throw new Error('totalSeats must be a positive integer');
    const client = await db_1.db.getClient();
    try {
        await client.query('BEGIN');
        const showId = (0, uuid_1.v4)();
        const insertShowSql = `INSERT INTO shows (id, name, start_time, total_seats) VALUES ($1, $2, $3, $4)`;
        await client.query(insertShowSql, [showId, name, start_time, totalSeats]);
        const values = [];
        const params = [];
        for (let i = 1; i <= totalSeats; i++) {
            const seatId = (0, uuid_1.v4)();
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
    }
    catch (err) {
        await client.query('ROLLBACK');
        logger.error({ err }, 'createShow transaction failed');
        throw err;
    }
    finally {
        client.release();
    }
}
async function listShows() {
    const sql = `
    SELECT id, name, start_time, total_seats
    FROM shows
    ORDER BY start_time ASC
    LIMIT 200
  `;
    const res = await db_1.db.query(sql);
    return res.rows;
}
async function getShow(showId) {
    const showRes = await db_1.db.query('SELECT id, name, start_time, total_seats FROM shows WHERE id = $1', [showId]);
    if (showRes.rowCount === 0)
        return null;
    const show = showRes.rows[0];
    const seatsRes = await db_1.db.query('SELECT id, show_id, seat_number, status, created_at FROM seats WHERE show_id = $1 ORDER BY seat_number::int NULLS LAST, seat_number ASC', [showId]);
    const seats = seatsRes.rows.map((r) => ({
        id: r.id,
        show_id: r.show_id,
        seat_number: r.seat_number,
        status: r.status,
        created_at: r.created_at
    }));
    return { ...show, seats };
}
//# sourceMappingURL=show.service.js.map