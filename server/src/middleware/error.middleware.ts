import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError, type ErrorBody } from '../shared/errors.js';
import type { Logger } from '../shared/logger.js';

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(AppError.notFound('Route not found.'));
};

/** Converts any thrown value into the stable { error: { code, message, requestId } } contract. */
export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (err, req, res, _next) => {
    let appError: AppError;
    const bodyError = err as { type?: string; status?: number };

    if (err instanceof AppError) {
      appError = err;
    } else if (bodyError?.type === 'entity.too.large') {
      appError = new AppError(413, 'PAYLOAD_TOO_LARGE', 'The request body is too large.');
    } else if (bodyError?.type === 'entity.parse.failed') {
      appError = AppError.validation('The request body is not valid JSON.');
    } else {
      appError = new AppError(500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
      // Log the error class only: messages can embed user-supplied or sensitive text.
      logger.error(
        { requestId: req.requestId, errorName: (err as Error)?.name },
        'unhandled error',
      );
    }

    const body: ErrorBody = {
      error: {
        code: appError.code,
        message: appError.message,
        requestId: req.requestId,
        ...(appError.details ? { details: appError.details } : {}),
      },
    };
    res.status(appError.status).json(body);
  };
}
