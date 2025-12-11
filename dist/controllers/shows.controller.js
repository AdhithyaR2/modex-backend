"use strict";
/**
 * src/controllers/shows.controller.ts
 *
 * HTTP controllers for shows endpoints.
 * - Minimal responsibility: validate request, call service, return response.
 * - All heavy-lifting and DB logic lives in services/show.service.ts
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
exports.handleCreateShow = handleCreateShow;
exports.handleListShows = handleListShows;
exports.handleGetShowById = handleGetShowById;
const app_1 = require("../app");
const showService = __importStar(require("../services/show.service"));
/**
 * POST /api/shows
 * Admin: create a show and its seat rows.
 */
async function handleCreateShow(req, res, next) {
    const body = req.body;
    // Basic validation
    if (!body || typeof body !== 'object') {
        throw new app_1.ApiError(400, 'Invalid request body');
    }
    const { name, start_time, total_seats } = body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new app_1.ApiError(400, 'name is required and must be a non-empty string');
    }
    if (!start_time || typeof start_time !== 'string') {
        throw new app_1.ApiError(400, 'start_time is required and must be an ISO datetime string');
    }
    const startTimeParsed = new Date(start_time);
    if (Number.isNaN(startTimeParsed.getTime())) {
        throw new app_1.ApiError(400, 'start_time must be a valid ISO datetime string');
    }
    if (typeof total_seats !== 'number' || !Number.isInteger(total_seats) || total_seats <= 0) {
        throw new app_1.ApiError(400, 'total_seats is required and must be a positive integer');
    }
    // Call service
    try {
        app_1.logger.info({ route: 'createShow', name, start_time, total_seats }, 'creating_show');
        const show = await showService.createShow(name.trim(), start_time, total_seats);
        return res.status(201).json({ data: show });
    }
    catch (err) {
        // Let global error handler deal with logging; wrap common DB error shapes into ApiError when possible
        app_1.logger.error({ err, route: 'createShow' }, 'createShow failed');
        return next(err);
    }
}
/**
 * GET /api/shows
 * List shows (basic listing)
 */
async function handleListShows(_req, res, next) {
    try {
        const shows = await showService.listShows();
        return res.json({ data: shows });
    }
    catch (err) {
        app_1.logger.error({ err, route: 'listShows' }, 'listShows failed');
        return next(err);
    }
}
/**
 * GET /api/shows/:id
 * Get show by ID with seats
 */
async function handleGetShowById(req, res, next) {
    const showId = req.params.id;
    if (!showId) {
        throw new app_1.ApiError(400, 'Show id is required');
    }
    try {
        const show = await showService.getShow(showId);
        if (!show) {
            throw new app_1.ApiError(404, 'Show not found');
        }
        return res.json({ data: show });
    }
    catch (err) {
        app_1.logger.error({ err, route: 'getShowById', showId }, 'getShowById failed');
        return next(err);
    }
}
//# sourceMappingURL=shows.controller.js.map