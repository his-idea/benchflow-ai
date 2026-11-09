import { HttpErrorResponse } from '@angular/common/http';
import { ApiError, errorMessage, toApiError } from './api-error';

const http = (status: number, body: unknown) => new HttpErrorResponse({ status, error: body });

describe('toApiError', () => {
  it('uses the server error contract, including field details', () => {
    const e = toApiError(
      http(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Bad data.',
          requestId: 'r-1',
          details: [{ path: 'weeklyHours', message: 'Too high.' }],
        },
      }),
    );
    expect(e).toBeInstanceOf(ApiError);
    expect(e).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Bad data.',
      requestId: 'r-1',
      status: 400,
    });
    expect(e.details).toEqual([{ path: 'weeklyHours', message: 'Too high.' }]);
  });

  it('explains network failures in plain language', () => {
    const e = toApiError(http(0, null));
    expect(e.code).toBe('NETWORK_ERROR');
    expect(e.message).toContain("Can't reach the server");
  });

  it('gives a friendly message for rate limiting without a body', () => {
    expect(toApiError(http(429, 'Too Many Requests')).code).toBe('RATE_LIMITED');
  });

  it('falls back to a generic message for unexpected responses', () => {
    const e = toApiError(http(502, '<html>Bad gateway</html>'));
    expect(e.code).toBe('UNKNOWN_ERROR');
    expect(e.message).not.toContain('html');
  });
});

describe('errorMessage', () => {
  it('shows ApiError messages and hides everything else', () => {
    expect(errorMessage(new ApiError('Nope.', 400, 'X', null))).toBe('Nope.');
    expect(errorMessage(new Error('stack trace details'))).toBe(
      'Something went wrong. Please try again.',
    );
  });
});
