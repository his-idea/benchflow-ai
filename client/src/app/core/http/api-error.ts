import { HttpErrorResponse } from '@angular/common/http';

export interface ApiFieldError {
  path: string;
  message: string;
}

/** A normalised API failure with a message that is safe to show to a person. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly requestId: string | null,
    public readonly details: ApiFieldError[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ServerErrorBody {
  error?: { code?: string; message?: string; requestId?: string; details?: ApiFieldError[] };
}

/** Convert any HttpErrorResponse into an ApiError, with friendly text for common failures. */
export function toApiError(error: HttpErrorResponse): ApiError {
  const body = error.error as ServerErrorBody | null;
  const server = body?.error;
  if (server?.message && server.code) {
    return new ApiError(
      server.message,
      error.status,
      server.code,
      server.requestId ?? null,
      server.details ?? [],
    );
  }
  if (error.status === 0) {
    return new ApiError(
      "Can't reach the server. Check that the API is running and try again.",
      0,
      'NETWORK_ERROR',
      null,
    );
  }
  if (error.status === 429) {
    return new ApiError(
      'Too many requests. Please wait a moment and try again.',
      429,
      'RATE_LIMITED',
      null,
    );
  }
  return new ApiError(
    'Something went wrong. Please try again.',
    error.status,
    'UNKNOWN_ERROR',
    null,
  );
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}
