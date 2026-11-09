import { pino, type Logger } from 'pino';

/**
 * Structured logger. Secrets and credentials are redacted by path. Application code must also
 * never pass prompts, AI responses, or chat text to the logger (see docs/security.md).
 */
export function createLogger(level: string): Logger {
  return pino({
    level,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'headers.authorization',
        'headers.cookie',
        '*.apiKey',
        '*.token',
        '*.password',
        '*.secret',
        'apiKey',
        'authorization',
      ],
      censor: '[REDACTED]',
    },
  });
}

export type { Logger };
