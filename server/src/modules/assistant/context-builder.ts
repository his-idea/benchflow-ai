import type { KnowledgeSnippet, Skill, UserProfile, DemandLevel } from '../../shared/types.js';
import type { NextSkill } from '../recommendations/next-skill.js';
import type { RecommendedCourse } from '../recommendations/recommendation.service.js';
import { DEMAND_WEIGHT } from '../recommendations/scoring.js';
import type { PlanDraft } from '../learning-plans/plan-draft.js';
import type { PlanView } from '../learning-plans/plan.service.js';
import type {
  AssistantContext,
  AssistantTask,
  ContextCourse,
  GroundingRef,
} from './assistant.types.js';
import { tokenize } from './knowledge.js';

export interface ContextInput {
  task: AssistantTask;
  message: string;
  includeProfile: boolean;
  includeCurrentPlan: boolean;
  profile: UserProfile;
  roleName: string | undefined;
  skills: readonly Skill[];
  /** Courses ranked by relevance, best first. */
  ranked: readonly RecommendedCourse[];
  nextSkill: NextSkill | null;
  plan: PlanView | null;
  demandBySkill: ReadonlyMap<string, DemandLevel>;
  knowledge: readonly KnowledgeSnippet[];
  draft?: PlanDraft;
}

const MAX_CONTEXT_COURSES = 5;
const MAX_DEMAND_ENTRIES = 5;

/** Assemble the minimal, source-identified context for one assistant request. */
export function buildAssistantContext(input: ContextInput): AssistantContext {
  const names = new Map(input.skills.map((s) => [s.id, s.name]));
  const skillName = (id: string): string => names.get(id) ?? id;
  const references: GroundingRef[] = [];
  const addRef = (ref: GroundingRef): void => {
    if (!references.some((r) => r.sourceId === ref.sourceId)) references.push(ref);
  };

  const context: AssistantContext = { courses: [], demand: [], knowledge: [], references };

  if (input.includeProfile) {
    context.profile = {
      sourceId: 'profile:me',
      targetRole: input.roleName ?? 'not set',
      interests: input.profile.interests.map(skillName),
      weeklyHours: input.profile.weeklyHours,
      learningStyle: input.profile.preferredLearningStyle,
      skills: input.profile.skills.map((s) => ({ name: skillName(s.skillId), level: s.level })),
    };
    addRef({ sourceId: 'profile:me', type: 'profile', id: 'me', title: 'Your skill profile' });
  }

  if (input.includeCurrentPlan && input.plan) {
    context.plan = {
      sourceId: `plan:${input.plan.id}`,
      title: input.plan.title,
      progressPercent: input.plan.progress.percent,
      items: input.plan.items.map((i) => ({
        courseId: i.courseId,
        title: i.courseTitle,
        status: i.status,
        targetWeek: i.targetWeek,
      })),
    };
    addRef({
      sourceId: context.plan.sourceId,
      type: 'plan',
      id: input.plan.id,
      title: input.plan.title,
    });
  }

  // Which courses the model may see. A plan request sees only the draft's courses.
  let candidates: readonly RecommendedCourse[];
  if (input.task === 'plan' && input.draft) {
    const ids = new Set(input.draft.items.map((i) => i.courseId));
    candidates = input.ranked.filter((r) => ids.has(r.course.id));
  } else if (input.includeProfile) {
    candidates = input.ranked.slice(0, MAX_CONTEXT_COURSES);
  } else {
    // Without the profile, rank only by keyword overlap so personalised ordering does not leak.
    const tokens = tokenize(input.message);
    const alphabetical = [...input.ranked].sort((a, b) =>
      a.course.title.localeCompare(b.course.title),
    );
    const matching = alphabetical.filter((r) =>
      tokens.some((t) =>
        `${r.course.title} ${r.course.skillTags.map(skillName).join(' ')}`
          .toLowerCase()
          .includes(t),
      ),
    );
    candidates = (matching.length > 0 ? matching : alphabetical).slice(0, MAX_CONTEXT_COURSES);
  }

  // The next-skill suggestion cites its top course, so that course must be in the context.
  if (input.includeProfile && input.nextSkill?.topCourseId && input.task === 'chat') {
    const topId = input.nextSkill.topCourseId;
    if (!candidates.some((r) => r.course.id === topId)) {
      const extra = input.ranked.find((r) => r.course.id === topId);
      if (extra) candidates = [...candidates, extra];
    }
  }

  context.courses = candidates.map((r): ContextCourse => {
    const sourceId = `course:${r.course.id}`;
    addRef({ sourceId, type: 'course', id: r.course.id, title: r.course.title });
    return {
      sourceId,
      id: r.course.id,
      title: r.course.title,
      level: r.course.level,
      durationHours: r.course.durationHours,
      skills: r.course.skillTags.map(skillName),
      ...(input.includeProfile ? { relevance: r.score, reasons: r.reasons } : {}),
    };
  });

  if (input.includeProfile && input.nextSkill) {
    const next = input.nextSkill;
    context.nextSkill = {
      sourceId: `skill:${next.skillId}`,
      name: next.name,
      reason: next.reason,
      topCourseId: next.topCourseId,
    };
    addRef({
      sourceId: context.nextSkill.sourceId,
      type: 'skill',
      id: next.skillId,
      title: next.name,
    });
  }

  context.demand = [...input.demandBySkill.entries()]
    .sort(
      (a, b) =>
        DEMAND_WEIGHT[b[1]] - DEMAND_WEIGHT[a[1]] || skillName(a[0]).localeCompare(skillName(b[0])),
    )
    .slice(0, MAX_DEMAND_ENTRIES)
    .map(([skillId, level]) => {
      const sourceId = `demand:${skillId}`;
      addRef({ sourceId, type: 'demand', id: skillId, title: `${skillName(skillId)} demand` });
      return { sourceId, skill: skillName(skillId), level };
    });

  context.knowledge = input.knowledge.map((k) => {
    const sourceId = `kb:${k.id}`;
    addRef({ sourceId, type: 'knowledge', id: k.id, title: k.title });
    return { sourceId, title: k.title, text: k.text };
  });

  if (input.task === 'plan' && input.draft) {
    context.planDraft = {
      sourceId: 'draft:plan',
      title: input.draft.title,
      weeklyHours: input.draft.weeklyHours,
      items: input.draft.items.map((i) => ({
        courseId: i.courseId,
        title: i.courseTitle,
        targetWeek: i.targetWeek,
        durationHours: i.durationHours,
      })),
      notes: input.draft.notes,
    };
    addRef({ sourceId: 'draft:plan', type: 'draft', id: 'plan', title: input.draft.title });
  }

  return context;
}
