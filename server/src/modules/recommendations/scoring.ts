import type {
  Course,
  DemandLevel,
  DemandSignal,
  RoleDefinition,
  UserProfile,
} from '../../shared/types.js';
import { uniq } from '../../shared/text.js';

/**
 * Deterministic course-relevance scoring (weights-v1).
 *
 * This is a recommendation aid for choosing learning. It is NOT a performance rating of a
 * person and must never be used for staffing, promotion, or employment decisions.
 */
export const MODEL_VERSION = 'weights-v1';

export const SCORE_WEIGHTS = {
  roleAlignment: 0.35,
  skillGap: 0.25,
  demand: 0.15,
  interest: 0.1,
  prerequisites: 0.1,
  timeFit: 0.05,
} as const;

export type ScoreFactorKey = keyof typeof SCORE_WEIGHTS;

export const MAX_SKILL_LEVEL = 5;
/** A prerequisite counts as met at this self-assessed level or higher. */
export const PREREQUISITE_MIN_LEVEL = 2;
export const PLAN_WEEKS = 4;

export const DEMAND_WEIGHT: Record<DemandLevel, number> = { low: 0.3, medium: 0.6, high: 1 };

export interface ScoreFactor {
  factor: ScoreFactorKey;
  label: string;
  weight: number;
  /** Raw factor value from 0 to 1. */
  raw: number;
  /** Contribution to the total, in score points (weight x raw x 100). */
  points: number;
}

export interface ScoreResult {
  /** Whole number from 0 to 100. */
  score: number;
  breakdown: ScoreFactor[];
  /** Always contains at least one human-readable reason. */
  reasons: string[];
}

export interface ScoreContext {
  profile: UserProfile;
  role: RoleDefinition | undefined;
  skillNames: ReadonlyMap<string, string>;
  /** Highest currently-effective demand level per skill id. */
  demandBySkill: ReadonlyMap<string, DemandLevel>;
}

const FACTOR_LABELS: Record<ScoreFactorKey, string> = {
  roleAlignment: 'Target-role skill alignment',
  skillGap: 'Identified skill gap',
  demand: 'Project-demand relevance',
  interest: 'Interest alignment',
  prerequisites: 'Prerequisite readiness',
  timeFit: 'Available-time fit',
};

const round = (n: number, places: number): number => {
  const f = 10 ** places;
  return Math.round(n * f) / f;
};
const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

export function levelOf(profile: UserProfile, skillId: string): number {
  return profile.skills.find((s) => s.skillId === skillId)?.level ?? 0;
}

/** Highest demand level among signals whose effective window contains `now`. */
export function buildDemandMap(
  signals: readonly DemandSignal[],
  now: Date,
): Map<string, DemandLevel> {
  const day = now.toISOString().slice(0, 10);
  const map = new Map<string, DemandLevel>();
  for (const s of signals) {
    if (s.effectiveFrom > day) continue;
    if (s.effectiveTo !== null && s.effectiveTo < day) continue;
    const current = map.get(s.skillId);
    if (!current || DEMAND_WEIGHT[s.demandLevel] > DEMAND_WEIGHT[current]) {
      map.set(s.skillId, s.demandLevel);
    }
  }
  return map;
}

