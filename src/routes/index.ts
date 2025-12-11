/**
 * src/routes/index.ts
 *
 * Central router that mounts versioned/feature routers.
 * - Keeps routing organized and easy to extend
 * - Applies lightweight per-request sanity checks (content-type)
 * - Exports a ready-to-use express.Router()
 */

import { Router, Request, Response, NextFunction } from 'express';
import showsRoutes from './shows.routes';
import bookingsRoutes from './bookings.routes';

const router = Router();

/**
 * Lightweight middleware: ensure JSON content-type for write requests.
 * This prevents accidental form posts without JSON body and gives faster errors.
 */
function requireJsonForWrites(req: Request, _res: Response, next: NextFunction) {
  const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (writeMethods.includes(req.method)) {
    const contentType = (req.headers['content-type'] || '').toLowerCase();
    if (!contentType.includes('application/json')) {
      return next({
        status: 415,
        message: 'Content-Type must be application/json for write requests'
      } as any);
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
router.use('/shows', showsRoutes);
router.use('/bookings', bookingsRoutes);

/**
 * Basic root for API to confirm router is loaded.
 * App-level health endpoint exists separately at /health.
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({ api: 'modex-backend', version: '1.0.0' });
});

export default router;
