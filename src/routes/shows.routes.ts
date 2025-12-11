/**
 * src/routes/shows.routes.ts
 *
 * Routes for:
 * - Creating shows (Admin)
 * - Listing shows
 * - Retrieving show details with seats
 *
 * This file uses a small local wrapAsync helper instead of importing a
 * global wrapper from app. This avoids runtime interop issues between
 * compiled modules and keeps each route self-contained.
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  handleCreateShow,
  handleListShows,
  handleGetShowById
} from '../controllers/shows.controller';

const router = Router();

/** local async wrapper (identical purpose to previous wrap) */
const wrapAsync = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

/**
 * POST /api/shows
 * Body: { name, start_time, total_seats }
 * Admin action: create a show with the required number of seats
 */
router.post('/', wrapAsync(handleCreateShow));

/**
 * GET /api/shows
 * List all shows
 */
router.get('/', wrapAsync(handleListShows));

/**
 * GET /api/shows/:id
 * Get specific show + its seats
 */
router.get('/:id', wrapAsync(handleGetShowById));

export default router;
