/** Stable machine-readable error codes returned to API clients. */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'ASSISTANT_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export interface ErrorDetail {
  path: string;
  message: string;
}

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = 'AppError';
  }

  static validation(message: string, details?: ErrorDetail[]): AppError {
    return new AppError(400, 'VALIDATION_ERROR', message, details);
  }
  static notFound(message = 'Resource not found.'): AppError {
    return new AppError(404, 'NOT_FOUND', message);
  }
  static conflict(message: string): AppError {
    return new AppError(409, 'CONFLICT', message);
  }
  static unauthorized(message = 'Authentication is required.'): AppError {
    return new AppError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'You do not have access to this resource.'): AppError {
    return new AppError(403, 'FORBIDDEN', message);
  }
}

/** Standard error body: { error: { code, message, requestId, details? } } */
export interface ErrorBody {
  error: { code: ErrorCode; message: string; requestId: string; details?: ErrorDetail[] };
}
