import type { KnowledgeSnippet } from '../../shared/types.js';

const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'what',
  'which',
  'how',
  'can',
  'should',
  'would',
  'could',
  'does',
  'this',
  'that',
  'are',
  'was',
  'you',
  'your',
  'about',
  'have',
  'has',
  'any',
  'need',
  'want',
  'from',
  'into',
  'there',
  'their',
  'them',
  'will',
  'who',
  'when',
  'where',
  'why',
  'please',
  'tell',
  'create',
]);

export function tokenize(text: string): string[] {
  return [...new Set(text.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])].filter(
    (t) => !STOPWORDS.has(t),
  );
}

/** Keyword retrieval over the approved knowledge snippets (top matches only). */
export function retrieveKnowledge(
  message: string,
  snippets: readonly KnowledgeSnippet[],
  limit = 3,
): KnowledgeSnippet[] {
  const tokens = tokenize(message);
  if (tokens.length === 0) return [];
  return snippets
    .map((snippet) => {
      const haystack = tokenize(`${snippet.title} ${snippet.text}`);
      const set = new Set(haystack);
      // Prefix matching lets "enroll" match "enrollment" and "voucher" match "vouchers".
      const score = tokens.filter(
        (t) => set.has(t) || haystack.some((h) => h.startsWith(t) || t.startsWith(h)),
      ).length;
      return { snippet, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.snippet.id.localeCompare(b.snippet.id))
    .slice(0, limit)
    .map((s) => s.snippet);
}
