import type { ZodType } from 'zod';
import { AppError } from './errors.js';

/** Parse untrusted input with a Zod schema or throw a VALIDATION_ERROR with field details. */
export function validate<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const details = result.error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
  throw AppError.validation('The request contains invalid data.', details);
}
