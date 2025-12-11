"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const shows_controller_1 = require("../controllers/shows.controller");
const router = (0, express_1.Router)();
/** local async wrapper (identical purpose to previous wrap) */
const wrapAsync = (fn) => (req, res, next) => fn(req, res, next).catch(next);
/**
 * POST /api/shows
 * Body: { name, start_time, total_seats }
 * Admin action: create a show with the required number of seats
 */
router.post('/', wrapAsync(shows_controller_1.handleCreateShow));
/**
 * GET /api/shows
 * List all shows
 */
router.get('/', wrapAsync(shows_controller_1.handleListShows));
/**
 * GET /api/shows/:id
 * Get specific show + its seats
 */
router.get('/:id', wrapAsync(shows_controller_1.handleGetShowById));
exports.default = router;
//# sourceMappingURL=shows.routes.js.map