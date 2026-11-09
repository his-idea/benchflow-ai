export type SourceType = 'profile' | 'course' | 'plan' | 'knowledge' | 'skill' | 'demand' | 'draft';

/** A user-readable reference to one piece of supplied context. */
export interface GroundingRef {
  sourceId: string;
  type: SourceType;
  id: string;
  title: string;
}

export interface ContextCourse {
  sourceId: string;
  id: string;
  title: string;
  level: string;
  durationHours: number;
  skills: string[];
  /** Course relevance 0-100. Omitted when the user excluded their profile from the request. */
  relevance?: number;
  reasons?: string[];
}

/**
 * Everything the model is allowed to know for one request. It is deliberately minimal: no names,
 * no free-text profile fields, no other users' data.
 */
export interface AssistantContext {
  profile?: {
    sourceId: string;
    targetRole: string;
    interests: string[];
    weeklyHours: number;
    learningStyle: string;
    skills: { name: string; level: number }[];
  };
  plan?: {
    sourceId: string;
    title: string;
    progressPercent: number;
    items: { courseId: string; title: string; status: string; targetWeek: number }[];
  };
  courses: ContextCourse[];
  nextSkill?: { sourceId: string; name: string; reason: string; topCourseId: string | null };
  demand: { sourceId: string; skill: string; level: string }[];
  knowledge: { sourceId: string; title: string; text: string }[];
  planDraft?: {
    sourceId: string;
    title: string;
    weeklyHours: number;
    items: { courseId: string; title: string; targetWeek: number; durationHours: number }[];
    notes: string[];
  };
  references: GroundingRef[];
}

export type AssistantTask = 'chat' | 'plan';

export const SUGGESTED_ACTIONS = [
  'View course',
  'Generate plan',
  'Open plan',
  'Update profile',
  'Browse courses',
] as const;
export type SuggestedAction = (typeof SUGGESTED_ACTIONS)[number];
