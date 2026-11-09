import { z } from 'zod';
import type { AssistantContext, SuggestedAction } from './assistant.types.js';
import { SUGGESTED_ACTIONS } from './assistant.types.js';

/** JSON Schema sent to providers that support structured output (Azure OpenAI). */
export const ASSISTANT_OUTPUT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    recommendedCourseIds: { type: 'array', items: { type: 'string' } },
    suggestedActions: { type: 'array', items: { type: 'string', enum: [...SUGGESTED_ACTIONS] } },
    sourceIds: { type: 'array', items: { type: 'string' } },
  },
  required: ['answer', 'recommendedCourseIds', 'suggestedActions', 'sourceIds'],
  additionalProperties: false,
} as const;

const outputSchema = z.object({
  answer: z.string().trim().min(1).max(4000),
  recommendedCourseIds: z.array(z.string().max(100)).max(10),
  suggestedActions: z.array(z.string().max(50)).max(10),
  sourceIds: z.array(z.string().max(120)).max(30),
});

export interface ValidAssistantOutput {
  answer: string;
  recommendedCourseIds: string[];
  suggestedActions: SuggestedAction[];
  sourceIds: string[];
}

export type ValidationFailureReason =
  'not_json' | 'schema' | 'unknown_course' | 'unknown_source' | 'ungrounded_course';

export type ParseResult =
  { ok: true; value: ValidAssistantOutput } | { ok: false; reason: ValidationFailureReason };

function extractJson(raw: string): unknown {
  const text = raw.trim();
  // Tolerate a fenced code block even though the prompt asks for bare JSON.
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(text);
  return JSON.parse(fenced?.[1] ?? text);
}

/**
 * Reject malformed or ungrounded model output. Ungrounded means it cites ids that were never
 * supplied, recommends a course outside the supplied set, or recommends a course without
 * citing that course as a source.
 */
export function parseAssistantOutput(raw: string, context: AssistantContext): ParseResult {
  let json: unknown;
  try {
    json = extractJson(raw);
  } catch {
    return { ok: false, reason: 'not_json' };
  }
  const parsed = outputSchema.safeParse(json);
  if (!parsed.success) return { ok: false, reason: 'schema' };

  const courseIds = new Set(context.courses.map((c) => c.id));
  const sourceIds = new Set(context.references.map((r) => r.sourceId));
  const { answer, recommendedCourseIds, suggestedActions, sourceIds: cited } = parsed.data;

  if (recommendedCourseIds.some((id) => !courseIds.has(id)))
    return { ok: false, reason: 'unknown_course' };
  if (cited.some((id) => !sourceIds.has(id))) return { ok: false, reason: 'unknown_source' };
  if (recommendedCourseIds.some((id) => !cited.includes(`course:${id}`))) {
    return { ok: false, reason: 'ungrounded_course' };
  }

  const allowed = new Set<string>(SUGGESTED_ACTIONS);
  return {
    ok: true,
    value: {
      answer,
      recommendedCourseIds: [...new Set(recommendedCourseIds)],
      suggestedActions: [...new Set(suggestedActions)]
        .filter((a): a is SuggestedAction => allowed.has(a))
        .slice(0, 4),
      sourceIds: [...new Set(cited)],
    },
  };
}