export function scoreCourse(course: Course, ctx: ScoreContext): ScoreResult {
  const { profile, role, skillNames, demandBySkill } = ctx;
  const name = (id: string): string => skillNames.get(id) ?? id;
  const list = (ids: string[]): string => ids.map(name).join(', ');

  const tags = uniq(course.skillTags);
  const prerequisites = uniq(course.prerequisites);
  const required = new Set(role?.requiredSkillIds ?? []);
  const interests = new Set(profile.interests);

  // 1. Target-role alignment: share of the smaller set (course tags vs role skills) that overlaps.
  const roleMatches = tags.filter((t) => required.has(t));
  const roleDenominator = Math.min(tags.length, required.size);
  const roleAlignment = roleDenominator === 0 ? 0 : clamp01(roleMatches.length / roleDenominator);

  // 2. Skill gap: average distance from the maximum level across the course's skills.
  const gapTags = tags.filter((t) => levelOf(profile, t) < MAX_SKILL_LEVEL);
  const skillGap =
    tags.length === 0
      ? 0
      : clamp01(
          tags.reduce(
            (sum, t) => sum + (MAX_SKILL_LEVEL - levelOf(profile, t)) / MAX_SKILL_LEVEL,
            0,
          ) / tags.length,
        );

  // 3. Demand: the strongest current demand signal among the course's skills.
  const demandedTags = tags.filter((t) => demandBySkill.has(t));
  let strongestDemandTag: string | undefined;
  let demand = 0;
  for (const t of demandedTags) {
    const w = DEMAND_WEIGHT[demandBySkill.get(t) as DemandLevel];
    if (w > demand) {
      demand = w;
      strongestDemandTag = t;
    }
  }

  // 4. Interests: overlap with stated interests.
  const interestMatches = tags.filter((t) => interests.has(t));
  const interestDenominator = Math.min(tags.length, interests.size);
  const interest =
    interestDenominator === 0 ? 0 : clamp01(interestMatches.length / interestDenominator);

  // 5. Prerequisites: share of prerequisites the user already meets (none required = fully ready).
  const unmet = prerequisites.filter((p) => levelOf(profile, p) < PREREQUISITE_MIN_LEVEL);
  const prerequisiteReadiness =
    prerequisites.length === 0
      ? 1
      : clamp01((prerequisites.length - unmet.length) / prerequisites.length);

  // 6. Time fit: can the course be finished within the four-week window at the stated hours?
  const capacity = profile.weeklyHours * PLAN_WEEKS;
  const timeFit =
    course.durationHours <= 0 ? 1 : capacity <= 0 ? 0 : clamp01(capacity / course.durationHours);

  const raws: Record<ScoreFactorKey, number> = {
    roleAlignment,
    skillGap,
    demand,
    interest,
    prerequisites: prerequisiteReadiness,
    timeFit,
  };

  const keys = Object.keys(SCORE_WEIGHTS) as ScoreFactorKey[];
  const total = keys.reduce((sum, k) => sum + SCORE_WEIGHTS[k] * raws[k], 0);
  const breakdown: ScoreFactor[] = keys.map((k) => ({
    factor: k,
    label: FACTOR_LABELS[k],
    weight: SCORE_WEIGHTS[k],
    raw: round(raws[k], 2),
    points: round(SCORE_WEIGHTS[k] * raws[k] * 100, 1),
  }));

  const reasons: string[] = [];
  if (roleMatches.length > 0 && role) {
    reasons.push(`Builds skills a ${role.name} often uses: ${list(roleMatches)}.`);
  }
  const weak = gapTags.filter((t) => levelOf(profile, t) <= 2);
  if (weak.length > 0) {
    reasons.push(
      `Addresses a skill gap: ${weak.map((t) => `${name(t)} (your level: ${levelOf(profile, t)} of ${MAX_SKILL_LEVEL})`).join(', ')}.`,
    );
  } else if (skillGap > 0 && tags.length > 0 && skillGap < 0.5) {
    reasons.push('Strengthens skills you already partly have.');
  }
  if (strongestDemandTag) {
    reasons.push(
      `${name(strongestDemandTag)} currently has ${demandBySkill.get(strongestDemandTag)} demand in the aggregate project signals.`,
    );
  }
  if (interestMatches.length > 0) {
    reasons.push(`Matches your stated interests: ${list(interestMatches)}.`);
  }
  if (reasons.length === 0) {
    reasons.push('General catalog course with limited overlap with your current goals.');
  }
  if (prerequisites.length > 0) {
    reasons.push(
      unmet.length === 0
        ? `You meet the prerequisites (${list(prerequisites)}).`
        : `Build these prerequisites first: ${list(unmet)}.`,
    );
  }
  if (capacity <= 0) {
    reasons.push('Set your weekly learning hours in your profile to check time fit.');
  } else if (timeFit >= 1) {
    reasons.push(
      `Fits your time: ${course.durationHours}h is within the ${capacity}h you have over four weeks.`,
    );
  } else {
    reasons.push(
      `Needs ${course.durationHours}h but you have about ${capacity}h over four weeks, so it may run past the plan.`,
    );
  }

  return {
    score: Math.min(100, Math.max(0, Math.round(total * 100))),
    breakdown,
    reasons,
  };
}
