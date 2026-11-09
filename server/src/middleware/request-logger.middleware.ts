import type { RequestHandler } from 'express';
import type { Logger } from '../shared/logger.js';

/**
 * One structured line per request. Deliberately logs no headers, query strings, or bodies, so
 * chat text and profile data never reach the logs.
 */
export function requestLogger(logger: Logger): RequestHandler {
  return (req, res, next) => {
    const started = process.hrtime.bigint();
    res.on('finish', () => {
      logger.info(
        {
          requestId: req.requestId,
          method: req.method,
          route: req.baseUrl + (req.route?.path ?? req.path),
          status: res.statusCode,
          latencyMs: Number((process.hrtime.bigint() - started) / 1_000_000n),
        },
        'request',
      );
    });
    next();
  };
}
