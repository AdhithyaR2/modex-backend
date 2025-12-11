"use strict";
/**
 * src/routes/index.ts
 *
 * Central router that mounts versioned/feature routers.
 * - Keeps routing organized and easy to extend
 * - Applies lightweight per-request sanity checks (content-type)
 * - Exports a ready-to-use express.Router()
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const shows_routes_1 = __importDefault(require("./shows.routes"));
const bookings_routes_1 = __importDefault(require("./bookings.routes"));
const router = (0, express_1.Router)();
/**
 * Lightweight middleware: ensure JSON content-type for write requests.
 * This prevents accidental form posts without JSON body and gives faster errors.
 */
function requireJsonForWrites(req, _res, next) {
    const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (writeMethods.includes(req.method)) {
        const contentType = (req.headers['content-type'] || '').toLowerCase();
        if (!contentType.includes('application/json')) {
            return next({
                status: 415,
                message: 'Content-Type must be application/json for write requests'
            });
        }
    }
    next();
}
/**
 * Mount feature routers under /shows and /bookings
 * These routers are intentionally focused: showsRoutes handles admin + listing,
 * bookingsRoutes handles booking creation & retrieval.
 */
router.use(requireJsonForWrites);
router.use('/shows', shows_routes_1.default);
router.use('/bookings', bookings_routes_1.default);
/**
 * Basic root for API to confirm router is loaded.
 * App-level health endpoint exists separately at /health.
 */
router.get('/', (_req, res) => {
    res.json({ api: 'modex-backend', version: '1.0.0' });
});
exports.default = router;
//# sourceMappingURL=index.js.map