/**
 * src/controllers/bookings.controller.ts
 *
 * Controllers for booking endpoints:
 * - handleCreateBooking  -> creates a booking (concurrency-safe in service)
 * - handleGetBookingById -> returns booking status/details
 *
 * Responsibilities:
 * - Validate incoming HTTP payloads
 * - Call service layer
 * - Convert errors into ApiError when appropriate
 * - Log useful context for observability
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError, logger } from '../app';
import * as bookingService from '../services/booking.service';

type CreateBookingBody = {
  showId?: string;
  seatNumbers?: string[]; // seat identifiers as strings (e.g., ["1","2","A1"])
  userId?: string | null;
};

export async function handleCreateBooking(req: Request, res: Response, next: NextFunction) {
  const body = req.body as CreateBookingBody;

  if (!body || typeof body !== 'object') {
    throw new ApiError(400, 'Invalid request body');
  }

  const { showId, seatNumbers, userId } = body;

  if (!showId || typeof showId !== 'string') {
    throw new ApiError(400, 'showId is required and must be a string');
  }

  if (!Array.isArray(seatNumbers) || seatNumbers.length === 0) {
    throw new ApiError(400, 'seatNumbers is required and must be a non-empty array of seat identifiers');
  }

  // Validate seatNumbers entries
  for (const s of seatNumbers) {
    if (typeof s !== 'string' || s.trim().length === 0) {
      throw new ApiError(400, 'Each seatNumber must be a non-empty string');
    }
  }

  try {
    logger.info({ route: 'createBooking', showId, seatsRequested: seatNumbers.length, userId }, 'creating_booking');

    // Call the service — service will handle transaction and concurrency safety
    const booking = await bookingService.createBooking(showId, seatNumbers.map(s => s.trim()), userId || null);

    // Return booking record; booking.status will be PENDING (or CONFIRMED depending on flow)
    return res.status(201).json({ data: booking });
  } catch (err: any) {
    // Convert known DB or business errors into ApiError for better client messages
    // The service throws Errors with descriptive messages; preserve them as 400-level where appropriate
    logger.error({ err, route: 'createBooking', showId, seatNumbers }, 'createBooking failed');

    // If error appears to be a validation/business error, return 400
    if (err && (err.message?.includes('not found') || err.message?.includes('not available') || err.message?.includes('required'))) {
      return next(new ApiError(400, err.message));
    }

    return next(err);
  }
}

export async function handleGetBookingById(req: Request, res: Response, next: NextFunction) {
  const bookingId = req.params.id;
  if (!bookingId || typeof bookingId !== 'string') {
    throw new ApiError(400, 'booking id is required');
  }

  try {
    const booking = await bookingService.getBooking(bookingId);
    if (!booking) {
      return next(new ApiError(404, 'Booking not found'));
    }
    return res.json({ data: booking });
  } catch (err) {
    logger.error({ err, route: 'getBookingById', bookingId }, 'getBookingById failed');
    return next(err);
  }
}
