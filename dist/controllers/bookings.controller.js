"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCreateBooking = handleCreateBooking;
exports.handleGetBookingById = handleGetBookingById;
const app_1 = require("../app");
const bookingService = __importStar(require("../services/booking.service"));
async function handleCreateBooking(req, res, next) {
    const body = req.body;
    if (!body || typeof body !== 'object') {
        throw new app_1.ApiError(400, 'Invalid request body');
    }
    const { showId, seatNumbers, userId } = body;
    if (!showId || typeof showId !== 'string') {
        throw new app_1.ApiError(400, 'showId is required and must be a string');
    }
    if (!Array.isArray(seatNumbers) || seatNumbers.length === 0) {
        throw new app_1.ApiError(400, 'seatNumbers is required and must be a non-empty array of seat identifiers');
    }
    // Validate seatNumbers entries
    for (const s of seatNumbers) {
        if (typeof s !== 'string' || s.trim().length === 0) {
            throw new app_1.ApiError(400, 'Each seatNumber must be a non-empty string');
        }
    }
    try {
        app_1.logger.info({ route: 'createBooking', showId, seatsRequested: seatNumbers.length, userId }, 'creating_booking');
        // Call the service — service will handle transaction and concurrency safety
        const booking = await bookingService.createBooking(showId, seatNumbers.map(s => s.trim()), userId || null);
        // Return booking record; booking.status will be PENDING (or CONFIRMED depending on flow)
        return res.status(201).json({ data: booking });
    }
    catch (err) {
        // Convert known DB or business errors into ApiError for better client messages
        // The service throws Errors with descriptive messages; preserve them as 400-level where appropriate
        app_1.logger.error({ err, route: 'createBooking', showId, seatNumbers }, 'createBooking failed');
        // If error appears to be a validation/business error, return 400
        if (err && (err.message?.includes('not found') || err.message?.includes('not available') || err.message?.includes('required'))) {
            return next(new app_1.ApiError(400, err.message));
        }
        return next(err);
    }
}
async function handleGetBookingById(req, res, next) {
    const bookingId = req.params.id;
    if (!bookingId || typeof bookingId !== 'string') {
        throw new app_1.ApiError(400, 'booking id is required');
    }
    try {
        const booking = await bookingService.getBooking(bookingId);
        if (!booking) {
            return next(new app_1.ApiError(404, 'Booking not found'));
        }
        return res.json({ data: booking });
    }
    catch (err) {
        app_1.logger.error({ err, route: 'getBookingById', bookingId }, 'getBookingById failed');
        return next(err);
    }
}
//# sourceMappingURL=bookings.controller.js.map