import { rateLimit } from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { AppError } from '../shared/errors.js';

/** Per-user limiter for the assistant endpoints (the costly ones). */
export function assistantRateLimit(max: number, windowMs = 60_000): RequestHandler {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id ?? 'anonymous',
    handler: (_req, res, next) => {
      res.setHeader('Retry-After', String(Math.ceil(windowMs / 1000)));
      next(
        new AppError(
          429,
          'RATE_LIMITED',
          'Too many assistant requests. Please wait a moment and try again.',
        ),
      );
    },
  });
}
