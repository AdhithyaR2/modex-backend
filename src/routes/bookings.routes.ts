/**
 * src/routes/bookings.routes.ts
 *
 * Booking endpoints:
 * - POST /api/bookings      -> create a booking (PENDING / CONFIRMED logic in service)
 * - GET  /api/bookings/:id  -> fetch booking status/details
 *
 * Uses a local wrapAsync helper so the routes are independent of app exports.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { handleCreateBooking, handleGetBookingById } from '../controllers/bookings.controller';

const router = Router();

const wrapAsync = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

/**
 * POST /api/bookings
 * Body:
 * {
 *   "showId": "<uuid>",
 *   "seatNumbers": ["1","2"],
 *   "userId": "<optional-uuid>"
 * }
 */
router.post('/', wrapAsync(handleCreateBooking));

/**
 * GET /api/bookings/:id
 */
router.get('/:id', wrapAsync(handleGetBookingById));

export default router;
