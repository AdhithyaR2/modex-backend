"use strict";
/**
 * src/app.ts
 *
 * Express application factory (production-ready)
 * - Pino request logger
 * - Minimal security headers (Helmet-like)
 * - Configurable CORS
 * - Body parsing with limits
 * - API versioning (mount routes under /api)
 * - Centralized error handling
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.ApiError = void 0;
exports.wrap = wrap;
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const pino_1 = __importDefault(require("pino"));
const routes_1 = __importDefault(require("./routes"));
dotenv_1.default.config();
/* ---------------------------
 * Logger
 * --------------------------- */
const logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard' }
    }
});
exports.logger = logger;
/**
 * Exported wrap function (use a proper function export so CommonJS interop
 * keeps it a callable function in compiled code).
 */
function wrap(fn) {
    return (req, res, next) => fn(req, res, next).catch(next);
}
/* ---------------------------
 * Security / CORS helpers
 * --------------------------- */
function applySecurityHeaders(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    next();
}
function corsMiddleware(req, res, next) {
    const allowed = (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.split(',')) || ['*'];
    const origin = req.headers.origin;
    if (allowed.includes('*')) {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    else if (origin && allowed.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }
    next();
}
/* ---------------------------
 * Request logging middleware using pino
 * --------------------------- */
function requestLogger(req, res, next) {
    const start = Date.now();
    const { method, url } = req;
    const id = `${Math.random().toString(36).substring(2, 9)}`;
    req.requestId = id;
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info({
            id,
            method,
            url,
            status: res.statusCode,
            duration
        }, 'request_finished');
    });
    next();
}
/* ---------------------------
 * Error types & handler
 * --------------------------- */
class ApiError extends Error {
    constructor(status, message, code, details) {
        super(message);
        this.status = status || 500;
        this.code = code;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ApiError = ApiError;
function errorHandler(err, req, res, _next) {
    logger.error({ err, path: req.path, method: req.method }, 'unhandled_error');
    if (err instanceof ApiError) {
        return res.status(err.status).json({
            error: {
                message: err.message,
                code: err.code || 'API_ERROR',
                details: err.details || null
            }
        });
    }
    return res.status(500).json({
        error: {
            message: 'Internal Server Error',
            code: 'INTERNAL_ERROR'
        }
    });
}
/* ---------------------------
 * Application Factory
 * --------------------------- */
function createApp() {
    const app = (0, express_1.default)();
    app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
    app.use(express_1.default.json({ limit: '100kb' }));
    app.use(express_1.default.urlencoded({ extended: true }));
    app.use(requestLogger);
    app.use(applySecurityHeaders);
    app.use(corsMiddleware);
    app.use('/api', routes_1.default);
    app.use((req, res) => {
        res.status(404).json({ error: { message: 'Not Found', code: 'NOT_FOUND' } });
    });
    app.use(errorHandler);
    return app;
}
const app = createApp();
exports.default = app;
//# sourceMappingURL=app.js.map