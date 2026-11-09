import type { RecommendedCourse } from '../recommendations/recommendation.service.js';
import { PLAN_WEEKS } from '../recommendations/scoring.js';

export interface PlanDraftItem {
  courseId: string;
  courseTitle: string;
  durationHours: number;
  sequence: number;
  /** Week (1-4) in which the course is expected to finish at the user's weekly hours. */
  targetWeek: number;
}

export interface PlanDraft {
  title: string;
  weeklyHours: number;
  totalHours: number;
  items: PlanDraftItem[];
  notes: string[];
}

const MAX_DRAFT_ITEMS = 6;

/**
 * Deterministic four-week plan draft. Courses come from the ranked recommendation list; the
 * language model never chooses or invents them, it only describes this draft.
 */
export function buildPlanDraft(input: {
  ranked: readonly RecommendedCourse[];
  weeklyHours: number;
  roleName: string | undefined;
  excludeCourseIds?: ReadonlySet<string>;
}): PlanDraft {
  const { ranked, weeklyHours, roleName, excludeCourseIds = new Set<string>() } = input;
  const title = roleName ? `Four-week plan: ${roleName} focus` : 'Four-week learning plan';
  const notes: string[] = [];

  if (weeklyHours <= 0) {
    return {
      title,
      weeklyHours,
      totalHours: 0,
      items: [],
      notes: ['Set your weekly learning hours in your profile to generate a plan.'],
    };
  }

  const items: PlanDraftItem[] = [];
  let cumulative = 0;
  let skippedForTime = false;
  let skippedForPrerequisites = false;

  for (const rec of ranked) {
    if (items.length >= MAX_DRAFT_ITEMS) break;
    if (rec.score <= 0 || excludeCourseIds.has(rec.course.id)) continue;
    const prerequisites = rec.breakdown.find((f) => f.factor === 'prerequisites');
    if (prerequisites && prerequisites.raw < 1) {
      skippedForPrerequisites = true;
      continue;
    }
    const targetWeek = Math.ceil((cumulative + rec.course.durationHours) / weeklyHours);
    if (targetWeek > PLAN_WEEKS) {
      skippedForTime = true;
      continue;
    }
    cumulative += rec.course.durationHours;
    items.push({
      courseId: rec.course.id,
      courseTitle: rec.course.title,
      durationHours: rec.course.durationHours,
      sequence: items.length + 1,
      targetWeek,
    });
  }

  if (skippedForTime)
    notes.push(
      'Some relevant courses were left out because they would not fit your weekly hours within four weeks.',
    );
  if (skippedForPrerequisites)
    notes.push('Courses whose prerequisites you have not yet met were left out.');
  if (items.length === 0)
    notes.push(
      'No suitable course fits the plan window right now. Try adjusting your weekly hours or skills.',
    );

  return { title, weeklyHours, totalHours: cumulative, items, notes };
}
