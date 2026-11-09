/** Strip control characters (except tab/newline), collapse blank runs, and trim. */
export function sanitizeUserText(input: string): string {
  return (
    input
      // Intentionally matches control characters in order to remove them.
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

export function uniq<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
