/**
 * src/controllers/shows.controller.ts
 *
 * HTTP controllers for shows endpoints.
 * - Minimal responsibility: validate request, call service, return response.
 * - All heavy-lifting and DB logic lives in services/show.service.ts
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError, logger } from '../app';
import * as showService from '../services/show.service';

type CreateShowBody = {
  name?: string;
  start_time?: string; // ISO datetime string
  total_seats?: number;
};

/**
 * POST /api/shows
 * Admin: create a show and its seat rows.
 */
export async function handleCreateShow(req: Request, res: Response, next: NextFunction) {
  const body = req.body as CreateShowBody;

  // Basic validation
  if (!body || typeof body !== 'object') {
    throw new ApiError(400, 'Invalid request body');
  }
  const { name, start_time, total_seats } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new ApiError(400, 'name is required and must be a non-empty string');
  }

  if (!start_time || typeof start_time !== 'string') {
    throw new ApiError(400, 'start_time is required and must be an ISO datetime string');
  }
  const startTimeParsed = new Date(start_time);
  if (Number.isNaN(startTimeParsed.getTime())) {
    throw new ApiError(400, 'start_time must be a valid ISO datetime string');
  }

  if (typeof total_seats !== 'number' || !Number.isInteger(total_seats) || total_seats <= 0) {
    throw new ApiError(400, 'total_seats is required and must be a positive integer');
  }

  // Call service
  try {
    logger.info({ route: 'createShow', name, start_time, total_seats }, 'creating_show');
    const show = await showService.createShow(name.trim(), start_time, total_seats);
    return res.status(201).json({ data: show });
  } catch (err) {
    // Let global error handler deal with logging; wrap common DB error shapes into ApiError when possible
    logger.error({ err, route: 'createShow' }, 'createShow failed');
    return next(err);
  }
}

/**
 * GET /api/shows
 * List shows (basic listing)
 */
export async function handleListShows(_req: Request, res: Response, next: NextFunction) {
  try {
    const shows = await showService.listShows();
    return res.json({ data: shows });
  } catch (err) {
    logger.error({ err, route: 'listShows' }, 'listShows failed');
    return next(err);
  }
}

/**
 * GET /api/shows/:id
 * Get show by ID with seats
 */
export async function handleGetShowById(req: Request, res: Response, next: NextFunction) {
  const showId = req.params.id;
  if (!showId) {
    throw new ApiError(400, 'Show id is required');
  }

  try {
    const show = await showService.getShow(showId);
    if (!show) {
      throw new ApiError(404, 'Show not found');
    }
    return res.json({ data: show });
  } catch (err) {
    logger.error({ err, route: 'getShowById', showId }, 'getShowById failed');
    return next(err);
  }
}
