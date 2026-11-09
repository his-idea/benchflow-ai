import type {
  Course,
  DemandLevel,
  RoleDefinition,
  Skill,
  UserProfile,
} from '../../shared/types.js';
import { DEMAND_WEIGHT, MAX_SKILL_LEVEL, levelOf, type ScoreResult } from './scoring.js';

export interface NextSkill {
  skillId: string;
  name: string;
  currentLevel: number;
  demandLevel: DemandLevel | null;
  reason: string;
  /** Highest-relevance active course that teaches this skill, if any. */
  topCourseId: string | null;
}

/**
 * Pick the skill to focus on next: candidates are the target role's skills and the user's
 * interests. Priority = 50% size of gap + 20% current demand + 30% bonus if the target role uses
 * the skill. Ties break by id so the result is deterministic.
 */
export function pickNextSkill(input: {
  profile: UserProfile;
  role: RoleDefinition | undefined;
  skills: readonly Skill[];
  demandBySkill: ReadonlyMap<string, DemandLevel>;
  scored: ReadonlyArray<{ course: Course; result: ScoreResult }>;
}): NextSkill | null {
  const { profile, role, skills, demandBySkill, scored } = input;
  const known = new Map(skills.map((s) => [s.id, s]));

  let candidateIds = [...new Set([...(role?.requiredSkillIds ?? []), ...profile.interests])];
  if (candidateIds.length === 0) candidateIds = skills.map((s) => s.id);

  const required = new Set(role?.requiredSkillIds ?? []);
  // Role relevance counts most (as in course scoring), then the size of the gap, then demand.
  const ranked = candidateIds
    .filter((id) => known.has(id) && levelOf(profile, id) < MAX_SKILL_LEVEL)
    .map((id) => {
      const gap = (MAX_SKILL_LEVEL - levelOf(profile, id)) / MAX_SKILL_LEVEL;
      const demandLevel = demandBySkill.get(id);
      const demand = demandLevel ? DEMAND_WEIGHT[demandLevel] : 0;
      return { id, priority: gap * 0.5 + demand * 0.2 + (required.has(id) ? 0.3 : 0) };
    })
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));

  const best = ranked[0];
  if (!best) return null;
  const skill = known.get(best.id) as Skill;
  const level = levelOf(profile, best.id);
  const demandLevel = demandBySkill.get(best.id) ?? null;

  const parts: string[] = [];
  if (role?.requiredSkillIds.includes(best.id)) parts.push(`it is commonly used by a ${role.name}`);
  parts.push(`your current level is ${level} of ${MAX_SKILL_LEVEL}`);
  if (demandLevel) parts.push(`demand is ${demandLevel} in the aggregate project signals`);

  const topCourse = scored
    .filter((s) => s.course.skillTags.includes(best.id))
    .sort(
      (a, b) => b.result.score - a.result.score || a.course.title.localeCompare(b.course.title),
    )[0];

  return {
    skillId: best.id,
    name: skill.name,
    currentLevel: level,
    demandLevel,
    reason: `Suggested because ${parts.join(', ')}.`,
    topCourseId: topCourse?.course.id ?? null,
  };
}
