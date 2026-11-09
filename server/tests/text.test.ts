import { describe, expect, it } from 'vitest';
import { sanitizeUserText, slugify } from '../src/shared/text.js';

describe('sanitizeUserText', () => {
  it('removes control characters but keeps tabs and newlines', () => {
    expect(sanitizeUserText('a\u0000b\u0007c\td\ne')).toBe('abc\td\ne');
  });
  it('collapses long blank runs and trims', () => {
    expect(sanitizeUserText('  hi\n\n\n\n\nthere  ')).toBe('hi\n\nthere');
  });
  it('returns an empty string for whitespace-only input', () => {
    expect(sanitizeUserText(' \n\t ')).toBe('');
  });
});

describe('slugify', () => {
  it('creates safe kebab-case ids', () => {
    expect(slugify('  GraphQL & REST: Basics!  ')).toBe('graphql-rest-basics');
  });
});
