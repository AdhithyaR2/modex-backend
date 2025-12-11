"use strict";
/**
 * src/routes/bookings.routes.ts
 *
 * Booking endpoints:
 * - POST /api/bookings      -> create a booking (PENDING / CONFIRMED logic in service)
 * - GET  /api/bookings/:id  -> fetch booking status/details
 *
 * Uses a local wrapAsync helper so the routes are independent of app exports.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bookings_controller_1 = require("../controllers/bookings.controller");
const router = (0, express_1.Router)();
const wrapAsync = (fn) => (req, res, next) => fn(req, res, next).catch(next);
/**
 * POST /api/bookings
 * Body:
 * {
 *   "showId": "<uuid>",
 *   "seatNumbers": ["1","2"],
 *   "userId": "<optional-uuid>"
 * }
 */
router.post('/', wrapAsync(bookings_controller_1.handleCreateBooking));
/**
 * GET /api/bookings/:id
 */
router.get('/:id', wrapAsync(bookings_controller_1.handleGetBookingById));
exports.default = router;
//# sourceMappingURL=bookings.routes.js.map